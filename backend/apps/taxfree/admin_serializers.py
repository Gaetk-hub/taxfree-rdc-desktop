"""
Admin serializers for TaxFree app - Full traceability for Super Admin.
"""
from rest_framework import serializers
from django.utils import timezone

from apps.sales.models import SaleInvoice, SaleItem
from apps.merchants.models import Merchant, Outlet
from apps.customs.models import CustomsValidation, PointOfExit
from apps.refunds.models import Refund, PaymentAttempt
from apps.audit.models import AuditLog
from .models import Traveler, TaxFreeForm, TaxFreeFormStatus


class AdminSaleItemSerializer(serializers.ModelSerializer):
    """Detailed sale item for admin view."""
    
    class Meta:
        model = SaleItem
        fields = [
            'id', 'product_code', 'barcode', 'product_name', 'product_category',
            'description', 'quantity', 'unit_price', 'line_total',
            'vat_rate', 'vat_amount', 'is_eligible', 'ineligibility_reason',
            'created_at'
        ]


class AdminMerchantSerializer(serializers.ModelSerializer):
    """Merchant info for admin view."""
    
    class Meta:
        model = Merchant
        fields = [
            'id', 'name', 'trade_name', 'registration_number', 'tax_id',
            'address_line1', 'city', 'province', 'contact_name', 
            'contact_email', 'contact_phone', 'status'
        ]


class AdminOutletSerializer(serializers.ModelSerializer):
    """Outlet info for admin view."""
    
    class Meta:
        model = Outlet
        fields = [
            'id', 'name', 'code', 'address_line1', 'city', 'province',
            'phone', 'email', 'is_active'
        ]


class AdminInvoiceSerializer(serializers.ModelSerializer):
    """Detailed invoice for admin view."""
    
    items = AdminSaleItemSerializer(many=True, read_only=True)
    merchant = AdminMerchantSerializer(read_only=True)
    outlet = AdminOutletSerializer(read_only=True)
    created_by_info = serializers.SerializerMethodField()
    
    class Meta:
        model = SaleInvoice
        fields = [
            'id', 'invoice_number', 'invoice_date', 'currency',
            'subtotal', 'total_vat', 'total_amount',
            'payment_method', 'payment_reference', 'notes',
            'is_cancelled', 'cancelled_at', 'cancelled_reason',
            'merchant', 'outlet', 'items', 'created_by_info',
            'created_at', 'updated_at'
        ]
    
    def get_created_by_info(self, obj):
        if obj.created_by:
            return {
                'id': str(obj.created_by.id),
                'email': obj.created_by.email,
                'full_name': obj.created_by.full_name,
                'role': obj.created_by.role,
                'role_display': obj.created_by.get_role_display(),
            }
        return None


class AdminTravelerSerializer(serializers.ModelSerializer):
    """Detailed traveler for admin view."""
    
    full_name = serializers.ReadOnlyField()
    passport_number = serializers.SerializerMethodField()
    forms_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Traveler
        fields = [
            'id', 'passport_number', 'passport_number_last4', 'passport_country',
            'passport_issue_date', 'passport_expiry_date',
            'first_name', 'last_name', 'full_name', 'date_of_birth',
            'nationality', 'residence_country', 'residence_address',
            'email', 'phone', 'preferred_refund_method', 'refund_details',
            'forms_count', 'created_at', 'updated_at'
        ]
    
    def get_passport_number(self, obj):
        if obj.passport_number_full:
            return obj.passport_number_full
        return f"***{obj.passport_number_last4}"
    
    def get_forms_count(self, obj):
        return obj.taxfree_forms.count()


class AdminPointOfExitSerializer(serializers.ModelSerializer):
    """Point of exit for admin view."""
    
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    
    class Meta:
        model = PointOfExit
        fields = [
            'id', 'code', 'name', 'type', 'type_display',
            'city', 'province', 'address'
        ]


class AdminCustomsValidationSerializer(serializers.ModelSerializer):
    """Detailed customs validation for admin view."""
    
    agent_info = serializers.SerializerMethodField()
    point_of_exit = AdminPointOfExitSerializer(read_only=True)
    decision_display = serializers.CharField(source='get_decision_display', read_only=True)
    refusal_reason_display = serializers.SerializerMethodField()
    
    class Meta:
        model = CustomsValidation
        fields = [
            'id', 'decision', 'decision_display',
            'refusal_reason', 'refusal_reason_display', 'refusal_details',
            'physical_control_done', 'control_notes',
            'agent_info', 'point_of_exit',
            'is_offline', 'offline_batch_id', 'offline_timestamp', 'synced_at',
            'decided_at', 'created_at'
        ]
    
    def get_agent_info(self, obj):
        if obj.agent:
            return {
                'id': str(obj.agent.id),
                'email': obj.agent.email,
                'full_name': obj.agent.full_name,
                'agent_code': obj.agent.agent_code,
            }
        return None
    
    def get_refusal_reason_display(self, obj):
        if obj.refusal_reason:
            return obj.get_refusal_reason_display()
        return None


class AdminPaymentAttemptSerializer(serializers.ModelSerializer):
    """Payment attempt for admin view."""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PaymentAttempt
        fields = [
            'id', 'provider', 'provider_request_id', 'provider_response_id',
            'status', 'status_display', 'error_code', 'error_message',
            'started_at', 'completed_at'
        ]


class AdminRefundSerializer(serializers.ModelSerializer):
    """Detailed refund for admin view."""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    attempts = AdminPaymentAttemptSerializer(many=True, read_only=True)
    initiated_by_info = serializers.SerializerMethodField()
    cash_collected_by_info = serializers.SerializerMethodField()
    cancelled_by_info = serializers.SerializerMethodField()
    
    class Meta:
        model = Refund
        fields = [
            'id', 'currency', 'gross_amount', 'operator_fee', 'net_amount',
            'payout_currency', 'exchange_rate_applied', 'payout_amount',
            'actual_payout_amount', 'service_gain', 'service_gain_cdf',
            'method', 'method_display', 'payment_details',
            'status', 'status_display',
            'initiated_at', 'initiated_by_info',
            'paid_at', 'cash_collected', 'cash_collected_at', 'cash_collected_by_info',
            'cancelled_at', 'cancelled_by_info', 'cancellation_reason',
            'retry_count', 'max_retries', 'next_retry_at',
            'attempts', 'created_at', 'updated_at'
        ]
    
    def get_initiated_by_info(self, obj):
        if obj.initiated_by:
            return {
                'id': str(obj.initiated_by.id),
                'email': obj.initiated_by.email,
                'full_name': obj.initiated_by.full_name,
                'role': obj.initiated_by.role,
            }
        return None
    
    def get_cash_collected_by_info(self, obj):
        if obj.cash_collected_by:
            return {
                'id': str(obj.cash_collected_by.id),
                'email': obj.cash_collected_by.email,
                'full_name': obj.cash_collected_by.full_name,
            }
        return None
    
    def get_cancelled_by_info(self, obj):
        if obj.cancelled_by:
            return {
                'id': str(obj.cancelled_by.id),
                'email': obj.cancelled_by.email,
                'full_name': obj.cancelled_by.full_name,
            }
        return None


class AdminTaxFreeFormListSerializer(serializers.ModelSerializer):
    """List serializer for admin - summary view."""
    
    traveler_name = serializers.CharField(source='traveler.full_name', read_only=True)
    traveler_passport = serializers.SerializerMethodField()
    merchant_name = serializers.CharField(source='invoice.merchant.name', read_only=True)
    outlet_name = serializers.CharField(source='invoice.outlet.name', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    created_by_name = serializers.SerializerMethodField()
    validation_status = serializers.SerializerMethodField()
    refund_status = serializers.SerializerMethodField()
    is_expired = serializers.SerializerMethodField()
    
    class Meta:
        model = TaxFreeForm
        fields = [
            'id', 'form_number', 'status', 'status_display',
            'traveler_name', 'traveler_passport',
            'merchant_name', 'outlet_name',
            'currency', 'eligible_amount', 'vat_amount', 'refund_amount',
            'risk_score', 'requires_control',
            'validation_status', 'refund_status',
            'created_by_name', 'is_expired',
            'issued_at', 'expires_at', 'validated_at',
            'created_at'
        ]
    
    def get_traveler_passport(self, obj):
        return f"***{obj.traveler.passport_number_last4}"
    
    def get_created_by_name(self, obj):
        if obj.created_by:
            return obj.created_by.full_name
        return None
    
    def get_validation_status(self, obj):
        try:
            validation = obj.customs_validation
            return {
                'decision': validation.decision,
                'decided_at': validation.decided_at,
                'agent_name': validation.agent.full_name if validation.agent else None,
            }
        except CustomsValidation.DoesNotExist:
            return None
    
    def get_refund_status(self, obj):
        try:
            refund = obj.refund
            return {
                'status': refund.status,
                'method': refund.method,
                'paid_at': refund.paid_at,
                'payout_currency': refund.payout_currency,
                'payout_amount': str(refund.payout_amount) if refund.payout_amount else None,
                'actual_payout_amount': str(refund.actual_payout_amount) if refund.actual_payout_amount else None,
                'service_gain': str(refund.service_gain) if refund.service_gain else None,
            }
        except Refund.DoesNotExist:
            return None
    
    def get_is_expired(self, obj):
        return obj.expires_at < timezone.now() if obj.expires_at else False


class AdminTaxFreeFormDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer for admin - complete traceability."""
    
    # Traveler info
    traveler = AdminTravelerSerializer(read_only=True)
    
    # Invoice with items, merchant, outlet, creator
    invoice = AdminInvoiceSerializer(read_only=True)
    
    # Form creator
    created_by_info = serializers.SerializerMethodField()
    
    # Cancellation info
    cancelled_by_info = serializers.SerializerMethodField()
    
    # Customs validation
    customs_validation = AdminCustomsValidationSerializer(read_only=True)
    
    # Refund with attempts
    refund = AdminRefundSerializer(read_only=True)
    
    # Email sending history
    email_history = serializers.SerializerMethodField()
    
    # Audit trail
    audit_trail = serializers.SerializerMethodField()
    
    # Status info
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    is_expired = serializers.SerializerMethodField()
    can_validate = serializers.SerializerMethodField()
    can_cancel = serializers.SerializerMethodField()
    
    # QR Code
    qr_code_data = serializers.SerializerMethodField()
    
    class Meta:
        model = TaxFreeForm
        fields = [
            'id', 'form_number', 'status', 'status_display',
            'currency', 'eligible_amount', 'vat_amount', 'refund_amount', 'operator_fee',
            'risk_score', 'risk_flags', 'requires_control',
            'rule_snapshot',
            'qr_code_data',
            'is_expired', 'can_validate', 'can_cancel',
            'issued_at', 'expires_at', 'validated_at',
            'cancelled_at', 'cancelled_by_info', 'cancellation_reason',
            'created_by_info', 'created_at', 'updated_at',
            'traveler', 'invoice', 'customs_validation', 'refund',
            'email_history', 'audit_trail'
        ]
    
    def get_created_by_info(self, obj):
        if obj.created_by:
            return {
                'id': str(obj.created_by.id),
                'email': obj.created_by.email,
                'full_name': obj.created_by.full_name,
                'role': obj.created_by.role,
                'role_display': obj.created_by.get_role_display(),
            }
        return None
    
    def get_cancelled_by_info(self, obj):
        if obj.cancelled_by:
            return {
                'id': str(obj.cancelled_by.id),
                'email': obj.cancelled_by.email,
                'full_name': obj.cancelled_by.full_name,
            }
        return None
    
    def get_email_history(self, obj):
        """Get email sending history from audit logs."""
        logs = AuditLog.objects.filter(
            entity='TaxFreeForm',
            entity_id=str(obj.id),
            action__in=['TAXFREE_FORM_EMAILED', 'RECEIPT_SENT']
        ).order_by('-timestamp')[:10]
        
        return [
            {
                'action': log.action,
                'timestamp': log.timestamp,
                'actor_email': log.actor_email,
                'metadata': log.metadata,
            }
            for log in logs
        ]
    
    def get_audit_trail(self, obj):
        """Get full audit trail for this form."""
        logs = AuditLog.objects.filter(
            entity='TaxFreeForm',
            entity_id=str(obj.id)
        ).order_by('-timestamp')[:50]
        
        return [
            {
                'action': log.action,
                'timestamp': log.timestamp,
                'actor_email': log.actor_email,
                'actor_role': log.actor_role,
                'metadata': log.metadata,
            }
            for log in logs
        ]
    
    def get_is_expired(self, obj):
        return obj.expires_at < timezone.now() if obj.expires_at else False
    
    def get_can_validate(self, obj):
        return obj.can_be_validated()
    
    def get_can_cancel(self, obj):
        return obj.can_be_cancelled()
    
    def get_qr_code_data(self, obj):
        if obj.qr_payload and obj.qr_signature:
            return f"{obj.qr_payload}|{obj.qr_signature}"
        return None


class AdminRefundListSerializer(serializers.ModelSerializer):
    """List serializer for refunds - admin view."""
    
    form_number = serializers.CharField(source='form.form_number', read_only=True)
    traveler_name = serializers.CharField(source='form.traveler.full_name', read_only=True)
    merchant_name = serializers.SerializerMethodField()
    outlet_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    initiated_by_name = serializers.SerializerMethodField()
    attempts_count = serializers.IntegerField(source='attempts.count', read_only=True)
    
    class Meta:
        model = Refund
        fields = [
            'id', 'form', 'form_number', 'traveler_name',
            'merchant_name', 'outlet_name',
            'currency', 'gross_amount', 'operator_fee', 'net_amount',
            'payout_currency', 'exchange_rate_applied', 'payout_amount',
            'actual_payout_amount', 'service_gain', 'service_gain_cdf',
            'method', 'method_display', 'status', 'status_display',
            'initiated_at', 'initiated_by_name', 'paid_at',
            'cash_collected', 'cash_collected_at',
            'retry_count', 'attempts_count',
            'created_at'
        ]
    
    def get_merchant_name(self, obj):
        if obj.form and obj.form.invoice and obj.form.invoice.merchant:
            return obj.form.invoice.merchant.name
        return None
    
    def get_outlet_name(self, obj):
        if obj.form and obj.form.invoice and obj.form.invoice.outlet:
            return obj.form.invoice.outlet.name
        return None
    
    def get_initiated_by_name(self, obj):
        if obj.initiated_by:
            return obj.initiated_by.full_name
        return None


class AdminRefundDetailSerializer(serializers.ModelSerializer):
    """Full detail serializer for refunds - admin view with complete traceability."""
    
    # Form info
    form_info = serializers.SerializerMethodField()
    
    # Status
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    
    # Actors
    initiated_by_info = serializers.SerializerMethodField()
    cash_collected_by_info = serializers.SerializerMethodField()
    cancelled_by_info = serializers.SerializerMethodField()
    
    # Payment attempts
    attempts = AdminPaymentAttemptSerializer(many=True, read_only=True)
    
    # Audit trail
    audit_trail = serializers.SerializerMethodField()
    
    class Meta:
        model = Refund
        fields = [
            'id', 'form', 'form_info',
            'currency', 'gross_amount', 'operator_fee', 'net_amount',
            'payout_currency', 'exchange_rate_applied', 'payout_amount',
            'actual_payout_amount', 'service_gain', 'service_gain_cdf',
            'method', 'method_display', 'payment_details',
            'status', 'status_display',
            'initiated_at', 'initiated_by_info',
            'paid_at', 'cash_collected', 'cash_collected_at', 'cash_collected_by_info',
            'cancelled_at', 'cancelled_by_info', 'cancellation_reason',
            'retry_count', 'max_retries', 'next_retry_at',
            'attempts', 'audit_trail',
            'created_at', 'updated_at'
        ]
    
    def get_form_info(self, obj):
        form = obj.form
        return {
            'id': str(form.id),
            'form_number': form.form_number,
            'status': form.status,
            'status_display': form.get_status_display(),
            'traveler': {
                'id': str(form.traveler.id),
                'full_name': form.traveler.full_name,
                'passport_last4': form.traveler.passport_number_last4,
                'email': form.traveler.email,
                'phone': form.traveler.phone,
            },
            'merchant': {
                'id': str(form.invoice.merchant.id),
                'name': form.invoice.merchant.name,
            } if form.invoice and form.invoice.merchant else None,
            'outlet': {
                'id': str(form.invoice.outlet.id),
                'name': form.invoice.outlet.name,
            } if form.invoice and form.invoice.outlet else None,
            'validation': self._get_validation_info(form),
            'eligible_amount': str(form.eligible_amount),
            'vat_amount': str(form.vat_amount),
            'refund_amount': str(form.refund_amount),
            'created_at': form.created_at,
        }
    
    def _get_validation_info(self, form):
        try:
            validation = form.customs_validation
            return {
                'decision': validation.decision,
                'decision_display': validation.get_decision_display(),
                'decided_at': validation.decided_at,
                'agent_name': validation.agent.full_name if validation.agent else None,
                'point_of_exit': validation.point_of_exit.name if validation.point_of_exit else None,
            }
        except CustomsValidation.DoesNotExist:
            return None
    
    def get_initiated_by_info(self, obj):
        if obj.initiated_by:
            return {
                'id': str(obj.initiated_by.id),
                'email': obj.initiated_by.email,
                'full_name': obj.initiated_by.full_name,
                'role': obj.initiated_by.role,
                'role_display': obj.initiated_by.get_role_display(),
            }
        return None
    
    def get_cash_collected_by_info(self, obj):
        if obj.cash_collected_by:
            return {
                'id': str(obj.cash_collected_by.id),
                'email': obj.cash_collected_by.email,
                'full_name': obj.cash_collected_by.full_name,
            }
        return None
    
    def get_cancelled_by_info(self, obj):
        if obj.cancelled_by:
            return {
                'id': str(obj.cancelled_by.id),
                'email': obj.cancelled_by.email,
                'full_name': obj.cancelled_by.full_name,
            }
        return None
    
    def get_audit_trail(self, obj):
        """Get audit trail for this refund."""
        logs = AuditLog.objects.filter(
            entity='Refund',
            entity_id=str(obj.id)
        ).order_by('-timestamp')[:50]
        
        return [
            {
                'action': log.action,
                'timestamp': log.timestamp,
                'actor_email': log.actor_email,
                'actor_role': log.actor_role,
                'metadata': log.metadata,
            }
            for log in logs
        ]
