"""
Audit service for logging actions.
"""
import logging
from django.utils import timezone
from .models import AuditLog

logger = logging.getLogger(__name__)


class AuditService:
    """Service for creating audit log entries."""
    
    # Fields to exclude from metadata (sensitive data)
    SENSITIVE_FIELDS = {
        'password', 'token', 'api_key', 'secret', 'passport_number',
        'card_number', 'cvv', 'pin', 'account_number'
    }
    
    @classmethod
    def log(cls, actor, action, entity, entity_id, metadata=None, request=None):
        """
        Create an audit log entry.
        
        Args:
            actor: User who performed the action (can be None for system actions)
            action: Action performed (e.g., 'MERCHANT_CREATED', 'FORM_VALIDATED')
            entity: Entity type (e.g., 'Merchant', 'TaxFreeForm')
            entity_id: ID of the entity
            metadata: Additional context (will be sanitized)
            request: HTTP request (for IP extraction)
        """
        try:
            # Sanitize metadata
            safe_metadata = cls._sanitize_metadata(metadata or {})
            
            # Extract actor info
            actor_id = None
            actor_email = ''
            actor_role = ''
            
            if actor:
                actor_id = actor.id
                actor_email = actor.email
                actor_role = actor.role
            
            # Extract IP from request
            actor_ip = None
            if request:
                actor_ip = cls._get_client_ip(request)
            
            # Create log entry
            AuditLog.objects.create(
                actor_id=actor_id,
                actor_email=actor_email,
                actor_role=actor_role,
                actor_ip=actor_ip,
                action=action,
                entity=entity,
                entity_id=str(entity_id),
                metadata=safe_metadata
            )
            
        except Exception as e:
            # Log error but don't fail the main operation
            logger.error(f"Failed to create audit log: {e}")
    
    @classmethod
    def _sanitize_metadata(cls, metadata):
        """Remove sensitive fields from metadata."""
        if not isinstance(metadata, dict):
            return {}
        
        sanitized = {}
        for key, value in metadata.items():
            key_lower = key.lower()
            if any(sensitive in key_lower for sensitive in cls.SENSITIVE_FIELDS):
                sanitized[key] = '[REDACTED]'
            elif isinstance(value, dict):
                sanitized[key] = cls._sanitize_metadata(value)
            else:
                sanitized[key] = value
        
        return sanitized
    
    @classmethod
    def _get_client_ip(cls, request):
        """Extract client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    @classmethod
    def get_entity_history(cls, entity, entity_id, limit=100):
        """Get audit history for an entity."""
        return AuditLog.objects.filter(
            entity=entity,
            entity_id=str(entity_id)
        ).order_by('-timestamp')[:limit]
    
    @classmethod
    def get_actor_history(cls, actor_id, limit=100):
        """Get audit history for an actor."""
        return AuditLog.objects.filter(
            actor_id=actor_id
        ).order_by('-timestamp')[:limit]
