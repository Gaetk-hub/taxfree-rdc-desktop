"""
Admin serializers for user management and permissions.
"""
from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password

from .admin_models import (
    UserPermission, PermissionPreset, SystemUserInvitation,
    PermissionModule, PermissionAction, SystemUserInvitationStatus
)

User = get_user_model()


class UserPermissionSerializer(serializers.ModelSerializer):
    """Serializer for user permissions."""
    
    module_display = serializers.CharField(source='get_module_display', read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    granted_by_name = serializers.CharField(source='granted_by.full_name', read_only=True)
    
    class Meta:
        model = UserPermission
        fields = [
            'id', 'user', 'module', 'module_display', 
            'action', 'action_display',
            'granted_by', 'granted_by_name', 'granted_at'
        ]
        read_only_fields = ['id', 'granted_at']


class PermissionPresetSerializer(serializers.ModelSerializer):
    """Serializer for permission presets."""
    
    permissions_count = serializers.SerializerMethodField()
    
    class Meta:
        model = PermissionPreset
        fields = [
            'id', 'name', 'description', 'permissions', 
            'permissions_count', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_permissions_count(self, obj):
        return len(obj.permissions) if obj.permissions else 0


class AdminUserListSerializer(serializers.ModelSerializer):
    """Enhanced user list serializer for admin with full context."""
    
    full_name = serializers.ReadOnlyField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    # Context info
    merchant_name = serializers.SerializerMethodField()
    outlet_name = serializers.SerializerMethodField()
    point_of_exit_name = serializers.SerializerMethodField()
    
    # User type classification
    user_type = serializers.SerializerMethodField()
    
    # Permissions count
    permissions_count = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'role_display', 'phone', 'is_active',
            'user_type', 'merchant_id', 'merchant_name',
            'outlet_id', 'outlet_name',
            'point_of_exit_id', 'point_of_exit_name',
            'agent_code', 'permissions_count',
            'date_joined', 'last_login', 'created_at'
        ]
    
    def get_merchant_name(self, obj):
        if obj.merchant:
            return obj.merchant.name
        return None
    
    def get_outlet_name(self, obj):
        if obj.outlet:
            return obj.outlet.name
        return None
    
    def get_point_of_exit_name(self, obj):
        if obj.point_of_exit:
            return obj.point_of_exit.name
        return None
    
    def get_user_type(self, obj):
        """Classify user type for filtering."""
        if obj.role in ['ADMIN', 'AUDITOR', 'OPERATOR']:
            return 'SYSTEM'
        elif obj.role in ['MERCHANT', 'MERCHANT_EMPLOYEE']:
            return 'MERCHANT'
        elif obj.role == 'CUSTOMS_AGENT':
            return 'CUSTOMS'
        elif obj.role == 'TRAVELER':
            return 'TRAVELER'
        return 'OTHER'
    
    def get_permissions_count(self, obj):
        return obj.custom_permissions.count() if hasattr(obj, 'custom_permissions') else 0


class AdminUserDetailSerializer(serializers.ModelSerializer):
    """Detailed user serializer for admin with permissions."""
    
    full_name = serializers.ReadOnlyField()
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    
    # Context info
    merchant_info = serializers.SerializerMethodField()
    outlet_info = serializers.SerializerMethodField()
    point_of_exit_info = serializers.SerializerMethodField()
    
    # User type
    user_type = serializers.SerializerMethodField()
    
    # Permissions
    permissions = serializers.SerializerMethodField()
    
    # Invitation info
    invitation_info = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'role', 'role_display', 'phone', 'is_active',
            'user_type', 'merchant_info', 'outlet_info', 'point_of_exit_info',
            'agent_code', 'permissions', 'invitation_info',
            'date_joined', 'last_login', 'created_at', 'updated_at'
        ]
    
    def get_merchant_info(self, obj):
        if obj.merchant:
            return {
                'id': str(obj.merchant.id),
                'name': obj.merchant.name,
                'trade_name': obj.merchant.trade_name,
                'status': obj.merchant.status,
            }
        return None
    
    def get_outlet_info(self, obj):
        if obj.outlet:
            return {
                'id': str(obj.outlet.id),
                'name': obj.outlet.name,
                'code': obj.outlet.code,
                'city': obj.outlet.city,
            }
        return None
    
    def get_point_of_exit_info(self, obj):
        if obj.point_of_exit:
            return {
                'id': str(obj.point_of_exit.id),
                'name': obj.point_of_exit.name,
                'code': obj.point_of_exit.code,
                'type': obj.point_of_exit.type,
                'city': obj.point_of_exit.city,
            }
        return None
    
    def get_user_type(self, obj):
        if obj.role in ['ADMIN', 'AUDITOR', 'OPERATOR']:
            return 'SYSTEM'
        elif obj.role in ['MERCHANT', 'MERCHANT_EMPLOYEE']:
            return 'MERCHANT'
        elif obj.role == 'CUSTOMS_AGENT':
            return 'CUSTOMS'
        elif obj.role == 'TRAVELER':
            return 'TRAVELER'
        return 'OTHER'
    
    def get_permissions(self, obj):
        permissions = obj.custom_permissions.all()
        return UserPermissionSerializer(permissions, many=True).data
    
    def get_invitation_info(self, obj):
        # Check for system invitation
        if hasattr(obj, 'system_invitation') and obj.system_invitation:
            inv = obj.system_invitation
            return {
                'type': 'system',
                'invited_by': inv.created_by.full_name if inv.created_by else None,
                'invited_at': inv.created_at,
                'activated_at': inv.activated_at,
            }
        # Check for customs invitation
        if hasattr(obj, 'customs_invitation') and obj.customs_invitation:
            inv = obj.customs_invitation
            return {
                'type': 'customs',
                'invited_by': inv.created_by.full_name if inv.created_by else None,
                'invited_at': inv.created_at,
                'activated_at': inv.activated_at,
            }
        # Check for merchant invitation
        if hasattr(obj, 'invitation') and obj.invitation:
            inv = obj.invitation
            return {
                'type': 'merchant',
                'invited_by': inv.invited_by.full_name if inv.invited_by else None,
                'invited_at': inv.created_at,
                'activated_at': inv.accepted_at,
            }
        return None


class SystemUserInvitationSerializer(serializers.ModelSerializer):
    """Serializer for system user invitations."""
    
    full_name = serializers.ReadOnlyField()
    role_display = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    preset_name = serializers.CharField(source='permission_preset.name', read_only=True)
    is_valid = serializers.ReadOnlyField()
    is_expired = serializers.ReadOnlyField()
    
    class Meta:
        model = SystemUserInvitation
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name', 'phone',
            'role', 'role_display', 'initial_permissions', 'permission_preset', 'preset_name',
            'message', 'status', 'status_display', 'is_valid', 'is_expired',
            'created_by', 'created_by_name', 'created_at', 'expires_at', 'activated_at',
            'user'
        ]
        read_only_fields = [
            'id', 'invitation_token', 'status', 'created_at', 
            'activated_at', 'user', 'created_by'
        ]
    
    def get_role_display(self, obj):
        role_labels = {
            'ADMIN': 'Administrateur',
            'AUDITOR': 'Auditeur',
            'OPERATOR': 'Opérateur',
        }
        return role_labels.get(obj.role, obj.role)


class CreateSystemUserInvitationSerializer(serializers.Serializer):
    """Serializer for creating a system user invitation."""
    
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=[
        ('ADMIN', 'Administrateur'),
        ('AUDITOR', 'Auditeur'),
        ('OPERATOR', 'Opérateur'),
    ])
    permission_preset_id = serializers.UUIDField(required=False, allow_null=True)
    point_of_exit_id = serializers.UUIDField(required=False, allow_null=True)
    initial_permissions = serializers.ListField(
        child=serializers.DictField(),
        required=False,
        default=list
    )
    message = serializers.CharField(required=False, allow_blank=True)
    
    def validate_email(self, value):
        # Check if user already exists
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Un utilisateur avec cet email existe déjà.')
        # Check for pending invitation
        if SystemUserInvitation.objects.filter(
            email=value, 
            status=SystemUserInvitationStatus.PENDING
        ).exists():
            raise serializers.ValidationError('Une invitation en attente existe déjà pour cet email.')
        return value
    
    def validate_permission_preset_id(self, value):
        if value:
            if not PermissionPreset.objects.filter(id=value, is_active=True).exists():
                raise serializers.ValidationError('Preset de permissions invalide.')
        return value
    
    def validate_point_of_exit_id(self, value):
        if value:
            from apps.customs.models import PointOfExit
            if not PointOfExit.objects.filter(id=value, is_active=True).exists():
                raise serializers.ValidationError('Point de sortie invalide.')
        return value
    
    def validate(self, data):
        # For OPERATOR role, point_of_exit_id is required
        if data.get('role') == 'OPERATOR' and not data.get('point_of_exit_id'):
            raise serializers.ValidationError({
                'point_of_exit_id': 'Le point de sortie est obligatoire pour les opérateurs.'
            })
        return data
    
    def create(self, validated_data):
        preset_id = validated_data.pop('permission_preset_id', None)
        point_of_exit_id = validated_data.pop('point_of_exit_id', None)
        preset = None
        if preset_id:
            preset = PermissionPreset.objects.get(id=preset_id)
        
        invitation = SystemUserInvitation.objects.create(
            email=validated_data['email'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone', ''),
            role=validated_data['role'],
            permission_preset=preset,
            point_of_exit_id=point_of_exit_id,
            initial_permissions=validated_data.get('initial_permissions', []),
            message=validated_data.get('message', ''),
            created_by=self.context['request'].user
        )
        return invitation


class ActivateSystemUserSerializer(serializers.Serializer):
    """Serializer for activating a system user invitation."""
    
    token = serializers.CharField()
    password = serializers.CharField(validators=[validate_password])
    password_confirm = serializers.CharField()
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Les mots de passe ne correspondent pas.'
            })
        return attrs
    
    def validate_token(self, value):
        try:
            invitation = SystemUserInvitation.objects.get(invitation_token=value)
        except SystemUserInvitation.DoesNotExist:
            raise serializers.ValidationError('Lien d\'invitation invalide.')
        
        if not invitation.is_valid:
            if invitation.is_expired:
                raise serializers.ValidationError('Cette invitation a expiré.')
            raise serializers.ValidationError('Cette invitation n\'est plus valide.')
        
        return value


class AssignPermissionsSerializer(serializers.Serializer):
    """Serializer for assigning permissions to a user."""
    
    permissions = serializers.ListField(
        child=serializers.DictField(),
        help_text='Liste des permissions: [{"module": "...", "action": "..."}]'
    )
    
    def validate_permissions(self, value):
        valid_modules = [m[0] for m in PermissionModule.choices]
        valid_actions = [a[0] for a in PermissionAction.choices]
        
        for perm in value:
            if 'module' not in perm or 'action' not in perm:
                raise serializers.ValidationError('Chaque permission doit avoir module et action.')
            if perm['module'] not in valid_modules:
                raise serializers.ValidationError(f"Module invalide: {perm['module']}")
            if perm['action'] not in valid_actions:
                raise serializers.ValidationError(f"Action invalide: {perm['action']}")
        
        return value


class ApplyPresetSerializer(serializers.Serializer):
    """Serializer for applying a permission preset to a user."""
    
    preset_id = serializers.UUIDField()
    replace = serializers.BooleanField(
        default=False,
        help_text='Si true, remplace toutes les permissions existantes'
    )
    
    def validate_preset_id(self, value):
        if not PermissionPreset.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError('Preset de permissions invalide.')
        return value


class UserStatsSerializer(serializers.Serializer):
    """Serializer for user statistics."""
    
    total = serializers.IntegerField()
    active = serializers.IntegerField()
    inactive = serializers.IntegerField()
    by_role = serializers.DictField()
    by_type = serializers.DictField()
    recent_signups = serializers.IntegerField()
    pending_invitations = serializers.IntegerField()
