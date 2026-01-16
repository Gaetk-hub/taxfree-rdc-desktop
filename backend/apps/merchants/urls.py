"""
URL configuration for merchants app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    MerchantViewSet, OutletViewSet, POSDeviceViewSet,
    MerchantOutletViewSet, MerchantUserViewSet, MerchantDashboardView,
    MerchantTravelersView, MerchantTravelerDetailView, MerchantReportsView
)

router = DefaultRouter()
router.register('', MerchantViewSet, basename='merchant')
router.register('outlets', OutletViewSet, basename='outlet')
router.register('pos-devices', POSDeviceViewSet, basename='pos-device')

# Merchant management routes (for merchant admins to manage their own resources)
merchant_router = DefaultRouter()
merchant_router.register('my-outlets', MerchantOutletViewSet, basename='my-outlet')
merchant_router.register('my-users', MerchantUserViewSet, basename='my-user')

urlpatterns = [
    path('', include(router.urls)),
    path('manage/', include(merchant_router.urls)),
    path('manage/dashboard/', MerchantDashboardView.as_view(), name='merchant-dashboard'),
    path('manage/travelers/', MerchantTravelersView.as_view(), name='merchant-travelers'),
    path('manage/travelers/<uuid:traveler_id>/', MerchantTravelerDetailView.as_view(), name='merchant-traveler-detail'),
    path('manage/reports/', MerchantReportsView.as_view(), name='merchant-reports'),
]
