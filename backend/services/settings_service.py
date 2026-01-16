"""
Service for accessing system settings throughout the application.
"""
from django.core.cache import cache
import json


SETTINGS_CACHE_KEY = 'system_settings'

DEFAULT_SETTINGS = {
    'general': {
        'company_name': 'Tax Free RDC',
        'company_address': 'Kinshasa, République Démocratique du Congo',
        'company_phone': '+243 XXX XXX XXX',
        'company_email': 'contact@taxfree.cd',
        'default_currency': 'CDF',
        'default_language': 'fr',
        'timezone': 'Africa/Kinshasa',
    },
    'taxfree': {
        'form_validity_days': 90,
        'min_purchase_amount': 50000,
        'max_refund_amount': 10000000,
        'default_vat_rate': 16,
        'operator_fee_percent': 15,
        'require_physical_control_above': 1000000,
    },
    'notifications': {
        'email_notifications_enabled': True,
        'sms_notifications_enabled': False,
        'notify_on_form_created': True,
        'notify_on_validation': True,
        'notify_on_refund': True,
        'notify_admins_on_high_risk': True,
    },
    'security': {
        'session_timeout_minutes': 60,
        'max_login_attempts': 5,
        'require_2fa_for_admins': True,
        'password_expiry_days': 90,
        'ip_whitelist_enabled': False,
        'ip_whitelist': [],
    },
    'maintenance': {
        'maintenance_mode': False,
        'maintenance_message': 'Le système est en maintenance. Veuillez réessayer plus tard.',
        'allowed_ips_during_maintenance': [],
    },
}


class SettingsService:
    """Service for accessing system settings."""
    
    @staticmethod
    def get_all_settings():
        """Get all system settings."""
        # Try cache first
        cached = cache.get(SETTINGS_CACHE_KEY)
        if cached:
            return cached
        
        # Try database
        try:
            from django.apps import apps
            SystemSetting = apps.get_model('accounts', 'SystemSetting')
            setting = SystemSetting.objects.filter(key='system_settings').first()
            if setting:
                settings_data = json.loads(setting.value)
                cache.set(SETTINGS_CACHE_KEY, settings_data, 3600)
                return settings_data
        except Exception:
            pass
        
        return DEFAULT_SETTINGS.copy()
    
    @staticmethod
    def get_section(section_name):
        """Get a specific section of settings."""
        all_settings = SettingsService.get_all_settings()
        return all_settings.get(section_name, DEFAULT_SETTINGS.get(section_name, {}))
    
    @staticmethod
    def get_setting(section_name, key, default=None):
        """Get a specific setting value."""
        section = SettingsService.get_section(section_name)
        return section.get(key, default)
    
    @staticmethod
    def is_email_notifications_enabled():
        """Check if email notifications are enabled."""
        return SettingsService.get_setting('notifications', 'email_notifications_enabled', True)
    
    @staticmethod
    def is_sms_notifications_enabled():
        """Check if SMS notifications are enabled."""
        return SettingsService.get_setting('notifications', 'sms_notifications_enabled', False)
    
    @staticmethod
    def should_notify_on_form_created():
        """Check if notifications should be sent on form creation."""
        return (
            SettingsService.is_email_notifications_enabled() and
            SettingsService.get_setting('notifications', 'notify_on_form_created', True)
        )
    
    @staticmethod
    def should_notify_on_validation():
        """Check if notifications should be sent on validation."""
        return (
            SettingsService.is_email_notifications_enabled() and
            SettingsService.get_setting('notifications', 'notify_on_validation', True)
        )
    
    @staticmethod
    def should_notify_on_refund():
        """Check if notifications should be sent on refund."""
        return (
            SettingsService.is_email_notifications_enabled() and
            SettingsService.get_setting('notifications', 'notify_on_refund', True)
        )
    
    @staticmethod
    def should_notify_admins_on_high_risk():
        """Check if admins should be notified on high risk."""
        return (
            SettingsService.is_email_notifications_enabled() and
            SettingsService.get_setting('notifications', 'notify_admins_on_high_risk', True)
        )
    
    # ==================== SECURITY SETTINGS ====================
    
    @staticmethod
    def get_session_timeout_minutes():
        """Get session timeout in minutes."""
        return SettingsService.get_setting('security', 'session_timeout_minutes', 60)
    
    @staticmethod
    def get_max_login_attempts():
        """Get maximum login attempts before lockout."""
        return SettingsService.get_setting('security', 'max_login_attempts', 5)
    
    @staticmethod
    def get_password_expiry_days():
        """Get password expiry in days (0 = no expiry)."""
        return SettingsService.get_setting('security', 'password_expiry_days', 90)
    
    @staticmethod
    def is_2fa_required_for_admins():
        """Check if 2FA is required for admin users."""
        return SettingsService.get_setting('security', 'require_2fa_for_admins', True)
    
    @staticmethod
    def is_ip_whitelist_enabled():
        """Check if IP whitelist is enabled."""
        return SettingsService.get_setting('security', 'ip_whitelist_enabled', False)
    
    @staticmethod
    def get_ip_whitelist():
        """Get list of whitelisted IPs."""
        return SettingsService.get_setting('security', 'ip_whitelist', [])
    
    # ==================== MAINTENANCE SETTINGS ====================
    
    @staticmethod
    def is_maintenance_mode():
        """Check if maintenance mode is enabled."""
        return SettingsService.get_setting('maintenance', 'maintenance_mode', False)
    
    @staticmethod
    def get_maintenance_message():
        """Get maintenance mode message."""
        return SettingsService.get_setting(
            'maintenance', 
            'maintenance_message', 
            'Le système est en maintenance. Veuillez réessayer plus tard.'
        )
