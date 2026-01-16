"""
Celery tasks for taxfree app.
"""
from celery import shared_task
from django.utils import timezone
from django.db.models import Q

from .models import TaxFreeForm, TaxFreeFormStatus


@shared_task
def expire_forms():
    """Mark expired forms as EXPIRED."""
    now = timezone.now()
    
    expired_forms = TaxFreeForm.objects.filter(
        Q(status__in=[TaxFreeFormStatus.CREATED, TaxFreeFormStatus.ISSUED, TaxFreeFormStatus.VALIDATION_PENDING]),
        expires_at__lt=now
    )
    
    count = expired_forms.update(status=TaxFreeFormStatus.EXPIRED)
    
    # Log each expiration
    from apps.audit.services import AuditService
    for form in TaxFreeForm.objects.filter(
        status=TaxFreeFormStatus.EXPIRED,
        updated_at__gte=now
    ):
        AuditService.log(
            actor=None,
            action='TAXFREE_FORM_EXPIRED',
            entity='TaxFreeForm',
            entity_id=str(form.id),
            metadata={'form_number': form.form_number}
        )
    
    return f"Expired {count} forms"
