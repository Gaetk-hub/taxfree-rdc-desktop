"""
Serializers for rules app.
"""
from rest_framework import serializers
from .models import RuleSet, RiskRule, ProductCategory, Currency, ExchangeRateHistory


class ProductCategorySerializer(serializers.ModelSerializer):
    """Serializer for product categories."""
    
    class Meta:
        model = ProductCategory
        fields = [
            'id', 'code', 'name', 'description', 'icon',
            'default_vat_rate', 'is_eligible_by_default',
            'is_active', 'display_order',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ProductCategoryCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating product categories."""
    
    class Meta:
        model = ProductCategory
        fields = [
            'code', 'name', 'description', 'icon',
            'default_vat_rate', 'is_eligible_by_default',
            'is_active', 'display_order'
        ]
    
    def validate_code(self, value):
        # Convert to uppercase
        value = value.upper().replace(' ', '_')
        if ProductCategory.objects.filter(code=value).exists():
            raise serializers.ValidationError('Ce code de catégorie existe déjà')
        return value


class RiskRuleSerializer(serializers.ModelSerializer):
    """Serializer for risk rules."""
    
    class Meta:
        model = RiskRule
        fields = [
            'id', 'name', 'description', 'field', 'operator',
            'value', 'score_impact', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class RuleSetSerializer(serializers.ModelSerializer):
    """Serializer for rule sets."""
    
    risk_rules_count = serializers.IntegerField(source='risk_rules.count', read_only=True)
    
    class Meta:
        model = RuleSet
        fields = [
            'id', 'version', 'name', 'description',
            'min_purchase_amount', 'min_age',
            'purchase_window_days', 'exit_deadline_months',
            'eligible_residence_countries', 'excluded_residence_countries',
            'excluded_categories', 'vat_rates', 'default_vat_rate',
            'operator_fee_percentage', 'operator_fee_fixed', 'min_operator_fee',
            'allowed_refund_methods',
            'risk_score_threshold', 'high_value_threshold',
            'is_active', 'activated_at',
            'risk_rules_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'is_active', 'activated_at', 'created_at', 'updated_at']


class RuleSetDetailSerializer(RuleSetSerializer):
    """Detailed rule set serializer with risk rules."""
    
    risk_rules = RiskRuleSerializer(many=True, read_only=True)
    activated_by_name = serializers.CharField(source='activated_by.full_name', read_only=True)
    
    class Meta(RuleSetSerializer.Meta):
        fields = RuleSetSerializer.Meta.fields + ['risk_rules', 'activated_by_name']


class RuleSetCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating rule sets."""
    
    class Meta:
        model = RuleSet
        fields = [
            'version', 'name', 'description',
            'min_purchase_amount', 'min_age',
            'purchase_window_days', 'exit_deadline_months',
            'eligible_residence_countries', 'excluded_residence_countries',
            'excluded_categories', 'vat_rates', 'default_vat_rate',
            'operator_fee_percentage', 'operator_fee_fixed', 'min_operator_fee',
            'allowed_refund_methods',
            'risk_score_threshold', 'high_value_threshold'
        ]

    def validate_version(self, value):
        if RuleSet.objects.filter(version=value).exists():
            raise serializers.ValidationError('Version already exists')
        return value


class CurrencySerializer(serializers.ModelSerializer):
    """Serializer for currency listing."""
    
    class Meta:
        model = Currency
        fields = [
            'id', 'code', 'name', 'symbol', 'exchange_rate',
            'is_base_currency', 'is_active',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class CurrencyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating currencies."""
    
    class Meta:
        model = Currency
        fields = ['code', 'name', 'symbol', 'exchange_rate', 'is_base_currency', 'is_active']
    
    def validate_code(self, value):
        value = value.upper()
        if len(value) != 3:
            raise serializers.ValidationError('Le code devise doit contenir exactement 3 caractères')
        if Currency.objects.filter(code=value).exists():
            raise serializers.ValidationError('Ce code devise existe déjà')
        return value


class CurrencyUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating currencies."""
    
    reason = serializers.CharField(required=False, write_only=True, allow_blank=True)
    
    class Meta:
        model = Currency
        fields = ['name', 'symbol', 'exchange_rate', 'is_active', 'reason']
    
    def update(self, instance, validated_data):
        reason = validated_data.pop('reason', '')
        old_rate = instance.exchange_rate
        new_rate = validated_data.get('exchange_rate', old_rate)
        
        # Update the currency
        instance = super().update(instance, validated_data)
        
        # Log rate change if rate was modified
        if old_rate != new_rate:
            request = self.context.get('request')
            ExchangeRateHistory.objects.create(
                currency=instance,
                old_rate=old_rate,
                new_rate=new_rate,
                changed_by=request.user if request else None,
                reason=reason
            )
        
        return instance


class ExchangeRateHistorySerializer(serializers.ModelSerializer):
    """Serializer for exchange rate history."""
    
    currency_code = serializers.CharField(source='currency.code', read_only=True)
    changed_by_name = serializers.CharField(source='changed_by.full_name', read_only=True)
    
    class Meta:
        model = ExchangeRateHistory
        fields = [
            'id', 'currency', 'currency_code',
            'old_rate', 'new_rate',
            'changed_by', 'changed_by_name', 'reason',
            'changed_at'
        ]
        read_only_fields = ['id', 'changed_at']


class CurrencyDetailSerializer(CurrencySerializer):
    """Detailed currency serializer with rate history."""
    
    rate_history = ExchangeRateHistorySerializer(many=True, read_only=True)
    
    class Meta(CurrencySerializer.Meta):
        fields = CurrencySerializer.Meta.fields + ['rate_history']
