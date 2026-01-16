"""
Security Middleware for enforcing dynamic security settings.
Handles IP whitelist, maintenance mode, and other security checks.
"""
from django.http import JsonResponse
from django.utils.deprecation import MiddlewareMixin
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


class SecurityMiddleware(MiddlewareMixin):
    """
    Middleware to enforce security settings:
    - Maintenance mode
    - IP whitelist for admin users
    
    Note: This middleware runs AFTER AuthenticationMiddleware, but the JWT
    authentication happens in DRF views. We need to manually check JWT tokens
    to determine if the user is an admin during maintenance mode.
    """
    
    # Paths that are always allowed (login, public pages, etc.)
    EXEMPT_PATHS = [
        '/api/auth/login/',
        '/api/auth/verify-otp/',
        '/api/auth/refresh/',
        '/api/auth/logout/',  # Allow logout during maintenance
        '/api/auth/forgot-password/',
        '/api/auth/reset-password/',
        '/api/auth/register/',
        '/api/settings/system/',  # Allow settings access for admins to disable maintenance
        '/api/taxfree/status/',  # Public status check
        '/api/docs/',
        '/api/schema/',
        '/api/redoc/',
        '/admin/',
        '/static/',
        '/media/',
    ]
    
    def process_request(self, request):
        """Process each request for security checks."""
        from .security_service import SecurityService
        
        path = request.path
        
        # Skip exempt paths
        if self._is_exempt_path(path):
            logger.debug(f"SecurityMiddleware: Path {path} is exempt")
            return None
        
        ip_address = SecurityService.get_client_ip(request)
        
        # Try to get authenticated user from JWT token
        user = self._get_user_from_jwt(request)
        
        # Debug logging
        is_maintenance = SecurityService.is_maintenance_mode()
        logger.info(f"SecurityMiddleware: path={path}, ip={ip_address}, user={user}, is_admin={user.is_admin() if user else None}, maintenance_mode={is_maintenance}")
        
        # Check maintenance mode
        can_access = SecurityService.can_access_during_maintenance(ip_address, user)
        logger.info(f"SecurityMiddleware: can_access_during_maintenance={can_access}")
        
        if not can_access:
            message = SecurityService.get_maintenance_message()
            logger.warning(f"SecurityMiddleware: Blocking request to {path} - maintenance mode active")
            return JsonResponse(
                {
                    'detail': message,
                    'code': 'maintenance_mode'
                },
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        
        # Check IP whitelist (only for authenticated admin users)
        if user and user.is_admin():
            if not SecurityService.is_ip_allowed(ip_address, user):
                return JsonResponse(
                    {
                        'detail': 'Accès refusé. Votre adresse IP n\'est pas autorisée.',
                        'code': 'ip_not_whitelisted'
                    },
                    status=status.HTTP_403_FORBIDDEN
                )
        
        return None
    
    def _is_exempt_path(self, path):
        """Check if path is exempt from security checks."""
        for exempt in self.EXEMPT_PATHS:
            if path.startswith(exempt):
                return True
        return False
    
    def _get_user_from_jwt(self, request):
        """
        Manually extract and validate JWT token to get user.
        This is needed because DRF authentication happens after middleware.
        """
        try:
            from rest_framework_simplejwt.authentication import JWTAuthentication
            
            jwt_auth = JWTAuthentication()
            
            # Try to authenticate
            auth_result = jwt_auth.authenticate(request)
            if auth_result:
                user, token = auth_result
                return user
        except Exception as e:
            # Token invalid or not present - that's fine, user is anonymous
            logger.debug(f"JWT auth in middleware failed: {e}")
        
        return None
