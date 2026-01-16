"""
URL configuration for taxfree app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TravelerViewSet, TaxFreeFormViewSet, TravelerStatusCheckView
from .admin_views import AdminTaxFreeFormViewSet, AdminRefundViewSet
from .override_views import StatusOverrideViewSet

router = DefaultRouter()
router.register('travelers', TravelerViewSet, basename='traveler')
router.register('forms', TaxFreeFormViewSet, basename='taxfree-form')

# Admin router for full traceability views
admin_router = DefaultRouter()
admin_router.register('forms', AdminTaxFreeFormViewSet, basename='admin-taxfree-form')
admin_router.register('refunds', AdminRefundViewSet, basename='admin-refund')
admin_router.register('overrides', StatusOverrideViewSet, basename='admin-override')

urlpatterns = [
    path('status/', TravelerStatusCheckView.as_view(), name='traveler-status'),
    path('admin/', include(admin_router.urls)),
    path('', include(router.urls)),
]
