"""
Serializers for merchants app.
"""
from rest_framework import serializers
from django.utils import timezone
from .models import Merchant, Outlet, POSDevice, MerchantStatus


class POSDeviceSerializer(serializers.ModelSerializer):
    """Serializer for POS devices."""
    
    api_key = serializers.CharField(read_only=True)
    
    class Meta:
        model = POSDevice
        fields = [
            'id', 'outlet', 'name', 'device_id', 'api_key', 
            'api_key_prefix', 'is_active', 'last_seen', 'created_at'
        ]
        read_only_fields = ['id', 'api_key', 'api_key_prefix', 'last_seen', 'created_at']


class POSDeviceCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating POS devices."""
    
    class Meta:
        model = POSDevice
        fields = ['outlet', 'name', 'device_id']


class OutletSerializer(serializers.ModelSerializer):
    """Serializer for outlets."""
    
    pos_devices_count = serializers.IntegerField(source='pos_devices.count', read_only=True)
    
    class Meta:
        model = Outlet
        fields = [
            'id', 'merchant', 'name', 'code', 'address_line1', 'address_line2',
            'city', 'province', 'phone', 'email', 'is_active', 
            'pos_devices_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class OutletDetailSerializer(OutletSerializer):
    """Detailed outlet serializer with POS devices."""
    
    pos_devices = POSDeviceSerializer(many=True, read_only=True)
    
    class Meta(OutletSerializer.Meta):
        fields = OutletSerializer.Meta.fields + ['pos_devices']


class MerchantSerializer(serializers.ModelSerializer):
    """Serializer for merchants."""
    
    outlets_count = serializers.IntegerField(source='outlets.count', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Merchant
        fields = [
            'id', 'name', 'trade_name', 'registration_number', 'tax_id', 'vat_number',
            'address_line1', 'address_line2', 'city', 'province', 'postal_code', 'country',
            'contact_name', 'contact_email', 'contact_phone',
            'bank_name', 'bank_account_number', 'bank_swift_code',
            'mobile_money_number', 'mobile_money_provider',
            'status', 'status_display', 'status_reason',
            'submitted_at', 'approved_at', 'outlets_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'status', 'status_reason', 'submitted_at', 
            'approved_at', 'created_at', 'updated_at'
        ]


class MerchantDetailSerializer(MerchantSerializer):
    """Detailed merchant serializer with outlets."""
    
    outlets = OutletSerializer(many=True, read_only=True)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True)
    
    class Meta(MerchantSerializer.Meta):
        fields = MerchantSerializer.Meta.fields + ['outlets', 'approved_by_name']


class MerchantCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating merchants."""
    
    class Meta:
        model = Merchant
        fields = [
            'name', 'trade_name', 'registration_number', 'tax_id', 'vat_number',
            'address_line1', 'address_line2', 'city', 'province', 'postal_code', 'country',
            'contact_name', 'contact_email', 'contact_phone',
            'bank_name', 'bank_account_number', 'bank_swift_code',
            'mobile_money_number', 'mobile_money_provider'
        ]


class MerchantSubmitSerializer(serializers.Serializer):
    """Serializer for submitting merchant for review."""
    pass


class MerchantApproveSerializer(serializers.Serializer):
    """Serializer for approving merchant."""
    pass


class MerchantRejectSerializer(serializers.Serializer):
    """Serializer for rejecting merchant."""
    reason = serializers.CharField(required=True)


class MerchantSuspendSerializer(serializers.Serializer):
    """Serializer for suspending merchant."""
    reason = serializers.CharField(required=True)


# ============================================
# MERCHANT USER MANAGEMENT SERIALIZERS
# ============================================

class MerchantUserSerializer(serializers.ModelSerializer):
    """Serializer for merchant users (employees)."""
    from apps.accounts.models import User, UserRole
    
    outlet_name = serializers.CharField(source='outlet.name', read_only=True, allow_null=True)
    outlet_code = serializers.CharField(source='outlet.code', read_only=True, allow_null=True)
    role_display = serializers.CharField(source='get_role_display', read_only=True)
    full_name = serializers.ReadOnlyField()
    
    # Activity statistics
    total_forms_created = serializers.SerializerMethodField()
    total_sales_amount = serializers.SerializerMethodField()
    last_activity = serializers.SerializerMethodField()
    
    class Meta:
        from apps.accounts.models import User
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'role', 'role_display', 'outlet_id', 'outlet_name', 'outlet_code',
            'is_active', 'created_at', 'last_login',
            'total_forms_created', 'total_sales_amount', 'last_activity'
        ]
        read_only_fields = ['id', 'email', 'created_at', 'last_login']
    
    def get_total_forms_created(self, obj):
        """Get total tax free forms created by this user."""
        from apps.taxfree.models import TaxFreeForm
        # Try created_by first, then fall back to checking by merchant for admins
        count = TaxFreeForm.objects.filter(created_by_id=obj.id).count()
        if count == 0 and obj.is_merchant_admin() and obj.merchant_id:
            # For merchant admins, count all forms from their merchant
            count = TaxFreeForm.objects.filter(invoice__merchant_id=obj.merchant_id).count()
        return count
    
    def get_total_sales_amount(self, obj):
        """Get total sales amount from forms created by this user."""
        from apps.taxfree.models import TaxFreeForm
        from django.db.models import Sum
        # Try created_by first
        result = TaxFreeForm.objects.filter(created_by_id=obj.id).aggregate(
            total=Sum('invoice__total_amount')
        )
        total = result['total'] or 0
        if total == 0 and obj.is_merchant_admin() and obj.merchant_id:
            # For merchant admins, sum all forms from their merchant
            result = TaxFreeForm.objects.filter(invoice__merchant_id=obj.merchant_id).aggregate(
                total=Sum('invoice__total_amount')
            )
            total = result['total'] or 0
        return float(total)
    
    def get_last_activity(self, obj):
        """Get last activity timestamp."""
        from apps.audit.models import AuditLog
        last_log = AuditLog.objects.filter(actor_id=obj.id).order_by('-timestamp').first()
        return last_log.timestamp if last_log else obj.last_login


class MerchantUserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating merchant users."""
    from apps.accounts.models import User, UserRole
    
    class Meta:
        from apps.accounts.models import User
        model = User
        fields = ['first_name', 'last_name', 'phone', 'outlet_id', 'is_active']


class MerchantUserInviteSerializer(serializers.Serializer):
    """Serializer for inviting new merchant users."""
    from apps.accounts.models import UserRole
    
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    role = serializers.ChoiceField(choices=[
        ('MERCHANT', 'Admin Commerçant'),
        ('MERCHANT_EMPLOYEE', 'Employé'),
    ], default='MERCHANT_EMPLOYEE')
    outlet_id = serializers.UUIDField(required=False, allow_null=True)
    
    def validate(self, data):
        from apps.accounts.models import User, UserRole
        
        # Check if email already exists
        if User.objects.filter(email=data['email']).exists():
            raise serializers.ValidationError({
                'email': 'Un utilisateur avec cet email existe déjà.'
            })
        
        # Employees must have an outlet
        if data.get('role') == UserRole.MERCHANT_EMPLOYEE and not data.get('outlet_id'):
            raise serializers.ValidationError({
                'outlet_id': 'Un point de vente est requis pour les employés.'
            })
        
        return data


class MerchantInvitationSerializer(serializers.ModelSerializer):
    """Serializer for merchant user invitations."""
    outlet_name = serializers.CharField(source='outlet.name', read_only=True, allow_null=True)
    invited_by_name = serializers.CharField(source='invited_by.full_name', read_only=True)
    role_display = serializers.SerializerMethodField()
    
    class Meta:
        from apps.accounts.models import MerchantUserInvitation
        model = MerchantUserInvitation
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'role', 'role_display', 'outlet', 'outlet_name',
            'invited_by_name', 'is_accepted', 'expires_at', 'created_at'
        ]
        read_only_fields = ['id', 'invited_by_name', 'is_accepted', 'expires_at', 'created_at']
    
    def get_role_display(self, obj):
        return 'Admin Commerçant' if obj.role == 'MERCHANT' else 'Employé'


class OutletCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating outlets by merchant."""
    
    class Meta:
        model = Outlet
        fields = [
            'name', 'code', 'address_line1', 'address_line2',
            'city', 'province', 'phone', 'email'
        ]
    
    def validate_code(self, value):
        merchant = self.context.get('merchant')
        if merchant:
            queryset = Outlet.objects.filter(merchant=merchant, code=value)
            # Exclude current instance when updating
            if self.instance:
                queryset = queryset.exclude(pk=self.instance.pk)
            if queryset.exists():
                raise serializers.ValidationError('Ce code est déjà utilisé pour un autre point de vente.')
        return value
