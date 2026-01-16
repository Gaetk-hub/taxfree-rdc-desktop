"""
Serializers for customs app.
"""
from rest_framework import serializers
from django.utils import timezone
import json

from apps.taxfree.models import TaxFreeForm, TaxFreeFormStatus
from apps.taxfree.serializers import TaxFreeFormSerializer
from .models import PointOfExit, CustomsValidation, OfflineSyncBatch, ValidationDecision, RefusalReason


class PointOfExitSerializer(serializers.ModelSerializer):
    """Serializer for points of exit."""
    
    agents_count = serializers.IntegerField(read_only=True)
    validations_today = serializers.IntegerField(read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = PointOfExit
        fields = [
            'id', 'code', 'name', 'type', 'type_display',
            'address', 'city', 'province', 'country',
            'latitude', 'longitude',
            'phone', 'email', 'manager_name',
            'operating_hours', 'is_24h', 'daily_capacity',
            'is_active', 'agents_count', 'validations_today',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'agents_count', 'validations_today', 'created_at', 'updated_at']


class CustomsValidationSerializer(serializers.ModelSerializer):
    """Serializer for customs validations."""
    
    form_number = serializers.CharField(source='form.form_number', read_only=True)
    agent_name = serializers.CharField(source='agent.full_name', read_only=True)
    point_of_exit_name = serializers.CharField(source='point_of_exit.name', read_only=True)
    decision_display = serializers.CharField(source='get_decision_display', read_only=True)
    refusal_reason_display = serializers.CharField(source='get_refusal_reason_display', read_only=True, allow_null=True)
    
    class Meta:
        model = CustomsValidation
        fields = [
            'id', 'form', 'form_number', 'agent', 'agent_name',
            'point_of_exit', 'point_of_exit_name',
            'decision', 'decision_display', 'refusal_reason', 'refusal_reason_display', 'refusal_details',
            'physical_control_done', 'control_notes',
            'is_offline', 'offline_batch_id', 'offline_timestamp',
            'decided_at', 'created_at'
        ]
        read_only_fields = ['id', 'agent', 'created_at']


class ScanQRSerializer(serializers.Serializer):
    """Serializer for scanning QR codes."""
    
    qr_string = serializers.CharField()

    def validate_qr_string(self, value):
        try:
            if '|' not in value:
                raise serializers.ValidationError('Invalid QR format')
            payload_str, signature = value.rsplit('|', 1)
            payload = json.loads(payload_str)
            
            form_id = payload.get('form_id')
            if not form_id:
                raise serializers.ValidationError('Missing form ID in QR')
            
            try:
                form = TaxFreeForm.objects.get(id=form_id)
            except TaxFreeForm.DoesNotExist:
                raise serializers.ValidationError('Form not found')
            
            # Verify signature
            if not form.verify_qr_signature(value):
                raise serializers.ValidationError('Invalid QR signature')
            
            return {'form': form, 'payload': payload}
        except json.JSONDecodeError:
            raise serializers.ValidationError('Invalid QR payload')


class ScanResultSerializer(serializers.Serializer):
    """Serializer for scan result."""
    
    form = TaxFreeFormSerializer()
    can_validate = serializers.BooleanField()
    validation_errors = serializers.ListField(child=serializers.CharField())
    warnings = serializers.ListField(child=serializers.CharField())


class DecisionSerializer(serializers.Serializer):
    """Serializer for customs decision."""
    
    decision = serializers.ChoiceField(choices=ValidationDecision.choices)
    refusal_reason = serializers.ChoiceField(choices=RefusalReason.choices, required=False, allow_blank=True)
    refusal_details = serializers.CharField(required=False, allow_blank=True)
    physical_control_done = serializers.BooleanField(default=False)
    control_notes = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if attrs['decision'] == ValidationDecision.REFUSED:
            if not attrs.get('refusal_reason'):
                raise serializers.ValidationError({
                    'refusal_reason': 'Refusal reason is required when refusing'
                })
        return attrs


class OfflineValidationSerializer(serializers.Serializer):
    """Serializer for a single offline validation."""
    
    form_id = serializers.UUIDField()
    decision = serializers.ChoiceField(choices=ValidationDecision.choices)
    refusal_reason = serializers.ChoiceField(choices=RefusalReason.choices, required=False, allow_blank=True)
    refusal_details = serializers.CharField(required=False, allow_blank=True)
    physical_control_done = serializers.BooleanField(default=False)
    control_notes = serializers.CharField(required=False, allow_blank=True)
    offline_timestamp = serializers.DateTimeField()


class OfflineSyncSerializer(serializers.Serializer):
    """Serializer for offline sync batch."""
    
    batch_id = serializers.CharField()
    validations = OfflineValidationSerializer(many=True)


class OfflineSyncResultSerializer(serializers.Serializer):
    """Serializer for offline sync result."""
    
    batch_id = serializers.CharField()
    total = serializers.IntegerField()
    successful = serializers.IntegerField()
    failed = serializers.IntegerField()
    errors = serializers.ListField(child=serializers.DictField())


# ============== ADMIN SERIALIZERS FOR CUSTOMS AGENTS ==============

class CustomsAgentSerializer(serializers.ModelSerializer):
    """Serializer for customs agents (User with CUSTOMS_AGENT role)."""
    from apps.accounts.models import User
    
    point_of_exit_name = serializers.SerializerMethodField()
    point_of_exit_code = serializers.SerializerMethodField()
    full_name = serializers.CharField(read_only=True)
    
    # From invitation
    matricule = serializers.SerializerMethodField()
    grade = serializers.SerializerMethodField()
    department = serializers.SerializerMethodField()
    hire_date = serializers.SerializerMethodField()
    
    # Personal info from invitation
    date_of_birth = serializers.SerializerMethodField()
    place_of_birth = serializers.SerializerMethodField()
    nationality = serializers.SerializerMethodField()
    national_id = serializers.SerializerMethodField()
    
    # Address from invitation
    address = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    province = serializers.SerializerMethodField()
    
    # Emergency contact from invitation
    emergency_contact_name = serializers.SerializerMethodField()
    emergency_contact_phone = serializers.SerializerMethodField()
    emergency_contact_relation = serializers.SerializerMethodField()
    
    # Stats
    validations_count = serializers.SerializerMethodField()
    validations_today = serializers.SerializerMethodField()
    
    class Meta:
        from apps.accounts.models import User
        model = User
        fields = [
            'id', 'email', 'first_name', 'last_name', 'full_name',
            'phone', 'is_active', 'point_of_exit_id',
            'point_of_exit_name', 'point_of_exit_code',
            'matricule', 'grade', 'department', 'hire_date',
            'date_of_birth', 'place_of_birth', 'nationality', 'national_id',
            'address', 'city', 'province',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relation',
            'validations_count', 'validations_today',
            'created_at', 'last_login'
        ]
        read_only_fields = ['id', 'created_at', 'last_login']
    
    def _get_invitation(self, obj):
        if hasattr(obj, 'customs_invitation') and obj.customs_invitation:
            return obj.customs_invitation
        return None
    
    def get_point_of_exit_name(self, obj):
        if obj.point_of_exit:
            return obj.point_of_exit.name
        return None
    
    def get_point_of_exit_code(self, obj):
        if obj.point_of_exit:
            return obj.point_of_exit.code
        return None
    
    def get_matricule(self, obj):
        inv = self._get_invitation(obj)
        return inv.matricule if inv else None
    
    def get_grade(self, obj):
        inv = self._get_invitation(obj)
        return inv.grade if inv else None
    
    def get_department(self, obj):
        inv = self._get_invitation(obj)
        return inv.department if inv else None
    
    def get_hire_date(self, obj):
        inv = self._get_invitation(obj)
        return inv.hire_date if inv else None
    
    def get_date_of_birth(self, obj):
        inv = self._get_invitation(obj)
        return inv.date_of_birth if inv else None
    
    def get_place_of_birth(self, obj):
        inv = self._get_invitation(obj)
        return inv.place_of_birth if inv else None
    
    def get_nationality(self, obj):
        inv = self._get_invitation(obj)
        return inv.nationality if inv else None
    
    def get_national_id(self, obj):
        inv = self._get_invitation(obj)
        return inv.national_id if inv else None
    
    def get_address(self, obj):
        inv = self._get_invitation(obj)
        return inv.address if inv else None
    
    def get_city(self, obj):
        inv = self._get_invitation(obj)
        return inv.city if inv else None
    
    def get_province(self, obj):
        inv = self._get_invitation(obj)
        return inv.province if inv else None
    
    def get_emergency_contact_name(self, obj):
        inv = self._get_invitation(obj)
        return inv.emergency_contact_name if inv else None
    
    def get_emergency_contact_phone(self, obj):
        inv = self._get_invitation(obj)
        return inv.emergency_contact_phone if inv else None
    
    def get_emergency_contact_relation(self, obj):
        inv = self._get_invitation(obj)
        return inv.emergency_contact_relation if inv else None
    
    def get_validations_count(self, obj):
        from .models import CustomsValidation
        return CustomsValidation.objects.filter(agent=obj).count()
    
    def get_validations_today(self, obj):
        from .models import CustomsValidation
        from django.utils import timezone
        today = timezone.now().date()
        return CustomsValidation.objects.filter(agent=obj, decided_at__date=today).count()


class CustomsAgentInvitationSerializer(serializers.ModelSerializer):
    """Serializer for customs agent invitations."""
    from apps.accounts.models import CustomsAgentInvitation
    
    point_of_exit_name = serializers.CharField(source='point_of_exit.name', read_only=True)
    point_of_exit_code = serializers.CharField(source='point_of_exit.code', read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    is_expired = serializers.BooleanField(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)
    
    class Meta:
        from apps.accounts.models import CustomsAgentInvitation
        model = CustomsAgentInvitation
        fields = [
            'id', 'email', 'first_name', 'last_name', 'phone',
            'matricule', 'grade',
            'point_of_exit', 'point_of_exit_name', 'point_of_exit_code',
            'status', 'is_expired', 'is_valid',
            'created_at', 'expires_at', 'activated_at',
            'created_by', 'created_by_name', 'user'
        ]
        read_only_fields = [
            'id', 'invitation_token', 'status', 'created_at', 
            'expires_at', 'activated_at', 'created_by', 'user'
        ]


class CreateAgentInvitationSerializer(serializers.Serializer):
    """Serializer for creating a new agent invitation."""
    
    # Basic info
    email = serializers.EmailField()
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    
    # Personal identification
    date_of_birth = serializers.DateField(required=False, allow_null=True)
    place_of_birth = serializers.CharField(max_length=100, required=False, allow_blank=True)
    nationality = serializers.CharField(max_length=50, required=False, allow_blank=True)
    national_id = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    # Address
    address = serializers.CharField(max_length=255, required=False, allow_blank=True)
    city = serializers.CharField(max_length=100, required=False, allow_blank=True)
    province = serializers.CharField(max_length=100, required=False, allow_blank=True)
    
    # Emergency contact
    emergency_contact_name = serializers.CharField(max_length=150, required=False, allow_blank=True)
    emergency_contact_phone = serializers.CharField(max_length=20, required=False, allow_blank=True)
    emergency_contact_relation = serializers.CharField(max_length=50, required=False, allow_blank=True)
    
    # Professional info
    matricule = serializers.CharField(max_length=50)
    grade = serializers.CharField(max_length=100, required=False, allow_blank=True)
    department = serializers.CharField(max_length=100, required=False, allow_blank=True)
    hire_date = serializers.DateField(required=False, allow_null=True)
    point_of_exit = serializers.UUIDField()
    
    def validate_email(self, value):
        from apps.accounts.models import User, CustomsAgentInvitation
        # Check if email already exists as user
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Un utilisateur avec cet email existe déjà")
        # Check if pending invitation exists
        if CustomsAgentInvitation.objects.filter(email=value, status='PENDING').exists():
            raise serializers.ValidationError("Une invitation en attente existe déjà pour cet email")
        return value
    
    def validate_matricule(self, value):
        from apps.accounts.models import CustomsAgentInvitation
        if CustomsAgentInvitation.objects.filter(matricule=value).exists():
            raise serializers.ValidationError("Ce matricule est déjà utilisé")
        return value
    
    def validate_point_of_exit(self, value):
        if not PointOfExit.objects.filter(id=value, is_active=True).exists():
            raise serializers.ValidationError("Frontière invalide ou inactive")
        return value


class ActivateAgentInvitationSerializer(serializers.Serializer):
    """Serializer for activating an agent invitation."""
    
    token = serializers.CharField()
    password = serializers.CharField(min_length=8, write_only=True)
    password_confirm = serializers.CharField(min_length=8, write_only=True)
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError({
                'password_confirm': 'Les mots de passe ne correspondent pas'
            })
        return attrs
    
    def validate_token(self, value):
        from apps.accounts.models import CustomsAgentInvitation
        try:
            invitation = CustomsAgentInvitation.objects.get(invitation_token=value)
            if not invitation.is_valid:
                raise serializers.ValidationError("Cette invitation n'est plus valide ou a expiré")
            return value
        except CustomsAgentInvitation.DoesNotExist:
            raise serializers.ValidationError("Invitation invalide")


# ============================================
# AGENT SHIFT SERIALIZERS
# ============================================

class AgentShiftSerializer(serializers.ModelSerializer):
    """Serializer for agent shifts."""
    from .models import AgentShift
    
    agent_name = serializers.CharField(source='agent.full_name', read_only=True)
    point_of_exit_name = serializers.CharField(source='point_of_exit.name', read_only=True)
    point_of_exit_code = serializers.CharField(source='point_of_exit.code', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    duration_hours = serializers.FloatField(read_only=True)
    duration_formatted = serializers.SerializerMethodField()
    validations_count = serializers.SerializerMethodField()
    validated_count = serializers.SerializerMethodField()
    refused_count = serializers.SerializerMethodField()
    total_amount_validated = serializers.SerializerMethodField()
    
    class Meta:
        from .models import AgentShift
        model = AgentShift
        fields = [
            'id', 'agent', 'agent_name', 'point_of_exit', 'point_of_exit_name', 'point_of_exit_code',
            'started_at', 'ended_at', 'status', 'status_display',
            'total_pause_duration', 'duration_hours', 'duration_formatted',
            'validations_count', 'validated_count', 'refused_count', 'total_amount_validated',
            'notes', 'end_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'agent', 'point_of_exit', 'started_at', 'ended_at',
            'total_pause_duration', 'created_at', 'updated_at'
        ]
    
    def get_duration_formatted(self, obj):
        """Format duration as HH:MM."""
        duration = obj.duration
        total_seconds = int(duration.total_seconds())
        hours = total_seconds // 3600
        minutes = (total_seconds % 3600) // 60
        return f"{hours}h {minutes:02d}min"
    
    def _get_shift_validations(self, obj):
        """Get validations made during this shift."""
        from .models import CustomsValidation
        end_time = obj.ended_at or timezone.now()
        return CustomsValidation.objects.filter(
            agent=obj.agent,
            decided_at__gte=obj.started_at,
            decided_at__lte=end_time
        )
    
    def get_validations_count(self, obj):
        """Count total validations during this shift."""
        return self._get_shift_validations(obj).count()
    
    def get_validated_count(self, obj):
        """Count validated (approved) during this shift."""
        return self._get_shift_validations(obj).filter(decision='VALIDATED').count()
    
    def get_refused_count(self, obj):
        """Count refused during this shift."""
        return self._get_shift_validations(obj).filter(decision='REFUSED').count()
    
    def get_total_amount_validated(self, obj):
        """Sum of refund amounts validated during this shift."""
        from django.db.models import Sum
        total = self._get_shift_validations(obj).filter(decision='VALIDATED').aggregate(
            total=Sum('form__refund_amount')
        )['total'] or 0
        return float(total)


class StartShiftSerializer(serializers.Serializer):
    """Serializer for starting a shift."""
    
    notes = serializers.CharField(required=False, allow_blank=True, default='')
    device_info = serializers.JSONField(required=False, default=dict)


class EndShiftSerializer(serializers.Serializer):
    """Serializer for ending a shift."""
    
    notes = serializers.CharField(required=False, allow_blank=True, default='')
