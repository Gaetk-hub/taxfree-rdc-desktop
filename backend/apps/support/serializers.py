"""
Serializers for Support app: Chat and Training.
"""
from rest_framework import serializers
from django.utils import timezone

from .models import (
    Conversation, ConversationStatus, ConversationCategory,
    ChatMessage, ChatAttachment, ConversationParticipant,
    TrainingCategory, TrainingContent, TrainingContentType, TrainingProgress
)
from apps.accounts.serializers import UserSerializer
from apps.accounts.models import User, UserRole


# =============================================================================
# CHAT SERIALIZERS
# =============================================================================

class ChatAttachmentSerializer(serializers.ModelSerializer):
    """Serializer for chat attachments."""
    
    class Meta:
        model = ChatAttachment
        fields = ['id', 'filename', 'file_type', 'file_size', 'file', 'created_at']
        read_only_fields = ['id', 'created_at']


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer for chat messages."""
    
    sender_name = serializers.SerializerMethodField()
    sender_role = serializers.SerializerMethodField()
    attachments = ChatAttachmentSerializer(many=True, read_only=True)
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'conversation', 'sender', 'sender_name', 'sender_role',
            'is_from_support', 'is_system_message', 'content',
            'is_read', 'read_at', 'created_at', 'edited_at', 'attachments'
        ]
        read_only_fields = ['id', 'sender', 'sender_name', 'sender_role', 'created_at']

    def get_sender_name(self, obj):
        if obj.sender:
            return obj.sender.get_full_name()
        return 'Système'

    def get_sender_role(self, obj):
        if obj.sender:
            return obj.sender.role
        return None


class ChatMessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating chat messages."""
    content = serializers.CharField(required=False, allow_blank=True, default='')
    
    class Meta:
        model = ChatMessage
        fields = ['conversation', 'content']

    def create(self, validated_data):
        user = self.context['request'].user
        validated_data['sender'] = user
        # Determine if from support (admin/operator)
        validated_data['is_from_support'] = user.role in ['ADMIN', 'OPERATOR', 'AUDITOR']
        # Set default content if empty
        if not validated_data.get('content'):
            validated_data['content'] = '📎 Pièce(s) jointe(s)'
        return super().create(validated_data)


class ConversationListSerializer(serializers.ModelSerializer):
    """Serializer for conversation list view."""
    
    user_name = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    assigned_to_name = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'reference', 'user', 'user_name', 'user_role',
            'category', 'category_display', 'subject',
            'status', 'status_display',
            'assigned_to', 'assigned_to_name', 'assigned_at',
            'last_message_at', 'last_message',
            'unread_by_user', 'unread_by_support',
            'created_at', 'resolved_at'
        ]

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else None

    def get_user_role(self, obj):
        return obj.user.role if obj.user else None

    def get_assigned_to_name(self, obj):
        return obj.assigned_to.get_full_name() if obj.assigned_to else None

    def get_last_message(self, obj):
        last_msg = obj.messages.order_by('-created_at').first()
        if last_msg:
            return {
                'content': last_msg.content[:100] + '...' if len(last_msg.content) > 100 else last_msg.content,
                'sender_name': last_msg.sender.get_full_name() if last_msg.sender else 'Système',
                'is_from_support': last_msg.is_from_support,
                'created_at': last_msg.created_at
            }
        return None


class ConversationDetailSerializer(serializers.ModelSerializer):
    """Serializer for conversation detail view."""
    
    user = UserSerializer(read_only=True)
    assigned_to = UserSerializer(read_only=True)
    messages = ChatMessageSerializer(many=True, read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = Conversation
        fields = [
            'id', 'reference', 'user',
            'category', 'category_display', 'subject',
            'status', 'status_display',
            'assigned_to', 'assigned_at',
            'related_form', 'related_merchant',
            'last_message_at', 'messages',
            'unread_by_user', 'unread_by_support',
            'created_at', 'updated_at', 'resolved_at'
        ]


class ConversationCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new conversation."""
    
    initial_message = serializers.CharField(write_only=True)
    
    class Meta:
        model = Conversation
        fields = ['category', 'subject', 'initial_message', 'related_form', 'related_merchant']

    def create(self, validated_data):
        initial_message = validated_data.pop('initial_message')
        user = self.context['request'].user
        validated_data['user'] = user
        
        conversation = super().create(validated_data)
        
        # Create initial message
        ChatMessage.objects.create(
            conversation=conversation,
            sender=user,
            content=initial_message,
            is_from_support=False
        )
        
        return conversation


class ConversationAssignSerializer(serializers.Serializer):
    """Serializer for assigning a conversation."""
    
    agent_id = serializers.UUIDField()


class ConversationParticipantSerializer(serializers.ModelSerializer):
    """Serializer for conversation participants."""
    
    user_name = serializers.SerializerMethodField()
    user_role = serializers.SerializerMethodField()
    user_email = serializers.SerializerMethodField()
    added_by_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ConversationParticipant
        fields = [
            'id', 'user', 'user_name', 'user_role', 'user_email',
            'added_by', 'added_by_name', 'added_at',
            'is_initiator', 'is_support', 'is_muted'
        ]
        read_only_fields = ['id', 'added_at']

    def get_user_name(self, obj):
        return obj.user.get_full_name() if obj.user else None

    def get_user_role(self, obj):
        return obj.user.role if obj.user else None

    def get_user_email(self, obj):
        return obj.user.email if obj.user else None

    def get_added_by_name(self, obj):
        return obj.added_by.get_full_name() if obj.added_by else None


class AddParticipantSerializer(serializers.Serializer):
    """Serializer for adding a participant to a conversation."""
    
    user_id = serializers.UUIDField()


class AdminConversationCreateSerializer(serializers.Serializer):
    """Serializer for admin to create a conversation with a specific user."""
    
    recipient_id = serializers.UUIDField(help_text="ID of the user to start conversation with")
    category = serializers.ChoiceField(choices=ConversationCategory.choices, default='GENERAL')
    subject = serializers.CharField(max_length=255)
    initial_message = serializers.CharField()
    
    def validate_recipient_id(self, value):
        try:
            user = User.objects.get(id=value, is_active=True)
            return value
        except User.DoesNotExist:
            raise serializers.ValidationError("Utilisateur non trouvé ou inactif")
    
    def create(self, validated_data):
        admin_user = self.context['request'].user
        recipient = User.objects.get(id=validated_data['recipient_id'])
        
        # Create conversation with recipient as the main user
        conversation = Conversation.objects.create(
            user=recipient,
            category=validated_data['category'],
            subject=validated_data['subject'],
            status=ConversationStatus.IN_PROGRESS,
            assigned_to=admin_user,
            assigned_at=timezone.now()
        )
        
        # Add participants
        ConversationParticipant.objects.create(
            conversation=conversation,
            user=recipient,
            added_by=admin_user,
            is_initiator=False,
            is_support=False
        )
        ConversationParticipant.objects.create(
            conversation=conversation,
            user=admin_user,
            added_by=admin_user,
            is_initiator=True,
            is_support=True
        )
        
        # Create initial message from admin
        ChatMessage.objects.create(
            conversation=conversation,
            sender=admin_user,
            content=validated_data['initial_message'],
            is_from_support=True
        )
        
        return conversation


class UserSearchSerializer(serializers.ModelSerializer):
    """Serializer for user search results (autocomplete)."""
    
    full_name = serializers.SerializerMethodField()
    role_display = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'email', 'first_name', 'last_name', 'full_name', 'role', 'role_display']

    def get_full_name(self, obj):
        return obj.get_full_name()

    def get_role_display(self, obj):
        return obj.get_role_display()


# =============================================================================
# TRAINING SERIALIZERS
# =============================================================================

class TrainingCategorySerializer(serializers.ModelSerializer):
    """Serializer for training categories."""
    
    content_count = serializers.SerializerMethodField()
    
    class Meta:
        model = TrainingCategory
        fields = [
            'id', 'name', 'slug', 'description', 'icon',
            'target_roles', 'order', 'is_active', 'content_count'
        ]

    def get_content_count(self, obj):
        return obj.contents.filter(is_published=True).count()


class TrainingContentListSerializer(serializers.ModelSerializer):
    """Serializer for training content list."""
    
    category_name = serializers.CharField(source='category.name', read_only=True)
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)
    is_completed = serializers.SerializerMethodField()
    
    class Meta:
        model = TrainingContent
        fields = [
            'id', 'category', 'category_name', 'title', 'slug', 'description',
            'content_type', 'content_type_display',
            'thumbnail', 'reading_time', 'video_duration',
            'is_featured', 'view_count', 'is_completed',
            'published_at'
        ]

    def get_is_completed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            progress = obj.user_progress.filter(user=request.user).first()
            return progress.is_completed if progress else False
        return False


class TrainingContentDetailSerializer(serializers.ModelSerializer):
    """Serializer for training content detail."""
    
    category = TrainingCategorySerializer(read_only=True)
    content_type_display = serializers.CharField(source='get_content_type_display', read_only=True)
    author_name = serializers.SerializerMethodField()
    user_progress = serializers.SerializerMethodField()
    
    class Meta:
        model = TrainingContent
        fields = [
            'id', 'category', 'title', 'slug', 'description',
            'content_type', 'content_type_display',
            'body', 'video_url', 'video_duration',
            'thumbnail', 'reading_time',
            'target_roles', 'related_feature',
            'is_featured', 'view_count',
            'author', 'author_name',
            'published_at', 'created_at', 'updated_at',
            'user_progress'
        ]

    def get_author_name(self, obj):
        return obj.author.get_full_name() if obj.author else None

    def get_user_progress(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            progress = obj.user_progress.filter(user=request.user).first()
            if progress:
                return {
                    'is_completed': progress.is_completed,
                    'completed_at': progress.completed_at,
                    'progress_percent': progress.progress_percent,
                    'last_position': progress.last_position,
                    'last_viewed_at': progress.last_viewed_at
                }
        return None


class TrainingContentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating training content."""
    
    class Meta:
        model = TrainingContent
        fields = [
            'category', 'title', 'slug', 'description',
            'content_type', 'body', 'video_url', 'video_duration',
            'thumbnail', 'reading_time',
            'target_roles', 'related_feature',
            'is_published', 'is_featured', 'order'
        ]

    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        if validated_data.get('is_published') and not validated_data.get('published_at'):
            validated_data['published_at'] = timezone.now()
        return super().create(validated_data)


class TrainingProgressSerializer(serializers.ModelSerializer):
    """Serializer for training progress."""
    
    content_title = serializers.CharField(source='content.title', read_only=True)
    
    class Meta:
        model = TrainingProgress
        fields = [
            'id', 'user', 'content', 'content_title',
            'is_completed', 'completed_at',
            'progress_percent', 'last_position',
            'first_viewed_at', 'last_viewed_at'
        ]
        read_only_fields = ['id', 'user', 'first_viewed_at', 'last_viewed_at']


class TrainingProgressUpdateSerializer(serializers.Serializer):
    """Serializer for updating training progress."""
    
    progress_percent = serializers.IntegerField(min_value=0, max_value=100, required=False)
    last_position = serializers.IntegerField(min_value=0, required=False)
    is_completed = serializers.BooleanField(required=False)
