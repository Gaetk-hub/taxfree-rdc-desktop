"""
URL configuration for Support app.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    ConversationViewSet, ChatMessageViewSet,
    TrainingCategoryViewSet, TrainingContentViewSet, TrainingProgressViewSet
)

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'messages', ChatMessageViewSet, basename='chat-message')
router.register(r'training/categories', TrainingCategoryViewSet, basename='training-category')
router.register(r'training/content', TrainingContentViewSet, basename='training-content')
router.register(r'training/progress', TrainingProgressViewSet, basename='training-progress')

urlpatterns = [
    path('', include(router.urls)),
]
