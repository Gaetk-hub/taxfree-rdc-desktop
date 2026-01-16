"""
Celery configuration for Tax Free project.
"""
import os
from celery import Celery
from celery.schedules import crontab

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

app = Celery('taxfree')
app.config_from_object('django.conf:settings', namespace='CELERY')
app.autodiscover_tasks()

# Periodic tasks
app.conf.beat_schedule = {
    'expire-taxfree-forms': {
        'task': 'apps.taxfree.tasks.expire_forms',
        'schedule': crontab(hour='0', minute='0'),  # Daily at midnight
    },
    'retry-failed-payments': {
        'task': 'apps.refunds.tasks.retry_failed_payments',
        'schedule': crontab(hour='*/4', minute='0'),  # Every 4 hours
    },
    'send-pending-notifications': {
        'task': 'apps.notifications.tasks.send_pending_notifications',
        'schedule': crontab(minute='*/5'),  # Every 5 minutes
    },
}


@app.task(bind=True, ignore_result=True)
def debug_task(self):
    print(f'Request: {self.request!r}')
