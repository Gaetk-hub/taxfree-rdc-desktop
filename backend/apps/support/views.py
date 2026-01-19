"""
Views for Support app: Chat and Training APIs.
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q
from django.utils import timezone

from apps.accounts.permissions import IsAdmin, IsAdminOrAuditor, PermissionService
from apps.accounts.models import User, UserRole

from .models import (
    Conversation, ConversationStatus, ChatMessage, ChatAttachment,
    TrainingCategory, TrainingContent, TrainingProgress
)
from .serializers import (
    ConversationListSerializer, ConversationDetailSerializer,
    ConversationCreateSerializer, ConversationAssignSerializer,
    ConversationParticipantSerializer, AddParticipantSerializer,
    AdminConversationCreateSerializer, UserSearchSerializer,
    ChatMessageSerializer, ChatMessageCreateSerializer, ChatAttachmentSerializer,
    TrainingCategorySerializer,
    TrainingContentListSerializer, TrainingContentDetailSerializer, TrainingContentCreateSerializer,
    TrainingProgressSerializer, TrainingProgressUpdateSerializer
)
from .models import ConversationParticipant
from .services import SupportNotificationService


# =============================================================================
# CHAT VIEWS
# =============================================================================

class ConversationViewSet(viewsets.ModelViewSet):
    """
    ViewSet for chat conversations.
    - Users see their own conversations
    - Support (Admin/Operator) sees all conversations
    """
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['status', 'category', 'assigned_to']
    search_fields = ['reference', 'subject', 'user__email', 'user__first_name', 'user__last_name']
    ordering_fields = ['created_at', 'last_message_at', 'status']
    ordering = ['-last_message_at']

    def get_queryset(self):
        user = self.request.user
        # Only ADMIN and AUDITOR with SUPPORT_CHAT permission see all conversations
        if user.role in [UserRole.ADMIN, UserRole.AUDITOR]:
            # Check if user has SUPPORT_CHAT permission (super admin bypasses)
            if getattr(user, 'is_super_admin', False) or PermissionService.has_module_permission(user, 'SUPPORT_CHAT'):
                return Conversation.objects.all()
        # All other users (including ADMIN/AUDITOR without permission) see only their own conversations
        return Conversation.objects.filter(user=user)

    def get_serializer_class(self):
        if self.action == 'create':
            return ConversationCreateSerializer
        if self.action == 'retrieve':
            return ConversationDetailSerializer
        return ConversationListSerializer

    def perform_create(self, serializer):
        conversation = serializer.save()
        # Send notification to support team
        SupportNotificationService.notify_new_conversation(conversation)

    @action(detail=True, methods=['post'])
    def assign(self, request, pk=None):
        """Assign conversation to a support agent."""
        conversation = self.get_object()
        serializer = ConversationAssignSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            agent = User.objects.get(id=serializer.validated_data['agent_id'])
        except User.DoesNotExist:
            return Response({'error': 'Agent non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        conversation.assign_to(agent)
        return Response(ConversationDetailSerializer(conversation).data)

    @action(detail=True, methods=['post'])
    def take(self, request, pk=None):
        """Take/claim a conversation (self-assign)."""
        conversation = self.get_object()
        conversation.assign_to(request.user)
        return Response(ConversationDetailSerializer(conversation).data)

    @action(detail=True, methods=['post'])
    def mark_read(self, request, pk=None):
        """Mark all messages as read."""
        conversation = self.get_object()
        user = request.user
        
        # Mark messages as read
        if user.role in [UserRole.ADMIN, UserRole.AUDITOR]:
            # Support (back-office) marking user messages as read
            conversation.messages.filter(is_from_support=False, is_read=False).update(
                is_read=True, read_at=timezone.now()
            )
            conversation.unread_by_support = 0
        else:
            # User marking support messages as read
            conversation.messages.filter(is_from_support=True, is_read=False).update(
                is_read=True, read_at=timezone.now()
            )
            conversation.unread_by_user = 0
        
        conversation.save()
        return Response({'status': 'ok'})

    @action(detail=False, methods=['get'])
    def unread_count(self, request):
        """Get total count of unread messages."""
        user = request.user
        from django.db.models import Sum
        if user.role in [UserRole.ADMIN, UserRole.AUDITOR]:
            # Sum of all unread messages by support (back-office only)
            result = Conversation.objects.aggregate(total=Sum('unread_by_support'))
            count = result['total'] or 0
        else:
            # Sum of all unread messages for this user (including OPERATOR, CUSTOMS_AGENT)
            result = Conversation.objects.filter(user=user).aggregate(total=Sum('unread_by_user'))
            count = result['total'] or 0
        return Response({'unread_count': count})

    @action(detail=False, methods=['get'])
    def search_users(self, request):
        """Search users for autocomplete (admin only)."""
        if request.user.role not in [UserRole.ADMIN]:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        query = request.query_params.get('q', '').strip()
        role_filter = request.query_params.get('role', '')
        
        if len(query) < 2:
            return Response([])
        
        users = User.objects.filter(
            is_active=True
        ).filter(
            Q(email__icontains=query) |
            Q(first_name__icontains=query) |
            Q(last_name__icontains=query)
        ).exclude(id=request.user.id)
        
        if role_filter:
            users = users.filter(role=role_filter)
        
        users = users[:20]  # Limit results
        serializer = UserSearchSerializer(users, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def create_for_user(self, request):
        """Admin creates a conversation with a specific user."""
        if request.user.role not in [UserRole.ADMIN, UserRole.OPERATOR]:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        serializer = AdminConversationCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        conversation = serializer.save()
        
        # Notify the recipient
        SupportNotificationService.notify_new_chat_message(conversation.messages.first())
        
        return Response(ConversationDetailSerializer(conversation).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'])
    def participants(self, request, pk=None):
        """Get list of participants in a conversation."""
        conversation = self.get_object()
        participants = conversation.participants.all()
        serializer = ConversationParticipantSerializer(participants, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def add_participant(self, request, pk=None):
        """Add a participant to a conversation (admin only)."""
        if request.user.role not in [UserRole.ADMIN, UserRole.OPERATOR]:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        conversation = self.get_object()
        serializer = AddParticipantSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        try:
            user = User.objects.get(id=serializer.validated_data['user_id'], is_active=True)
        except User.DoesNotExist:
            return Response({'error': 'Utilisateur non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if already participant
        if conversation.participants.filter(user=user).exists():
            return Response({'error': 'Utilisateur déjà participant'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Add participant
        participant = ConversationParticipant.objects.create(
            conversation=conversation,
            user=user,
            added_by=request.user,
            is_support=user.role in [UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR]
        )
        
        # Create system message
        ChatMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            content=f"{user.get_full_name()} a été ajouté à la conversation par {request.user.get_full_name()}",
            is_from_support=True,
            is_system_message=True
        )
        
        # Notify the added user (in-app notification)
        from apps.accounts.models import Notification, NotificationType
        Notification.objects.create(
            user=user,
            notification_type=NotificationType.NEW_CONVERSATION,
            title=f"📬 Ajouté à une conversation - {conversation.reference}",
            message=f"Vous avez été ajouté à la conversation: {conversation.subject}",
            related_object_type='Conversation',
            related_object_id=conversation.id,
            action_url=f"/merchant/support?conversation={conversation.id}"
        )
        
        # Send email notification
        from services.email_service import SupportEmailService
        SupportEmailService.send_participant_added_email(conversation, user, request.user)
        
        return Response(ConversationParticipantSerializer(participant).data, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='remove_participant/(?P<user_id>[^/.]+)')
    def remove_participant(self, request, pk=None, user_id=None):
        """Remove a participant from a conversation (admin only)."""
        if request.user.role not in [UserRole.ADMIN, UserRole.OPERATOR]:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        conversation = self.get_object()
        
        try:
            participant = conversation.participants.get(user_id=user_id)
        except ConversationParticipant.DoesNotExist:
            return Response({'error': 'Participant non trouvé'}, status=status.HTTP_404_NOT_FOUND)
        
        # Don't allow removing the initiator
        if participant.is_initiator:
            return Response({'error': 'Impossible de retirer l\'initiateur'}, status=status.HTTP_400_BAD_REQUEST)
        
        user_name = participant.user.get_full_name()
        participant.delete()
        
        # Create system message
        ChatMessage.objects.create(
            conversation=conversation,
            sender=request.user,
            content=f"{user_name} a été retiré de la conversation par {request.user.get_full_name()}",
            is_from_support=True,
            is_system_message=True
        )
        
        return Response({'status': 'ok'})


class ChatMessageViewSet(viewsets.ModelViewSet):
    """ViewSet for chat messages."""
    permission_classes = [IsAuthenticated]
    parser_classes = None  # Will be set in __init__
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
        self.parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_queryset(self):
        user = self.request.user
        conversation_id = self.request.query_params.get('conversation')
        
        if conversation_id:
            # Check access to conversation
            if user.role in [UserRole.ADMIN, UserRole.OPERATOR, UserRole.AUDITOR]:
                return ChatMessage.objects.filter(conversation_id=conversation_id)
            return ChatMessage.objects.filter(
                conversation_id=conversation_id,
                conversation__user=user
            )
        return ChatMessage.objects.none()

    def get_serializer_class(self):
        if self.action == 'create':
            return ChatMessageCreateSerializer
        return ChatMessageSerializer

    def perform_create(self, serializer):
        message = serializer.save()
        
        # Handle file attachments
        files = self.request.FILES.getlist('attachments')
        for file in files:
            try:
                ChatAttachment.objects.create(
                    message=message,
                    file=file,
                    filename=file.name,
                    file_type=file.content_type or 'application/octet-stream',
                    file_size=file.size or 0
                )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Error creating chat attachment: {e}")
                # Continue without attachment rather than failing the whole message
        
        # Send notification to other party
        try:
            SupportNotificationService.notify_new_chat_message(message)
        except Exception as e:
            import logging
            logger = logging.getLogger(__name__)
            logger.error(f"Error sending notification: {e}")


# =============================================================================
# TRAINING VIEWS
# =============================================================================

class TrainingCategoryViewSet(viewsets.ModelViewSet):
    """ViewSet for training categories."""
    permission_classes = [IsAuthenticated]
    serializer_class = TrainingCategorySerializer
    lookup_field = 'slug'

    def get_queryset(self):
        user = self.request.user
        queryset = TrainingCategory.objects.filter(is_active=True)
        
        # Filter by user role
        if user.role != UserRole.ADMIN:
            queryset = queryset.filter(target_roles__contains=[user.role])
        
        return queryset

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]


class TrainingContentViewSet(viewsets.ModelViewSet):
    """ViewSet for training content."""
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'content_type', 'is_featured']
    search_fields = ['title', 'description', 'body']
    ordering_fields = ['order', 'published_at', 'view_count']
    ordering = ['order', '-published_at']
    lookup_field = 'slug'

    def get_queryset(self):
        user = self.request.user
        queryset = TrainingContent.objects.all()
        
        # Non-admins only see published content for their role
        if user.role != UserRole.ADMIN:
            queryset = queryset.filter(
                is_published=True,
                target_roles__contains=[user.role]
            )
        
        # Filter by related feature if provided
        feature = self.request.query_params.get('feature')
        if feature:
            queryset = queryset.filter(related_feature=feature)
        
        return queryset

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return TrainingContentCreateSerializer
        if self.action == 'retrieve':
            return TrainingContentDetailSerializer
        return TrainingContentListSerializer

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsAdmin()]
        return [IsAuthenticated()]

    def retrieve(self, request, *args, **kwargs):
        instance = self.get_object()
        # Increment view count
        instance.increment_views()
        # Track progress
        if request.user.is_authenticated:
            TrainingProgress.objects.get_or_create(
                user=request.user,
                content=instance
            )
        serializer = self.get_serializer(instance)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def update_progress(self, request, slug=None):
        """Update user's progress on this content."""
        content = self.get_object()
        serializer = TrainingProgressUpdateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        progress, created = TrainingProgress.objects.get_or_create(
            user=request.user,
            content=content
        )
        
        if 'progress_percent' in serializer.validated_data:
            progress.progress_percent = serializer.validated_data['progress_percent']
        if 'last_position' in serializer.validated_data:
            progress.last_position = serializer.validated_data['last_position']
        if serializer.validated_data.get('is_completed'):
            progress.mark_completed()
        else:
            progress.save()
        
        return Response(TrainingProgressSerializer(progress).data)

    @action(detail=True, methods=['post'])
    def mark_complete(self, request, slug=None):
        """Mark content as completed."""
        content = self.get_object()
        progress, created = TrainingProgress.objects.get_or_create(
            user=request.user,
            content=content
        )
        progress.mark_completed()
        return Response(TrainingProgressSerializer(progress).data)

    @action(detail=False, methods=['get'])
    def by_feature(self, request):
        """Get content for a specific feature (contextual help)."""
        feature = request.query_params.get('feature')
        if not feature:
            return Response({'error': 'Feature parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        user = request.user
        queryset = TrainingContent.objects.filter(
            is_published=True,
            related_feature=feature
        )
        
        if user.role != UserRole.ADMIN:
            queryset = queryset.filter(target_roles__contains=[user.role])
        
        serializer = TrainingContentListSerializer(queryset, many=True, context={'request': request})
        return Response(serializer.data)


class TrainingProgressViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for user's training progress."""
    permission_classes = [IsAuthenticated]
    serializer_class = TrainingProgressSerializer

    def get_queryset(self):
        return TrainingProgress.objects.filter(user=self.request.user)

    @action(detail=False, methods=['get'])
    def summary(self, request):
        """Get summary of user's training progress."""
        user = request.user
        
        # Get accessible content count
        total_content = TrainingContent.objects.filter(
            is_published=True,
            target_roles__contains=[user.role]
        ).count()
        
        # Get completed count
        completed = TrainingProgress.objects.filter(
            user=user,
            is_completed=True
        ).count()
        
        # Get in-progress count
        in_progress = TrainingProgress.objects.filter(
            user=user,
            is_completed=False,
            progress_percent__gt=0
        ).count()
        
        return Response({
            'total_content': total_content,
            'completed': completed,
            'in_progress': in_progress,
            'completion_rate': round((completed / total_content * 100) if total_content > 0 else 0, 1)
        })
