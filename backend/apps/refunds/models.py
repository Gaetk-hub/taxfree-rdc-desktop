"""
Refund and Payment models.
"""
import uuid
from decimal import Decimal
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator


class RefundStatus(models.TextChoices):
    PENDING = 'PENDING', _('Pending')
    INITIATED = 'INITIATED', _('Initiated')
    PAID = 'PAID', _('Paid')
    FAILED = 'FAILED', _('Failed')
    CANCELLED = 'CANCELLED', _('Cancelled')


class RefundMethod(models.TextChoices):
    CARD = 'CARD', _('Credit/Debit Card')
    BANK_TRANSFER = 'BANK_TRANSFER', _('Bank Transfer')
    MOBILE_MONEY = 'MOBILE_MONEY', _('Mobile Money')
    CASH = 'CASH', _('Cash at Counter')


class PaymentAttemptStatus(models.TextChoices):
    PENDING = 'PENDING', _('Pending')
    SUCCESS = 'SUCCESS', _('Success')
    FAILED = 'FAILED', _('Failed')


class Refund(models.Model):
    """Refund record for a validated tax free form."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Form reference
    form = models.OneToOneField(
        'taxfree.TaxFreeForm',
        on_delete=models.PROTECT,
        related_name='refund'
    )
    
    # Amount
    currency = models.CharField(max_length=3, default='CDF')
    gross_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))],
        help_text=_('VAT amount before fees')
    )
    operator_fee = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00')
    )
    net_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text=_('Amount to be paid to traveler')
    )
    
    # Method
    method = models.CharField(
        max_length=20,
        choices=RefundMethod.choices
    )
    
    # Payment details (depends on method)
    payment_details = models.JSONField(default=dict)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=RefundStatus.choices,
        default=RefundStatus.PENDING
    )
    
    # Processing
    initiated_at = models.DateTimeField(null=True, blank=True)
    initiated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='initiated_refunds'
    )
    paid_at = models.DateTimeField(null=True, blank=True)
    
    # For cash refunds
    cash_collected = models.BooleanField(default=False)
    cash_collected_at = models.DateTimeField(null=True, blank=True)
    cash_collected_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cash_refunds_processed'
    )
    
    # Retry info
    retry_count = models.IntegerField(default=0)
    max_retries = models.IntegerField(default=3)
    next_retry_at = models.DateTimeField(null=True, blank=True)
    
    # Cancellation
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_refunds'
    )
    cancellation_reason = models.TextField(blank=True)
    
    # Currency conversion fields
    payout_currency = models.CharField(
        max_length=3,
        default='CDF',
        help_text=_('Currency in which the refund was paid to traveler')
    )
    exchange_rate_applied = models.DecimalField(
        max_digits=20,
        decimal_places=6,
        null=True,
        blank=True,
        help_text=_('Exchange rate applied at time of refund (1 CDF = X payout_currency)')
    )
    payout_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Amount paid to traveler in payout_currency')
    )
    
    # Service gain (difference between expected payout and actual payout)
    actual_payout_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        null=True,
        blank=True,
        help_text=_('Actual amount given to traveler (may be less than payout_amount)')
    )
    service_gain = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Difference between payout_amount and actual_payout_amount (rounding gain)')
    )
    service_gain_cdf = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Service gain converted to CDF for reporting')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('refund')
        verbose_name_plural = _('refunds')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['next_retry_at']),
        ]

    def __str__(self):
        return f"Refund {self.form.form_number} - {self.status}"

    def can_retry(self):
        return (
            self.status == RefundStatus.FAILED and
            self.retry_count < self.max_retries
        )


class PaymentAttempt(models.Model):
    """Record of a payment attempt for a refund."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    refund = models.ForeignKey(
        Refund,
        on_delete=models.CASCADE,
        related_name='attempts'
    )
    
    # Provider info
    provider = models.CharField(max_length=50)
    provider_request_id = models.CharField(max_length=100, blank=True)
    provider_response_id = models.CharField(max_length=100, blank=True)
    
    # Request/Response
    request_payload = models.JSONField(default=dict)
    response_payload = models.JSONField(default=dict)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=PaymentAttemptStatus.choices,
        default=PaymentAttemptStatus.PENDING
    )
    error_code = models.CharField(max_length=50, blank=True)
    error_message = models.TextField(blank=True)
    
    # Timing
    started_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _('payment attempt')
        verbose_name_plural = _('payment attempts')
        ordering = ['-started_at']

    def __str__(self):
        return f"Attempt {self.id} - {self.status}"
