"""
Tax Free Form and Traveler models.
"""
import uuid
import hashlib
import hmac
import json
from decimal import Decimal
from django.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator


class TaxFreeFormStatus(models.TextChoices):
    CREATED = 'CREATED', _('Création')
    ISSUED = 'ISSUED', _('Émis')
    VALIDATION_PENDING = 'VALIDATION_PENDING', _('En attente de validation')
    VALIDATED = 'VALIDATED', _('Validé par la douane')
    REFUNDED = 'REFUNDED', _('Remboursé')
    REFUSED = 'REFUSED', _('Refusé par la douane')
    EXPIRED = 'EXPIRED', _('Expiré')
    CANCELLED = 'CANCELLED', _('Annulé')


class Traveler(models.Model):
    """Traveler information for tax free claims."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Identity (passport info)
    passport_number_hash = models.CharField(max_length=64)  # SHA256 hash for verification
    passport_number_last4 = models.CharField(max_length=4)  # Last 4 chars for quick display
    passport_number_full = models.CharField(max_length=50, blank=True, default='')  # Full number for display
    passport_country = models.CharField(max_length=2)  # ISO 3166-1 alpha-2
    passport_issue_date = models.DateField(null=True, blank=True)
    passport_expiry_date = models.DateField(null=True, blank=True)
    
    # Personal info
    first_name = models.CharField(max_length=100)
    last_name = models.CharField(max_length=100)
    date_of_birth = models.DateField()
    
    # Residence
    nationality = models.CharField(max_length=2)  # ISO 3166-1 alpha-2
    residence_country = models.CharField(max_length=2)  # ISO 3166-1 alpha-2
    residence_address = models.TextField(blank=True)
    
    # Contact (optional, for notifications)
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # Refund preferences
    preferred_refund_method = models.CharField(max_length=50, blank=True)
    refund_details = models.JSONField(default=dict, blank=True)  # Bank/MoMo details
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('traveler')
        verbose_name_plural = _('travelers')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.first_name} {self.last_name} (***{self.passport_number_last4})"

    @classmethod
    def hash_passport(cls, passport_number):
        """Hash passport number for secure storage."""
        return hashlib.sha256(passport_number.upper().encode()).hexdigest()

    def set_passport_number(self, passport_number):
        """Set passport number with hashing."""
        self.passport_number_hash = self.hash_passport(passport_number)
        self.passport_number_last4 = passport_number[-4:]
        self.passport_number_full = passport_number  # Store full number for display

    def verify_passport(self, passport_number):
        """Verify passport number matches."""
        return self.passport_number_hash == self.hash_passport(passport_number)

    @property
    def full_name(self):
        return f"{self.first_name} {self.last_name}"


class TaxFreeForm(models.Model):
    """Tax Free Form (Bordereau de détaxe)."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Unique form identifier (human readable)
    form_number = models.CharField(max_length=20, unique=True, editable=False)
    
    # References
    invoice = models.OneToOneField(
        'sales.SaleInvoice',
        on_delete=models.PROTECT,
        related_name='taxfree_form'
    )
    traveler = models.ForeignKey(
        Traveler,
        on_delete=models.PROTECT,
        related_name='taxfree_forms'
    )
    
    # Amounts
    currency = models.CharField(max_length=3, default='CDF')
    eligible_amount = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    vat_amount = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    refund_amount = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text=_('VAT amount minus operator fees')
    )
    operator_fee = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        default=Decimal('0.00')
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=TaxFreeFormStatus.choices,
        default=TaxFreeFormStatus.CREATED
    )
    
    # QR Code data
    qr_payload = models.TextField(blank=True)
    qr_signature = models.CharField(max_length=64, blank=True)
    
    # Rule snapshot (rules applied at creation time for audit)
    rule_snapshot = models.JSONField(default=dict)
    
    # Risk assessment
    risk_score = models.IntegerField(default=0)
    risk_flags = models.JSONField(default=list)
    requires_control = models.BooleanField(default=False)
    
    # Timestamps
    issued_at = models.DateTimeField(null=True, blank=True)
    expires_at = models.DateTimeField()
    validated_at = models.DateTimeField(null=True, blank=True)
    
    # Cancellation
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='cancelled_forms'
    )
    cancellation_reason = models.TextField(blank=True)
    
    # Metadata
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_forms'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('tax free form')
        verbose_name_plural = _('tax free forms')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['form_number']),
            models.Index(fields=['status']),
            models.Index(fields=['expires_at']),
        ]

    def __str__(self):
        return f"TF-{self.form_number}"

    def save(self, *args, **kwargs):
        if not self.form_number:
            self.form_number = self.generate_form_number()
        super().save(*args, **kwargs)

    @classmethod
    def generate_form_number(cls):
        """Generate unique form number."""
        import random
        import string
        from django.utils import timezone
        
        prefix = timezone.now().strftime('%Y%m')
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=8))
        return f"{prefix}{suffix}"

    def generate_qr_payload(self):
        """Generate QR code payload with signature."""
        payload = {
            'form_id': str(self.id),
            'form_number': self.form_number,
            'amount': str(self.refund_amount),
            'currency': self.currency,
            'expires': self.expires_at.isoformat() if self.expires_at else None,
        }
        payload_str = json.dumps(payload, sort_keys=True)
        
        # Generate HMAC signature
        signature = hmac.new(
            settings.TAXFREE_QR_HMAC_KEY.encode(),
            payload_str.encode(),
            hashlib.sha256
        ).hexdigest()
        
        self.qr_payload = payload_str
        self.qr_signature = signature
        return f"{payload_str}|{signature}"

    def verify_qr_signature(self, qr_string):
        """Verify QR code signature."""
        try:
            payload_str, signature = qr_string.rsplit('|', 1)
            expected_signature = hmac.new(
                settings.TAXFREE_QR_HMAC_KEY.encode(),
                payload_str.encode(),
                hashlib.sha256
            ).hexdigest()
            return hmac.compare_digest(signature, expected_signature)
        except (ValueError, AttributeError):
            return False

    def can_be_validated(self):
        """Check if form can be validated by customs."""
        from django.utils import timezone
        return (
            self.status in [TaxFreeFormStatus.ISSUED, TaxFreeFormStatus.VALIDATION_PENDING] and
            self.expires_at > timezone.now()
        )

    def can_be_cancelled(self):
        """Check if form can be cancelled."""
        return self.status in [TaxFreeFormStatus.CREATED, TaxFreeFormStatus.ISSUED]
