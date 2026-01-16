"""
Serializers for accounts app.
"""
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

User = get_user_model()


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Custom JWT token serializer with additional user info."""
    
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['email'] = user.email
        token['role'] = user.role
        token['full_name'] = user.full_name
        if user.merchant:
            token['merchant_id'] = str(user.merchant.id)
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Add user info to response
        data['user'] = UserSerializer(self.user).data
        return data


class UserSerializer(serializers.ModelSerializer):
    """User serializer for read operations."""
    
    full_name = serializers.ReadOnlyField()
    merchant_id = serializers.UUIDField(source='merchant.id', read_only=True, allow_null=True)
    merchant_name = serializers.CharField(source='merchant.name', read_only=True)
    outlet_id = serializers.UUIDField(source='outlet.id', read_only=True, allow_null=True)
    outlet_name = serializers.CharField(source='outlet.name', read_only=True)
    point_of_exit_id = serializers.UUIDField(source='point_of_exit.id', read_only=True, allow_null=True)
    point_of_exit_name = serializers.CharField(source='point_of_exit.name', read_only=True)
    profile_photo = serializers.ImageField(read_only=True)
    is_super_admin = serializers.BooleanField(read_only=True)
    permissions = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'phone', 'is_active', 'merchant_id', 'merchant_name',
            'outlet_id', 'outlet_name', 'point_of_exit_id', 'point_of_exit_name', 
            'profile_photo', 'is_super_admin', 'permissions', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_permissions(self, obj):
        """Return user permissions for ADMIN/AUDITOR roles."""
        if obj.role not in ['ADMIN', 'AUDITOR']:
            return []
        from apps.accounts.admin_models import UserPermission
        permissions = UserPermission.objects.filter(user=obj).values('module', 'action')
        return list(permissions)


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating users."""
    
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm', 'first_name', 
            'last_name', 'role', 'phone', 'merchant', 'point_of_exit'
        ]

    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Passwords do not match'})
        return attrs

    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating users."""
    
    class Meta:
        model = User
        fields = ['first_name', 'last_name', 'phone', 'is_active', 'merchant', 'point_of_exit']


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for password change."""
    
    old_password = serializers.CharField(required=True)
    new_password = serializers.CharField(required=True, validators=[validate_password])
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Invalid current password')
        return value


# ============================================
# PUBLIC REGISTRATION SERIALIZERS
# ============================================

class ClientRegistrationSerializer(serializers.ModelSerializer):
    """
    Serializer for client/traveler registration.
    Simple registration - account is active immediately.
    """
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = [
            'email', 'password', 'password_confirm', 
            'first_name', 'last_name', 'phone'
        ]
    
    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Un compte avec cet email existe déjà.')
        return value
    
    def validate(self, attrs):
        if attrs['password'] != attrs.pop('password_confirm'):
            raise serializers.ValidationError({'password_confirm': 'Les mots de passe ne correspondent pas.'})
        return attrs
    
    def create(self, validated_data):
        from .models import UserRole
        password = validated_data.pop('password')
        user = User(
            **validated_data,
            role=UserRole.TRAVELER,
            is_active=True
        )
        user.set_password(password)
        user.save()
        return user


class MerchantRegistrationRequestSerializer(serializers.Serializer):
    """
    Serializer for merchant/enterprise registration request.
    Creates a pending request that requires admin approval.
    Password will be set during account activation.
    """
    # User info (no password - will be set during activation)
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20)
    
    # Company info (RDC specific)
    company_name = serializers.CharField(max_length=255)
    trade_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    registration_number = serializers.CharField(max_length=100)  # RCCM
    tax_id = serializers.CharField(max_length=100)  # NIF
    national_id = serializers.CharField(max_length=100, required=False, allow_blank=True)  # Id. Nat.
    
    # Address
    address = serializers.CharField(max_length=255)
    city = serializers.CharField(max_length=100)
    province = serializers.CharField(max_length=100)
    commune = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    # Contact
    company_phone = serializers.CharField(max_length=20)
    company_email = serializers.EmailField()
    
    # Banking info (optional)
    bank_name = serializers.CharField(max_length=255, required=False, allow_blank=True)
    bank_account_number = serializers.CharField(max_length=100, required=False, allow_blank=True)
    mobile_money_number = serializers.CharField(max_length=20, required=False, allow_blank=True)
    mobile_money_provider = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    # Business info
    business_sector = serializers.CharField(max_length=100)
    business_description = serializers.CharField(required=False, allow_blank=True)
    
    def validate_email(self, value):
        from .models import MerchantRegistrationRequest
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Un compte avec cet email existe déjà.')
        if MerchantRegistrationRequest.objects.filter(email=value, status='PENDING').exists():
            raise serializers.ValidationError('Une demande avec cet email est déjà en cours de traitement.')
        return value
    
    def validate_registration_number(self, value):
        from .models import MerchantRegistrationRequest
        from apps.merchants.models import Merchant
        if Merchant.objects.filter(registration_number=value).exists():
            raise serializers.ValidationError('Ce numéro RCCM est déjà enregistré.')
        if MerchantRegistrationRequest.objects.filter(registration_number=value, status='PENDING').exists():
            raise serializers.ValidationError('Une demande avec ce numéro RCCM est déjà en cours.')
        return value
    
    def create(self, validated_data):
        from .models import MerchantRegistrationRequest
        
        request = MerchantRegistrationRequest(**validated_data)
        request.save()
        return request


class MerchantRegistrationRequestListSerializer(serializers.ModelSerializer):
    """Serializer for listing merchant registration requests (admin view)."""
    from .models import MerchantRegistrationRequest
    
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)
    
    class Meta:
        from .models import MerchantRegistrationRequest
        model = MerchantRegistrationRequest
        exclude = ['password_hash']
        read_only_fields = ['id', 'created_at', 'updated_at', 'reviewed_by', 'reviewed_at', 
                          'created_user', 'created_merchant_id']


class MerchantRegistrationRequestDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for merchant registration request."""
    from .models import MerchantRegistrationRequest
    
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)
    
    class Meta:
        from .models import MerchantRegistrationRequest
        model = MerchantRegistrationRequest
        exclude = ['password_hash']
        read_only_fields = ['id', 'created_at', 'updated_at', 'reviewed_by', 'reviewed_at', 
                          'created_user', 'created_merchant_id']


class ApproveRegistrationSerializer(serializers.Serializer):
    """Serializer for approving a merchant registration."""
    pass


class RejectRegistrationSerializer(serializers.Serializer):
    """Serializer for rejecting a merchant registration."""
    reason = serializers.CharField(required=True)


# ============================================
# DOCUMENT REQUEST SERIALIZERS
# ============================================

class RequestDocumentsSerializer(serializers.Serializer):
    """Serializer for admin requesting additional documents."""
    message = serializers.CharField(required=True, help_text="Message détaillant les documents/informations manquants")
    documents_requested = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
        help_text="Liste des documents spécifiques demandés"
    )


class RegistrationDocumentSerializer(serializers.ModelSerializer):
    """Serializer for uploaded documents."""
    from .models import RegistrationDocument
    
    class Meta:
        from .models import RegistrationDocument
        model = RegistrationDocument
        fields = ['id', 'name', 'file_path', 'file_type', 'file_size', 'uploaded_at']
        read_only_fields = ['id', 'uploaded_at']


class RegistrationDocumentRequestSerializer(serializers.ModelSerializer):
    """Serializer for document requests."""
    from .models import RegistrationDocumentRequest
    
    requested_by_name = serializers.CharField(source='requested_by.full_name', read_only=True)
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)
    documents = RegistrationDocumentSerializer(many=True, read_only=True)
    
    class Meta:
        from .models import RegistrationDocumentRequest
        model = RegistrationDocumentRequest
        fields = [
            'id', 'message', 'documents_requested', 'status',
            'requested_by', 'requested_by_name',
            'merchant_response', 'submitted_at',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at', 'review_notes',
            'documents', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'requested_by', 'status', 'submitted_at', 
                          'reviewed_by', 'reviewed_at', 'created_at', 'updated_at']


class RegistrationDocumentRequestPublicSerializer(serializers.ModelSerializer):
    """Public serializer for merchant to view document request (via token)."""
    from .models import RegistrationDocumentRequest
    
    company_name = serializers.CharField(source='registration.company_name', read_only=True)
    merchant_email = serializers.CharField(source='registration.email', read_only=True)
    merchant_name = serializers.SerializerMethodField()
    documents = RegistrationDocumentSerializer(many=True, read_only=True)
    
    class Meta:
        from .models import RegistrationDocumentRequest
        model = RegistrationDocumentRequest
        fields = [
            'id', 'company_name', 'merchant_email', 'merchant_name',
            'message', 'documents_requested', 'status',
            'merchant_response', 'submitted_at', 'documents',
            'created_at'
        ]
        read_only_fields = ['id', 'company_name', 'merchant_email', 'merchant_name',
                          'message', 'documents_requested', 'status', 
                          'submitted_at', 'created_at']
    
    def get_merchant_name(self, obj):
        return f"{obj.registration.first_name} {obj.registration.last_name}"


class SubmitDocumentsSerializer(serializers.Serializer):
    """Serializer for merchant submitting documents."""
    response_message = serializers.CharField(required=True, help_text="Message de réponse du commerçant")
    documents = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list,
        help_text="Liste des documents uploadés"
    )


class ReviewDocumentsSerializer(serializers.Serializer):
    """Serializer for admin reviewing submitted documents."""
    action = serializers.ChoiceField(
        choices=['accept', 'request_more', 'reject'],
        required=True,
        help_text="Action à effectuer: accept, request_more, reject"
    )
    notes = serializers.CharField(required=False, allow_blank=True, help_text="Notes de révision")
    message = serializers.CharField(required=False, allow_blank=True, help_text="Message pour nouvelle demande (si request_more)")
    documents_requested = serializers.ListField(
        child=serializers.CharField(),
        required=False,
        default=list,
        help_text="Nouveaux documents demandés (si request_more)"
    )
    rejection_reason = serializers.CharField(required=False, allow_blank=True, help_text="Raison du rejet (si reject)")


# ============================================
# COMMENT/HISTORY SERIALIZERS
# ============================================

class RegistrationCommentSerializer(serializers.ModelSerializer):
    """Serializer for registration comments/history."""
    from .models import RegistrationComment
    
    author_display_name = serializers.SerializerMethodField()
    
    class Meta:
        from .models import RegistrationComment
        model = RegistrationComment
        fields = [
            'id', 'comment_type', 'author', 'author_name', 'author_display_name',
            'content', 'document_request', 'old_status', 'new_status',
            'is_internal', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_author_display_name(self, obj):
        if obj.author:
            return obj.author.full_name
        return obj.author_name or 'Système'


class AddCommentSerializer(serializers.Serializer):
    """Serializer for adding a comment to a registration."""
    content = serializers.CharField(required=True)
    is_internal = serializers.BooleanField(default=False, help_text="Visible uniquement par les admins")


# ============================================
# NOTIFICATION SERIALIZERS
# ============================================

class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications (old model - kept for backward compatibility)."""
    from .models import Notification
    
    class Meta:
        from .models import Notification
        model = Notification
        fields = [
            'id', 'notification_type', 'title', 'message',
            'related_object_type', 'related_object_id', 'action_url',
            'is_read', 'read_at', 'created_at'
        ]
        read_only_fields = ['id', 'notification_type', 'title', 'message',
                          'related_object_type', 'related_object_id', 'action_url',
                          'created_at']


# ============================================
# ENHANCED REGISTRATION DETAIL SERIALIZER
# ============================================

class MerchantRegistrationRequestFullDetailSerializer(serializers.ModelSerializer):
    """Full detailed serializer with comments and document requests."""
    from .models import MerchantRegistrationRequest
    
    reviewed_by_name = serializers.CharField(source='reviewed_by.full_name', read_only=True)
    comments = RegistrationCommentSerializer(many=True, read_only=True)
    document_requests = RegistrationDocumentRequestSerializer(many=True, read_only=True)
    pending_document_request = serializers.SerializerMethodField()
    
    class Meta:
        from .models import MerchantRegistrationRequest
        model = MerchantRegistrationRequest
        exclude = ['password_hash']
        read_only_fields = ['id', 'created_at', 'updated_at', 'reviewed_by', 'reviewed_at', 
                          'created_user', 'created_merchant_id']
    
    def get_pending_document_request(self, obj):
        """Get the current pending document request if any."""
        from .models import DocumentRequestStatus
        pending = obj.document_requests.filter(status=DocumentRequestStatus.PENDING).first()
        if pending:
            return RegistrationDocumentRequestSerializer(pending).data
        submitted = obj.document_requests.filter(status=DocumentRequestStatus.SUBMITTED).first()
        if submitted:
            return RegistrationDocumentRequestSerializer(submitted).data
        return None
