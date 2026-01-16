"""
Celery tasks for notifications.
"""
from celery import shared_task
from django.utils import timezone

from .models import Notification, NotificationStatus, NotificationType


@shared_task
def send_pending_notifications():
    """Send all pending notifications."""
    from providers.notification_provider import get_notification_provider
    
    pending = Notification.objects.filter(status=NotificationStatus.PENDING)
    
    email_provider = get_notification_provider('email')
    sms_provider = get_notification_provider('sms')
    
    sent_count = 0
    failed_count = 0
    
    for notification in pending:
        try:
            if notification.type == NotificationType.EMAIL:
                success = email_provider.send(
                    to=notification.email or notification.user.email,
                    subject=notification.subject,
                    body=notification.body
                )
            elif notification.type == NotificationType.SMS:
                success = sms_provider.send(
                    to=notification.phone or notification.user.phone,
                    body=notification.body
                )
            elif notification.type == NotificationType.IN_APP:
                # In-app notifications are already "sent" when created
                success = True
            else:
                success = False
            
            if success:
                notification.status = NotificationStatus.SENT
                notification.sent_at = timezone.now()
                sent_count += 1
            else:
                notification.status = NotificationStatus.FAILED
                notification.error_message = "Provider returned failure"
                failed_count += 1
            
            notification.save()
            
        except Exception as e:
            notification.status = NotificationStatus.FAILED
            notification.error_message = str(e)
            notification.save()
            failed_count += 1
    
    return f"Sent: {sent_count}, Failed: {failed_count}"


@shared_task
def send_notification(notification_id):
    """Send a single notification."""
    try:
        notification = Notification.objects.get(id=notification_id)
        if notification.status != NotificationStatus.PENDING:
            return "Notification already processed"
        
        from providers.notification_provider import get_notification_provider
        
        if notification.type == NotificationType.EMAIL:
            provider = get_notification_provider('email')
            success = provider.send(
                to=notification.email or notification.user.email,
                subject=notification.subject,
                body=notification.body
            )
        elif notification.type == NotificationType.SMS:
            provider = get_notification_provider('sms')
            success = provider.send(
                to=notification.phone or notification.user.phone,
                body=notification.body
            )
        else:
            success = True
        
        if success:
            notification.status = NotificationStatus.SENT
            notification.sent_at = timezone.now()
        else:
            notification.status = NotificationStatus.FAILED
            notification.error_message = "Provider returned failure"
        
        notification.save()
        return f"Notification {notification_id}: {notification.status}"
        
    except Notification.DoesNotExist:
        return f"Notification {notification_id} not found"
