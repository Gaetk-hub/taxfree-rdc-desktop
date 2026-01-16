import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import FadeIn from '../../../components/ui/FadeIn';
import {
  UsersIcon,
  PlusIcon,
  EnvelopeIcon,
  XCircleIcon,
  ArrowPathIcon,
  ClockIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  DocumentTextIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  EyeIcon,
  PhoneIcon,
  AtSymbolIcon,
} from '@heroicons/react/24/outline';
import { merchantManageApi, type Outlet, type MerchantUser, type MerchantInvitation } from '../../../services/api';

interface UserActivity {
  id: string;
  action: string;
  entity: string;
  entity_id: string;
  metadata: Record<string, any>;
  timestamp: string;
  ip_address: string;
}

interface UserStats {
  total_forms_created: number;
  forms_by_status: Record<string, number>;
  total_sales_amount: number;
  total_refunds_amount: number;
  last_30_days: {
    forms_created: number;
    sales_amount: number;
  };
  last_login: string | null;
  account_created: string;
}

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedUser, setSelectedUser] = useState<MerchantUser | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'MERCHANT' | 'MERCHANT_EMPLOYEE'>('all');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const { data: usersData, isLoading: usersLoading } = useQuery({
    queryKey: ['my-users'],
    queryFn: async () => {
      const response = await merchantManageApi.users.list();
      return response.data;
    },
  });
  
  // Fetch user stats when a user is selected
  const { data: userStats, isLoading: statsLoading } = useQuery({
    queryKey: ['user-stats', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return null;
      const response = await merchantManageApi.users.stats(selectedUser.id);
      return response.data as UserStats;
    },
    enabled: !!selectedUser,
  });
  
  // Fetch user activity when a user is selected
  const { data: userActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['user-activity', selectedUser?.id],
    queryFn: async () => {
      if (!selectedUser) return null;
      const response = await merchantManageApi.users.activity(selectedUser.id);
      return response.data as { activities: UserActivity[]; total_count: number };
    },
    enabled: !!selectedUser,
  });

  const { data: invitationsData, isLoading: invitationsLoading } = useQuery({
    queryKey: ['my-invitations'],
    queryFn: async () => {
      const response = await merchantManageApi.users.invitations();
      return response.data;
    },
  });

  const { data: outletsData } = useQuery({
    queryKey: ['my-outlets'],
    queryFn: async () => {
      const response = await merchantManageApi.outlets.list();
      return response.data;
    },
  });
  
  const allUsers: MerchantUser[] = Array.isArray(usersData) 
    ? usersData 
    : ((usersData as any)?.results || []);
  const invitations: MerchantInvitation[] = Array.isArray(invitationsData) ? invitationsData : [];
  const outlets: Outlet[] = Array.isArray(outletsData) 
    ? outletsData 
    : ((outletsData as any)?.results || []);
  
  // Filter users
  const filteredUsers = allUsers.filter((user) => {
    const matchesSearch = searchQuery === '' ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.first_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.last_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' ||
      (statusFilter === 'active' && user.is_active) ||
      (statusFilter === 'inactive' && !user.is_active);
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });
  
  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / ITEMS_PER_PAGE);
  const paginatedUsers = filteredUsers.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );
  
  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };
  
  const handleStatusChange = (value: 'all' | 'active' | 'inactive') => {
    setStatusFilter(value);
    setPage(1);
  };
  
  const handleRoleChange = (value: 'all' | 'MERCHANT' | 'MERCHANT_EMPLOYEE') => {
    setRoleFilter(value);
    setPage(1);
  };

  const inviteMutation = useMutation({
    mutationFn: merchantManageApi.users.invite,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      toast.success('Invitation envoyée avec succès');
      setShowInviteForm(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.response?.data?.email?.[0] || 'Erreur lors de l\'envoi');
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => merchantManageApi.users.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-users'] });
      toast.success('Utilisateur désactivé');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erreur');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => merchantManageApi.users.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-users'] });
      toast.success('Utilisateur réactivé');
    },
  });

  const resendMutation = useMutation({
    mutationFn: (id: string) => merchantManageApi.users.resendInvitation(id),
    onSuccess: () => {
      toast.success('Invitation renvoyée');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erreur');
    },
  });

  const cancelInvitationMutation = useMutation({
    mutationFn: (id: string) => merchantManageApi.users.cancelInvitation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-invitations'] });
      toast.success('Invitation annulée');
    },
  });

  const isLoading = usersLoading || invitationsLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const pendingInvitations = invitations.filter((inv: MerchantInvitation) => !inv.is_accepted);

  return (
    <FadeIn duration={400}>
      <div>
        {/* Main Content */}
        <div>
          {/* Header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-900">Utilisateurs</h1>
          <p className="text-gray-500 mt-1">Gérez les utilisateurs et employés de votre commerce</p>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Search */}
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Rechercher..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 w-48"
              />
            </div>
            
            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
            
            {/* Role Filter */}
            <select
              value={roleFilter}
              onChange={(e) => handleRoleChange(e.target.value as 'all' | 'MERCHANT' | 'MERCHANT_EMPLOYEE')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous rôles</option>
              <option value="MERCHANT">Admin</option>
              <option value="MERCHANT_EMPLOYEE">Employé</option>
            </select>
            
            <span className="text-sm text-gray-500">
              {filteredUsers.length} utilisateur(s)
            </span>
          </div>
          
          <button
            onClick={() => setShowInviteForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            Inviter un utilisateur
          </button>
        </div>

        {/* Invite Form Modal */}
        {showInviteForm && (
          <InviteUserForm
            outlets={outlets}
            onSubmit={(data) => inviteMutation.mutate(data)}
            onCancel={() => setShowInviteForm(false)}
            isLoading={inviteMutation.isPending}
          />
        )}

        {/* Pending Invitations */}
        {pendingInvitations.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-500 mb-3 flex items-center gap-2">
              <ClockIcon className="w-4 h-4" />
              Invitations en attente ({pendingInvitations.length})
            </h3>
            <div className="space-y-2">
              {pendingInvitations.map((inv: MerchantInvitation) => (
                <div key={inv.id} className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 text-sm">{inv.first_name} {inv.last_name}</p>
                    <p className="text-xs text-gray-500">{inv.email}</p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 rounded">{inv.role_display}</span>
                      {inv.outlet_name && <span>• {inv.outlet_name}</span>}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => resendMutation.mutate(inv.id)}
                      disabled={resendMutation.isPending}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"
                      title="Renvoyer"
                    >
                      <ArrowPathIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => cancelInvitationMutation.mutate(inv.id)}
                      disabled={cancelInvitationMutation.isPending}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                      title="Annuler"
                    >
                      <XCircleIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Utilisateur</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Rôle</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Point de vente</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Activité</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-600 uppercase">Statut</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedUsers.map((user: MerchantUser) => (
                <tr 
                  key={user.id} 
                  className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${
                    selectedUser?.id === user.id ? 'bg-blue-50' : ''
                  } ${!user.is_active ? 'opacity-60' : ''}`}
                  onClick={() => setSelectedUser(selectedUser?.id === user.id ? null : user)}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-medium text-sm">
                        {user.first_name?.[0]}{user.last_name?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{user.full_name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.role === 'MERCHANT' 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {user.role_display}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {user.outlet_name ? (
                      <div className="flex items-center gap-1.5">
                        <BuildingStorefrontIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-700">{user.outlet_name}</span>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">Tous les points</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="text-xs">
                      <p className="font-medium text-gray-900">{(user as any).total_forms_created || 0} bordereaux</p>
                      <p className="text-gray-500">{((user as any).total_sales_amount || 0).toLocaleString('fr-FR')} CDF</p>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      user.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {user.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-1.5 text-blue-600 hover:bg-blue-100 rounded"
                        title="Voir détails"
                      >
                        <EyeIcon className="w-4 h-4" />
                      </button>
                      {user.is_active ? (
                        <button
                          onClick={() => deactivateMutation.mutate(user.id)}
                          disabled={deactivateMutation.isPending}
                          className="p-1.5 text-red-600 hover:bg-red-100 rounded"
                          title="Désactiver"
                        >
                          <XCircleIcon className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => activateMutation.mutate(user.id)}
                          disabled={activateMutation.isPending}
                          className="p-1.5 text-green-600 hover:bg-green-100 rounded"
                          title="Réactiver"
                        >
                          <ArrowPathIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                {(page - 1) * ITEMS_PER_PAGE + 1} - {Math.min(page * ITEMS_PER_PAGE, filteredUsers.length)} sur {filteredUsers.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  Préc.
                </button>
                <span className="px-3 py-1.5 text-sm font-medium">{page} / {totalPages}</span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suiv.
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
          
          {paginatedUsers.length === 0 && (
            <div className="text-center py-12">
              <UsersIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {allUsers.length === 0 ? 'Aucun utilisateur' : 'Aucun résultat'}
              </h3>
              <p className="text-gray-500">
                {allUsers.length === 0 
                  ? 'Invitez des utilisateurs pour collaborer'
                  : 'Aucun utilisateur ne correspond à vos critères'}
              </p>
            </div>
          )}
        </div>
      </div>
      
      {/* User Details Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedUser(null)}>
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                    {selectedUser.first_name?.[0]}{selectedUser.last_name?.[0]}
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold text-white">{selectedUser.full_name}</h3>
                    <p className="text-blue-100">{selectedUser.role_display}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                      selectedUser.is_active ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
                    }`}>
                      {selectedUser.is_active ? '● Actif' : '● Inactif'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedUser(null)}
                  className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
                >
                  <XMarkIcon className="w-6 h-6 text-white" />
                </button>
              </div>
            </div>
            
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {/* User Info */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Informations</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <AtSymbolIcon className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-xs text-gray-500">Email</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <PhoneIcon className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-xs text-gray-500">Téléphone</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.phone || '-'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <BuildingStorefrontIcon className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-xs text-gray-500">Point de vente</p>
                      <p className="text-sm font-medium text-gray-900">{selectedUser.outlet_name || 'Tous les points'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <CalendarIcon className="w-5 h-5 text-blue-500" />
                    <div>
                      <p className="text-xs text-gray-500">Créé le</p>
                      <p className="text-sm font-medium text-gray-900">{new Date(selectedUser.created_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Stats */}
              <div className="mb-6">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">Statistiques</h4>
                {statsLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : userStats ? (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-blue-50 rounded-xl p-4 text-center">
                      <DocumentTextIcon className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-700">{userStats.total_forms_created}</p>
                      <p className="text-sm text-blue-600">Bordereaux créés</p>
                    </div>
                    <div className="bg-green-50 rounded-xl p-4 text-center">
                      <CurrencyDollarIcon className="w-8 h-8 text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-700">{(userStats.total_sales_amount / 1000).toFixed(0)}K</p>
                      <p className="text-sm text-green-600">Ventes (CDF)</p>
                    </div>
                    <div className="bg-purple-50 rounded-xl p-4 text-center">
                      <ChartBarIcon className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-purple-700">{userStats.last_30_days.forms_created}</p>
                      <p className="text-sm text-purple-600">30 derniers jours</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">Aucune statistique disponible</p>
                )}
              </div>
              
              {/* Activity */}
              <div>
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Activité récente 
                  {userActivity && <span className="text-gray-400 font-normal ml-2">({userActivity.total_count} actions)</span>}
                </h4>
                {activityLoading ? (
                  <div className="flex justify-center py-6">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : userActivity && userActivity.activities.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
                    {userActivity.activities.slice(0, 20).map((activity) => (
                      <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                        <div className="w-2 h-2 rounded-full bg-blue-500 mt-2 flex-shrink-0"></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900">{activity.action.replace(/_/g, ' ')}</p>
                          <p className="text-xs text-gray-500">{activity.entity} • {new Date(activity.timestamp).toLocaleString('fr-FR')}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8 bg-gray-50 rounded-xl">
                    <ClockIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">Aucune activité enregistrée</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </FadeIn>
  );
}

interface InviteUserFormProps {
  outlets: Outlet[];
  onSubmit: (data: { email: string; first_name: string; last_name: string; phone?: string; role: string; outlet_id?: string }) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function InviteUserForm({ outlets, onSubmit, onCancel, isLoading }: InviteUserFormProps) {
  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      email: '',
      first_name: '',
      last_name: '',
      phone: '',
      role: 'MERCHANT_EMPLOYEE',
      outlet_id: '',
    },
  });

  const selectedRole = watch('role');

  const handleFormSubmit = (data: any) => {
    const submitData = {
      ...data,
      outlet_id: data.outlet_id || undefined,
    };
    onSubmit(submitData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg">
        <div className="p-6 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-900">Inviter un utilisateur</h3>
          <p className="text-sm text-gray-500 mt-1">L'utilisateur recevra un email pour activer son compte</p>
        </div>
        
        <form onSubmit={handleSubmit(handleFormSubmit)} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
              <input
                {...register('first_name', { required: 'Prénom requis' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
              <input
                {...register('last_name', { required: 'Nom requis' })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
              {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
            <input
              type="email"
              {...register('email', { required: 'Email requis' })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="utilisateur@exemple.com"
            />
            {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
            <input
              {...register('phone')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="+243 XXX XXX XXX"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rôle *</label>
            <select
              {...register('role')}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="MERCHANT_EMPLOYEE">Employé</option>
              <option value="MERCHANT">Admin Commerçant</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {selectedRole === 'MERCHANT' 
                ? 'Accès à tous les points de vente et paramètres' 
                : 'Accès limité à un point de vente'}
            </p>
          </div>
          
          {selectedRole === 'MERCHANT_EMPLOYEE' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Point de vente *</label>
              <select
                {...register('outlet_id', { 
                  required: selectedRole === 'MERCHANT_EMPLOYEE' ? 'Point de vente requis' : false 
                })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Sélectionner un point de vente</option>
                {outlets.filter(o => o.is_active).map((outlet) => (
                  <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                ))}
              </select>
              {errors.outlet_id && <p className="text-red-500 text-xs mt-1">{errors.outlet_id.message}</p>}
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <EnvelopeIcon className="w-5 h-5" />
              {isLoading ? 'Envoi...' : 'Envoyer l\'invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
