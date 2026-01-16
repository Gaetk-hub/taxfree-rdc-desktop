"""
URL configuration for sales app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SaleInvoiceViewSet, SaleItemViewSet

router = DefaultRouter()
router.register('invoices', SaleInvoiceViewSet, basename='invoice')
router.register('items', SaleItemViewSet, basename='sale-item')

urlpatterns = [
    path('', include(router.urls)),
]
