"""
Support models: Chat conversations and Training content.
"""
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.utils import timezone


# =============================================================================
# CHAT MODELS
# =============================================================================

class ConversationStatus(models.TextChoices):
    OPEN = 'OPEN', _('Ouvert')
    IN_PROGRESS = 'IN_PROGRESS', _('Actif')
    WAITING_USER = 'WAITING_USER', _('En attente utilisateur')
    WAITING_SUPPORT = 'WAITING_SUPPORT', _('En attente support')


class ConversationCategory(models.TextChoices):
    GENERAL = 'GENERAL', _('Question générale')
    TECHNICAL = 'TECHNICAL', _('Problème technique')
    FORM = 'FORM', _('Bordereau Tax Free')
    REFUND = 'REFUND', _('Remboursement')
    ACCOUNT = 'ACCOUNT', _('Compte utilisateur')
    MERCHANT = 'MERCHANT', _('Commerçant')
    CUSTOMS = 'CUSTOMS', _('Douane')
    OTHER = 'OTHER', _('Autre')


class Conversation(models.Model):
    """
    Chat conversation between a user and support team.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Reference number for tracking
    reference = models.CharField(max_length=20, unique=True, editable=False)
    
    # Initiator (user who started the conversation)
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='support_conversations'
    )
    
    # Category and subject
    category = models.CharField(
        max_length=20,
        choices=ConversationCategory.choices,
        default=ConversationCategory.GENERAL
    )
    subject = models.CharField(max_length=255)
    
    # Status
    status = models.CharField(
        max_length=20,
        choices=ConversationStatus.choices,
        default=ConversationStatus.OPEN
    )
    
    # Assignment
    assigned_to = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_conversations',
        help_text=_('Support agent handling this conversation')
    )
    assigned_at = models.DateTimeField(null=True, blank=True)
    
    # Related entities (optional context)
    related_form = models.ForeignKey(
        'taxfree.TaxFreeForm',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='support_conversations'
    )
    related_merchant = models.ForeignKey(
        'merchants.Merchant',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='support_conversations'
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    last_message_at = models.DateTimeField(null=True, blank=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    
    # Unread counts
    unread_by_user = models.IntegerField(default=0)
    unread_by_support = models.IntegerField(default=0)

    class Meta:
        verbose_name = _('conversation')
        verbose_name_plural = _('conversations')
        ordering = ['-last_message_at', '-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['assigned_to', 'status']),
            models.Index(fields=['status', '-last_message_at']),
        ]

    def __str__(self):
        return f"{self.reference} - {self.subject}"

    def save(self, *args, **kwargs):
        if not self.reference:
            self.reference = self.generate_reference()
        super().save(*args, **kwargs)

    @classmethod
    def generate_reference(cls):
        """Generate unique conversation reference."""
        import random
        import string
        prefix = timezone.now().strftime('%y%m')
        suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))
        return f"CHAT{prefix}{suffix}"

    def assign_to(self, agent):
        """Assign conversation to a support agent."""
        self.assigned_to = agent
        self.assigned_at = timezone.now()
        if self.status == ConversationStatus.OPEN:
            self.status = ConversationStatus.IN_PROGRESS
        self.save()

    def mark_resolved(self):
        """Mark conversation as resolved."""
        self.status = ConversationStatus.RESOLVED
        self.resolved_at = timezone.now()
        self.save()

    def add_participant(self, user, added_by):
        """Add a participant to the conversation."""
        participant, created = ConversationParticipant.objects.get_or_create(
            conversation=self,
            user=user,
            defaults={'added_by': added_by}
        )
        return participant, created


class ConversationParticipant(models.Model):
    """
    Participant in a conversation (for multi-participant support).
    Tracks who added whom and when.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='participants'
    )
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='conversation_participations'
    )
    
    # Traçabilité
    added_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='added_participants'
    )
    added_at = models.DateTimeField(auto_now_add=True)
    
    # Role in conversation
    is_initiator = models.BooleanField(default=False)
    is_support = models.BooleanField(default=False)
    
    # Notification preferences
    is_muted = models.BooleanField(default=False)
    
    class Meta:
        verbose_name = _('participant')
        verbose_name_plural = _('participants')
        unique_together = ['conversation', 'user']
        ordering = ['-is_initiator', 'added_at']

    def __str__(self):
        return f"{self.user.get_full_name()} in {self.conversation.reference}"


class ChatMessage(models.Model):
    """
    Individual message in a conversation.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    conversation = models.ForeignKey(
        Conversation,
        on_delete=models.CASCADE,
        related_name='messages'
    )
    
    # Sender
    sender = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='chat_messages'
    )
    is_from_support = models.BooleanField(
        default=False,
        help_text=_('True if message is from support team')
    )
    is_system_message = models.BooleanField(
        default=False,
        help_text=_('True for automated system messages')
    )
    
    # Content
    content = models.TextField()
    
    # Read status
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        verbose_name = _('message')
        verbose_name_plural = _('messages')
        ordering = ['created_at']

    def __str__(self):
        return f"Message in {self.conversation.reference}"

    def save(self, *args, **kwargs):
        is_new = self._state.adding
        super().save(*args, **kwargs)
        
        # Update conversation last_message_at and unread counts
        if is_new:
            self.conversation.last_message_at = self.created_at
            if self.is_from_support:
                self.conversation.unread_by_user += 1
            else:
                self.conversation.unread_by_support += 1
            self.conversation.save(update_fields=['last_message_at', 'unread_by_user', 'unread_by_support', 'updated_at'])


class ChatAttachment(models.Model):
    """
    File attachment for chat messages.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    message = models.ForeignKey(
        ChatMessage,
        on_delete=models.CASCADE,
        related_name='attachments'
    )
    
    file = models.FileField(upload_to='chat_attachments/%Y/%m/')
    filename = models.CharField(max_length=255)
    file_type = models.CharField(max_length=100, blank=True)
    file_size = models.IntegerField(default=0)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('pièce jointe')
        verbose_name_plural = _('pièces jointes')

    def __str__(self):
        return self.filename


# =============================================================================
# TRAINING / FORMATION MODELS
# =============================================================================

class TrainingCategory(models.Model):
    """
    Category for training content.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, unique=True)
    description = models.TextField(blank=True)
    icon = models.CharField(max_length=50, blank=True, help_text=_('Icon name (e.g., heroicon name)'))
    
    # Target roles (which roles can see this category)
    target_roles = models.JSONField(
        default=list,
        help_text=_('List of roles that can access this category: ADMIN, MERCHANT, CUSTOMS_AGENT, OPERATOR, AUDITOR')
    )
    
    # Ordering
    order = models.IntegerField(default=0)
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('catégorie de formation')
        verbose_name_plural = _('catégories de formation')
        ordering = ['order', 'name']

    def __str__(self):
        return self.name


class TrainingContentType(models.TextChoices):
    ARTICLE = 'ARTICLE', _('Article')
    GUIDE = 'GUIDE', _('Guide pas-à-pas')
    VIDEO = 'VIDEO', _('Tutoriel vidéo')
    FAQ = 'FAQ', _('FAQ')


class TrainingContent(models.Model):
    """
    Training content item (article, guide, video).
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    category = models.ForeignKey(
        TrainingCategory,
        on_delete=models.CASCADE,
        related_name='contents'
    )
    
    # Basic info
    title = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255)
    description = models.TextField(blank=True)
    
    # Content type
    content_type = models.CharField(
        max_length=20,
        choices=TrainingContentType.choices,
        default=TrainingContentType.ARTICLE
    )
    
    # Content body (for articles/guides)
    body = models.TextField(blank=True, help_text=_('HTML or Markdown content'))
    
    # Video (for video tutorials)
    video_url = models.URLField(blank=True, help_text=_('YouTube or Vimeo URL'))
    video_duration = models.IntegerField(null=True, blank=True, help_text=_('Duration in seconds'))
    
    # Target roles (which roles can see this content)
    target_roles = models.JSONField(
        default=list,
        help_text=_('List of roles that can access this content')
    )
    
    # Related feature/page (for contextual help)
    related_feature = models.CharField(
        max_length=100,
        blank=True,
        help_text=_('Feature code for contextual display (e.g., "forms.create", "customs.validate")')
    )
    
    # Metadata
    thumbnail = models.ImageField(upload_to='training/thumbnails/', blank=True, null=True)
    reading_time = models.IntegerField(null=True, blank=True, help_text=_('Estimated reading time in minutes'))
    
    # Status
    is_published = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    
    # Ordering
    order = models.IntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    
    # Stats
    view_count = models.IntegerField(default=0)
    
    # Author
    author = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='training_contents'
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('contenu de formation')
        verbose_name_plural = _('contenus de formation')
        ordering = ['category', 'order', '-created_at']
        unique_together = ['category', 'slug']
        indexes = [
            models.Index(fields=['is_published', 'content_type']),
            models.Index(fields=['related_feature']),
        ]

    def __str__(self):
        return self.title

    def publish(self):
        """Publish the content."""
        self.is_published = True
        self.published_at = timezone.now()
        self.save()

    def increment_views(self):
        """Increment view count."""
        self.view_count += 1
        self.save(update_fields=['view_count'])


class TrainingProgress(models.Model):
    """
    Track user progress through training content.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        related_name='training_progress'
    )
    content = models.ForeignKey(
        TrainingContent,
        on_delete=models.CASCADE,
        related_name='user_progress'
    )
    
    # Progress
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    
    # For videos: watch progress
    progress_percent = models.IntegerField(default=0)
    last_position = models.IntegerField(default=0, help_text=_('Last video position in seconds'))
    
    # Timestamps
    first_viewed_at = models.DateTimeField(auto_now_add=True)
    last_viewed_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('progression formation')
        verbose_name_plural = _('progressions formation')
        unique_together = ['user', 'content']

    def __str__(self):
        return f"{self.user.email} - {self.content.title}"

    def mark_completed(self):
        """Mark content as completed."""
        self.is_completed = True
        self.completed_at = timezone.now()
        self.progress_percent = 100
        self.save()
