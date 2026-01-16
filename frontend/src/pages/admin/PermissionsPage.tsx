import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import {
  ShieldCheckIcon,
  UserGroupIcon,
  ArrowPathIcon,
  PlusIcon,
  CheckIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';

interface Permission {
  id: string;
  module: string;
  module_display: string;
  action: string;
  action_display: string;
  granted_by_name: string;
  granted_at: string;
}

interface SystemUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  role_display: string;
  is_active: boolean;
  permissions: Permission[];
  permissions_count: number;
}

interface ModuleAction {
  value: string;
  label: string;
}

interface ModuleWithActions {
  value: string;
  label: string;
  actions: ModuleAction[];
}

interface ModulesData {
  modules: ModuleWithActions[];
  actions: ModuleAction[];
  module_actions: Record<string, string[]>;
}

const ROLE_COLORS: Record<string, string> = {
  ADMIN: 'bg-red-100 text-red-700',
  AUDITOR: 'bg-orange-100 text-orange-700',
  OPERATOR: 'bg-yellow-100 text-yellow-700',
};

export default function PermissionsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [addingPermission, setAddingPermission] = useState<string | null>(null);
  const [newPermission, setNewPermission] = useState({ module: '', action: '' });
  const [confirmDelete, setConfirmDelete] = useState<{ userId: string; module: string; action: string; moduleDisplay: string; actionDisplay: string } | null>(null);

  const { data: users, isLoading, refetch } = useQuery<SystemUser[]>({
    queryKey: ['system-users-permissions'],
    queryFn: async () => {
      const response = await api.get('/auth/admin/permissions/');
      return response.data;
    },
  });

  const { data: modulesData } = useQuery<ModulesData>({
    queryKey: ['permission-modules'],
    queryFn: async () => {
      const response = await api.get('/auth/admin/presets/modules/');
      return response.data;
    },
  });

  const addPermissionMutation = useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string; permissions: { module: string; action: string }[] }) => {
      const response = await api.post(`/auth/admin/users/${userId}/permissions/`, { permissions });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users-permissions'] });
      setAddingPermission(null);
      setNewPermission({ module: '', action: '' });
    },
  });

  const removePermissionMutation = useMutation({
    mutationFn: async ({ userId, permissions }: { userId: string; permissions: { module: string; action: string }[] }) => {
      const response = await api.delete(`/auth/admin/users/${userId}/permissions/`, { data: { permissions } });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['system-users-permissions'] });
    },
  });

  const filteredUsers = users?.filter(user => 
    user.full_name.toLowerCase().includes(search.toLowerCase()) ||
    user.email.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleAddPermission = (userId: string) => {
    if (!newPermission.module || !newPermission.action) return;
    addPermissionMutation.mutate({
      userId,
      permissions: [newPermission],
    });
  };

  const handleRemovePermission = (userId: string, module: string, action: string, moduleDisplay: string, actionDisplay: string) => {
    setConfirmDelete({ userId, module, action, moduleDisplay, actionDisplay });
  };

  const confirmRemovePermission = () => {
    if (confirmDelete) {
      removePermissionMutation.mutate({
        userId: confirmDelete.userId,
        permissions: [{ module: confirmDelete.module, action: confirmDelete.action }],
      });
      setConfirmDelete(null);
    }
  };

  const toggleExpand = (userId: string) => {
    setExpandedUser(expandedUser === userId ? null : userId);
    setAddingPermission(null);
  };

  const getModuleIcon = (module: string) => {
    const icons: Record<string, string> = {
      DASHBOARD: '📊',
      MERCHANTS: '🏪',
      USERS: '👥',
      FORMS: '📄',
      REFUNDS: '💰',
      BORDERS: '🚧',
      AGENTS: '👮',
      RULES: '📋',
      CATEGORIES: '🏷️',
      AUDIT: '🔍',
      REPORTS: '📈',
      SETTINGS: '⚙️',
      PERMISSIONS: '🔐',
    };
    return icons[module] || '📁';
  };

  const getActionColor = (action: string) => {
    const colors: Record<string, string> = {
      VIEW: 'bg-blue-100 text-blue-700',
      CREATE: 'bg-green-100 text-green-700',
      EDIT: 'bg-yellow-100 text-yellow-700',
      DELETE: 'bg-red-100 text-red-700',
      EXPORT: 'bg-purple-100 text-purple-700',
      APPROVE: 'bg-emerald-100 text-emerald-700',
      MANAGE: 'bg-indigo-100 text-indigo-700',
    };
    return colors[action] || 'bg-gray-100 text-gray-700';
  };

  // Group permissions by module
  const groupPermissionsByModule = (permissions: Permission[]) => {
    const grouped: Record<string, Permission[]> = {};
    permissions.forEach(perm => {
      if (!grouped[perm.module]) {
        grouped[perm.module] = [];
      }
      grouped[perm.module].push(perm);
    });
    return grouped;
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion des permissions</h1>
          <p className="text-gray-500 mt-1">
            Gérer les droits d'accès des utilisateurs système (Admin, Auditeur, Opérateur)
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Actualiser
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <ShieldCheckIcon className="w-6 h-6 text-purple-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-purple-900">Permissions granulaires</p>
            <p className="text-sm text-purple-700 mt-1">
              Les permissions permettent de contrôler finement l'accès aux différents modules et actions du système.
              Seuls les utilisateurs système (back-office) sont affichés ici. Les commerçants, employés et agents douaniers
              ont des accès définis par leur rôle.
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un utilisateur..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
        />
      </div>

      {/* Users List */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <ArrowPathIcon className="w-8 h-8 animate-spin mx-auto text-gray-400" />
            <p className="text-gray-500 mt-2">Chargement...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <UserGroupIcon className="w-12 h-12 mx-auto text-gray-300" />
            <p className="text-gray-500 mt-2">Aucun utilisateur système trouvé</p>
          </div>
        ) : (
          filteredUsers.map((user) => {
            const isExpanded = expandedUser === user.id;
            const groupedPermissions = groupPermissionsByModule(user.permissions);
            
            return (
              <div
                key={user.id}
                className="bg-white rounded-xl border border-gray-100 overflow-hidden"
              >
                {/* User Header */}
                <div
                  className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                  onClick={() => toggleExpand(user.id)}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white font-medium">
                      {user.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{user.full_name}</p>
                        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${ROLE_COLORS[user.role] || 'bg-gray-100'}`}>
                          {user.role_display}
                        </span>
                        {!user.is_active && (
                          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            Inactif
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">{user.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{user.permissions_count}</p>
                      <p className="text-xs text-gray-500">permission{user.permissions_count > 1 ? 's' : ''}</p>
                    </div>
                    {isExpanded ? (
                      <ChevronUpIcon className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="w-5 h-5 text-gray-400" />
                    )}
                  </div>
                </div>

                {/* Expanded Content */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50">
                    {/* Permissions by Module */}
                    {Object.keys(groupedPermissions).length > 0 ? (
                      <div className="space-y-4">
                        {Object.entries(groupedPermissions).map(([module, perms]) => (
                          <div key={module} className="bg-white rounded-lg border border-gray-200 p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">{getModuleIcon(module)}</span>
                              <span className="font-medium text-gray-900">{perms[0].module_display}</span>
                            </div>
                            <div className="flex flex-wrap gap-2">
                              {perms.map((perm) => (
                                <div
                                  key={perm.id}
                                  className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium ${getActionColor(perm.action)}`}
                                >
                                  <span>{perm.action_display}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleRemovePermission(user.id, perm.module, perm.action, perm.module_display, perm.action_display);
                                    }}
                                    className="ml-1 p-0.5 hover:bg-black/10 rounded"
                                    title="Retirer cette permission"
                                  >
                                    <XMarkIcon className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500 text-center py-4">
                        Aucune permission attribuée
                      </p>
                    )}

                    {/* Add Permission */}
                    <div className="mt-4 pt-4 border-t border-gray-200">
                      {addingPermission === user.id ? (
                        <div className="flex items-center gap-2">
                          <select
                            value={newPermission.module}
                            onChange={(e) => setNewPermission({ module: e.target.value, action: '' })}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                          >
                            <option value="">Module...</option>
                            {modulesData?.modules.map(m => (
                              <option key={m.value} value={m.value}>{m.label}</option>
                            ))}
                          </select>
                          <select
                            value={newPermission.action}
                            onChange={(e) => setNewPermission({ ...newPermission, action: e.target.value })}
                            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm"
                            disabled={!newPermission.module}
                          >
                            <option value="">Action...</option>
                            {newPermission.module && modulesData?.modules
                              .find(m => m.value === newPermission.module)?.actions
                              .map(a => (
                                <option key={a.value} value={a.value}>{a.label}</option>
                              ))
                            }
                          </select>
                          <button
                            onClick={() => handleAddPermission(user.id)}
                            disabled={!newPermission.module || !newPermission.action || addPermissionMutation.isPending}
                            className="p-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => {
                              setAddingPermission(null);
                              setNewPermission({ module: '', action: '' });
                            }}
                            className="p-2 text-gray-500 hover:bg-gray-200 rounded-lg"
                          >
                            <XMarkIcon className="w-5 h-5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setAddingPermission(user.id);
                          }}
                          className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-purple-600 hover:bg-purple-50 rounded-lg"
                        >
                          <PlusIcon className="w-4 h-4" />
                          Ajouter une permission
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <p className="text-sm font-medium text-gray-700 mb-3">Légende des actions</p>
        <div className="flex flex-wrap gap-2">
          {modulesData?.actions.map(action => (
            <span
              key={action.value}
              className={`px-2 py-1 text-xs font-medium rounded-lg ${getActionColor(action.value)}`}
            >
              {action.label}
            </span>
          ))}
        </div>
      </div>
      </div>

      {/* Modal de confirmation de suppression */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            <div 
              className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
              onClick={() => setConfirmDelete(null)} 
            />
            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full mx-auto transform transition-all">
              {/* Header */}
              <div className="bg-gradient-to-r from-red-500 to-red-600 px-6 py-4 rounded-t-2xl">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                    <ShieldCheckIcon className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-left">
                    <h3 className="text-lg font-semibold text-white">Retirer la permission</h3>
                    <p className="text-red-100 text-sm">Cette action est réversible</p>
                  </div>
                </div>
              </div>
              
              {/* Content */}
              <div className="px-6 py-5">
                <p className="text-gray-600 text-sm mb-4">
                  Êtes-vous sûr de vouloir retirer cette permission ?
                </p>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{getModuleIcon(confirmDelete.module)}</span>
                    <div className="text-left">
                      <p className="font-medium text-gray-900">{confirmDelete.moduleDisplay}</p>
                      <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-lg ${getActionColor(confirmDelete.action)}`}>
                        {confirmDelete.actionDisplay}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex items-center justify-end gap-3">
                <button
                  onClick={() => setConfirmDelete(null)}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={confirmRemovePermission}
                  disabled={removePermissionMutation.isPending}
                  className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {removePermissionMutation.isPending ? (
                    <>
                      <ArrowPathIcon className="w-4 h-4 animate-spin" />
                      Suppression...
                    </>
                  ) : (
                    <>
                      <XMarkIcon className="w-4 h-4" />
                      Retirer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </FadeIn>
  );
}
