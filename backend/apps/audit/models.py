"""
Audit log models - immutable audit trail.
"""
import uuid
from django.db import models
from django.utils.translation import gettext_lazy as _


class AuditLog(models.Model):
    """Immutable audit log entry."""
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # Actor (who performed the action)
    actor_id = models.UUIDField(null=True, blank=True)
    actor_email = models.CharField(max_length=255, blank=True)
    actor_role = models.CharField(max_length=50, blank=True)
    actor_ip = models.GenericIPAddressField(null=True, blank=True)
    
    # Action
    action = models.CharField(max_length=100, db_index=True)
    
    # Entity affected
    entity = models.CharField(max_length=100, db_index=True)
    entity_id = models.CharField(max_length=100, db_index=True)
    
    # Additional data (no sensitive info!)
    metadata = models.JSONField(default=dict)
    
    # Timestamp
    timestamp = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        verbose_name = _('audit log')
        verbose_name_plural = _('audit logs')
        ordering = ['-timestamp']
        indexes = [
            models.Index(fields=['entity', 'entity_id']),
            models.Index(fields=['actor_id', 'timestamp']),
            models.Index(fields=['action', 'timestamp']),
        ]
        # Prevent updates and deletes at DB level would require raw SQL
        # We enforce immutability in the application layer

    def __str__(self):
        return f"{self.action} on {self.entity}:{self.entity_id} at {self.timestamp}"

    def save(self, *args, **kwargs):
        # Prevent updates to existing records
        if self.pk and AuditLog.objects.filter(pk=self.pk).exists():
            raise ValueError("Audit logs are immutable and cannot be updated")
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        # Prevent deletion
        raise ValueError("Audit logs are immutable and cannot be deleted")
