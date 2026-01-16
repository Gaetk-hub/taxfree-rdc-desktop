"""
Notification models.
"""
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class NotificationType(models.TextChoices):
    EMAIL = 'EMAIL', _('Email')
    SMS = 'SMS', _('SMS')
    IN_APP = 'IN_APP', _('In-App')


class NotificationStatus(models.TextChoices):
    PENDING = 'PENDING', _('Pending')
    SENT = 'SENT', _('Sent')
    FAILED = 'FAILED', _('Failed')
    READ = 'READ', _('Read')


class NotificationTemplate(models.Model):
    """Template for notifications."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    code = models.CharField(max_length=50, unique=True)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    
    # Templates for different channels
    email_subject = models.CharField(max_length=255, blank=True)
    email_body = models.TextField(blank=True)
    sms_body = models.CharField(max_length=500, blank=True)
    in_app_title = models.CharField(max_length=100, blank=True)
    in_app_body = models.TextField(blank=True)
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('notification template')
        verbose_name_plural = _('notification templates')

    def __str__(self):
        return f"{self.code} - {self.name}"


class OutboundNotification(models.Model):
    """
    Outbound notification record for external communications (EMAIL, SMS).
    NOT for in-app notifications - use apps.accounts.models.Notification for that.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Recipient
    user = models.ForeignKey(
        'accounts.User',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='notifications'
    )
    email = models.EmailField(blank=True)
    phone = models.CharField(max_length=20, blank=True)
    
    # Content
    type = models.CharField(
        max_length=10,
        choices=NotificationType.choices
    )
    template = models.ForeignKey(
        NotificationTemplate,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )
    subject = models.CharField(max_length=255, blank=True)
    body = models.TextField()
    
    # Context data
    context = models.JSONField(default=dict)
    
    # Status
    status = models.CharField(
        max_length=10,
        choices=NotificationStatus.choices,
        default=NotificationStatus.PENDING
    )
    
    # Delivery info
    sent_at = models.DateTimeField(null=True, blank=True)
    read_at = models.DateTimeField(null=True, blank=True)
    error_message = models.TextField(blank=True)
    
    # Related entity
    related_entity = models.CharField(max_length=50, blank=True)
    related_entity_id = models.CharField(max_length=100, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('notification')
        verbose_name_plural = _('notifications')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['status', 'created_at']),
        ]

    def __str__(self):
        return f"{self.type} to {self.email or self.phone or self.user}"
