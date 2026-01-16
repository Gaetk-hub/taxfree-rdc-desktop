"""
Admin configuration for rules app.
"""
from django.contrib import admin
from .models import RuleSet, RiskRule


class RiskRuleInline(admin.TabularInline):
    model = RiskRule
    extra = 0


@admin.register(RuleSet)
class RuleSetAdmin(admin.ModelAdmin):
    list_display = ['name', 'version', 'is_active', 'min_purchase_amount', 'default_vat_rate', 'created_at']
    list_filter = ['is_active', 'created_at']
    search_fields = ['name', 'version']
    readonly_fields = ['id', 'activated_at', 'created_at', 'updated_at']
    inlines = [RiskRuleInline]
    
    fieldsets = (
        ('Basic Info', {
            'fields': ('id', 'version', 'name', 'description')
        }),
        ('Eligibility', {
            'fields': ('min_purchase_amount', 'min_age', 'purchase_window_days', 'exit_deadline_months')
        }),
        ('Territories', {
            'fields': ('eligible_residence_countries', 'excluded_residence_countries')
        }),
        ('Products & VAT', {
            'fields': ('excluded_categories', 'vat_rates', 'default_vat_rate')
        }),
        ('Fees', {
            'fields': ('operator_fee_percentage', 'operator_fee_fixed', 'min_operator_fee')
        }),
        ('Refund Methods', {
            'fields': ('allowed_refund_methods',)
        }),
        ('Risk', {
            'fields': ('risk_score_threshold', 'high_value_threshold')
        }),
        ('Status', {
            'fields': ('is_active', 'activated_at', 'activated_by')
        }),
        ('Metadata', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )


@admin.register(RiskRule)
class RiskRuleAdmin(admin.ModelAdmin):
    list_display = ['name', 'ruleset', 'field', 'operator', 'score_impact', 'is_active']
    list_filter = ['ruleset', 'is_active', 'field']
    search_fields = ['name', 'description']
