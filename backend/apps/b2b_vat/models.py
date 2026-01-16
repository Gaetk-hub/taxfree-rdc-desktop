"""
B2B VAT Credit models (optional feature).
"""
import uuid
from decimal import Decimal
from django.db import models
from django.utils.translation import gettext_lazy as _


class VATClaimStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('Draft')
    SUBMITTED = 'SUBMITTED', _('Submitted')
    UNDER_REVIEW = 'UNDER_REVIEW', _('Under Review')
    RFI = 'RFI', _('Request for Information')
    ACCEPTED = 'ACCEPTED', _('Accepted')
    PARTIALLY_ACCEPTED = 'PARTIALLY_ACCEPTED', _('Partially Accepted')
    REJECTED = 'REJECTED', _('Rejected')
    PAID = 'PAID', _('Paid')


class VATClaim(models.Model):
    """VAT credit claim from a business."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Claim number
    claim_number = models.CharField(max_length=20, unique=True, editable=False)
    
    # Claimant
    company_name = models.CharField(max_length=255)
    company_tax_id = models.CharField(max_length=100)
    company_address = models.TextField()
    contact_name = models.CharField(max_length=255)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20)
    
    # Period
    period_start = models.DateField()
    period_end = models.DateField()
    
    # Amounts
    currency = models.CharField(max_length=3, default='CDF')
    total_vat_claimed = models.DecimalField(max_digits=15, decimal_places=2)
    total_vat_approved = models.DecimalField(max_digits=15, decimal_places=2, null=True, blank=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=VATClaimStatus.choices,
        default=VATClaimStatus.DRAFT
    )
    
    # Review
    reviewer = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='reviewed_vat_claims'
    )
    review_notes = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('VAT claim')
        verbose_name_plural = _('VAT claims')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.claim_number} - {self.company_name}"

    def save(self, *args, **kwargs):
        if not self.claim_number:
            from django.utils import timezone
            import random
            import string
            prefix = timezone.now().strftime('%Y%m')
            suffix = ''.join(random.choices(string.digits, k=6))
            self.claim_number = f"VAT{prefix}{suffix}"
        super().save(*args, **kwargs)


class ClaimLine(models.Model):
    """Individual line item in a VAT claim."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    claim = models.ForeignKey(
        VATClaim,
        on_delete=models.CASCADE,
        related_name='lines'
    )
    
    # Invoice info
    supplier_name = models.CharField(max_length=255)
    supplier_tax_id = models.CharField(max_length=100)
    invoice_number = models.CharField(max_length=100)
    invoice_date = models.DateField()
    
    # Amounts
    invoice_amount = models.DecimalField(max_digits=15, decimal_places=2)
    vat_amount = models.DecimalField(max_digits=15, decimal_places=2)
    
    # Review
    is_approved = models.BooleanField(null=True)
    rejection_reason = models.CharField(max_length=255, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('claim line')
        verbose_name_plural = _('claim lines')

    def __str__(self):
        return f"{self.invoice_number} - {self.vat_amount}"


class ClaimAttachment(models.Model):
    """Attachment for VAT claim."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    claim = models.ForeignKey(
        VATClaim,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    
    file = models.FileField(upload_to='vat_claims/%Y/%m/')
    filename = models.CharField(max_length=255)
    description = models.CharField(max_length=255, blank=True)
    
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('claim attachment')
        verbose_name_plural = _('claim attachments')


class ClaimRFI(models.Model):
    """Request for Information on a claim."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    claim = models.ForeignKey(
        VATClaim,
        on_delete=models.CASCADE,
        related_name='rfis'
    )
    
    question = models.TextField()
    response = models.TextField(blank=True)
    
    requested_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='requested_rfis'
    )
    responded_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('claim RFI')
        verbose_name_plural = _('claim RFIs')


class VATPaymentOrder(models.Model):
    """Payment order for approved VAT claim."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    claim = models.OneToOneField(
        VATClaim,
        on_delete=models.PROTECT,
        related_name='payment_order'
    )
    
    amount = models.DecimalField(max_digits=15, decimal_places=2)
    currency = models.CharField(max_length=3, default='CDF')
    
    bank_name = models.CharField(max_length=255)
    bank_account = models.CharField(max_length=100)
    
    status = models.CharField(max_length=20, default='PENDING')
    paid_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('VAT payment order')
        verbose_name_plural = _('VAT payment orders')
