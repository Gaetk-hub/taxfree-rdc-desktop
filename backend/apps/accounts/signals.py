"""
Signals for accounts app.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import User


@receiver(post_save, sender=User)
def user_post_save(sender, instance, created, **kwargs):
    """Handle post-save actions for users."""
    if created:
        # Log user creation in audit log
        from apps.audit.services import AuditService
        AuditService.log(
            actor=None,
            action='USER_CREATED',
            entity='User',
            entity_id=str(instance.id),
            metadata={'email': instance.email, 'role': instance.role}
        )
