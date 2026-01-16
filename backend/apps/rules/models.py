"""
Rule Engine models for configurable tax free rules.
"""
import uuid
from decimal import Decimal
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator


class RuleSet(models.Model):
    """Versioned set of tax free rules."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Version info
    version = models.CharField(max_length=20)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Eligibility rules
    min_purchase_amount = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('50000.00'),
        help_text=_('Minimum purchase amount for eligibility')
    )
    min_age = models.IntegerField(
        default=16,
        validators=[MinValueValidator(0), MaxValueValidator(100)],
        help_text=_('Minimum age for eligibility')
    )
    
    # Time windows
    purchase_window_days = models.IntegerField(
        default=3,
        help_text=_('Maximum days between purchases to combine')
    )
    exit_deadline_months = models.IntegerField(
        default=3,
        help_text=_('Maximum months after purchase to exit')
    )
    
    # Territories
    eligible_residence_countries = models.JSONField(
        default=list,
        help_text=_('List of country codes eligible for refund (empty = all except excluded)')
    )
    excluded_residence_countries = models.JSONField(
        default=list,
        help_text=_('List of country codes NOT eligible for refund')
    )
    
    # Product categories
    excluded_categories = models.JSONField(
        default=list,
        help_text=_('Product categories excluded from refund')
    )
    
    # VAT rates by category
    vat_rates = models.JSONField(
        default=dict,
        help_text=_('VAT rates by category, e.g., {"GENERAL": 16.0, "FOOD": 0.0}')
    )
    default_vat_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('16.00'),
        help_text=_('Default VAT rate if category not specified')
    )
    
    # Operator fees
    operator_fee_percentage = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('15.00'),
        help_text=_('Operator fee as percentage of VAT')
    )
    operator_fee_fixed = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Fixed operator fee per form')
    )
    min_operator_fee = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('0.00'),
        help_text=_('Minimum operator fee')
    )
    
    # Refund methods
    allowed_refund_methods = models.JSONField(
        default=list,
        help_text=_('Allowed refund methods: CARD, BANK_TRANSFER, MOBILE_MONEY, CASH')
    )
    
    # Risk thresholds
    risk_score_threshold = models.IntegerField(
        default=70,
        help_text=_('Risk score above which control is required')
    )
    high_value_threshold = models.DecimalField(
        max_digits=15,
        decimal_places=2,
        default=Decimal('500000.00'),
        help_text=_('Amount above which additional control is required')
    )
    
    # Status
    is_active = models.BooleanField(default=False)
    activated_at = models.DateTimeField(null=True, blank=True)
    activated_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='activated_rulesets'
    )
    
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='created_rulesets'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('rule set')
        verbose_name_plural = _('rule sets')
        ordering = ['-created_at']

    def __str__(self):
        status = "ACTIVE" if self.is_active else "INACTIVE"
        return f"{self.name} v{self.version} ({status})"

    def to_snapshot(self):
        """Convert rules to a snapshot dict for storage in TaxFreeForm."""
        return {
            'ruleset_id': str(self.id),
            'version': self.version,
            'min_purchase_amount': str(self.min_purchase_amount),
            'min_age': self.min_age,
            'exit_deadline_months': self.exit_deadline_months,
            'excluded_categories': self.excluded_categories,
            'default_vat_rate': str(self.default_vat_rate),
            'operator_fee_percentage': str(self.operator_fee_percentage),
            'operator_fee_fixed': str(self.operator_fee_fixed),
        }

    @classmethod
    def get_active(cls):
        """Get the currently active ruleset."""
        return cls.objects.filter(is_active=True).first()


class RiskRule(models.Model):
    """Individual risk scoring rule."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    ruleset = models.ForeignKey(
        RuleSet,
        on_delete=models.CASCADE,
        related_name='risk_rules'
    )
    
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Rule definition
    field = models.CharField(
        max_length=50,
        help_text=_('Field to check: amount, traveler_country, category, etc.')
    )
    operator = models.CharField(
        max_length=20,
        help_text=_('Operator: equals, not_equals, greater_than, less_than, in, not_in')
    )
    value = models.JSONField(
        help_text=_('Value to compare against')
    )
    
    # Score impact
    score_impact = models.IntegerField(
        default=10,
        help_text=_('Points to add to risk score if rule matches')
    )
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('risk rule')
        verbose_name_plural = _('risk rules')
        ordering = ['ruleset', 'name']

    def __str__(self):
        return f"{self.name} (+{self.score_impact})"

    def evaluate(self, context):
        """Evaluate rule against context and return score if matched."""
        field_value = context.get(self.field)
        if field_value is None:
            return 0
        
        if self.operator == 'equals':
            if field_value == self.value:
                return self.score_impact
        elif self.operator == 'not_equals':
            if field_value != self.value:
                return self.score_impact
        elif self.operator == 'greater_than':
            if float(field_value) > float(self.value):
                return self.score_impact
        elif self.operator == 'less_than':
            if float(field_value) < float(self.value):
                return self.score_impact
        elif self.operator == 'in':
            if field_value in self.value:
                return self.score_impact
        elif self.operator == 'not_in':
            if field_value not in self.value:
                return self.score_impact
        
        return 0


class ProductCategory(models.Model):
    """Dynamic product categories for tax free eligibility."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Category info
    code = models.CharField(
        max_length=50, 
        unique=True,
        help_text=_('Unique code for the category (e.g., ELECTRONICS)')
    )
    name = models.CharField(
        max_length=100,
        help_text=_('Display name (e.g., Électronique)')
    )
    description = models.TextField(
        blank=True,
        help_text=_('Description of the category')
    )
    icon = models.CharField(
        max_length=10,
        default='📦',
        help_text=_('Emoji icon for the category')
    )
    
    # VAT settings
    default_vat_rate = models.DecimalField(
        max_digits=5,
        decimal_places=2,
        default=Decimal('16.00'),
        help_text=_('Default VAT rate for this category')
    )
    
    # Eligibility
    is_eligible_by_default = models.BooleanField(
        default=True,
        help_text=_('Whether this category is eligible for tax free by default')
    )
    
    # Status
    is_active = models.BooleanField(
        default=True,
        help_text=_('Whether this category is available for use')
    )
    
    # Ordering
    display_order = models.IntegerField(
        default=0,
        help_text=_('Order in which to display the category')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('product category')
        verbose_name_plural = _('product categories')
        ordering = ['display_order', 'name']

    def __str__(self):
        return f"{self.icon} {self.name} ({self.code})"


class Currency(models.Model):
    """Currency configuration for refund payments."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Currency info
    code = models.CharField(
        max_length=3,
        unique=True,
        help_text=_('ISO 4217 currency code (e.g., USD, EUR, CDF)')
    )
    name = models.CharField(
        max_length=100,
        help_text=_('Currency name (e.g., Dollar américain)')
    )
    symbol = models.CharField(
        max_length=10,
        help_text=_('Currency symbol (e.g., $, €, FC)')
    )
    
    # Exchange rate relative to base currency (CDF)
    exchange_rate = models.DecimalField(
        max_digits=20,
        decimal_places=6,
        default=Decimal('1.000000'),
        validators=[MinValueValidator(Decimal('0.000001'))],
        help_text=_('Exchange rate: 1 CDF = X of this currency')
    )
    
    # Status
    is_base_currency = models.BooleanField(
        default=False,
        help_text=_('Is this the base currency (CDF)?')
    )
    is_active = models.BooleanField(
        default=True,
        help_text=_('Is this currency available for refunds?')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('currency')
        verbose_name_plural = _('currencies')
        ordering = ['-is_base_currency', 'code']
    
    def __str__(self):
        status = "✓" if self.is_active else "✗"
        base = " (Base)" if self.is_base_currency else ""
        return f"{status} {self.code} - {self.name}{base}"
    
    def save(self, *args, **kwargs):
        # Ensure only one base currency
        if self.is_base_currency:
            Currency.objects.filter(is_base_currency=True).exclude(pk=self.pk).update(is_base_currency=False)
        # Base currency always has rate of 1
        if self.is_base_currency:
            self.exchange_rate = Decimal('1.000000')
        super().save(*args, **kwargs)
    
    def convert_from_base(self, amount_cdf: Decimal) -> Decimal:
        """Convert amount from CDF to this currency."""
        if self.is_base_currency:
            return amount_cdf
        return (amount_cdf * self.exchange_rate).quantize(Decimal('0.01'))
    
    def convert_to_base(self, amount: Decimal) -> Decimal:
        """Convert amount from this currency to CDF."""
        if self.is_base_currency:
            return amount
        return (amount / self.exchange_rate).quantize(Decimal('0.01'))
    
    @classmethod
    def get_base_currency(cls):
        """Get the base currency (CDF)."""
        return cls.objects.filter(is_base_currency=True).first()
    
    @classmethod
    def get_active_currencies(cls):
        """Get all active currencies for refund selection."""
        return cls.objects.filter(is_active=True)


class ExchangeRateHistory(models.Model):
    """History of exchange rate changes for audit trail."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    currency = models.ForeignKey(
        Currency,
        on_delete=models.CASCADE,
        related_name='rate_history'
    )
    
    # Rate info
    old_rate = models.DecimalField(
        max_digits=20,
        decimal_places=6,
        help_text=_('Previous exchange rate')
    )
    new_rate = models.DecimalField(
        max_digits=20,
        decimal_places=6,
        help_text=_('New exchange rate')
    )
    
    # Who changed it
    changed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='exchange_rate_changes'
    )
    reason = models.TextField(
        blank=True,
        help_text=_('Reason for the rate change')
    )
    
    # When
    changed_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('exchange rate history')
        verbose_name_plural = _('exchange rate histories')
        ordering = ['-changed_at']
    
    def __str__(self):
        return f"{self.currency.code}: {self.old_rate} → {self.new_rate} ({self.changed_at.strftime('%Y-%m-%d %H:%M')})"
