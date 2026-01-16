"""
Status Override models for administrative corrections.
Allows Super Admin to correct form statuses with full audit trail.
"""
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class OverrideType(models.TextChoices):
    """Types of status overrides."""
    STATUS_CORRECTION = 'STATUS_CORRECTION', _('Correction de statut')
    VALIDATION_REVERSAL = 'VALIDATION_REVERSAL', _('Annulation de validation')
    REFUND_CORRECTION = 'REFUND_CORRECTION', _('Correction de remboursement')
    REOPEN_FORM = 'REOPEN_FORM', _('Réouverture du bordereau')


class StatusOverride(models.Model):
    """
    Records administrative overrides/corrections to form statuses.
    This model is append-only - records cannot be modified or deleted.
    All original data is preserved for audit purposes.
    """
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Form reference
    form = models.ForeignKey(
        'taxfree.TaxFreeForm',
        on_delete=models.PROTECT,
        related_name='status_overrides'
    )
    
    # Override type
    override_type = models.CharField(
        max_length=30,
        choices=OverrideType.choices,
        default=OverrideType.STATUS_CORRECTION
    )
    
    # Status change
    previous_status = models.CharField(max_length=30)
    new_status = models.CharField(max_length=30)
    
    # Original validation info (preserved for audit)
    original_validation_decision = models.CharField(max_length=30, blank=True)
    original_validation_agent_id = models.UUIDField(null=True, blank=True)
    original_validation_agent_name = models.CharField(max_length=255, blank=True)
    original_validation_date = models.DateTimeField(null=True, blank=True)
    original_validation_point_of_exit = models.CharField(max_length=255, blank=True)
    
    # Reason (mandatory)
    reason = models.TextField(
        verbose_name=_('Raison de la correction'),
        help_text=_('Explication détaillée de la raison de cette correction')
    )
    
    # Supporting documentation reference (optional)
    reference_document = models.CharField(
        max_length=255,
        blank=True,
        verbose_name=_('Référence document'),
        help_text=_('Numéro de ticket, email, ou autre référence')
    )
    
    # Agent who requested the correction
    requesting_agent_id = models.UUIDField(null=True, blank=True)
    requesting_agent_name = models.CharField(max_length=255, blank=True)
    requesting_agent_email = models.CharField(max_length=255, blank=True)
    
    # Admin who performed the override
    performed_by = models.ForeignKey(
        'accounts.User',
        on_delete=models.PROTECT,
        related_name='performed_overrides'
    )
    
    # Metadata
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.CharField(max_length=500, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Notification tracking
    notifications_sent = models.JSONField(default=list)

    class Meta:
        verbose_name = _('status override')
        verbose_name_plural = _('status overrides')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['form', 'created_at']),
            models.Index(fields=['performed_by', 'created_at']),
        ]

    def __str__(self):
        return f"Override {self.form.form_number}: {self.previous_status} → {self.new_status}"

    def save(self, *args, **kwargs):
        # Prevent updates to existing records (append-only)
        if self.pk and StatusOverride.objects.filter(pk=self.pk).exists():
            raise ValueError("Status overrides are immutable and cannot be updated")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Prevent deletion
        raise ValueError("Status overrides are immutable and cannot be deleted")
