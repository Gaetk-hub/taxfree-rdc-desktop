"""
Support notification service.
Handles sending notifications for chat and ticket events.
"""
from django.db.models import Q
from apps.accounts.models import User, UserRole, Notification, NotificationType
from apps.accounts.permissions import PermissionService
from services.email_service import SupportEmailService


class SupportNotificationService:
    """Service for sending support-related notifications."""

    @staticmethod
    def get_support_chat_admins():
        """Get all users who should receive chat support notifications (with SUPPORT_CHAT permission)."""
        admins = User.objects.filter(
            Q(role=UserRole.ADMIN) | Q(role=UserRole.AUDITOR),
            is_active=True
        )
        # Filter to only those with SUPPORT_CHAT permission or super admin
        return [
            admin for admin in admins 
            if getattr(admin, 'is_super_admin', False) or PermissionService.has_module_permission(admin, 'SUPPORT_CHAT')
        ]

    @staticmethod
    def get_support_tickets_admins():
        """Get all users who should receive ticket support notifications (with SUPPORT_TICKETS permission)."""
        admins = User.objects.filter(
            Q(role=UserRole.ADMIN) | Q(role=UserRole.AUDITOR),
            is_active=True
        )
        # Filter to only those with SUPPORT_TICKETS permission or super admin
        return [
            admin for admin in admins 
            if getattr(admin, 'is_super_admin', False) or PermissionService.has_module_permission(admin, 'SUPPORT_TICKETS')
        ]

    @staticmethod
    def get_support_admins():
        """Get all users who should receive support notifications (legacy - for backward compatibility)."""
        # Use chat admins as default
        return SupportNotificationService.get_support_chat_admins()

    @staticmethod
    def notify_new_conversation(conversation):
        """Notify admins/operators about a new conversation."""
        admins = SupportNotificationService.get_support_chat_admins()
        admin_emails = [admin.email for admin in admins]
        
        for admin in admins:
            Notification.objects.create(
                user=admin,
                notification_type=NotificationType.NEW_CONVERSATION,
                title=f"💬 Nouvelle conversation - {conversation.reference}",
                message=f"{conversation.user.get_full_name()} a démarré une conversation: {conversation.subject}",
                related_object_type='Conversation',
                related_object_id=conversation.id,
                action_url=f"/admin/support/chat?conversation={conversation.id}"
            )
        
        # Send email notification to admins
        if admin_emails:
            SupportEmailService.send_new_conversation_email(conversation, admin_emails)

    @staticmethod
    def notify_new_chat_message(message):
        """Notify about a new chat message."""
        conversation = message.conversation
        
        if message.is_from_support:
            # Notify the user
            Notification.objects.create(
                user=conversation.user,
                notification_type=NotificationType.NEW_CHAT_MESSAGE,
                title=f"💬 Nouveau message - {conversation.reference}",
                message=f"Le support a répondu à votre conversation: {conversation.subject}",
                related_object_type='Conversation',
                related_object_id=conversation.id,
                action_url=f"/merchant/support?conversation={conversation.id}"
            )
            # Send email to user
            SupportEmailService.send_chat_message_email(
                conversation, message,
                conversation.user.email,
                conversation.user.first_name,
                is_support_reply=True
            )
        else:
            # Notify assigned agent or all admins
            if conversation.assigned_to:
                Notification.objects.create(
                    user=conversation.assigned_to,
                    notification_type=NotificationType.NEW_CHAT_MESSAGE,
                    title=f"💬 Nouveau message - {conversation.reference}",
                    message=f"{conversation.user.get_full_name()}: {message.content[:100]}...",
                    related_object_type='Conversation',
                    related_object_id=conversation.id,
                    action_url=f"/admin/support/chat?conversation={conversation.id}"
                )
                # Send email to assigned agent
                SupportEmailService.send_chat_message_email(
                    conversation, message,
                    conversation.assigned_to.email,
                    conversation.assigned_to.first_name,
                    is_support_reply=False
                )
            else:
                # Notify all admins with SUPPORT_CHAT permission if not assigned
                admins = SupportNotificationService.get_support_chat_admins()
                for admin in admins:
                    Notification.objects.create(
                        user=admin,
                        notification_type=NotificationType.NEW_CHAT_MESSAGE,
                        title=f"💬 Nouveau message - {conversation.reference}",
                        message=f"{conversation.user.get_full_name()}: {message.content[:100]}",
                        related_object_type='Conversation',
                        related_object_id=conversation.id,
                        action_url=f"/admin/support/chat?conversation={conversation.id}"
                    )
                # Send email to all admins
                for admin in admins:
                    SupportEmailService.send_chat_message_email(
                        conversation, message,
                        admin.email,
                        admin.first_name,
                        is_support_reply=False
                    )

    @staticmethod
    def notify_new_ticket(ticket):
        """Notify admins/operators about a new ticket."""
        admins = SupportNotificationService.get_support_tickets_admins()
        admin_emails = [admin.email for admin in admins]
        
        priority_emoji = {
            'LOW': '🟢',
            'MEDIUM': '🟡',
            'HIGH': '🟠',
            'URGENT': '🔴'
        }.get(ticket.priority, '🟡')
        
        for admin in admins:
            Notification.objects.create(
                user=admin,
                notification_type=NotificationType.NEW_TICKET,
                title=f"{priority_emoji} Nouveau ticket - {ticket.ticket_number}",
                message=f"{ticket.created_by.get_full_name()}: {ticket.subject}",
                related_object_type='DisputeTicket',
                related_object_id=ticket.id,
                action_url=f"/admin/support/tickets/{ticket.id}"
            )
        
        # Send email notification to admins
        if admin_emails:
            SupportEmailService.send_new_ticket_email(ticket, admin_emails)

    @staticmethod
    def notify_ticket_assigned(ticket, assigned_by=None):
        """Notify agent when a ticket is assigned to them."""
        if ticket.assigned_to:
            Notification.objects.create(
                user=ticket.assigned_to,
                notification_type=NotificationType.TICKET_ASSIGNED,
                title=f"📋 Ticket assigné - {ticket.ticket_number}",
                message=f"Le ticket '{ticket.subject}' vous a été assigné",
                related_object_type='DisputeTicket',
                related_object_id=ticket.id,
                action_url=f"/admin/support/tickets/{ticket.id}"
            )
            # Also notify the ticket creator that their ticket is being handled
            if ticket.created_by and ticket.created_by != ticket.assigned_to:
                Notification.objects.create(
                    user=ticket.created_by,
                    notification_type=NotificationType.TICKET_ASSIGNED,
                    title=f"📋 Ticket pris en charge - {ticket.ticket_number}",
                    message=f"Votre ticket '{ticket.subject}' a été pris en charge par {ticket.assigned_to.get_full_name()}",
                    related_object_type='DisputeTicket',
                    related_object_id=ticket.id,
                    action_url=f"/merchant/tickets/{ticket.id}"
                )
                # Send email to ticket creator
                SupportEmailService.send_ticket_taken_email(ticket)

    @staticmethod
    def notify_ticket_escalated(ticket):
        """Notify about ticket escalation."""
        if ticket.escalated_to:
            Notification.objects.create(
                user=ticket.escalated_to,
                notification_type=NotificationType.TICKET_ESCALATED,
                title=f"⚠️ Ticket escaladé - {ticket.ticket_number}",
                message=f"Le ticket '{ticket.subject}' a été escaladé vers vous. Raison: {ticket.escalation_reason}",
                related_object_type='DisputeTicket',
                related_object_id=ticket.id,
                action_url=f"/admin/support/tickets?ticket={ticket.id}"
            )

    @staticmethod
    def notify_ticket_resolved(ticket):
        """Notify ticket creator when resolved."""
        if ticket.created_by:
            Notification.objects.create(
                user=ticket.created_by,
                notification_type=NotificationType.TICKET_RESOLVED,
                title=f"✅ Ticket résolu - {ticket.ticket_number}",
                message=f"Votre ticket '{ticket.subject}' a été résolu",
                related_object_type='DisputeTicket',
                related_object_id=ticket.id,
                action_url=f"/merchant/tickets/{ticket.id}"
            )
            # Send email notification
            SupportEmailService.send_ticket_resolved_email(ticket)

    @staticmethod
    def notify_ticket_message(ticket, message, is_internal=False):
        """Notify about new ticket message."""
        if is_internal:
            return  # Don't notify for internal messages
        
        if message.author == ticket.created_by:
            # User sent message, notify assigned agent or admins
            if ticket.assigned_to:
                Notification.objects.create(
                    user=ticket.assigned_to,
                    notification_type=NotificationType.TICKET_MESSAGE,
                    title=f"💬 Nouveau message - {ticket.ticket_number}",
                    message=f"{message.author.get_full_name()}: {message.content[:100]}",
                    related_object_type='DisputeTicket',
                    related_object_id=ticket.id,
                    action_url=f"/admin/support/tickets/{ticket.id}"
                )
                # Send email to assigned agent
                SupportEmailService.send_ticket_message_email(
                    ticket, message, 
                    ticket.assigned_to.email, 
                    ticket.assigned_to.first_name,
                    is_support_reply=False
                )
        else:
            # Support sent message, notify ticket creator
            if ticket.created_by:
                Notification.objects.create(
                    user=ticket.created_by,
                    notification_type=NotificationType.TICKET_MESSAGE,
                    title=f"💬 Réponse à votre ticket - {ticket.ticket_number}",
                    message=f"Le support a répondu à votre ticket: {message.content[:100]}",
                    related_object_type='DisputeTicket',
                    related_object_id=ticket.id,
                    action_url=f"/merchant/tickets/{ticket.id}"
                )
                # Send email to ticket creator
                SupportEmailService.send_ticket_message_email(
                    ticket, message,
                    ticket.created_by.email,
                    ticket.created_by.first_name,
                    is_support_reply=True
                )

    @staticmethod
    def notify_ticket_observer_added(ticket, observer_user, added_by):
        """Notify a user when they are added as an observer to a ticket."""
        # Send email notification
        SupportEmailService.send_ticket_observer_email(ticket, observer_user, added_by)
