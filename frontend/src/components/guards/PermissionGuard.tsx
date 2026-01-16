/**
 * Permission Guard Component
 * Protects routes based on granular permissions for system users (ADMIN, AUDITOR).
 * Redirects to dashboard or shows access denied if user lacks required permission.
 */
import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';
import usePermissions from '../../hooks/usePermissions';
import { ShieldExclamationIcon } from '@heroicons/react/24/outline';

interface PermissionGuardProps {
  children: ReactNode;
  requiredModule?: string;
  requiredAction?: string;
  fallback?: ReactNode;
  redirectTo?: string;
}

/**
 * Access Denied component shown when user lacks permission
 */
function AccessDenied() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center">
        <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <ShieldExclamationIcon className="w-8 h-8 text-red-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Accès refusé</h2>
        <p className="text-gray-600 mb-4">
          Vous n'avez pas les permissions nécessaires pour accéder à cette page.
        </p>
        <p className="text-sm text-gray-500">
          Contactez votre administrateur si vous pensez que c'est une erreur.
        </p>
      </div>
    </div>
  );
}

export default function PermissionGuard({
  children,
  requiredModule,
  requiredAction,
  fallback,
  redirectTo,
}: PermissionGuardProps) {
  const { user, isAuthenticated } = useAuthStore();
  const location = useLocation();
  const { 
    hasModuleAccess, 
    hasPermission, 
    isSuperAdmin, 
    hasGranularPermissions,
    isLoading 
  } = usePermissions();

  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Only apply granular permissions to ADMIN and AUDITOR
  if (!user?.role || !['ADMIN', 'AUDITOR'].includes(user.role)) {
    // Other roles don't use granular permissions
    return <>{children}</>;
  }

  // Super admin bypasses all permission checks
  if (isSuperAdmin) {
    return <>{children}</>;
  }

  // Still loading permissions
  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  // If user has granular permissions, check them
  if (hasGranularPermissions && requiredModule) {
    const hasAccess = requiredAction 
      ? hasPermission(requiredModule, requiredAction)
      : hasModuleAccess(requiredModule);

    if (!hasAccess) {
      // Redirect if specified
      if (redirectTo) {
        return <Navigate to={redirectTo} replace />;
      }
      // Show fallback or access denied
      return <>{fallback || <AccessDenied />}</>;
    }
  }

  return <>{children}</>;
}

/**
 * Higher-order component version for class components or simpler usage
 */
export function withPermissionGuard(
  WrappedComponent: React.ComponentType,
  requiredModule?: string,
  requiredAction?: string
) {
  return function PermissionGuardedComponent(props: any) {
    return (
      <PermissionGuard requiredModule={requiredModule} requiredAction={requiredAction}>
        <WrappedComponent {...props} />
      </PermissionGuard>
    );
  };
}
