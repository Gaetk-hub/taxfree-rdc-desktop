"""
Serializers for disputes app.
Extended with priority, assignment, escalation and history.
"""
from rest_framework import serializers
from .models import (
    DisputeTicket, DisputeMessage, Attachment, DisputeStatus,
    TicketPriority, TicketHistory, TicketHistoryAction
)


class AttachmentSerializer(serializers.ModelSerializer):
    """Serializer for attachments."""
    
    uploaded_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = Attachment
        fields = [
            'id', 'file', 'filename', 'file_type', 'file_size',
            'description', 'uploaded_by', 'uploaded_by_name', 'created_at'
        ]
        read_only_fields = ['id', 'file_size', 'created_at']

    def get_uploaded_by_name(self, obj):
        return obj.uploaded_by.get_full_name() if obj.uploaded_by else None


class DisputeMessageSerializer(serializers.ModelSerializer):
    """Serializer for dispute messages."""
    
    author_name = serializers.SerializerMethodField()
    author_role = serializers.CharField(source='author.role', read_only=True)
    attachments = AttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = DisputeMessage
        fields = ['id', 'author', 'author_name', 'author_role', 'is_internal', 'content', 'attachments', 'created_at']
        read_only_fields = ['id', 'author', 'created_at']

    def get_author_name(self, obj):
        return obj.author.get_full_name() if obj.author else None


class TicketHistorySerializer(serializers.ModelSerializer):
    """Serializer for ticket history."""
    
    performed_by_name = serializers.SerializerMethodField()
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    
    class Meta:
        model = TicketHistory
        fields = [
            'id', 'action', 'action_display', 'performed_by', 'performed_by_name',
            'old_value', 'new_value', 'details', 'created_at'
        ]

    def get_performed_by_name(self, obj):
        return obj.performed_by.get_full_name() if obj.performed_by else 'Système'


class DisputeTicketSerializer(serializers.ModelSerializer):
    """Serializer for dispute tickets list."""
    
    form_number = serializers.CharField(source='form.form_number', read_only=True)
    type_display = serializers.CharField(source='get_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    messages_count = serializers.IntegerField(source='messages.count', read_only=True)
    attachments_count = serializers.IntegerField(source='attachments.count', read_only=True)
    assigned_to_name = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = DisputeTicket
        fields = [
            'id', 'ticket_number', 'form', 'form_number',
            'type', 'type_display', 'subject', 'description',
            'priority', 'priority_display',
            'status', 'status_display',
            'assigned_to', 'assigned_to_name', 'assigned_at',
            'is_escalated', 'escalated_to', 'escalated_at',
            'resolution', 'resolved_at', 'resolved_by',
            'contact_email', 'contact_phone',
            'created_by', 'created_by_name',
            'sla_due_at', 'is_overdue', 'first_response_at',
            'messages_count', 'attachments_count',
            'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'ticket_number', 'status', 'resolution',
            'resolved_at', 'resolved_by', 'assigned_at',
            'escalated_at', 'first_response_at', 'sla_due_at',
            'created_at', 'updated_at'
        ]

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() if obj.assigned_to else None

    def get_created_by_name(self, obj):
        return obj.created_by.get_full_name() if obj.created_by else None

    def get_is_overdue(self, obj):
        from django.utils import timezone
        if obj.sla_due_at and obj.status not in [DisputeStatus.RESOLVED, DisputeStatus.CLOSED, DisputeStatus.REJECTED]:
            return timezone.now() > obj.sla_due_at
        return False


class DisputeTicketDetailSerializer(DisputeTicketSerializer):
    """Detailed dispute ticket serializer with messages, attachments and history."""
    
    messages = serializers.SerializerMethodField()
    attachments = AttachmentSerializer(many=True, read_only=True)
    history = TicketHistorySerializer(many=True, read_only=True)
    resolved_by_name = serializers.SerializerMethodField()
    escalated_to_name = serializers.SerializerMethodField()
    
    class Meta(DisputeTicketSerializer.Meta):
        fields = DisputeTicketSerializer.Meta.fields + [
            'messages', 'attachments', 'history', 'resolved_by_name', 'escalated_to_name'
        ]

    def get_messages(self, obj):
        """Filter out internal messages for non-support users."""
        request = self.context.get('request')
        messages = obj.messages.all()
        
        # If user is not support, filter out internal messages
        if request and request.user:
            from apps.accounts.models import UserRole
            if request.user.role not in [UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR]:
                messages = messages.filter(is_internal=False)
        
        return DisputeMessageSerializer(messages, many=True).data

    def get_resolved_by_name(self, obj):
        return obj.resolved_by.get_full_name() if obj.resolved_by else None

    def get_escalated_to_name(self, obj):
        return obj.escalated_to.get_full_name() if obj.escalated_to else None


class DisputeTicketCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating dispute tickets."""
    
    class Meta:
        model = DisputeTicket
        fields = [
            'form', 'refund', 'merchant', 'type', 'priority',
            'subject', 'description', 'contact_email', 'contact_phone'
        ]


class DisputeMessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating dispute messages."""
    
    class Meta:
        model = DisputeMessage
        fields = ['content', 'is_internal']


class DisputeResolveSerializer(serializers.Serializer):
    """Serializer for resolving disputes."""
    
    resolution = serializers.CharField()
    status = serializers.ChoiceField(
        choices=[DisputeStatus.RESOLVED, DisputeStatus.REJECTED]
    )


class DisputeStatusUpdateSerializer(serializers.Serializer):
    """Serializer for updating dispute status."""
    
    status = serializers.ChoiceField(choices=DisputeStatus.choices)
    note = serializers.CharField(required=False, allow_blank=True)


class TicketAssignSerializer(serializers.Serializer):
    """Serializer for assigning a ticket."""
    
    agent_id = serializers.UUIDField()


class TicketEscalateSerializer(serializers.Serializer):
    """Serializer for escalating a ticket."""
    
    to_user_id = serializers.UUIDField()
    reason = serializers.CharField()


class TicketPriorityUpdateSerializer(serializers.Serializer):
    """Serializer for updating ticket priority."""
    
    priority = serializers.ChoiceField(choices=TicketPriority.choices)
