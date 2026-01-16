"""
Serializers for refunds app.
"""
from rest_framework import serializers
from .models import Refund, PaymentAttempt, RefundMethod, RefundStatus


class PaymentAttemptSerializer(serializers.ModelSerializer):
    """Serializer for payment attempts."""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = PaymentAttempt
        fields = [
            'id', 'provider', 'provider_request_id', 'provider_response_id',
            'status', 'status_display', 'error_code', 'error_message',
            'started_at', 'completed_at'
        ]
        read_only_fields = ['id', 'started_at']


class TravelerNestedSerializer(serializers.Serializer):
    """Nested serializer for traveler info."""
    first_name = serializers.CharField(read_only=True)
    last_name = serializers.CharField(read_only=True)
    passport_number_last4 = serializers.CharField(read_only=True)


class FormNestedSerializer(serializers.Serializer):
    """Nested serializer for form info in refunds."""
    id = serializers.UUIDField(read_only=True)
    form_number = serializers.CharField(read_only=True)
    traveler = TravelerNestedSerializer(read_only=True)


class RefundSerializer(serializers.ModelSerializer):
    """Serializer for refunds."""
    
    form_number = serializers.CharField(source='form.form_number', read_only=True)
    traveler_name = serializers.CharField(source='form.traveler.full_name', read_only=True)
    merchant_name = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    can_retry = serializers.BooleanField(read_only=True)
    attempts_count = serializers.IntegerField(source='attempts.count', read_only=True)
    initiated_by_name = serializers.CharField(source='initiated_by.full_name', read_only=True, allow_null=True)
    cancelled_by_name = serializers.CharField(source='cancelled_by.full_name', read_only=True, allow_null=True)
    form_data = FormNestedSerializer(source='form', read_only=True)
    
    class Meta:
        model = Refund
        fields = [
            'id', 'form', 'form_data', 'form_number', 'traveler_name', 'merchant_name',
            'currency', 'gross_amount', 'operator_fee', 'net_amount',
            'payout_currency', 'exchange_rate_applied', 'payout_amount',
            'actual_payout_amount', 'service_gain', 'service_gain_cdf',
            'method', 'method_display', 'payment_details',
            'status', 'status_display',
            'initiated_at', 'initiated_by_name', 'paid_at',
            'cash_collected', 'cash_collected_at',
            'cancelled_at', 'cancelled_by_name', 'cancellation_reason',
            'retry_count', 'max_retries', 'can_retry',
            'attempts_count', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'gross_amount', 'operator_fee', 'net_amount',
            'payout_currency', 'exchange_rate_applied', 'payout_amount',
            'actual_payout_amount', 'service_gain', 'service_gain_cdf',
            'status', 'initiated_at', 'paid_at',
            'retry_count', 'created_at', 'updated_at'
        ]
    
    def get_merchant_name(self, obj):
        if obj.form and obj.form.invoice and obj.form.invoice.merchant:
            return obj.form.invoice.merchant.name
        return None


class RefundDetailSerializer(RefundSerializer):
    """Detailed refund serializer with attempts."""
    
    attempts = PaymentAttemptSerializer(many=True, read_only=True)
    
    class Meta(RefundSerializer.Meta):
        fields = RefundSerializer.Meta.fields + ['attempts']


class RefundInitiateSerializer(serializers.Serializer):
    """Serializer for initiating a refund."""
    
    method = serializers.ChoiceField(choices=RefundMethod.choices)
    payment_details = serializers.JSONField(required=False, default=dict)
    payout_currency = serializers.CharField(required=False, default='CDF', max_length=3)

    def validate_payout_currency(self, value):
        from apps.rules.models import Currency
        
        value = value.upper()
        if value != 'CDF':
            if not Currency.objects.filter(code=value, is_active=True).exists():
                raise serializers.ValidationError(f'Devise {value} non disponible ou inactive')
        return value

    def validate_payment_details(self, value):
        method = self.initial_data.get('method')
        
        if method == RefundMethod.CARD:
            # Card details should be tokenized, not raw
            if not value.get('card_token'):
                raise serializers.ValidationError('Card token is required')
        elif method == RefundMethod.BANK_TRANSFER:
            if not value.get('account_number') or not value.get('bank_code'):
                raise serializers.ValidationError('Bank account details are required')
        elif method == RefundMethod.MOBILE_MONEY:
            if not value.get('phone_number') or not value.get('provider'):
                raise serializers.ValidationError('Mobile money details are required')
        # CASH doesn't need payment details
        
        return value


class RefundRetrySerializer(serializers.Serializer):
    """Serializer for retrying a failed refund."""
    pass


class CashCollectionSerializer(serializers.Serializer):
    """Serializer for marking cash as collected."""
    
    collected = serializers.BooleanField(default=True)
    actual_amount = serializers.DecimalField(
        max_digits=15, 
        decimal_places=2, 
        required=False,
        help_text='Actual amount given to traveler (may be less than expected due to rounding)'
    )
    notes = serializers.CharField(required=False, allow_blank=True)
