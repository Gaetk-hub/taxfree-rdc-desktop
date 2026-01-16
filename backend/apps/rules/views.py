"""
Views for rules app.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from django.db import transaction

from apps.accounts.permissions import IsAdmin, IsAdminOrReadOnly
from apps.audit.services import AuditService
from .models import RuleSet, RiskRule, ProductCategory, Currency, ExchangeRateHistory
from .serializers import (
    RuleSetSerializer, RuleSetDetailSerializer, RuleSetCreateSerializer,
    RiskRuleSerializer, ProductCategorySerializer, ProductCategoryCreateSerializer,
    CurrencySerializer, CurrencyCreateSerializer, CurrencyUpdateSerializer,
    CurrencyDetailSerializer, ExchangeRateHistorySerializer
)


class RuleSetViewSet(viewsets.ModelViewSet):
    """ViewSet for rule set management."""
    
    queryset = RuleSet.objects.all()
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filterset_fields = ['is_active']
    search_fields = ['name', 'version']
    ordering_fields = ['created_at', 'version']

    def get_serializer_class(self):
        if self.action == 'create':
            return RuleSetCreateSerializer
        if self.action == 'retrieve':
            return RuleSetDetailSerializer
        return RuleSetSerializer

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a rule set (deactivates others)."""
        ruleset = self.get_object()
        
        with transaction.atomic():
            # Deactivate all other rulesets
            RuleSet.objects.filter(is_active=True).update(is_active=False)
            
            # Activate this one
            ruleset.is_active = True
            ruleset.activated_at = timezone.now()
            ruleset.activated_by = request.user
            ruleset.save()
        
        AuditService.log(
            actor=request.user,
            action='RULESET_ACTIVATED',
            entity='RuleSet',
            entity_id=str(ruleset.id),
            metadata={
                'version': ruleset.version,
                'name': ruleset.name
            }
        )
        
        return Response(RuleSetDetailSerializer(ruleset).data)

    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a rule set with a new version."""
        original = self.get_object()
        new_version = request.data.get('version')
        
        if not new_version:
            return Response(
                {'error': 'New version is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if RuleSet.objects.filter(version=new_version).exists():
            return Response(
                {'error': 'Version already exists'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create copy
        new_ruleset = RuleSet.objects.create(
            version=new_version,
            name=f"{original.name} (Copy)",
            description=original.description,
            min_purchase_amount=original.min_purchase_amount,
            min_age=original.min_age,
            purchase_window_days=original.purchase_window_days,
            exit_deadline_months=original.exit_deadline_months,
            eligible_residence_countries=original.eligible_residence_countries,
            excluded_residence_countries=original.excluded_residence_countries,
            excluded_categories=original.excluded_categories,
            vat_rates=original.vat_rates,
            default_vat_rate=original.default_vat_rate,
            operator_fee_percentage=original.operator_fee_percentage,
            operator_fee_fixed=original.operator_fee_fixed,
            min_operator_fee=original.min_operator_fee,
            allowed_refund_methods=original.allowed_refund_methods,
            risk_score_threshold=original.risk_score_threshold,
            high_value_threshold=original.high_value_threshold,
            created_by=request.user
        )
        
        # Copy risk rules
        for rule in original.risk_rules.all():
            RiskRule.objects.create(
                ruleset=new_ruleset,
                name=rule.name,
                description=rule.description,
                field=rule.field,
                operator=rule.operator,
                value=rule.value,
                score_impact=rule.score_impact,
                is_active=rule.is_active
            )
        
        return Response(RuleSetDetailSerializer(new_ruleset).data, status=status.HTTP_201_CREATED)

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get the currently active rule set."""
        ruleset = RuleSet.get_active()
        if not ruleset:
            return Response(
                {'error': 'No active rule set'},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response(RuleSetDetailSerializer(ruleset).data)


class RiskRuleViewSet(viewsets.ModelViewSet):
    """ViewSet for risk rule management."""
    
    queryset = RiskRule.objects.all()
    serializer_class = RiskRuleSerializer
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filterset_fields = ['ruleset', 'is_active', 'field']
    search_fields = ['name', 'description']


class ProductCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for product category management."""
    
    queryset = ProductCategory.objects.all()
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filterset_fields = ['is_active', 'is_eligible_by_default']
    search_fields = ['code', 'name', 'description']
    ordering_fields = ['display_order', 'name', 'created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return ProductCategoryCreateSerializer
        return ProductCategorySerializer

    def get_permissions(self):
        # Allow anyone to list/retrieve/active categories (needed for forms)
        if self.action in ['list', 'retrieve', 'active']:
            return [AllowAny()]
        return [IsAuthenticated(), IsAdmin()]

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active categories."""
        categories = ProductCategory.objects.filter(is_active=True).order_by('display_order', 'name')
        serializer = ProductCategorySerializer(categories, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def toggle_eligibility(self, request, pk=None):
        """Toggle the default eligibility of a category."""
        category = self.get_object()
        category.is_eligible_by_default = not category.is_eligible_by_default
        category.save()
        
        AuditService.log(
            actor=request.user,
            action='CATEGORY_ELIGIBILITY_TOGGLED',
            entity='ProductCategory',
            entity_id=str(category.id),
            metadata={
                'code': category.code,
                'is_eligible_by_default': category.is_eligible_by_default
            }
        )
        
        return Response(ProductCategorySerializer(category).data)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle the active status of a category."""
        category = self.get_object()
        category.is_active = not category.is_active
        category.save()
        
        AuditService.log(
            actor=request.user,
            action='CATEGORY_STATUS_TOGGLED',
            entity='ProductCategory',
            entity_id=str(category.id),
            metadata={
                'code': category.code,
                'is_active': category.is_active
            }
        )
        
        return Response(ProductCategorySerializer(category).data)


class CurrencyViewSet(viewsets.ModelViewSet):
    """ViewSet for currency management."""
    
    queryset = Currency.objects.all()
    permission_classes = [IsAuthenticated, IsAdminOrReadOnly]
    filterset_fields = ['is_active', 'is_base_currency']
    search_fields = ['code', 'name']
    ordering_fields = ['code', 'created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return CurrencyCreateSerializer
        if self.action in ['update', 'partial_update']:
            return CurrencyUpdateSerializer
        if self.action == 'retrieve':
            return CurrencyDetailSerializer
        return CurrencySerializer

    def get_permissions(self):
        # Allow authenticated users to list/retrieve currencies (needed for refund form)
        if self.action in ['list', 'retrieve', 'active']:
            return [IsAuthenticated()]
        return [IsAuthenticated(), IsAdmin()]

    def perform_create(self, serializer):
        currency = serializer.save()
        AuditService.log(
            actor=self.request.user,
            action='CURRENCY_CREATED',
            entity='Currency',
            entity_id=str(currency.id),
            metadata={
                'code': currency.code,
                'name': currency.name,
                'exchange_rate': str(currency.exchange_rate)
            }
        )

    def perform_update(self, serializer):
        old_rate = serializer.instance.exchange_rate
        currency = serializer.save()
        AuditService.log(
            actor=self.request.user,
            action='CURRENCY_UPDATED',
            entity='Currency',
            entity_id=str(currency.id),
            metadata={
                'code': currency.code,
                'old_rate': str(old_rate),
                'new_rate': str(currency.exchange_rate)
            }
        )

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get all active currencies for refund selection."""
        currencies = Currency.objects.filter(is_active=True).order_by('-is_base_currency', 'code')
        serializer = CurrencySerializer(currencies, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def toggle_active(self, request, pk=None):
        """Toggle the active status of a currency."""
        currency = self.get_object()
        
        # Cannot deactivate base currency
        if currency.is_base_currency and currency.is_active:
            return Response(
                {'error': 'Cannot deactivate the base currency'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        currency.is_active = not currency.is_active
        currency.save()
        
        AuditService.log(
            actor=request.user,
            action='CURRENCY_STATUS_TOGGLED',
            entity='Currency',
            entity_id=str(currency.id),
            metadata={
                'code': currency.code,
                'is_active': currency.is_active
            }
        )
        
        return Response(CurrencySerializer(currency).data)

    @action(detail=True, methods=['get'])
    def history(self, request, pk=None):
        """Get exchange rate history for a currency."""
        currency = self.get_object()
        history = currency.rate_history.all()[:50]
        serializer = ExchangeRateHistorySerializer(history, many=True)
        return Response({
            'currency': CurrencySerializer(currency).data,
            'history': serializer.data
        })


class ExchangeRateHistoryViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing exchange rate history."""
    
    queryset = ExchangeRateHistory.objects.all()
    serializer_class = ExchangeRateHistorySerializer
    permission_classes = [IsAuthenticated, IsAdmin]
    filterset_fields = ['currency']
    ordering_fields = ['changed_at']
