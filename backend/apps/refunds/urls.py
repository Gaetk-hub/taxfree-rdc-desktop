"""
URL configuration for refunds app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RefundViewSet, PaymentAttemptViewSet

router = DefaultRouter()
router.register('', RefundViewSet, basename='refund')
router.register('attempts', PaymentAttemptViewSet, basename='payment-attempt')

urlpatterns = [
    path('', include(router.urls)),
]
