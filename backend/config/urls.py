"""
URL configuration for Tax Free project.
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView, SpectacularRedocView
from apps.accounts.settings_views import SystemSettingsView

urlpatterns = [
    path('admin/', admin.site.urls),
    
    # API Documentation
    path('api/schema/', SpectacularAPIView.as_view(), name='schema'),
    path('api/docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('api/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # API endpoints
    path('api/auth/', include('apps.accounts.urls')),
    path('api/merchants/', include('apps.merchants.urls')),
    path('api/sales/', include('apps.sales.urls')),
    path('api/taxfree/', include('apps.taxfree.urls')),
    path('api/customs/', include('apps.customs.urls')),
    path('api/refunds/', include('apps.refunds.urls')),
    path('api/disputes/', include('apps.disputes.urls')),
    path('api/rules/', include('apps.rules.urls')),
    path('api/audit/', include('apps.audit.urls')),
    path('api/reports/', include('apps.audit.report_urls')),
    path('api/settings/system/', SystemSettingsView.as_view(), name='system-settings'),
    path('api/support/', include('apps.support.urls')),
]

# B2B VAT module (feature flag)
if settings.FEATURE_B2B_VAT:
    urlpatterns.append(path('api/b2b-vat/', include('apps.b2b_vat.urls')))

# Serve media files in development
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
