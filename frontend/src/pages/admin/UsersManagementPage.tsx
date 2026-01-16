import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import { usePermissions } from '../../hooks/usePermissions';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  UserPlusIcon,
  UserGroupIcon,
  BuildingStorefrontIcon,
  ShieldCheckIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  CheckIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: string;
  role_display: string;
  phone: string;
  is_active: boolean;
  user_type: string;
  merchant_id: string | null;
  merchant_name: string | null;
  outlet_id: string | null;
  outlet_name: string | null;
  point_of_exit_id: string | null;
  point_of_exit_name: string | null;
  agent_code: string | null;
  permissions_count: number;
  date_joined: string;
  last_login: string | null;
  created_at: string;
}

interface Stats {
  total: number;
  active: number;
  inactive: number;
  by_role: Record<string, number>;
  by_type: Record<string, number>;
  recent_signups: number;
  pending_invitations: number;
}

interface PermissionPreset {
  id: string;
  name: string;
  description: string;
  permissions_count: number;
}

const USER_TYPE_OPTIONS = [
  { value: '', label: 'Tous les types' },
  { value: 'SYSTEM', label: 'Système (Admin, Auditeur, Opérateur)' },
  { value: 'MERCHANT', label: 'Commerçants' },
  { value: 'CUSTOMS', label: 'Agents douaniers' },
  { value: 'TRAVELER', label: 'Voyageurs' },
];

const ROLE_OPTIONS = [
  { value: '', label: 'Tous les rôles' },
  { value: 'ADMIN', label: 'Administrateur' },
  { value: 'AUDITOR', label: 'Auditeur' },
  { value: 'OPERATOR', label: 'Opérateur' },
  { value: 'MERCHANT', label: 'Admin Commerçant' },
  { value: 'MERCHANT_EMPLOYEE', label: 'Employé Commerçant' },
  { value: 'CUSTOMS_AGENT', label: 'Agent Douanier' },
  { value: 'TRAVELER', label: 'Voyageur' },
];

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'true', label: 'Actifs' },
  { value: 'false', label: 'Inactifs' },
];

export default function UsersManagementPage() {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filters, setFilters] = useState({
    user_type: '',
    role: '',
    is_active: '',
  });

  // Permission checks
  const canCreate = isSuperAdmin || hasPermission('USERS', 'CREATE');

  const pageSize = 5;

  const buildParams = () => {
    const params: Record<string, string> = {
      page: page.toString(),
      page_size: pageSize.toString(),
    };
    if (search) params.search = search;
    if (filters.user_type) params.user_type = filters.user_type;
    if (filters.role) params.role = filters.role;
    if (filters.is_active) params.is_active = filters.is_active;
    return params;
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-users', page, search, filters],
    queryFn: async () => {
      const response = await api.get('/auth/admin/users/', { params: buildParams() });
      return response.data;
    },
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ['admin-users-stats'],
    queryFn: async () => {
      const response = await api.get('/auth/admin/users/stats/');
      return response.data;
    },
  });

  const { data: presets } = useQuery<PermissionPreset[]>({
    queryKey: ['permission-presets'],
    queryFn: async () => {
      const response = await api.get('/auth/admin/presets/');
      return response.data.results || response.data;
    },
  });

  const users: User[] = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const resetFilters = () => {
    setFilters({ user_type: '', role: '', is_active: '' });
    setPage(1);
  };

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'SYSTEM':
        return <ShieldCheckIcon className="w-4 h-4 text-purple-500" />;
      case 'MERCHANT':
        return <BuildingStorefrontIcon className="w-4 h-4 text-blue-500" />;
      case 'CUSTOMS':
        return <MapPinIcon className="w-4 h-4 text-green-500" />;
      default:
        return <UserGroupIcon className="w-4 h-4 text-gray-500" />;
    }
  };

  const getUserTypeBadge = (userType: string) => {
    const styles: Record<string, string> = {
      SYSTEM: 'bg-purple-100 text-purple-700',
      MERCHANT: 'bg-blue-100 text-blue-700',
      CUSTOMS: 'bg-green-100 text-green-700',
      TRAVELER: 'bg-gray-100 text-gray-600',
    };
    const labels: Record<string, string> = {
      SYSTEM: 'Système',
      MERCHANT: 'Commerçant',
      CUSTOMS: 'Douane',
      TRAVELER: 'Voyageur',
    };
    return (
      <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${styles[userType] || 'bg-gray-100'}`}>
        {labels[userType] || userType}
      </span>
    );
  };

  const getRoleBadge = (role: string, roleDisplay: string) => {
    const styles: Record<string, string> = {
      ADMIN: 'bg-red-100 text-red-700 border-red-200',
      AUDITOR: 'bg-orange-100 text-orange-700 border-orange-200',
      OPERATOR: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      MERCHANT: 'bg-blue-100 text-blue-700 border-blue-200',
      MERCHANT_EMPLOYEE: 'bg-sky-100 text-sky-700 border-sky-200',
      CUSTOMS_AGENT: 'bg-green-100 text-green-700 border-green-200',
      TRAVELER: 'bg-gray-100 text-gray-600 border-gray-200',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded border ${styles[role] || 'bg-gray-100'}`}>
        {roleDisplay}
      </span>
    );
  };

  const getContextInfo = (user: User) => {
    if (user.merchant_name) {
      return (
        <div className="text-xs text-gray-500">
          <span className="font-medium text-blue-600">{user.merchant_name}</span>
          {user.outlet_name && <span className="ml-1">• {user.outlet_name}</span>}
        </div>
      );
    }
    if (user.point_of_exit_name) {
      return (
        <div className="text-xs text-gray-500">
          <span className="font-medium text-green-600">{user.point_of_exit_name}</span>
          {user.agent_code && <span className="ml-1">• {user.agent_code}</span>}
        </div>
      );
    }
    if (user.user_type === 'SYSTEM') {
      return (
        <div className="text-xs text-purple-500">
          Back-office {user.permissions_count > 0 && `• ${user.permissions_count} permissions`}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <FadeIn delay={0} duration={400}>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des utilisateurs</h1>
            <p className="text-gray-500 mt-1">Vue complète de tous les utilisateurs du système</p>
          </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowInviteModal(true)}
            disabled={!canCreate}
            title={!canCreate ? "Vous n'avez pas la permission de créer des utilisateurs" : undefined}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${
              canCreate 
                ? 'bg-purple-600 text-white hover:bg-purple-700' 
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <UserPlusIcon className="w-4 h-4" />
            Inviter un utilisateur
          </button>
        </div>
        </div>
      </FadeIn>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Actifs</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.active}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-purple-500 uppercase tracking-wide">Système</p>
            <p className="text-2xl font-bold text-purple-600 mt-1">{stats.by_type.SYSTEM || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-blue-500 uppercase tracking-wide">Commerçants</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{stats.by_type.MERCHANT || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-green-500 uppercase tracking-wide">Douane</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.by_type.CUSTOMS || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Récents (30j)</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.recent_signups}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-orange-500 uppercase tracking-wide">Invitations</p>
            <p className="text-2xl font-bold text-orange-600 mt-1">{stats.pending_invitations}</p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Rechercher par nom, email, téléphone..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </form>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
              showFilters ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FunnelIcon className="w-4 h-4" />
            Filtres
            {Object.values(filters).some(v => v) && (
              <span className="w-2 h-2 bg-blue-500 rounded-full" />
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Type</label>
                <select
                  value={filters.user_type}
                  onChange={(e) => setFilters({ ...filters, user_type: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {USER_TYPE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Rôle</label>
                <select
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {ROLE_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Statut</label>
                <select
                  value={filters.is_active}
                  onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-end">
                <button
                  onClick={resetFilters}
                  className="w-full px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg"
                >
                  Réinitialiser
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Utilisateur
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rôle
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contexte
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Créé le
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Chargement...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">
                    <UserGroupIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    Aucun utilisateur trouvé
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr 
                    key={user.id} 
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedUser(user)}
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-sm font-medium">
                          {user.first_name?.[0]}{user.last_name?.[0]}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{user.full_name}</p>
                          <p className="text-xs text-gray-500">{user.email}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {getUserTypeIcon(user.user_type)}
                        {getUserTypeBadge(user.user_type)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {getRoleBadge(user.role, user.role_display)}
                    </td>
                    <td className="px-4 py-3">
                      {getContextInfo(user) || <span className="text-gray-400 text-xs">-</span>}
                    </td>
                    <td className="px-4 py-3">
                      {user.is_active ? (
                        <span className="flex items-center gap-1 text-green-600 text-xs">
                          <CheckIcon className="w-4 h-4" />
                          Actif
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-red-600 text-xs">
                          <XMarkIcon className="w-4 h-4" />
                          Inactif
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-500">{formatDate(user.created_at)}</p>
                      {user.last_login && (
                        <p className="text-xs text-gray-400">Dernière: {formatDate(user.last_login)}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-lg"
                      >
                        <EyeIcon className="w-4 h-4" />
                        Détails
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <p className="text-sm text-gray-500">
              {totalCount} utilisateur{totalCount > 1 ? 's' : ''} - Page {page} sur {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteUserModal
          presets={presets || []}
          onClose={() => setShowInviteModal(false)}
          onSuccess={() => {
            setShowInviteModal(false);
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            queryClient.invalidateQueries({ queryKey: ['admin-users-stats'] });
          }}
        />
      )}

      {/* User Detail Modal */}
      {selectedUser && (
        <UserDetailModal
          user={selectedUser}
          onClose={() => setSelectedUser(null)}
        />
      )}
    </div>
  );
}

interface InviteUserModalProps {
  presets: PermissionPreset[];
  onClose: () => void;
  onSuccess: () => void;
}

function InviteUserModal({ presets, onClose, onSuccess }: InviteUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    role: 'OPERATOR',
    permission_preset_id: '',
    message: '',
    point_of_exit_id: '',
  });
  const [error, setError] = useState('');

  // Fetch points of exit for OPERATOR role
  const { data: pointsOfExit } = useQuery({
    queryKey: ['points-of-exit'],
    queryFn: async () => {
      const response = await api.get('/customs/points-of-exit/');
      return response.data.results || response.data || [];
    },
    enabled: formData.role === 'OPERATOR',
  });

  const mutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const payload = {
        ...data,
        permission_preset_id: data.permission_preset_id || null,
        point_of_exit_id: data.point_of_exit_id || null,
      };
      const response = await api.post('/auth/admin/invitations/', payload);
      return response.data;
    },
    onSuccess: () => {
      toast.success(`Invitation envoyée à ${formData.email}`);
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || err.response?.data?.email?.[0] || 'Erreur lors de l\'envoi de l\'invitation');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    mutation.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Inviter un utilisateur système</h2>
              <p className="text-sm text-gray-500 mt-1">Admin, Auditeur ou Opérateur</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <input
                type="text"
                required
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                type="text"
                required
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              required
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
            <select
              required
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value, point_of_exit_id: '' })}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            >
              <option value="ADMIN">Administrateur</option>
              <option value="AUDITOR">Auditeur</option>
              <option value="OPERATOR">Opérateur</option>
            </select>
          </div>

          {/* Point de sortie - uniquement pour les opérateurs */}
          {formData.role === 'OPERATOR' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPinIcon className="w-4 h-4 inline mr-1" />
                Frontière / Point de sortie *
              </label>
              <select
                required
                value={formData.point_of_exit_id}
                onChange={(e) => setFormData({ ...formData, point_of_exit_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Sélectionner une frontière</option>
                {(pointsOfExit || []).map((poe: any) => (
                  <option key={poe.id} value={poe.id}>
                    {poe.name} ({poe.code}) - {poe.city}
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                L'opérateur ne pourra voir et traiter que les bordereaux validés à cette frontière
              </p>
            </div>
          )}

          {/* Preset de permissions - uniquement pour Admin et Auditeur (pas pour Opérateur) */}
          {formData.role !== 'OPERATOR' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preset de permissions</label>
              <select
                value={formData.permission_preset_id}
                onChange={(e) => setFormData({ ...formData, permission_preset_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
              >
                <option value="">Aucun preset (permissions manuelles)</option>
                {presets.map(preset => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} ({preset.permissions_count} permissions)
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 mt-1">
                Les permissions peuvent être modifiées après l'activation du compte
              </p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message personnalisé</label>
            <textarea
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              rows={3}
              placeholder="Message optionnel inclus dans l'email d'invitation..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="px-4 py-2 bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50"
            >
              {mutation.isPending ? 'Envoi...' : 'Envoyer l\'invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface UserDetailModalProps {
  user: User;
  onClose: () => void;
}

function UserDetailModal({ user, onClose }: UserDetailModalProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getUserTypeLabel = (userType: string) => {
    const labels: Record<string, string> = {
      SYSTEM: 'Utilisateur système (Back-office)',
      MERCHANT: 'Commerçant',
      CUSTOMS: 'Agent douanier',
      TRAVELER: 'Voyageur',
    };
    return labels[userType] || userType;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div 
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 border-b border-gray-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-blue-700 flex items-center justify-center text-white text-lg font-bold">
                {user.first_name?.[0]}{user.last_name?.[0]}
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">{user.full_name}</h2>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status & Role */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className={`px-3 py-1 text-sm font-medium rounded-full ${
              user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
            }`}>
              {user.is_active ? '✓ Actif' : '✗ Inactif'}
            </span>
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-blue-100 text-blue-700">
              {user.role_display}
            </span>
            <span className="px-3 py-1 text-sm font-medium rounded-full bg-gray-100 text-gray-600">
              {getUserTypeLabel(user.user_type)}
            </span>
          </div>

          {/* Info Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Téléphone</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{user.phone || '-'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Créé le</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{formatDate(user.created_at)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Dernière connexion</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{user.last_login ? formatDate(user.last_login) : 'Jamais connecté'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Permissions</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{user.permissions_count} permission(s)</p>
            </div>
          </div>

          {/* Context Info */}
          {user.merchant_name && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
              <p className="text-xs text-blue-600 uppercase tracking-wide font-medium mb-2">
                <BuildingStorefrontIcon className="w-4 h-4 inline mr-1" />
                Commerçant associé
              </p>
              <p className="text-sm font-semibold text-blue-900">{user.merchant_name}</p>
              {user.outlet_name && (
                <p className="text-sm text-blue-700 mt-1">Point de vente : {user.outlet_name}</p>
              )}
            </div>
          )}

          {user.point_of_exit_name && (
            <div className="bg-green-50 border border-green-200 rounded-xl p-4">
              <p className="text-xs text-green-600 uppercase tracking-wide font-medium mb-2">
                <MapPinIcon className="w-4 h-4 inline mr-1" />
                Frontière assignée
              </p>
              <p className="text-sm font-semibold text-green-900">{user.point_of_exit_name}</p>
              {user.agent_code && (
                <p className="text-sm text-green-700 mt-1">Code agent : {user.agent_code}</p>
              )}
            </div>
          )}

          {user.user_type === 'SYSTEM' && (
            <div className="bg-purple-50 border border-purple-200 rounded-xl p-4">
              <p className="text-xs text-purple-600 uppercase tracking-wide font-medium mb-2">
                <ShieldCheckIcon className="w-4 h-4 inline mr-1" />
                Utilisateur système
              </p>
              <p className="text-sm text-purple-700">
                Cet utilisateur a accès au back-office avec {user.permissions_count} permission(s) configurée(s).
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
