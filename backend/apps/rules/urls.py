"""
URL configuration for rules app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    RuleSetViewSet, RiskRuleViewSet, ProductCategoryViewSet,
    CurrencyViewSet, ExchangeRateHistoryViewSet
)

router = DefaultRouter()
router.register('rulesets', RuleSetViewSet, basename='ruleset')
router.register('risk-rules', RiskRuleViewSet, basename='risk-rule')
router.register('categories', ProductCategoryViewSet, basename='category')
router.register('currencies', CurrencyViewSet, basename='currency')
router.register('exchange-rate-history', ExchangeRateHistoryViewSet, basename='exchange-rate-history')

urlpatterns = [
    path('', include(router.urls)),
]
