"""
Dispute and Ticket models.
Extended with priority, assignment, escalation and history tracking.
"""
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


class DisputeType(models.TextChoices):
    VALIDATION_MISSED = 'VALIDATION_MISSED', _('Validation manquée')
    AMOUNT_ERROR = 'AMOUNT_ERROR', _('Erreur de montant')
    IDENTITY_ISSUE = 'IDENTITY_ISSUE', _('Problème d\'identité')
    REFUND_NOT_RECEIVED = 'REFUND_NOT_RECEIVED', _('Remboursement non reçu')
    WRONG_REFUND_AMOUNT = 'WRONG_REFUND_AMOUNT', _('Montant de remboursement incorrect')
    TECHNICAL = 'TECHNICAL', _('Problème technique')
    ACCOUNT = 'ACCOUNT', _('Problème de compte')
    MERCHANT = 'MERCHANT', _('Question commerçant')
    CUSTOMS = 'CUSTOMS', _('Question douane')
    OTHER = 'OTHER', _('Autre')


class DisputeStatus(models.TextChoices):
    NEW = 'NEW', _('Nouveau')
    OPEN = 'OPEN', _('Ouvert')
    IN_PROGRESS = 'IN_PROGRESS', _('En cours')
    NEED_INFO = 'NEED_INFO', _('Informations requises')
    UNDER_REVIEW = 'UNDER_REVIEW', _('En révision')
    ESCALATED = 'ESCALATED', _('Escaladé')
    RESOLVED = 'RESOLVED', _('Résolu')
    CLOSED = 'CLOSED', _('Fermé')
    REJECTED = 'REJECTED', _('Rejeté')


class TicketPriority(models.TextChoices):
    LOW = 'LOW', _('Basse')
    MEDIUM = 'MEDIUM', _('Moyenne')
    HIGH = 'HIGH', _('Haute')
    URGENT = 'URGENT', _('Urgente')


class DisputeTicket(models.Model):
    """
    Dispute/Support ticket for issues with tax free forms or general support.
    Extended with priority, assignment, escalation and full history tracking.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Reference number
    ticket_number = models.CharField(max_length=20, unique=True, editable=False)
    
    # Form reference (optional - might be for general issues)
    form = models.ForeignKey(
        'taxfree.TaxFreeForm',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='disputes'
    )
    
    # Related entities for context
    refund = models.ForeignKey(
        'refunds.Refund',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets'
    )
    merchant = models.ForeignKey(
        'merchants.Merchant',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='tickets'
    )
    
    # Type and description
    type = models.CharField(
        max_length=30,
        choices=DisputeType.choices
    )
    subject = models.CharField(max_length=255)
    description = models.TextField()
    
    # Priority
    priority = models.CharField(
        max_length=10,
        choices=TicketPriority.choices,
        default=TicketPriority.MEDIUM
    )
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=DisputeStatus.choices,
        default=DisputeStatus.NEW
    )
    
    # Assignment
    assigned_to = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_tickets',
        help_text=_('Support agent handling this ticket')
    )
    assigned_at = models.DateTimeField(null=True, blank=True)
    
    # Escalation
    is_escalated = models.BooleanField(default=False)
    escalated_to = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='escalated_tickets'
    )
    escalated_at = models.DateTimeField(null=True, blank=True)
    escalation_reason = models.TextField(blank=True)
    
    # Resolution
    resolution = models.TextField(blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='resolved_disputes'
    )
    
    # Contact info (for travelers without accounts)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=20, blank=True)
    
    # Creator
    created_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_disputes'
    )
    
    # SLA tracking
    first_response_at = models.DateTimeField(null=True, blank=True)
    sla_due_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('ticket support')
        verbose_name_plural = _('tickets support')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'priority']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['created_by', 'status']),
        ]

    def __str__(self):
        return f"{self.ticket_number} - {self.subject}"

    def save(self, *args, **kwargs):
        if not self.ticket_number:
            self.ticket_number = self.generate_ticket_number()
        # Set SLA due date based on priority
        if not self.sla_due_at and self.priority:
            self.sla_due_at = self._calculate_sla_due()
        super().save(*args, **kwargs)

    def _calculate_sla_due(self):
        """Calculate SLA due date based on priority."""
        from datetime import timedelta
        sla_hours = {
            TicketPriority.URGENT: 4,
            TicketPriority.HIGH: 8,
            TicketPriority.MEDIUM: 24,
            TicketPriority.LOW: 72,
        }
        hours = sla_hours.get(self.priority, 24)
        return timezone.now() + timedelta(hours=hours)

    @classmethod
    def generate_ticket_number(cls):
        """Generate unique ticket number."""
        import random
        import string
        
        prefix = timezone.now().strftime('%Y%m')
        suffix = ''.join(random.choices(string.digits, k=6))
        return f"TKT{prefix}{suffix}"

    def assign_to(self, agent, assigned_by=None):
        """Assign ticket to a support agent."""
        self.assigned_to = agent
        self.assigned_at = timezone.now()
        if self.status == DisputeStatus.NEW:
            self.status = DisputeStatus.IN_PROGRESS
        self.save()
        # Log history
        TicketHistory.objects.create(
            ticket=self,
            action='ASSIGNED',
            performed_by=assigned_by,
            details=f'Assigné à {agent.get_full_name()}'
        )

    def escalate(self, to_user, reason, escalated_by=None):
        """Escalate ticket to a supervisor."""
        self.is_escalated = True
        self.escalated_to = to_user
        self.escalated_at = timezone.now()
        self.escalation_reason = reason
        self.status = DisputeStatus.ESCALATED
        self.save()
        # Log history
        TicketHistory.objects.create(
            ticket=self,
            action='ESCALATED',
            performed_by=escalated_by,
            details=f'Escaladé à {to_user.get_full_name()}: {reason}'
        )

    def resolve(self, resolution, resolved_by):
        """Resolve the ticket."""
        self.resolution = resolution
        self.resolved_at = timezone.now()
        self.resolved_by = resolved_by
        self.status = DisputeStatus.RESOLVED
        self.save()
        # Log history
        TicketHistory.objects.create(
            ticket=self,
            action='RESOLVED',
            performed_by=resolved_by,
            details=resolution[:500] if resolution else 'Résolu'
        )

    def close(self, closed_by=None):
        """Close the ticket."""
        self.status = DisputeStatus.CLOSED
        self.save()
        TicketHistory.objects.create(
            ticket=self,
            action='CLOSED',
            performed_by=closed_by,
            details='Ticket fermé'
        )


class DisputeMessage(models.Model):
    """Message in a dispute thread."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    ticket = models.ForeignKey(
        DisputeTicket,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    
    # Author
    author = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='dispute_messages'
    )
    is_internal = models.BooleanField(
        default=False,
        help_text=_('Internal notes not visible to traveler')
    )
    
    content = models.TextField()
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('dispute message')
        verbose_name_plural = _('dispute messages')
        ordering = ['created_at']

    def __str__(self):
        return f"Message on {self.ticket.ticket_number}"


class Attachment(models.Model):
    """File attachment for disputes or forms."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Can be attached to ticket, message or form
    ticket = models.ForeignKey(
        DisputeTicket,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attachments'
    )
    message = models.ForeignKey(
        DisputeMessage,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attachments'
    )
    form = models.ForeignKey(
        'taxfree.TaxFreeForm',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='attachments'
    )
    
    # File
    file = models.FileField(upload_to='attachments/%Y/%m/')
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100, blank=True)
    file_size = models.IntegerField(default=0)
    
    # Metadata
    description = models.CharField(max_length=255, blank=True)
    uploaded_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='uploaded_attachments'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('attachment')
        verbose_name_plural = _('attachments')
        ordering = ['-created_at']

    def __str__(self):
        return self.filename


class TicketHistoryAction(models.TextChoices):
    CREATED = 'CREATED', _('Créé')
    ASSIGNED = 'ASSIGNED', _('Assigné')
    REASSIGNED = 'REASSIGNED', _('Réassigné')
    STATUS_CHANGED = 'STATUS_CHANGED', _('Statut modifié')
    PRIORITY_CHANGED = 'PRIORITY_CHANGED', _('Priorité modifiée')
    ESCALATED = 'ESCALATED', _('Escaladé')
    MESSAGE_ADDED = 'MESSAGE_ADDED', _('Message ajouté')
    ATTACHMENT_ADDED = 'ATTACHMENT_ADDED', _('Pièce jointe ajoutée')
    RESOLVED = 'RESOLVED', _('Résolu')
    CLOSED = 'CLOSED', _('Fermé')
    REOPENED = 'REOPENED', _('Réouvert')


class TicketHistory(models.Model):
    """
    Complete history/audit trail for ticket actions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    ticket = models.ForeignKey(
        DisputeTicket,
        on_delete=models.CASCADE,
        related_name='history'
    )
    
    action = models.CharField(
        max_length=20,
        choices=TicketHistoryAction.choices
    )
    
    performed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='ticket_actions'
    )
    
    # Previous and new values for status/priority changes
    old_value = models.CharField(max_length=50, blank=True)
    new_value = models.CharField(max_length=50, blank=True)
    
    # Additional details
    details = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('historique ticket')
        verbose_name_plural = _('historiques tickets')
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.ticket.ticket_number} - {self.action}"


class TicketObserver(models.Model):
    """
    Observers/CC for a ticket - users who can view and follow the ticket.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    ticket = models.ForeignKey(
        DisputeTicket,
        on_delete=models.CASCADE,
        related_name='observers'
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='observed_tickets'
    )
    added_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='added_ticket_observers'
    )
    added_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = _('observateur ticket')
        verbose_name_plural = _('observateurs tickets')
        unique_together = ['ticket', 'user']
        ordering = ['-added_at']

    def __str__(self):
        return f"{self.user.get_full_name()} observe {self.ticket.ticket_number}"
