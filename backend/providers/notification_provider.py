"""
Notification providers (mock implementations).
"""
import logging
from abc import ABC, abstractmethod

logger = logging.getLogger(__name__)


class BaseNotificationProvider(ABC):
    """Base class for notification providers."""
    
    name = "base"
    
    @abstractmethod
    def send(self, to, body, **kwargs):
        """
        Send a notification.
        
        Args:
            to: Recipient (email or phone)
            body: Message body
            **kwargs: Additional params (subject for email, etc.)
            
        Returns:
            bool indicating success
        """
        pass


class MockEmailProvider(BaseNotificationProvider):
    """Mock email provider that logs emails."""
    
    name = "mock_email"
    
    def send(self, to, body, subject='', **kwargs):
        logger.info(f"[MOCK EMAIL] To: {to}")
        logger.info(f"[MOCK EMAIL] Subject: {subject}")
        logger.info(f"[MOCK EMAIL] Body: {body[:200]}...")
        
        # Always succeed in mock
        return True


class MockSMSProvider(BaseNotificationProvider):
    """Mock SMS provider that logs SMS."""
    
    name = "mock_sms"
    
    def send(self, to, body, **kwargs):
        logger.info(f"[MOCK SMS] To: {to}")
        logger.info(f"[MOCK SMS] Body: {body}")
        
        # Always succeed in mock
        return True


def get_notification_provider(channel):
    """Get notification provider for a channel."""
    providers = {
        'email': MockEmailProvider(),
        'sms': MockSMSProvider(),
    }
    return providers.get(channel, MockEmailProvider())
