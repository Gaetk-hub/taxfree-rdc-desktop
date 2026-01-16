"""
Admin configuration for disputes app.
Extended with priority, assignment, escalation and history.
"""
from django.contrib import admin
from .models import DisputeTicket, DisputeMessage, Attachment, TicketHistory


class DisputeMessageInline(admin.TabularInline):
    model = DisputeMessage
    extra = 0
    readonly_fields = ['author', 'created_at']


class AttachmentInline(admin.TabularInline):
    model = Attachment
    extra = 0
    readonly_fields = ['uploaded_by', 'file_size', 'created_at']
    fk_name = 'ticket'


class TicketHistoryInline(admin.TabularInline):
    model = TicketHistory
    extra = 0
    readonly_fields = ['action', 'performed_by', 'old_value', 'new_value', 'details', 'created_at']
    can_delete = False
    ordering = ['-created_at']


@admin.register(DisputeTicket)
class DisputeTicketAdmin(admin.ModelAdmin):
    list_display = ['ticket_number', 'type', 'priority', 'subject', 'status', 'assigned_to', 'is_escalated', 'is_overdue', 'created_at']
    list_filter = ['status', 'priority', 'type', 'is_escalated', 'created_at']
    search_fields = ['ticket_number', 'subject', 'description', 'created_by__email']
    raw_id_fields = ['form', 'refund', 'merchant', 'created_by', 'resolved_by', 'assigned_to', 'escalated_to']
    readonly_fields = ['id', 'ticket_number', 'sla_due_at', 'first_response_at', 'created_at', 'updated_at']
    inlines = [DisputeMessageInline, AttachmentInline, TicketHistoryInline]
    
    fieldsets = (
        ('Ticket Info', {
            'fields': ('id', 'ticket_number', 'type', 'priority', 'subject', 'description')
        }),
        ('Contexte', {
            'fields': ('form', 'refund', 'merchant'),
            'classes': ('collapse',)
        }),
        ('Statut', {
            'fields': ('status', 'resolution', 'resolved_at', 'resolved_by')
        }),
        ('Assignation', {
            'fields': ('assigned_to', 'assigned_at')
        }),
        ('Escalade', {
            'fields': ('is_escalated', 'escalated_to', 'escalated_at', 'escalation_reason'),
            'classes': ('collapse',)
        }),
        ('SLA', {
            'fields': ('sla_due_at', 'first_response_at')
        }),
        ('Contact', {
            'fields': ('contact_email', 'contact_phone')
        }),
        ('Métadonnées', {
            'fields': ('created_by', 'created_at', 'updated_at')
        }),
    )

    def is_overdue(self, obj):
        from django.utils import timezone
        if obj.sla_due_at and obj.status not in ['RESOLVED', 'CLOSED', 'REJECTED']:
            return timezone.now() > obj.sla_due_at
        return False
    is_overdue.boolean = True
    is_overdue.short_description = 'En retard'


@admin.register(DisputeMessage)
class DisputeMessageAdmin(admin.ModelAdmin):
    list_display = ['ticket', 'author', 'is_internal', 'created_at']
    list_filter = ['is_internal', 'created_at']
    search_fields = ['ticket__ticket_number', 'content']


@admin.register(Attachment)
class AttachmentAdmin(admin.ModelAdmin):
    list_display = ['filename', 'ticket', 'form', 'file_type', 'file_size', 'created_at']
    list_filter = ['file_type', 'created_at']
    search_fields = ['filename', 'description']
