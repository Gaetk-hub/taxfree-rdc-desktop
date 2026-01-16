"""
Custom permissions for RBAC.
"""
from rest_framework import permissions
from .models import UserRole


class IsAdmin(permissions.BasePermission):
    """Allow access only to admin users."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_admin()


class IsAdminOrReadOnly(permissions.BasePermission):
    """Allow write access only to admin users."""
    
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return request.user.is_authenticated
        return request.user.is_authenticated and request.user.is_admin()


class IsMerchant(permissions.BasePermission):
    """Allow access only to merchant users."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_merchant_user()


class IsCustomsAgent(permissions.BasePermission):
    """Allow access only to customs agents."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_customs_agent()


class IsOperator(permissions.BasePermission):
    """Allow access only to refund operators."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_operator()


class IsAuditor(permissions.BasePermission):
    """Allow access only to auditors."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and request.user.is_auditor()


class IsAdminOrAuditor(permissions.BasePermission):
    """Allow access to admin or auditor users."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_admin() or request.user.is_auditor()
        )


class IsOperatorOrCustomsAgent(permissions.BasePermission):
    """Allow access to operators or customs agents."""
    
    def has_permission(self, request, view):
        return request.user.is_authenticated and (
            request.user.is_operator() or request.user.is_customs_agent()
        )


class HasRole(permissions.BasePermission):
    """Generic role-based permission - STRICT mode (no admin bypass)."""
    
    allowed_roles = []
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        # Strict role check - no admin bypass
        return request.user.role in self.allowed_roles


class HasRoleStrict(permissions.BasePermission):
    """
    Strict role-based permission that does NOT allow admin bypass.
    Use this for role-specific endpoints where admins should not have access.
    """
    
    def __init__(self, allowed_roles=None):
        self.allowed_roles = allowed_roles or []
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in self.allowed_roles


class IsMerchantOwner(permissions.BasePermission):
    """Check if user owns the merchant resource."""
    
    def has_object_permission(self, request, view, obj):
        if request.user.is_admin():
            return True
        # Check if object has merchant attribute
        merchant = getattr(obj, 'merchant', None)
        if merchant is None:
            merchant = obj if hasattr(obj, 'users') else None
        return merchant and request.user.merchant == merchant


def role_required(*roles, allow_admin=False):
    """
    Decorator factory for role-based permissions.
    By default, this is STRICT - admin does NOT bypass.
    Set allow_admin=True to allow admin access.
    """
    class RolePermission(permissions.BasePermission):
        def has_permission(self, request, view):
            if not request.user.is_authenticated:
                return False
            if allow_admin and request.user.is_admin():
                return True
            return request.user.role in roles
    return RolePermission


class IsAdminOnly(permissions.BasePermission):
    """
    Strict admin-only permission.
    Only ADMIN role can access, no other roles.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'ADMIN'


class IsMerchantOnly(permissions.BasePermission):
    """
    Strict merchant-only permission.
    Only MERCHANT and MERCHANT_EMPLOYEE roles can access.
    Admin cannot access.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ['MERCHANT', 'MERCHANT_EMPLOYEE']


class IsCustomsAgentOnly(permissions.BasePermission):
    """
    Strict customs agent-only permission.
    Only CUSTOMS_AGENT and OPERATOR roles can access.
    Admin cannot access.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role in ['CUSTOMS_AGENT', 'OPERATOR']


class IsOperatorOnly(permissions.BasePermission):
    """
    Strict operator-only permission.
    Only OPERATOR role can access.
    Admin cannot access.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'OPERATOR'


class IsClientOnly(permissions.BasePermission):
    """
    Strict client-only permission.
    Only TRAVELER role can access.
    Admin cannot access.
    """
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        return request.user.role == 'TRAVELER'


# =============================================================================
# GRANULAR PERMISSIONS SERVICE
# =============================================================================

class PermissionService:
    """
    Service for checking granular permissions for system users (ADMIN, AUDITOR).
    These permissions are stored in UserPermission model.
    """
    
    # Mapping of modules to their corresponding URL paths and sidebar items
    MODULE_ROUTES = {
        'DASHBOARD': ['/admin/dashboard', '/admin'],
        'MERCHANTS': ['/admin/merchants'],
        'USERS': ['/admin/users'],
        'FORMS': ['/admin/forms', '/admin/bordereaux'],
        'REFUNDS': ['/admin/refunds', '/admin/remboursements'],
        'BORDERS': ['/admin/borders', '/admin/points-of-exit'],
        'AGENTS': ['/admin/agents'],
        'RULES': ['/admin/rules', '/admin/vat-rules'],
        'CATEGORIES': ['/admin/categories'],
        'AUDIT': ['/admin/audit'],
        'REPORTS': ['/admin/reports'],
        'SETTINGS': ['/admin/settings'],
        'PERMISSIONS': ['/admin/permissions'],
    }
    
    @staticmethod
    def get_user_permissions(user):
        """Get all permissions for a user as a dict of module -> actions."""
        if not user or not user.is_authenticated:
            return {}
        
        # Only ADMIN and AUDITOR have granular permissions
        if user.role not in ['ADMIN', 'AUDITOR']:
            return {}
        
        from .admin_models import UserPermission
        permissions = UserPermission.objects.filter(user=user)
        
        result = {}
        for perm in permissions:
            if perm.module not in result:
                result[perm.module] = []
            result[perm.module].append(perm.action)
        
        return result
    
    @staticmethod
    def get_user_modules(user):
        """Get list of modules the user has access to (any action)."""
        permissions = PermissionService.get_user_permissions(user)
        return list(permissions.keys())
    
    @staticmethod
    def has_module_permission(user, module, action=None):
        """
        Check if user has permission for a specific module.
        If action is None, checks if user has ANY action on the module.
        """
        if not user or not user.is_authenticated:
            return False
        
        # Non-system users don't use granular permissions
        if user.role not in ['ADMIN', 'AUDITOR']:
            return False
        
        # Super admin has all permissions
        if getattr(user, 'is_super_admin', False):
            return True
        
        from .admin_models import UserPermission
        
        query = UserPermission.objects.filter(user=user, module=module)
        if action:
            query = query.filter(action=action)
        
        return query.exists()
    
    @staticmethod
    def has_any_permission(user):
        """Check if user has at least one permission."""
        if not user or not user.is_authenticated:
            return False
        
        if user.role not in ['ADMIN', 'AUDITOR']:
            return False
        
        # Super admin always has permissions
        if getattr(user, 'is_super_admin', False):
            return True
        
        from .admin_models import UserPermission
        return UserPermission.objects.filter(user=user).exists()
    
    @staticmethod
    def get_accessible_routes(user):
        """Get list of routes the user can access based on their permissions."""
        modules = PermissionService.get_user_modules(user)
        routes = []
        for module in modules:
            routes.extend(PermissionService.MODULE_ROUTES.get(module, []))
        return routes


class HasModulePermission(permissions.BasePermission):
    """
    Permission class that checks granular module permissions.
    Use with view attribute 'required_module' and optionally 'required_action'.
    """
    
    def has_permission(self, request, view):
        if not request.user.is_authenticated:
            return False
        
        # Non-system users bypass granular permissions (they use role-based)
        if request.user.role not in ['ADMIN', 'AUDITOR']:
            # For other roles, check if they have basic admin access
            return request.user.is_admin() or request.user.is_auditor()
        
        # Super admin bypass
        if getattr(request.user, 'is_super_admin', False):
            return True
        
        required_module = getattr(view, 'required_module', None)
        required_action = getattr(view, 'required_action', None)
        
        if not required_module:
            # No module specified, allow access
            return True
        
        return PermissionService.has_module_permission(
            request.user, 
            required_module, 
            required_action
        )


def require_module_permission(module, action=None):
    """
    Decorator factory for module-based permissions.
    Creates a permission class that checks for specific module/action.
    
    Usage:
        @require_module_permission('MERCHANTS', 'VIEW')
        class MerchantsViewSet(viewsets.ModelViewSet):
            ...
    """
    class ModulePermission(permissions.BasePermission):
        def has_permission(self, request, view):
            if not request.user.is_authenticated:
                return False
            
            # Non-system users bypass granular permissions
            if request.user.role not in ['ADMIN', 'AUDITOR']:
                return request.user.is_admin() or request.user.is_auditor()
            
            # Super admin bypass
            if getattr(request.user, 'is_super_admin', False):
                return True
            
            return PermissionService.has_module_permission(request.user, module, action)
    
    return ModulePermission


class RequiresMerchants(permissions.BasePermission):
    """Permission for MERCHANTS module."""
    def has_permission(self, request, view):
        return _check_module_permission(request, 'MERCHANTS')


class RequiresUsers(permissions.BasePermission):
    """Permission for USERS module."""
    def has_permission(self, request, view):
        return _check_module_permission(request, 'USERS')


class RequiresForms(permissions.BasePermission):
    """Permission for FORMS module."""
    def has_permission(self, request, view):
        return _check_module_permission(request, 'FORMS')


class RequiresRefunds(permissions.BasePermission):
    """Permission for REFUNDS module."""
    def has_permission(self, request, view):
        return _check_module_permission(request, 'REFUNDS')


class RequiresBorders(permissions.BasePermission):
    """Permission for BORDERS module."""
    def has_permission(self, request, view):
        return _check_module_permission(request, 'BORDERS')


class RequiresAgents(permissions.BasePermission):
    """Permission for AGENTS module."""
    def has_permission(self, request, view):
        return _check_module_permission(request, 'AGENTS')


class RequiresRules(permissions.BasePermission):
    """Permission for RULES module."""
    def has_permission(self, request, view):
        return _check_module_permission(request, 'RULES')


class RequiresCategories(permissions.BasePermission):
    """Permission for CATEGORIES module."""
    def has_permission(self, request, view):
        return _check_module_permission(request, 'CATEGORIES')


class RequiresAudit(permissions.BasePermission):
    """Permission for AUDIT module."""
    def has_permission(self, request, view):
        return _check_module_permission(request, 'AUDIT')


class RequiresReports(permissions.BasePermission):
    """Permission for REPORTS module."""
    def has_permission(self, request, view):
        return _check_module_permission(request, 'REPORTS')


class RequiresSettings(permissions.BasePermission):
    """Permission for SETTINGS module."""
    def has_permission(self, request, view):
        return _check_module_permission(request, 'SETTINGS')


class RequiresPermissions(permissions.BasePermission):
    """Permission for PERMISSIONS module."""
    def has_permission(self, request, view):
        return _check_module_permission(request, 'PERMISSIONS')


def _check_module_permission(request, module, action=None):
    """Helper function to check module permission."""
    if not request.user.is_authenticated:
        return False
    
    # Non-system users bypass granular permissions
    if request.user.role not in ['ADMIN', 'AUDITOR']:
        return request.user.is_admin() or request.user.is_auditor()
    
    # Super admin bypass
    if getattr(request.user, 'is_super_admin', False):
        return True
    
    return PermissionService.has_module_permission(request.user, module, action)
