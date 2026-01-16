"""
Serializers for taxfree app.
"""
from rest_framework import serializers
from django.utils import timezone
from datetime import timedelta
from decimal import Decimal

from apps.sales.serializers import SaleInvoiceSerializer
from .models import Traveler, TaxFreeForm, TaxFreeFormStatus


class TravelerSerializer(serializers.ModelSerializer):
    """Serializer for travelers."""
    
    full_name = serializers.ReadOnlyField()
    passport_display = serializers.SerializerMethodField()
    passport_number = serializers.SerializerMethodField()
    
    class Meta:
        model = Traveler
        fields = [
            'id', 'passport_number', 'passport_display', 'passport_country',
            'passport_issue_date', 'passport_expiry_date',
            'first_name', 'last_name', 'full_name', 'date_of_birth',
            'nationality', 'residence_country', 'residence_address',
            'email', 'phone', 'preferred_refund_method',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']

    def get_passport_display(self, obj):
        return f"***{obj.passport_number_last4}"
    
    def get_passport_number(self, obj):
        """Return full passport number if available, otherwise masked."""
        if obj.passport_number_full:
            return obj.passport_number_full
        return f"***{obj.passport_number_last4}"


class TravelerCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating travelers."""
    
    passport_number = serializers.CharField(write_only=True, max_length=50)
    
    class Meta:
        model = Traveler
        fields = [
            'passport_number', 'passport_country', 'passport_issue_date', 'passport_expiry_date',
            'first_name', 'last_name', 'date_of_birth',
            'nationality', 'residence_country', 'residence_address',
            'email', 'phone', 'preferred_refund_method', 'refund_details'
        ]

    def create(self, validated_data):
        passport_number = validated_data.pop('passport_number')
        traveler = Traveler(**validated_data)
        traveler.set_passport_number(passport_number)
        traveler.save()
        return traveler


class CancellationInfoSerializer(serializers.Serializer):
    """Serializer for cancellation details."""
    cancelled_at = serializers.DateTimeField()
    cancelled_by_name = serializers.CharField()
    cancelled_by_email = serializers.CharField()
    reason = serializers.CharField()


class TaxFreeFormSerializer(serializers.ModelSerializer):
    """Serializer for tax free forms."""
    
    traveler = TravelerSerializer(read_only=True)
    invoice_number = serializers.CharField(source='invoice.invoice_number', read_only=True)
    merchant_name = serializers.CharField(source='invoice.merchant.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    can_validate = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    cancellation_info = serializers.SerializerMethodField()
    validation = serializers.SerializerMethodField()
    refund = serializers.SerializerMethodField()
    
    class Meta:
        model = TaxFreeForm
        fields = [
            'id', 'form_number', 'invoice', 'invoice_number', 'merchant_name',
            'traveler', 'currency', 'eligible_amount', 'vat_amount',
            'refund_amount', 'operator_fee', 'status', 'status_display',
            'risk_score', 'risk_flags', 'requires_control',
            'issued_at', 'expires_at', 'validated_at',
            'is_expired', 'can_validate', 'can_cancel', 'cancellation_info',
            'validation', 'refund', 'created_by_name', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'form_number', 'status', 'risk_score', 'risk_flags',
            'issued_at', 'validated_at', 'created_at', 'updated_at'
        ]

    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.get_full_name() or obj.created_by.email
        return None
    
    def get_validation(self, obj):
        """Return validation details if form has been validated."""
        try:
            validation = obj.customs_validation
            return {
                'decided_at': validation.decided_at,
                'decision': validation.decision,
                'decision_display': validation.get_decision_display(),
                'agent_name': validation.agent.get_full_name() or validation.agent.email if validation.agent else None,
                'point_of_exit_name': validation.point_of_exit.name if validation.point_of_exit else None,
                'physical_control_done': validation.physical_control_done,
                'refusal_reason': validation.refusal_reason,
                'refusal_reason_display': validation.get_refusal_reason_display() if validation.refusal_reason else None,
                'refusal_details': validation.refusal_details,
            }
        except Exception:
            return None

    def get_is_expired(self, obj):
        return obj.expires_at < timezone.now() if obj.expires_at else False

    def get_can_validate(self, obj):
        return obj.can_be_validated()

    def get_can_cancel(self, obj):
        return obj.can_be_cancelled()
    
    def get_cancellation_info(self, obj):
        """Return cancellation details if form is cancelled."""
        if obj.status != TaxFreeFormStatus.CANCELLED or not obj.cancelled_at:
            return None
        return {
            'cancelled_at': obj.cancelled_at,
            'cancelled_by_name': obj.cancelled_by.get_full_name() if obj.cancelled_by else 'Système',
            'cancelled_by_email': obj.cancelled_by.email if obj.cancelled_by else '',
            'reason': obj.cancellation_reason or 'Aucune raison spécifiée'
        }
    
    def get_refund(self, obj):
        """Return refund info if exists."""
        try:
            refund = obj.refund
            return {
                'id': str(refund.id),
                'status': refund.status,
                'status_display': refund.get_status_display(),
                'method': refund.method,
                'method_display': refund.get_method_display(),
                'currency': refund.currency,
                'net_amount': str(refund.net_amount),
                'payout_currency': refund.payout_currency,
                'exchange_rate_applied': str(refund.exchange_rate_applied) if refund.exchange_rate_applied else None,
                'payout_amount': str(refund.payout_amount) if refund.payout_amount else None,
                'actual_payout_amount': str(refund.actual_payout_amount) if refund.actual_payout_amount else None,
                'service_gain': str(refund.service_gain) if refund.service_gain else '0.00',
                'service_gain_cdf': str(refund.service_gain_cdf) if refund.service_gain_cdf else '0.00',
                'paid_at': refund.paid_at,
                'initiated_at': refund.initiated_at,
                'initiated_by_name': refund.initiated_by.get_full_name() if refund.initiated_by else None,
                'cancelled_at': refund.cancelled_at,
                'cancelled_by_name': refund.cancelled_by.get_full_name() if refund.cancelled_by else None,
                'cancellation_reason': refund.cancellation_reason,
                'created_at': refund.created_at,
            }
        except Exception:
            return None


class TaxFreeFormDetailSerializer(TaxFreeFormSerializer):
    """Detailed serializer with invoice info."""
    
    invoice = SaleInvoiceSerializer(read_only=True)
    qr_code_data = serializers.SerializerMethodField()
    
    class Meta(TaxFreeFormSerializer.Meta):
        fields = TaxFreeFormSerializer.Meta.fields + ['qr_code_data', 'rule_snapshot']

    def get_qr_code_data(self, obj):
        if obj.qr_payload and obj.qr_signature:
            return f"{obj.qr_payload}|{obj.qr_signature}"
        return None


class TaxFreeFormCreateSerializer(serializers.Serializer):
    """Serializer for creating tax free forms."""
    
    invoice_id = serializers.UUIDField()
    traveler = TravelerCreateSerializer()

    def validate_invoice_id(self, value):
        from apps.sales.models import SaleInvoice
        try:
            invoice = SaleInvoice.objects.get(id=value)
            if invoice.is_cancelled:
                raise serializers.ValidationError('Invoice is cancelled')
            if hasattr(invoice, 'taxfree_form'):
                raise serializers.ValidationError('Invoice already has a tax free form')
            return value
        except SaleInvoice.DoesNotExist:
            raise serializers.ValidationError('Invoice not found')

    def create(self, validated_data):
        from apps.sales.models import SaleInvoice
        from services.taxfree_service import TaxFreeService
        
        invoice = SaleInvoice.objects.get(id=validated_data['invoice_id'])
        traveler_data = validated_data['traveler']
        user = self.context['request'].user
        
        # Create or get traveler
        passport_number = traveler_data.pop('passport_number')
        passport_hash = Traveler.hash_passport(passport_number)
        
        traveler, created = Traveler.objects.get_or_create(
            passport_number_hash=passport_hash,
            defaults={
                **traveler_data,
                'passport_number_last4': passport_number[-4:]
            }
        )
        
        if not created:
            # Update traveler info
            for key, value in traveler_data.items():
                setattr(traveler, key, value)
            traveler.save()
        
        # Create form using service
        form = TaxFreeService.create_form(invoice, traveler, user)
        return form


class TaxFreeFormCancelSerializer(serializers.Serializer):
    """Serializer for cancelling forms."""
    reason = serializers.CharField(required=True)


class TaxFreeFormScanSerializer(serializers.Serializer):
    """Serializer for scanning QR codes."""
    qr_string = serializers.CharField()

    def validate_qr_string(self, value):
        import json
        try:
            if '|' not in value:
                raise serializers.ValidationError('Invalid QR format')
            payload_str, signature = value.rsplit('|', 1)
            payload = json.loads(payload_str)
            if 'form_id' not in payload:
                raise serializers.ValidationError('Invalid QR payload')
            return value
        except json.JSONDecodeError:
            raise serializers.ValidationError('Invalid QR payload')


class TravelerStatusCheckSerializer(serializers.Serializer):
    """Serializer for traveler status check."""
    form_number = serializers.CharField(required=False)
    passport_number = serializers.CharField(required=False)

    def validate(self, attrs):
        if not attrs.get('form_number') and not attrs.get('passport_number'):
            raise serializers.ValidationError(
                'Either form_number or passport_number is required'
            )
        return attrs
