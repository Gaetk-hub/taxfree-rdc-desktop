/**
 * Hook for managing granular permissions for system users (ADMIN, AUDITOR).
 * Provides permission checking and module access control.
 */
import { useQuery } from '@tanstack/react-query';
import api from '../services/api';
import { useAuthStore } from '../store/authStore';

export interface PermissionsData {
  has_granular_permissions: boolean;
  is_super_admin?: boolean;
  role: string;
  permissions: Record<string, string[]>;
  modules: string[];
  accessible_routes: string[];
  message?: string;
}

// Module to route mapping (must match backend)
export const MODULE_ROUTES: Record<string, string[]> = {
  DASHBOARD: ['/admin/dashboard', '/admin'],
  MERCHANTS: ['/admin/merchants'],
  USERS: ['/admin/users'],
  FORMS: ['/admin/forms', '/admin/bordereaux'],
  REFUNDS: ['/admin/refunds', '/admin/remboursements'],
  BORDERS: ['/admin/borders', '/admin/points-of-exit'],
  AGENTS: ['/admin/agents'],
  RULES: ['/admin/rules', '/admin/vat-rules'],
  CATEGORIES: ['/admin/categories'],
  AUDIT: ['/admin/audit'],
  REPORTS: ['/admin/reports'],
  SETTINGS: ['/admin/settings'],
  PERMISSIONS: ['/admin/permissions'],
  SUPPORT_CHAT: ['/admin/support/chat'],
  SUPPORT_TICKETS: ['/admin/support/tickets'],
};

// Module labels for display
export const MODULE_LABELS: Record<string, string> = {
  DASHBOARD: 'Tableau de bord',
  MERCHANTS: 'Commerçants',
  USERS: 'Utilisateurs',
  FORMS: 'Bordereaux',
  REFUNDS: 'Remboursements',
  BORDERS: 'Frontières',
  AGENTS: 'Agents douaniers',
  RULES: 'Règles TVA',
  CATEGORIES: 'Catégories',
  AUDIT: 'Audit',
  REPORTS: 'Rapports',
  SETTINGS: 'Paramètres',
  PERMISSIONS: 'Permissions',
  SUPPORT_CHAT: 'Chat support',
  SUPPORT_TICKETS: 'Tickets support',
};

// Action labels
export const ACTION_LABELS: Record<string, string> = {
  VIEW: 'Consulter',
  CREATE: 'Créer',
  EDIT: 'Modifier',
  DELETE: 'Supprimer',
  EXPORT: 'Exporter',
  APPROVE: 'Approuver',
  MANAGE: 'Gérer',
};

export function usePermissions() {
  const { user, isAuthenticated } = useAuthStore();
  
  // Only fetch permissions for ADMIN and AUDITOR roles
  const shouldFetchPermissions = !!(isAuthenticated && 
    user?.role && 
    ['ADMIN', 'AUDITOR'].includes(user.role));

  const { data, isLoading, error, refetch } = useQuery<PermissionsData>({
    queryKey: ['my-permissions', user?.id],
    queryFn: async () => {
      const response = await api.get('/auth/my-permissions/');
      return response.data;
    },
    enabled: shouldFetchPermissions,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  /**
   * Check if user has access to a specific module
   */
  const hasModuleAccess = (module: string): boolean => {
    // Non-system users don't use granular permissions
    if (!shouldFetchPermissions) return false;
    
    // Super admin has all access
    if (data?.is_super_admin) return true;
    
    // Check if module is in user's permissions
    return data?.modules?.includes(module) ?? false;
  };

  /**
   * Check if user has a specific action on a module
   */
  const hasPermission = (module: string, action: string): boolean => {
    // Non-system users don't use granular permissions
    if (!shouldFetchPermissions) return false;
    
    // Super admin has all permissions
    if (data?.is_super_admin) return true;
    
    // Check specific permission
    return data?.permissions?.[module]?.includes(action) ?? false;
  };

  /**
   * Check if user can access a specific route
   */
  const canAccessRoute = (route: string): boolean => {
    // Non-system users don't use granular permissions
    if (!shouldFetchPermissions) return true;
    
    // Super admin can access everything
    if (data?.is_super_admin) return true;
    
    // Check if route is in accessible routes
    if (!data?.modules || data.modules.length === 0) return false;
    
    // Check each module's routes
    for (const module of data.modules) {
      const moduleRoutes = MODULE_ROUTES[module] || [];
      if (moduleRoutes.some(r => route.startsWith(r))) {
        return true;
      }
    }
    
    return false;
  };

  /**
   * Get list of accessible modules
   */
  const getAccessibleModules = (): string[] => {
    if (!shouldFetchPermissions) return [];
    if (data?.is_super_admin) return Object.keys(MODULE_ROUTES);
    return data?.modules || [];
  };

  /**
   * Check if user has any permissions at all
   */
  const hasAnyPermission = (): boolean => {
    if (!shouldFetchPermissions) return false;
    if (data?.is_super_admin) return true;
    return (data?.modules?.length ?? 0) > 0;
  };

  return {
    // Data
    permissions: data,
    isLoading,
    error,
    
    // Checks
    hasModuleAccess,
    hasPermission,
    canAccessRoute,
    hasAnyPermission,
    
    // Getters
    getAccessibleModules,
    
    // State
    isSuperAdmin: data?.is_super_admin ?? false,
    hasGranularPermissions: data?.has_granular_permissions ?? false,
    
    // Actions
    refetch,
  };
}

export default usePermissions;
