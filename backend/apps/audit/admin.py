"""
Admin configuration for audit app.
"""
from django.contrib import admin
from .models import AuditLog


@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ['action', 'entity', 'entity_id', 'actor_email', 'timestamp']
    list_filter = ['action', 'entity', 'timestamp']
    search_fields = ['entity_id', 'actor_email', 'action']
    readonly_fields = [
        'id', 'actor_id', 'actor_email', 'actor_role', 'actor_ip',
        'action', 'entity', 'entity_id', 'metadata', 'timestamp'
    ]
    ordering = ['-timestamp']
    
    def has_add_permission(self, request):
        return False
    
    def has_change_permission(self, request, obj=None):
        return False
    
    def has_delete_permission(self, request, obj=None):
        return False
