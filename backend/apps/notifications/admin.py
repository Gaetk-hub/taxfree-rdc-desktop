"""
Admin configuration for notifications app.
"""
from django.contrib import admin
from .models import NotificationTemplate, OutboundNotification


@admin.register(NotificationTemplate)
class NotificationTemplateAdmin(admin.ModelAdmin):
    list_display = ['code', 'name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['code', 'name']


@admin.register(OutboundNotification)
class OutboundNotificationAdmin(admin.ModelAdmin):
    list_display = ['type', 'user', 'email', 'status', 'created_at', 'sent_at']
    list_filter = ['type', 'status', 'created_at']
    search_fields = ['email', 'phone', 'subject']
    readonly_fields = ['id', 'created_at', 'sent_at', 'read_at']
