"""
Celery tasks for refunds app.
"""
from celery import shared_task
from django.utils import timezone
from django.db.models import F

from .models import Refund, RefundStatus


@shared_task
def retry_failed_payments():
    """Retry failed payments that are due for retry."""
    now = timezone.now()
    
    refunds_to_retry = Refund.objects.filter(
        status=RefundStatus.FAILED,
        retry_count__lt=F('max_retries'),
        next_retry_at__lte=now
    )
    
    from services.refund_service import RefundService
    
    count = 0
    for refund in refunds_to_retry:
        try:
            RefundService.process_refund(refund)
            count += 1
        except Exception as e:
            # Log error but continue with other refunds
            from apps.audit.services import AuditService
            AuditService.log(
                actor=None,
                action='REFUND_RETRY_ERROR',
                entity='Refund',
                entity_id=str(refund.id),
                metadata={'error': str(e)}
            )
    
    return f"Retried {count} refunds"


@shared_task
def process_refund_async(refund_id):
    """Process a single refund asynchronously."""
    try:
        refund = Refund.objects.get(id=refund_id)
        from services.refund_service import RefundService
        RefundService.process_refund(refund)
    except Refund.DoesNotExist:
        pass
