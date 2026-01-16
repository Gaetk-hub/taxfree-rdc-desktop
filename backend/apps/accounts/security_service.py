"""
Security Service for dynamic security settings enforcement.
Centralizes all security-related logic to avoid duplication.
"""
import logging
from datetime import timedelta
from django.utils import timezone
from django.core.cache import cache
from django.db import models

logger = logging.getLogger(__name__)

# Cache keys
LOGIN_ATTEMPTS_CACHE_PREFIX = 'login_attempts_'
IP_BLOCKED_CACHE_PREFIX = 'ip_blocked_'
LOCKOUT_DURATION_MINUTES = 30  # Default lockout duration


class SecurityService:
    """
    Centralized security service for enforcing dynamic security settings.
    All security checks should go through this service.
    """
    
    # ==================== SETTINGS ACCESS ====================
    
    @staticmethod
    def get_security_settings():
        """Get all security settings from database."""
        from services.settings_service import SettingsService
        return SettingsService.get_section('security')
    
    @staticmethod
    def get_setting(key, default=None):
        """Get a specific security setting."""
        settings = SecurityService.get_security_settings()
        return settings.get(key, default)
    
    # ==================== SESSION TIMEOUT ====================
    
    @staticmethod
    def get_session_timeout_minutes():
        """Get session timeout in minutes."""
        return SecurityService.get_setting('session_timeout_minutes', 60)
    
    @staticmethod
    def get_access_token_lifetime():
        """Get JWT access token lifetime based on session timeout setting."""
        minutes = SecurityService.get_session_timeout_minutes()
        return timedelta(minutes=minutes)
    
    # ==================== LOGIN ATTEMPTS ====================
    
    @staticmethod
    def get_max_login_attempts():
        """Get maximum allowed login attempts before lockout."""
        return SecurityService.get_setting('max_login_attempts', 5)
    
    @staticmethod
    def get_lockout_duration_minutes():
        """Get lockout duration in minutes after max attempts exceeded."""
        return SecurityService.get_setting('lockout_duration_minutes', LOCKOUT_DURATION_MINUTES)
    
    @staticmethod
    def _get_attempt_cache_key(identifier):
        """Get cache key for login attempts (email or IP)."""
        return f"{LOGIN_ATTEMPTS_CACHE_PREFIX}{identifier}"
    
    @staticmethod
    def _get_blocked_cache_key(identifier):
        """Get cache key for blocked status."""
        return f"{IP_BLOCKED_CACHE_PREFIX}{identifier}"
    
    @staticmethod
    def record_failed_login(email, ip_address=None):
        """
        Record a failed login attempt.
        Returns (is_blocked, attempts_remaining).
        """
        max_attempts = SecurityService.get_max_login_attempts()
        lockout_minutes = SecurityService.get_lockout_duration_minutes()
        lockout_seconds = lockout_minutes * 60
        
        # Track by email
        email_key = SecurityService._get_attempt_cache_key(email.lower())
        attempts = cache.get(email_key, 0) + 1
        cache.set(email_key, attempts, lockout_seconds)
        
        # Also track by IP if provided
        if ip_address:
            ip_key = SecurityService._get_attempt_cache_key(ip_address)
            ip_attempts = cache.get(ip_key, 0) + 1
            cache.set(ip_key, ip_attempts, lockout_seconds)
        
        # Check if should be blocked
        if attempts >= max_attempts:
            blocked_key = SecurityService._get_blocked_cache_key(email.lower())
            cache.set(blocked_key, True, lockout_seconds)
            
            # Log to database for audit
            SecurityService._log_lockout(email, ip_address, attempts)
            
            return True, 0
        
        return False, max_attempts - attempts
    
    @staticmethod
    def clear_failed_attempts(email):
        """Clear failed login attempts after successful login."""
        email_key = SecurityService._get_attempt_cache_key(email.lower())
        blocked_key = SecurityService._get_blocked_cache_key(email.lower())
        cache.delete(email_key)
        cache.delete(blocked_key)
    
    @staticmethod
    def is_login_blocked(email, ip_address=None):
        """
        Check if login is blocked for this email or IP.
        Returns (is_blocked, lockout_remaining_seconds).
        """
        max_attempts = SecurityService.get_max_login_attempts()
        lockout_minutes = SecurityService.get_lockout_duration_minutes()
        
        # Check email block
        blocked_key = SecurityService._get_blocked_cache_key(email.lower())
        if cache.get(blocked_key):
            # Get TTL if possible
            return True, lockout_minutes * 60
        
        # Check attempt count
        email_key = SecurityService._get_attempt_cache_key(email.lower())
        attempts = cache.get(email_key, 0)
        if attempts >= max_attempts:
            return True, lockout_minutes * 60
        
        return False, 0
    
    @staticmethod
    def get_failed_attempts_count(email):
        """Get current failed attempts count for an email."""
        email_key = SecurityService._get_attempt_cache_key(email.lower())
        return cache.get(email_key, 0)
    
    @staticmethod
    def _log_lockout(email, ip_address, attempts):
        """Log account lockout to audit log."""
        try:
            from apps.audit.services import AuditService
            AuditService.log(
                actor=None,
                action='ACCOUNT_LOCKED',
                entity='User',
                entity_id=email,
                metadata={
                    'email': email,
                    'ip_address': ip_address,
                    'failed_attempts': attempts,
                    'reason': 'max_login_attempts_exceeded'
                }
            )
        except Exception as e:
            logger.error(f"Failed to log lockout: {e}")
    
    # ==================== PASSWORD EXPIRY ====================
    
    @staticmethod
    def get_password_expiry_days():
        """Get password expiry in days (0 = no expiry)."""
        return SecurityService.get_setting('password_expiry_days', 90)
    
    @staticmethod
    def is_password_expired(user):
        """
        Check if user's password has expired.
        Returns (is_expired, days_since_change).
        """
        expiry_days = SecurityService.get_password_expiry_days()
        
        # 0 means no expiry
        if expiry_days == 0:
            return False, 0
        
        # Check if user has password_changed_at field
        password_changed_at = getattr(user, 'password_changed_at', None)
        if not password_changed_at:
            # If no record, consider it as needing change (first login or legacy)
            return True, expiry_days + 1
        
        days_since_change = (timezone.now() - password_changed_at).days
        is_expired = days_since_change >= expiry_days
        
        return is_expired, days_since_change
    
    @staticmethod
    def days_until_password_expiry(user):
        """Get days until password expires (negative if already expired)."""
        expiry_days = SecurityService.get_password_expiry_days()
        
        if expiry_days == 0:
            return None  # No expiry
        
        password_changed_at = getattr(user, 'password_changed_at', None)
        if not password_changed_at:
            return 0  # Expired
        
        days_since_change = (timezone.now() - password_changed_at).days
        return expiry_days - days_since_change
    
    # ==================== 2FA REQUIREMENTS ====================
    
    @staticmethod
    def is_2fa_required_for_admins():
        """Check if 2FA is required for admin users."""
        return SecurityService.get_setting('require_2fa_for_admins', True)
    
    @staticmethod
    def should_require_2fa(user):
        """
        Check if 2FA should be required for this user.
        Currently: always required for all users (existing behavior).
        Can be extended to make it configurable per role.
        """
        from apps.accounts.models import UserRole
        
        # If 2FA is required for admins and user is admin
        if SecurityService.is_2fa_required_for_admins():
            if user.role in [UserRole.ADMIN, UserRole.AUDITOR]:
                return True
        
        # For now, 2FA is always required for all users (existing behavior)
        # This can be changed to make it optional for non-admin users
        return True
    
    # ==================== IP WHITELIST ====================
    
    @staticmethod
    def is_ip_whitelist_enabled():
        """Check if IP whitelist is enabled."""
        return SecurityService.get_setting('ip_whitelist_enabled', False)
    
    @staticmethod
    def get_ip_whitelist():
        """Get list of whitelisted IPs."""
        return SecurityService.get_setting('ip_whitelist', [])
    
    @staticmethod
    def is_ip_allowed(ip_address, user=None):
        """
        Check if IP is allowed to access the system.
        IP whitelist only applies to admin users.
        """
        if not SecurityService.is_ip_whitelist_enabled():
            return True
        
        # IP whitelist only applies to admin users
        if user and not user.is_admin():
            return True
        
        whitelist = SecurityService.get_ip_whitelist()
        if not whitelist:
            return True  # Empty whitelist = allow all
        
        return ip_address in whitelist
    
    # ==================== MAINTENANCE MODE ====================
    
    @staticmethod
    def is_maintenance_mode():
        """Check if maintenance mode is enabled."""
        from services.settings_service import SettingsService
        return SettingsService.get_setting('maintenance', 'maintenance_mode', False)
    
    @staticmethod
    def get_maintenance_message():
        """Get maintenance mode message."""
        from services.settings_service import SettingsService
        return SettingsService.get_setting(
            'maintenance', 
            'maintenance_message', 
            'Le système est en maintenance. Veuillez réessayer plus tard.'
        )
    
    @staticmethod
    def get_allowed_ips_during_maintenance():
        """Get IPs allowed during maintenance."""
        from services.settings_service import SettingsService
        return SettingsService.get_setting('maintenance', 'allowed_ips_during_maintenance', [])
    
    @staticmethod
    def can_access_during_maintenance(ip_address, user=None):
        """Check if access is allowed during maintenance."""
        if not SecurityService.is_maintenance_mode():
            return True
        
        # Admins can always access
        if user and user.is_authenticated and user.is_admin():
            return True
        
        # Check allowed IPs
        allowed_ips = SecurityService.get_allowed_ips_during_maintenance()
        if ip_address in allowed_ips:
            return True
        
        return False
    
    # ==================== UTILITY ====================
    
    @staticmethod
    def get_client_ip(request):
        """Extract client IP from request."""
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0].strip()
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
