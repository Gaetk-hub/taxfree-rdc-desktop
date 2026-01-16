"""
Tax Free Form business logic service.
"""
from decimal import Decimal
from datetime import timedelta
from django.utils import timezone

from apps.taxfree.models import TaxFreeForm, Traveler, TaxFreeFormStatus
from apps.rules.models import RuleSet
from apps.audit.services import AuditService


class TaxFreeService:
    """Service for tax free form operations."""
    
    @classmethod
    def create_form(cls, invoice, traveler, user):
        """
        Create a tax free form from an invoice and traveler.
        
        Args:
            invoice: SaleInvoice instance
            traveler: Traveler instance
            user: User creating the form
            
        Returns:
            TaxFreeForm instance
        """
        # Get active ruleset
        ruleset = RuleSet.get_active()
        if not ruleset:
            raise ValueError("No active ruleset configured")
        
        # Check eligibility
        eligibility = cls.check_eligibility(invoice, traveler, ruleset)
        if not eligibility['eligible']:
            raise ValueError(f"Not eligible: {', '.join(eligibility['reasons'])}")
        
        # Mark items as eligible/ineligible based on excluded categories
        cls.update_items_eligibility(invoice, ruleset)
        
        # Pre-calculate refund to check if it's positive
        pre_vat = cls.calculate_vat_amount(invoice, ruleset)
        pre_fee = cls.calculate_operator_fee(pre_vat, ruleset)
        pre_refund = pre_vat - pre_fee
        if pre_refund <= 0:
            raise ValueError(f"Not eligible: Refund amount is zero or negative (fees {pre_fee} CDF exceed VAT {pre_vat} CDF)")
        
        # Calculate amounts
        eligible_amount = cls.calculate_eligible_amount(invoice, ruleset)
        vat_amount = cls.calculate_vat_amount(invoice, ruleset)
        operator_fee = cls.calculate_operator_fee(vat_amount, ruleset)
        refund_amount = vat_amount - operator_fee
        
        # Calculate expiry
        expires_at = timezone.now() + timedelta(days=ruleset.exit_deadline_months * 30)
        
        # Calculate risk score
        risk_score, risk_flags = cls.calculate_risk(invoice, traveler, ruleset)
        requires_control = (
            risk_score >= ruleset.risk_score_threshold or
            eligible_amount >= ruleset.high_value_threshold
        )
        
        # Create form
        form = TaxFreeForm.objects.create(
            invoice=invoice,
            traveler=traveler,
            currency=invoice.currency,
            eligible_amount=eligible_amount,
            vat_amount=vat_amount,
            refund_amount=refund_amount,
            operator_fee=operator_fee,
            status=TaxFreeFormStatus.CREATED,
            rule_snapshot=ruleset.to_snapshot(),
            risk_score=risk_score,
            risk_flags=risk_flags,
            requires_control=requires_control,
            expires_at=expires_at,
            created_by=user
        )
        
        return form
    
    @classmethod
    def check_eligibility(cls, invoice, traveler, ruleset):
        """
        Check if invoice/traveler combination is eligible for tax free.
        
        Returns:
            dict with 'eligible' bool and 'reasons' list
        """
        reasons = []
        
        # Check minimum purchase amount
        eligible_amount = cls.calculate_eligible_amount(invoice, ruleset)
        if eligible_amount < ruleset.min_purchase_amount:
            reasons.append(f"Amount below minimum ({ruleset.min_purchase_amount} CDF required, got {eligible_amount} CDF)")
        
        # Check traveler age
        from dateutil.relativedelta import relativedelta
        from datetime import date
        dob = traveler.date_of_birth
        if isinstance(dob, str):
            dob = date.fromisoformat(dob)
        age = relativedelta(timezone.now().date(), dob).years
        if age < ruleset.min_age:
            reasons.append(f"Traveler below minimum age ({ruleset.min_age})")
        
        # Check residence country
        if ruleset.excluded_residence_countries:
            if traveler.residence_country in ruleset.excluded_residence_countries:
                reasons.append("Residence country not eligible")
        
        if ruleset.eligible_residence_countries:
            if traveler.residence_country not in ruleset.eligible_residence_countries:
                reasons.append("Residence country not in eligible list")
        
        # Check merchant status
        if not invoice.merchant.can_create_forms():
            reasons.append("Merchant not approved")
        
        # Check invoice not cancelled
        if invoice.is_cancelled:
            reasons.append("Invoice is cancelled")
        
        # Check no existing form
        if hasattr(invoice, 'taxfree_form'):
            reasons.append("Invoice already has a tax free form")
        
        return {
            'eligible': len(reasons) == 0,
            'reasons': reasons
        }
    
    @classmethod
    def calculate_eligible_amount(cls, invoice, ruleset):
        """Calculate eligible amount from invoice items."""
        total = Decimal('0.00')
        
        for item in invoice.items.all():
            # Skip excluded categories
            if item.product_category in ruleset.excluded_categories:
                continue
            if not item.is_eligible:
                continue
            total += item.line_total
        
        return total
    
    @classmethod
    def calculate_vat_amount(cls, invoice, ruleset):
        """Calculate VAT amount from eligible items."""
        total = Decimal('0.00')
        
        for item in invoice.items.all():
            # Skip excluded categories
            if item.product_category in ruleset.excluded_categories:
                continue
            if not item.is_eligible:
                continue
            total += item.vat_amount
        
        return total
    
    @classmethod
    def calculate_operator_fee(cls, vat_amount, ruleset):
        """Calculate operator fee."""
        percentage_fee = vat_amount * (ruleset.operator_fee_percentage / Decimal('100'))
        total_fee = percentage_fee + ruleset.operator_fee_fixed
        
        # Apply minimum fee
        if total_fee < ruleset.min_operator_fee:
            total_fee = ruleset.min_operator_fee
        
        return total_fee.quantize(Decimal('0.01'))
    
    @classmethod
    def calculate_risk(cls, invoice, traveler, ruleset):
        """
        Calculate risk score and flags.
        
        Returns:
            tuple of (score, flags_list)
        """
        score = 0
        flags = []
        
        # Build context for risk rules
        context = {
            'amount': float(invoice.total_amount),
            'traveler_country': traveler.residence_country,
            'traveler_nationality': traveler.nationality,
            'merchant_id': str(invoice.merchant.id),
            'items_count': invoice.items.count(),
        }
        
        # Evaluate risk rules
        for rule in ruleset.risk_rules.filter(is_active=True):
            rule_score = rule.evaluate(context)
            if rule_score > 0:
                score += rule_score
                flags.append(rule.name)
        
        # Built-in risk checks
        if invoice.total_amount >= ruleset.high_value_threshold:
            score += 20
            flags.append('HIGH_VALUE')
        
        # Check for multiple forms same traveler recently
        recent_forms = TaxFreeForm.objects.filter(
            traveler=traveler,
            created_at__gte=timezone.now() - timedelta(days=7)
        ).count()
        if recent_forms >= 3:
            score += 15
            flags.append('FREQUENT_TRAVELER')
        
        return score, flags
    
    @classmethod
    def update_items_eligibility(cls, invoice, ruleset):
        """
        Update each item's is_eligible and ineligibility_reason based on ruleset.
        This ensures the eligibility status is persisted in the database.
        """
        excluded_categories = ruleset.excluded_categories or []
        
        for item in invoice.items.all():
            is_eligible = True
            reason = ''
            
            # Check if category is excluded
            if item.product_category and item.product_category.upper() in [c.upper() for c in excluded_categories]:
                is_eligible = False
                reason = 'Catégorie exclue de la détaxe'
            
            # Update item if eligibility changed
            if item.is_eligible != is_eligible or item.ineligibility_reason != reason:
                item.is_eligible = is_eligible
                item.ineligibility_reason = reason
                # Use update to avoid triggering save() which recalculates totals
                type(item).objects.filter(pk=item.pk).update(
                    is_eligible=is_eligible,
                    ineligibility_reason=reason
                )
