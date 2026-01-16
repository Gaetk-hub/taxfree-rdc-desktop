"""
URL configuration for disputes app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import DisputeTicketViewSet, AttachmentViewSet

router = DefaultRouter()
router.register('', DisputeTicketViewSet, basename='dispute')
router.register('attachments', AttachmentViewSet, basename='attachment')

urlpatterns = [
    path('', include(router.urls)),
]
