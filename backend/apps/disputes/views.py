"""
Views for disputes app.
Extended with assignment, escalation and priority management.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django_filters.rest_framework import DjangoFilterBackend
from django.utils import timezone

from apps.accounts.permissions import IsAdmin, IsAdminOrAuditor, PermissionService
from apps.accounts.models import User, UserRole
from apps.audit.services import AuditService
from apps.support.services import SupportNotificationService
from .models import DisputeTicket, DisputeMessage, Attachment, DisputeStatus, TicketHistory, TicketHistoryAction, TicketObserver
from .serializers import (
    DisputeTicketSerializer, DisputeTicketDetailSerializer,
    DisputeTicketCreateSerializer, DisputeMessageSerializer,
    DisputeMessageCreateSerializer, DisputeResolveSerializer,
    DisputeStatusUpdateSerializer, AttachmentSerializer,
    TicketAssignSerializer, TicketEscalateSerializer, TicketPriorityUpdateSerializer
)


class DisputeTicketViewSet(viewsets.ModelViewSet):
    """ViewSet for dispute ticket management with assignment, escalation and priority."""
    
    queryset = DisputeTicket.objects.all()
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'type', 'priority', 'assigned_to', 'is_escalated', 'form', 'merchant']
    search_fields = ['ticket_number', 'subject', 'description', 'created_by__email']
    ordering_fields = ['created_at', 'updated_at', 'priority', 'sla_due_at', 'status']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.action == 'create':
            return DisputeTicketCreateSerializer
        if self.action == 'retrieve':
            return DisputeTicketDetailSerializer
        if self.action == 'resolve':
            return DisputeResolveSerializer
        if self.action == 'update_status':
            return DisputeStatusUpdateSerializer
        if self.action == 'add_message':
            return DisputeMessageCreateSerializer
        return DisputeTicketSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        
        # Only ADMIN and AUDITOR with SUPPORT_TICKETS permission see all tickets
        if user.is_admin() or user.is_auditor():
            # Check if user has SUPPORT_TICKETS permission (super admin bypasses)
            if getattr(user, 'is_super_admin', False) or PermissionService.has_module_permission(user, 'SUPPORT_TICKETS'):
                return queryset
        
        if user.is_merchant_user() and user.merchant:
            # Merchants see tickets they created OR tickets linked to their merchant
            from django.db.models import Q
            queryset = queryset.filter(
                Q(created_by=user) | 
                Q(merchant=user.merchant) |
                Q(form__invoice__merchant=user.merchant)
            ).distinct()
        else:
            # OPERATOR, CUSTOMS_AGENT, and all other users see only their own tickets
            queryset = queryset.filter(created_by=user)
        
        return queryset

    def perform_create(self, serializer):
        ticket = serializer.save(created_by=self.request.user)
        AuditService.log(
            actor=self.request.user,
            action='DISPUTE_CREATED',
            entity='DisputeTicket',
            entity_id=str(ticket.id),
            metadata={
                'ticket_number': ticket.ticket_number,
                'type': ticket.type,
                'subject': ticket.subject
            }
        )
        # Send notification to support team
        SupportNotificationService.notify_new_ticket(ticket)

    @action(detail=True, methods=['post'], parser_classes=[JSONParser, MultiPartParser, FormParser])
    def add_message(self, request, pk=None):
        """Add a message to a dispute with optional attachments."""
        ticket = self.get_object()
        serializer = DisputeMessageCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        message = DisputeMessage.objects.create(
            ticket=ticket,
            author=request.user,
            **serializer.validated_data
        )
        
        # Handle file attachments - link to message
        files = request.FILES.getlist('attachments')
        for file in files:
            Attachment.objects.create(
                ticket=ticket,
                message=message,
                file=file,
                filename=file.name,
                file_type=file.content_type,
                file_size=file.size,
                uploaded_by=request.user
            )
        
        # Notify about new message
        SupportNotificationService.notify_ticket_message(
            ticket, message, is_internal=serializer.validated_data.get('is_internal', False)
        )
        
        return Response(DisputeMessageSerializer(message).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        """Update dispute status."""
        ticket = self.get_object()
        serializer = DisputeStatusUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        old_status = ticket.status
        ticket.status = serializer.validated_data['status']
        ticket.save()
        
        # Add internal note if provided
        note = serializer.validated_data.get('note')
        if note:
            DisputeMessage.objects.create(
                ticket=ticket,
                author=request.user,
                content=f"Status changed from {old_status} to {ticket.status}. Note: {note}",
                is_internal=True
            )
        
        AuditService.log(
            actor=request.user,
            action='DISPUTE_STATUS_CHANGED',
            entity='DisputeTicket',
            entity_id=str(ticket.id),
            metadata={
                'ticket_number': ticket.ticket_number,
                'old_status': old_status,
                'new_status': ticket.status
            }
        )
        
        return Response(DisputeTicketSerializer(ticket).data)

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Resolve a dispute."""
        ticket = self.get_object()
        serializer = DisputeResolveSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        ticket.status = serializer.validated_data['status']
        ticket.resolution = serializer.validated_data['resolution']
        ticket.resolved_at = timezone.now()
        ticket.resolved_by = request.user
        ticket.save()
        
        AuditService.log(
            actor=request.user,
            action='DISPUTE_RESOLVED',
            entity='DisputeTicket',
            entity_id=str(ticket.id),
            metadata={
                'ticket_number': ticket.ticket_number,
                'status': ticket.status,
                'resolution': ticket.resolution[:100]
            }
        )
        # Notify ticket creator
        SupportNotificationService.notify_ticket_resolved(ticket)
        
        return Response(DisputeTicketDetailSerializer(ticket).data)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Assign ticket to a support agent."""
        ticket = self.get_object()
        serializer = TicketAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            agent = User.objects.get(id=serializer.validated_data['agent_id'])
        except User.DoesNotExist:
            return Response({'error': 'Agent non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        ticket.assign_to(agent, assigned_by=request.user)
        
        AuditService.log(
            actor=request.user,
            action='TICKET_ASSIGNED',
            entity='DisputeTicket',
            entity_id=str(ticket.id),
            metadata={
                'ticket_number': ticket.ticket_number,
                'assigned_to': agent.get_full_name()
            }
        )
        # Notify assigned agent
        SupportNotificationService.notify_ticket_assigned(ticket, assigned_by=request.user)
        
        return Response(DisputeTicketDetailSerializer(ticket).data)

    @action(detail=True, methods=['post'])
    def take(self, request, pk=None):
        """Take/claim a ticket (self-assign)."""
        ticket = self.get_object()
        ticket.assign_to(request.user, assigned_by=request.user)
        
        AuditService.log(
            actor=request.user,
            action='TICKET_CLAIMED',
            entity='DisputeTicket',
            entity_id=str(ticket.id),
            metadata={'ticket_number': ticket.ticket_number}
        )
        # Notify ticket creator that their ticket is being handled
        SupportNotificationService.notify_ticket_assigned(ticket, assigned_by=request.user)
        
        return Response(DisputeTicketDetailSerializer(ticket).data)

    @action(detail=True, methods=['post'])
    def escalate(self, request, pk=None):
        """Escalate ticket to a supervisor."""
        ticket = self.get_object()
        serializer = TicketEscalateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            to_user = User.objects.get(id=serializer.validated_data['to_user_id'])
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        ticket.escalate(
            to_user=to_user,
            reason=serializer.validated_data['reason'],
            escalated_by=request.user
        )
        
        AuditService.log(
            actor=request.user,
            action='TICKET_ESCALATED',
            entity='DisputeTicket',
            entity_id=str(ticket.id),
            metadata={
                'ticket_number': ticket.ticket_number,
                'escalated_to': to_user.get_full_name(),
                'reason': serializer.validated_data['reason'][:100]
            }
        )
        # Notify escalated user
        SupportNotificationService.notify_ticket_escalated(ticket)
        
        return Response(DisputeTicketDetailSerializer(ticket).data)

    @action(detail=True, methods=['post'])
    def update_priority(self, request, pk=None):
        """Update ticket priority."""
        ticket = self.get_object()
        serializer = TicketPriorityUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        old_priority = ticket.priority
        ticket.priority = serializer.validated_data['priority']
        ticket.save()
        
        TicketHistory.objects.create(
            ticket=ticket,
            action=TicketHistoryAction.PRIORITY_CHANGED,
            performed_by=request.user,
            old_value=old_priority,
            new_value=ticket.priority,
            details=f'Priorité changée de {old_priority} à {ticket.priority}'
        )
        
        return Response(DisputeTicketDetailSerializer(ticket).data)

    @action(detail=True, methods=['post'])
    def close(self, request, pk=None):
        """Close the ticket."""
        ticket = self.get_object()
        ticket.close(closed_by=request.user)
        
        AuditService.log(
            actor=request.user,
            action='TICKET_CLOSED',
            entity='DisputeTicket',
            entity_id=str(ticket.id),
            metadata={'ticket_number': ticket.ticket_number}
        )
        
        return Response(DisputeTicketDetailSerializer(ticket).data)

    @action(detail=False, methods=['get'])
    def my_tickets(self, request):
        """Get tickets assigned to current user."""
        tickets = DisputeTicket.objects.filter(assigned_to=request.user)
        serializer = DisputeTicketSerializer(tickets, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def unassigned(self, request):
        """Get unassigned tickets."""
        tickets = DisputeTicket.objects.filter(
            assigned_to__isnull=True,
            status__in=[DisputeStatus.NEW, DisputeStatus.OPEN]
        )
        serializer = DisputeTicketSerializer(tickets, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def overdue(self, request):
        """Get overdue tickets."""
        tickets = DisputeTicket.objects.filter(
            sla_due_at__lt=timezone.now()
        ).exclude(
            status__in=[DisputeStatus.RESOLVED, DisputeStatus.CLOSED, DisputeStatus.REJECTED]
        )
        serializer = DisputeTicketSerializer(tickets, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get ticket statistics."""
        from django.db.models import Count, Q
        
        user = request.user
        
        # Only ADMIN and AUDITOR see global stats
        if user.is_admin() or user.is_auditor():
            base_queryset = DisputeTicket.objects.all()
        else:
            # Other users (OPERATOR, CUSTOMS_AGENT, etc.) see only their own stats
            base_queryset = DisputeTicket.objects.filter(created_by=user)
        
        total = base_queryset.count()
        by_status = dict(
            base_queryset.values('status')
            .annotate(count=Count('id'))
            .values_list('status', 'count')
        )
        by_priority = dict(
            base_queryset.values('priority')
            .annotate(count=Count('id'))
            .values_list('priority', 'count')
        )
        unassigned = base_queryset.filter(assigned_to__isnull=True).count()
        overdue = base_queryset.filter(
            sla_due_at__lt=timezone.now()
        ).exclude(
            status__in=[DisputeStatus.RESOLVED, DisputeStatus.CLOSED, DisputeStatus.REJECTED]
        ).count()
        
        return Response({
            'total': total,
            'by_status': by_status,
            'by_priority': by_priority,
            'unassigned': unassigned,
            'overdue': overdue
        })

    @action(detail=True, methods=['get'])
    def observers(self, request, pk=None):
        """Get list of observers for a ticket."""
        ticket = self.get_object()
        observers = ticket.observers.select_related('user', 'added_by').all()
        data = [{
            'id': str(obs.id),
            'user_id': str(obs.user.id),
            'user_name': obs.user.get_full_name(),
            'user_email': obs.user.email,
            'user_role': obs.user.get_role_display(),
            'added_by_name': obs.added_by.get_full_name() if obs.added_by else None,
            'added_at': obs.added_at.isoformat()
        } for obs in observers]
        return Response(data)

    @action(detail=True, methods=['post'])
    def add_observer(self, request, pk=None):
        """Add an observer to a ticket (admin only)."""
        if request.user.role not in [UserRole.ADMIN, UserRole.OPERATOR]:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        ticket = self.get_object()
        user_id = request.data.get('user_id')
        
        if not user_id:
            return Response({'error': 'user_id requis'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(id=user_id, is_active=True)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if already observer
        if ticket.observers.filter(user=user).exists():
            return Response({'error': 'Utilisateur déjà observateur'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Add observer
        observer = TicketObserver.objects.create(
            ticket=ticket,
            user=user,
            added_by=request.user
        )
        
        # Create history entry
        TicketHistory.objects.create(
            ticket=ticket,
            action=TicketHistoryAction.STATUS_CHANGED,
            performed_by=request.user,
            details=f'{user.get_full_name()} ajouté comme observateur'
        )
        
        # Notify the observer (in-app notification)
        from apps.accounts.models import Notification, NotificationType
        Notification.objects.create(
            user=user,
            notification_type=NotificationType.TICKET_ASSIGNED,
            title=f"👁️ Ajouté comme observateur - {ticket.ticket_number}",
            message=f"Vous avez été ajouté comme observateur au ticket: {ticket.subject}",
            related_object_type='DisputeTicket',
            related_object_id=ticket.id,
            action_url=f"/admin/support/tickets/{ticket.id}"
        )
        
        # Send email notification
        SupportNotificationService.notify_ticket_observer_added(ticket, user, request.user)
        
        return Response({
            'id': str(observer.id),
            'user_id': str(user.id),
            'user_name': user.get_full_name(),
            'user_email': user.email
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='remove_observer/(?P<user_id>[^/.]+)')
    def remove_observer(self, request, pk=None, user_id=None):
        """Remove an observer from a ticket (admin only)."""
        if request.user.role not in [UserRole.ADMIN, UserRole.OPERATOR]:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        ticket = self.get_object()
        
        try:
            observer = ticket.observers.get(user_id=user_id)
        except TicketObserver.DoesNotExist:
            return Response({'error': 'Observateur non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        user_name = observer.user.get_full_name()
        observer.delete()
        
        TicketHistory.objects.create(
            ticket=ticket,
            action=TicketHistoryAction.STATUS_CHANGED,
            performed_by=request.user,
            details=f'{user_name} retiré des observateurs'
        )
        
        return Response({'status': 'ok'})


class AttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet for attachments."""
    
    queryset = Attachment.objects.all()
    serializer_class = AttachmentSerializer
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser]
    filterset_fields = ['ticket', 'form']

    def perform_create(self, serializer):
        file = self.request.FILES.get('file')
        serializer.save(
            uploaded_by=self.request.user,
            filename=file.name if file else '',
            file_type=file.content_type if file else '',
            file_size=file.size if file else 0
        )
