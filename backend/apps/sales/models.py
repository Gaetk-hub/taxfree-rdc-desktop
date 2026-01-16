"""
Sales and Invoice models for the Tax Free system.
"""
import uuid
from decimal import Decimal
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator


class ProductCategory(models.TextChoices):
    """Product categories for VAT purposes."""
    GENERAL = 'GENERAL', _('Marchandises générales')
    ELECTRONICS = 'ELECTRONICS', _('Électronique')
    CLOTHING = 'CLOTHING', _('Vêtements & Accessoires')
    JEWELRY = 'JEWELRY', _('Bijoux & Montres')
    COSMETICS = 'COSMETICS', _('Cosmétiques & Parfums')
    FOOD = 'FOOD', _('Alimentation & Boissons')
    TOBACCO = 'TOBACCO', _('Produits du tabac')
    ALCOHOL = 'ALCOHOL', _('Boissons alcoolisées')
    SERVICES = 'SERVICES', _('Services')
    OTHER = 'OTHER', _('Autre')


class SaleInvoice(models.Model):
    """Invoice for a sale eligible for tax refund."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # References
    merchant = models.ForeignKey(
        'merchants.Merchant',
        on_delete=models.PROTECT,
        related_name='invoices'
    )
    outlet = models.ForeignKey(
        'merchants.Outlet',
        on_delete=models.PROTECT,
        related_name='invoices'
    )
    
    # Invoice details
    invoice_number = models.CharField(max_length=100)
    invoice_date = models.DateField()
    
    # Amounts (in local currency)
    currency = models.CharField(max_length=3, default='CDF')
    subtotal = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    total_vat = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    total_amount = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    
    # Payment info
    payment_method = models.CharField(max_length=50, blank=True)
    payment_reference = models.CharField(max_length=100, blank=True)
    
    # Metadata
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_invoices'
    )
    
    # Soft delete
    is_cancelled = models.BooleanField(default=False)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancelled_reason = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('sale invoice')
        verbose_name_plural = _('sale invoices')
        ordering = ['-created_at']
        unique_together = ['merchant', 'invoice_number']

    def __str__(self):
        return f"{self.merchant.name} - {self.invoice_number}"

    def calculate_totals(self):
        """Recalculate totals from items."""
        items = self.items.all()
        self.subtotal = sum(item.line_total for item in items)
        self.total_vat = sum(item.vat_amount for item in items)
        self.total_amount = self.subtotal + self.total_vat
        return self


class SaleItem(models.Model):
    """Individual item in a sale invoice."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    invoice = models.ForeignKey(
        SaleInvoice,
        on_delete=models.CASCADE,
        related_name='items'
    )
    
    # Product info
    product_code = models.CharField(max_length=100, blank=True)
    barcode = models.CharField(max_length=50, blank=True, help_text='Code-barres du produit (EAN, UPC, etc.)')
    product_name = models.CharField(max_length=255)
    # Note: Removed choices constraint to allow dynamic categories from ProductCategory model in rules app
    product_category = models.CharField(
        max_length=50,
        default='GENERAL'
    )
    description = models.TextField(blank=True)
    
    # Quantities and prices
    quantity = models.DecimalField(
        max_digits=10, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    unit_price = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    line_total = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    
    # VAT
    vat_rate = models.DecimalField(
        max_digits=5, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))],
        help_text=_('VAT rate as percentage (e.g., 16.00 for 16%)')
    )
    vat_amount = models.DecimalField(
        max_digits=15, 
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.00'))]
    )
    
    # Eligibility
    is_eligible = models.BooleanField(
        default=True,
        help_text=_('Whether this item is eligible for tax refund')
    )
    ineligibility_reason = models.CharField(max_length=255, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('sale item')
        verbose_name_plural = _('sale items')
        ordering = ['created_at']

    def __str__(self):
        return f"{self.product_name} x {self.quantity}"

    def save(self, *args, **kwargs):
        # Calculate line total and VAT amount
        self.line_total = self.quantity * self.unit_price
        self.vat_amount = self.line_total * (self.vat_rate / Decimal('100'))
        super().save(*args, **kwargs)
