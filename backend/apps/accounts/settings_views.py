"""
System settings views for admin configuration.
"""
from rest_framework import views, status
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.cache import cache
from django.conf import settings as django_settings
import json

from .permissions import IsAdmin


# Default system settings
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

SETTINGS_CACHE_KEY = 'system_settings'
SETTINGS_CACHE_TIMEOUT = 60 * 60  # 1 hour


class SystemSettingsView(views.APIView):
    """
    API endpoint for system settings management.
    Only accessible by Super Admins.
    """
    permission_classes = [IsAuthenticated, IsAdmin]

    def get(self, request):
        """Get current system settings."""
        # Try to get from cache first
        cached_settings = cache.get(SETTINGS_CACHE_KEY)
        if cached_settings:
            return Response(cached_settings)
        
        # Try to load from database/file
        settings_data = self._load_settings()
        
        # Cache the settings
        cache.set(SETTINGS_CACHE_KEY, settings_data, SETTINGS_CACHE_TIMEOUT)
        
        return Response(settings_data)

    def put(self, request):
        """Update system settings."""
        new_settings = request.data
        
        # Load current settings to detect critical changes
        current_settings = self._load_settings()
        
        # Merge with defaults to ensure all keys exist
        merged_settings = self._merge_settings(DEFAULT_SETTINGS, new_settings)
        
        # Save settings
        self._save_settings(merged_settings)
        
        # Clear cache
        cache.delete(SETTINGS_CACHE_KEY)
        
        # Log the change with detailed metadata
        from apps.audit.services import AuditService
        
        # Build detailed metadata for audit
        audit_metadata = {
            'updated_sections': list(new_settings.keys()),
        }
        
        # Detect critical maintenance mode changes
        if 'maintenance' in new_settings:
            old_maintenance = current_settings.get('maintenance', {})
            new_maintenance = merged_settings.get('maintenance', {})
            
            old_mode = old_maintenance.get('maintenance_mode', False)
            new_mode = new_maintenance.get('maintenance_mode', False)
            
            if old_mode != new_mode:
                audit_metadata['maintenance_mode_changed'] = {
                    'from': old_mode,
                    'to': new_mode
                }
                # Log specific maintenance mode change
                AuditService.log(
                    actor=request.user,
                    action='MAINTENANCE_MODE_TOGGLED',
                    entity='SystemSettings',
                    entity_id='maintenance',
                    request=request,
                    metadata={
                        'enabled': new_mode,
                        'message': new_maintenance.get('maintenance_message', ''),
                        'allowed_ips': new_maintenance.get('allowed_ips_during_maintenance', [])
                    }
                )
            
            # Detect IP whitelist changes
            old_ips = set(old_maintenance.get('allowed_ips_during_maintenance', []))
            new_ips = set(new_maintenance.get('allowed_ips_during_maintenance', []))
            if old_ips != new_ips:
                audit_metadata['maintenance_ips_changed'] = {
                    'added': list(new_ips - old_ips),
                    'removed': list(old_ips - new_ips)
                }
        
        # Detect critical security changes
        if 'security' in new_settings:
            old_security = current_settings.get('security', {})
            new_security = merged_settings.get('security', {})
            
            # IP whitelist toggle
            if old_security.get('ip_whitelist_enabled') != new_security.get('ip_whitelist_enabled'):
                audit_metadata['ip_whitelist_changed'] = {
                    'from': old_security.get('ip_whitelist_enabled', False),
                    'to': new_security.get('ip_whitelist_enabled', False)
                }
        
        # Log general settings update
        AuditService.log(
            actor=request.user,
            action='SYSTEM_SETTINGS_UPDATED',
            entity='SystemSettings',
            entity_id='system',
            request=request,
            metadata=audit_metadata
        )
        
        return Response(merged_settings)

    def _load_settings(self):
        """Load settings from storage."""
        try:
            # Try to load from SystemSetting model if it exists
            from django.apps import apps
            if apps.is_installed('apps.accounts'):
                try:
                    SystemSetting = apps.get_model('accounts', 'SystemSetting')
                    setting = SystemSetting.objects.filter(key='system_settings').first()
                    if setting:
                        return json.loads(setting.value)
                except LookupError:
                    pass
        except Exception:
            pass
        
        # Return defaults if nothing found
        return DEFAULT_SETTINGS.copy()

    def _save_settings(self, settings_data):
        """Save settings to storage."""
        try:
            from django.apps import apps
            if apps.is_installed('apps.accounts'):
                try:
                    SystemSetting = apps.get_model('accounts', 'SystemSetting')
                    SystemSetting.objects.update_or_create(
                        key='system_settings',
                        defaults={'value': json.dumps(settings_data)}
                    )
                    return
                except LookupError:
                    pass
        except Exception:
            pass
        
        # Fallback: just cache it
        cache.set(SETTINGS_CACHE_KEY, settings_data, SETTINGS_CACHE_TIMEOUT * 24)

    def _merge_settings(self, defaults, updates):
        """Deep merge settings with defaults."""
        result = defaults.copy()
        for key, value in updates.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = {**result[key], **value}
            else:
                result[key] = value
        return result
