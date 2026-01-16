"""
Merchant and Outlet models for the Tax Free system.
"""
import uuid
import secrets
from django.db import models
from django.utils.translation import gettext_lazy as _


class MerchantStatus(models.TextChoices):
    DRAFT = 'DRAFT', _('Draft')
    SUBMITTED = 'SUBMITTED', _('Submitted for Review')
    APPROVED = 'APPROVED', _('Approved')
    REJECTED = 'REJECTED', _('Rejected')
    SUSPENDED = 'SUSPENDED', _('Suspended')


class Merchant(models.Model):
    """Merchant entity with KYB information."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Basic info
    name = models.CharField(max_length=255)
    trade_name = models.CharField(max_length=255, blank=True)
    
    # KYB fields
    registration_number = models.CharField(max_length=100, unique=True)
    tax_id = models.CharField(max_length=100, blank=True)
    vat_number = models.CharField(max_length=100, blank=True)
    
    # Address
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    country = models.CharField(max_length=2, default='CD')  # ISO 3166-1 alpha-2
    
    # Contact
    contact_name = models.CharField(max_length=255)
    contact_email = models.EmailField()
    contact_phone = models.CharField(max_length=20)
    
    # Banking info
    bank_name = models.CharField(max_length=255, blank=True)
    bank_account_number = models.CharField(max_length=100, blank=True)
    bank_swift_code = models.CharField(max_length=20, blank=True)
    mobile_money_number = models.CharField(max_length=20, blank=True)
    mobile_money_provider = models.CharField(max_length=50, blank=True)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=MerchantStatus.choices,
        default=MerchantStatus.DRAFT
    )
    status_reason = models.TextField(blank=True)
    
    # Metadata
    submitted_at = models.DateTimeField(null=True, blank=True)
    approved_at = models.DateTimeField(null=True, blank=True)
    approved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='approved_merchants'
    )
    
    # Soft delete
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('merchant')
        verbose_name_plural = _('merchants')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.registration_number})"

    def can_create_forms(self):
        """Check if merchant can create tax free forms."""
        return self.status == MerchantStatus.APPROVED


class Outlet(models.Model):
    """Point of sale / outlet for a merchant."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    merchant = models.ForeignKey(
        Merchant,
        on_delete=models.CASCADE,
        related_name='outlets'
    )
    
    name = models.CharField(max_length=255)
    code = models.CharField(max_length=50)  # Internal code
    
    # Address
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True)
    city = models.CharField(max_length=100)
    province = models.CharField(max_length=100, blank=True)
    
    # Contact
    phone = models.CharField(max_length=20, blank=True)
    email = models.EmailField(blank=True)
    
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('outlet')
        verbose_name_plural = _('outlets')
        unique_together = ['merchant', 'code']
        ordering = ['merchant', 'name']

    def __str__(self):
        return f"{self.merchant.name} - {self.name}"


class POSDevice(models.Model):
    """POS device / terminal for an outlet."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    outlet = models.ForeignKey(
        Outlet,
        on_delete=models.CASCADE,
        related_name='pos_devices'
    )
    
    name = models.CharField(max_length=100)
    device_id = models.CharField(max_length=100, unique=True)
    
    # API authentication
    api_key = models.CharField(max_length=64, unique=True, editable=False)
    api_key_prefix = models.CharField(max_length=8, editable=False)  # For display
    
    is_active = models.BooleanField(default=True)
    last_seen = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('POS device')
        verbose_name_plural = _('POS devices')
        ordering = ['outlet', 'name']

    def __str__(self):
        return f"{self.outlet.name} - {self.name}"

    def save(self, *args, **kwargs):
        if not self.api_key:
            self.api_key = secrets.token_hex(32)
            self.api_key_prefix = self.api_key[:8]
        super().save(*args, **kwargs)

    def regenerate_api_key(self):
        """Generate a new API key."""
        self.api_key = secrets.token_hex(32)
        self.api_key_prefix = self.api_key[:8]
        self.save()
        return self.api_key
