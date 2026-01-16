import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import FadeIn from '../../components/ui/FadeIn';
import { usePermissions } from '../../hooks/usePermissions';
import {
  UserGroupIcon,
  PlusIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  EnvelopeIcon,
  PhoneIcon,
  MapPinIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperAirplaneIcon,
  ClockIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface Agent {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone: string;
  is_active: boolean;
  point_of_exit_id: string | null;
  point_of_exit_name: string | null;
  point_of_exit_code: string | null;
  // Professional info
  matricule: string | null;
  grade: string | null;
  department: string | null;
  hire_date: string | null;
  // Personal identification
  date_of_birth: string | null;
  place_of_birth: string | null;
  nationality: string | null;
  national_id: string | null;
  // Address
  address: string | null;
  city: string | null;
  province: string | null;
  // Emergency contact
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relation: string | null;
  // Stats
  validations_count: number;
  validations_today: number;
  // Dates
  created_at: string;
  last_login: string | null;
}

interface Invitation {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  matricule: string;
  grade: string;
  point_of_exit: string;
  point_of_exit_name: string;
  point_of_exit_code: string;
  status: string;
  is_expired: boolean;
  is_valid: boolean;
  created_at: string;
  expires_at: string;
  activated_at: string | null;
  created_by_name: string;
}

interface Border {
  id: string;
  code: string;
  name: string;
  is_active: boolean;
}

const statusLabels: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'En attente', color: 'text-amber-700', bg: 'bg-amber-100' },
  ACCEPTED: { label: 'Acceptée', color: 'text-green-700', bg: 'bg-green-100' },
  EXPIRED: { label: 'Expirée', color: 'text-red-700', bg: 'bg-red-100' },
  CANCELLED: { label: 'Annulée', color: 'text-gray-700', bg: 'bg-gray-100' },
};

export default function AgentsPage() {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [activeTab, setActiveTab] = useState<'agents' | 'invitations'>('agents');
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [currentInvPage, setCurrentInvPage] = useState(1);
  const pageSize = 5;

  // Permission checks
  const canCreate = isSuperAdmin || hasPermission('AGENTS', 'CREATE');

  // Fetch agents with auto-refresh every 10 seconds
  const { data: agentsData, isLoading: loadingAgents } = useQuery({
    queryKey: ['admin-customs-agents'],
    queryFn: async () => {
      const response = await api.get('/customs/admin/agents/');
      return response.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch invitations with auto-refresh every 10 seconds
  const { data: invitationsData, isLoading: loadingInvitations } = useQuery({
    queryKey: ['admin-agent-invitations'],
    queryFn: async () => {
      const response = await api.get('/customs/admin/invitations/');
      return response.data;
    },
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Fetch borders for dropdown
  const { data: bordersData } = useQuery({
    queryKey: ['admin-borders-list'],
    queryFn: async () => {
      const response = await api.get('/customs/points-of-exit/');
      return response.data;
    },
  });

  const agents: Agent[] = agentsData?.agents || [];
  const invitations: Invitation[] = invitationsData?.invitations || [];
  const borders: Border[] = bordersData?.results || bordersData || [];

  const filteredAgents = agents.filter((agent) => {
    const query = searchQuery.toLowerCase();
    return (
      agent.email.toLowerCase().includes(query) ||
      agent.first_name.toLowerCase().includes(query) ||
      agent.last_name.toLowerCase().includes(query) ||
      (agent.matricule && agent.matricule.toLowerCase().includes(query))
    );
  });

  const filteredInvitations = invitations.filter((inv) => {
    const query = searchQuery.toLowerCase();
    return (
      inv.email.toLowerCase().includes(query) ||
      inv.first_name.toLowerCase().includes(query) ||
      inv.last_name.toLowerCase().includes(query) ||
      inv.matricule.toLowerCase().includes(query)
    );
  });

  // Pagination for agents
  const totalAgentPages = Math.ceil(filteredAgents.length / pageSize);
  const paginatedAgents = filteredAgents.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // Pagination for invitations
  const totalInvPages = Math.ceil(filteredInvitations.length / pageSize);
  const paginatedInvitations = filteredInvitations.slice((currentInvPage - 1) * pageSize, currentInvPage * pageSize);

  // Reset page when search changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
    setCurrentInvPage(1);
  };

  // Create invitation mutation
  const createInvitationMutation = useMutation({
    mutationFn: (data: any) => api.post('/customs/admin/invitations/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agent-invitations'] });
      toast.success('Invitation envoyée avec succès');
      setShowInviteForm(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || err.response?.data?.email?.[0] || 'Erreur lors de l\'envoi');
    },
  });

  // Resend invitation mutation
  const resendInvitationMutation = useMutation({
    mutationFn: (id: string) => api.post(`/customs/admin/invitations/${id}/resend/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agent-invitations'] });
      toast.success('Invitation renvoyée');
    },
  });

  // Cancel invitation mutation
  const cancelInvitationMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/customs/admin/invitations/${id}/`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-agent-invitations'] });
      toast.success('Invitation annulée');
    },
  });

  // Toggle agent active status
  const toggleAgentMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/customs/admin/agents/${id}/`, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-customs-agents'] });
      toast.success('Statut mis à jour');
      setSelectedAgent(null);
    },
  });

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Agents Douaniers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez les agents douaniers et leurs affectations
          </p>
        </div>
        <button
          onClick={() => setShowInviteForm(true)}
          disabled={!canCreate}
          title={!canCreate ? "Vous n'avez pas la permission de créer des agents" : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            canCreate
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <PlusIcon className="w-5 h-5" />
          Inviter un agent
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('agents')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'agents'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <UserGroupIcon className="w-5 h-5" />
            Agents actifs ({agents.length})
          </div>
        </button>
        <button
          onClick={() => setActiveTab('invitations')}
          className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${
            activeTab === 'invitations'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}
        >
          <div className="flex items-center gap-2">
            <EnvelopeIcon className="w-5 h-5" />
            Invitations ({invitations.filter(i => i.status === 'PENDING').length} en attente)
          </div>
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, email, matricule..."
          value={searchQuery}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {/* Agents Tab */}
      {activeTab === 'agents' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loadingAgents ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredAgents.length === 0 ? (
            <div className="text-center py-12">
              <UserGroupIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucun agent trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Agent</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matricule</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frontière</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Contact</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedAgents.map((agent) => (
                    <tr 
                      key={agent.id} 
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onClick={() => setSelectedAgent(agent)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-medium">
                            {agent.first_name[0]}{agent.last_name[0]}
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{agent.full_name}</p>
                            <p className="text-xs text-gray-500">{agent.grade || 'Agent'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-gray-700">{agent.matricule || '-'}</span>
                      </td>
                      <td className="px-4 py-3">
                        {agent.point_of_exit_name ? (
                          <div className="flex items-center gap-2">
                            <MapPinIcon className="w-4 h-4 text-blue-500" />
                            <div>
                              <p className="text-sm text-gray-900">{agent.point_of_exit_name}</p>
                              <p className="text-xs text-gray-500">{agent.point_of_exit_code}</p>
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Non assigné</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1 text-sm text-gray-700">
                            <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                            {agent.email}
                          </div>
                          {agent.phone && (
                            <div className="flex items-center gap-1 text-sm text-gray-500">
                              <PhoneIcon className="w-4 h-4 text-gray-400" />
                              {agent.phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          agent.is_active
                            ? 'bg-green-100 text-green-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {agent.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedAgent(agent)}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                            title="Voir détails"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => toggleAgentMutation.mutate({ id: agent.id, is_active: !agent.is_active })}
                            className={`p-2 rounded-lg ${
                              agent.is_active
                                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={agent.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {agent.is_active ? <XCircleIcon className="w-5 h-5" /> : <CheckCircleIcon className="w-5 h-5" />}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination for Agents */}
          {totalAgentPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {filteredAgents.length} agent{filteredAgents.length > 1 ? 's' : ''} - Page {currentPage} sur {totalAgentPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalAgentPages, p + 1))}
                  disabled={currentPage === totalAgentPages}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invitations Tab */}
      {activeTab === 'invitations' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          {loadingInvitations ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredInvitations.length === 0 ? (
            <div className="text-center py-12">
              <EnvelopeIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">Aucune invitation</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-100">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invité</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Matricule</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frontière</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Expire le</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedInvitations.map((inv) => (
                    <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{inv.first_name} {inv.last_name}</p>
                          <p className="text-xs text-gray-500">{inv.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-mono text-gray-700">{inv.matricule}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <MapPinIcon className="w-4 h-4 text-blue-500" />
                          <span className="text-sm text-gray-900">{inv.point_of_exit_name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          statusLabels[inv.status]?.bg || 'bg-gray-100'
                        } ${statusLabels[inv.status]?.color || 'text-gray-700'}`}>
                          {statusLabels[inv.status]?.label || inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <div className="flex items-center justify-center gap-1 text-sm">
                          <ClockIcon className="w-4 h-4 text-gray-400" />
                          <span className={inv.is_expired ? 'text-red-600' : 'text-gray-600'}>
                            {formatDate(inv.expires_at)}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {inv.status === 'PENDING' && (
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => resendInvitationMutation.mutate(inv.id)}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                              title="Renvoyer l'invitation"
                            >
                              <PaperAirplaneIcon className="w-5 h-5" />
                            </button>
                            <button
                              onClick={() => cancelInvitationMutation.mutate(inv.id)}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                              title="Annuler l'invitation"
                            >
                              <XCircleIcon className="w-5 h-5" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination for Invitations */}
          {totalInvPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                {filteredInvitations.length} invitation{filteredInvitations.length > 1 ? 's' : ''} - Page {currentInvPage} sur {totalInvPages}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentInvPage(p => Math.max(1, p - 1))}
                  disabled={currentInvPage === 1}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentInvPage(p => Math.min(totalInvPages, p + 1))}
                  disabled={currentInvPage === totalInvPages}
                  className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Invite Form Modal */}
      {showInviteForm && (
        <InviteAgentForm
          borders={borders.filter(b => b.is_active)}
          onSubmit={(data) => createInvitationMutation.mutate(data)}
          onCancel={() => setShowInviteForm(false)}
          isLoading={createInvitationMutation.isPending}
        />
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <AgentDetailModal
          agent={selectedAgent}
          onClose={() => setSelectedAgent(null)}
          onToggleActive={(is_active) => toggleAgentMutation.mutate({ id: selectedAgent.id, is_active })}
        />
      )}
      </div>
    </FadeIn>
  );
}

interface InviteAgentFormProps {
  borders: Border[];
  onSubmit: (data: any) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function InviteAgentForm({ borders, onSubmit, onCancel, isLoading }: InviteAgentFormProps) {
  const { register, handleSubmit, formState: { errors } } = useForm({
    defaultValues: {
      email: '', first_name: '', last_name: '', phone: '',
      date_of_birth: '', place_of_birth: '', nationality: 'CD', national_id: '',
      address: '', city: '', province: '',
      emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relation: '',
      matricule: '', grade: '', department: '', hire_date: '', point_of_exit: '',
    },
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <UserGroupIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Inviter un agent douanier</h3>
              <p className="text-blue-100 text-sm">Remplissez toutes les informations pour la traçabilité</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            {/* Section 1: Informations de base */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">1</span>
                Informations de base
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                  <input {...register('first_name', { required: 'Requis' })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  {errors.first_name && <p className="text-red-500 text-xs mt-1">{errors.first_name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input {...register('last_name', { required: 'Requis' })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  {errors.last_name && <p className="text-red-500 text-xs mt-1">{errors.last_name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                  <input {...register('phone', { required: 'Requis' })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="+243..." />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input {...register('email', { required: 'Requis', pattern: { value: /^\S+@\S+$/i, message: 'Email invalide' } })} type="email" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                </div>
              </div>
            </div>

            {/* Section 2: Identification personnelle */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">2</span>
                Identification personnelle
              </h4>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date de naissance *</label>
                  <input {...register('date_of_birth', { required: 'Requis' })} type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  {errors.date_of_birth && <p className="text-red-500 text-xs mt-1">{errors.date_of_birth.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Lieu de naissance *</label>
                  <input {...register('place_of_birth', { required: 'Requis' })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  {errors.place_of_birth && <p className="text-red-500 text-xs mt-1">{errors.place_of_birth.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nationalité</label>
                  <input {...register('nationality')} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" defaultValue="Congolaise" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">N° Carte d'identité *</label>
                  <input {...register('national_id', { required: 'Requis' })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  {errors.national_id && <p className="text-red-500 text-xs mt-1">{errors.national_id.message}</p>}
                </div>
              </div>
            </div>

            {/* Section 3: Adresse */}
            <div className="bg-gray-50 rounded-xl p-4">
              <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">3</span>
                Adresse de résidence
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse complète *</label>
                  <input {...register('address', { required: 'Requis' })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" placeholder="N°, Avenue, Quartier, Commune" />
                  {errors.address && <p className="text-red-500 text-xs mt-1">{errors.address.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                  <input {...register('city', { required: 'Requis' })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Province *</label>
                  <input {...register('province', { required: 'Requis' })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500" />
                  {errors.province && <p className="text-red-500 text-xs mt-1">{errors.province.message}</p>}
                </div>
              </div>
            </div>

            {/* Section 4: Contact d'urgence */}
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs">4</span>
                Contact d'urgence
              </h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom complet *</label>
                  <input {...register('emergency_contact_name', { required: 'Requis' })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
                  {errors.emergency_contact_name && <p className="text-red-500 text-xs mt-1">{errors.emergency_contact_name.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                  <input {...register('emergency_contact_phone', { required: 'Requis' })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500" />
                  {errors.emergency_contact_phone && <p className="text-red-500 text-xs mt-1">{errors.emergency_contact_phone.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Relation *</label>
                  <select {...register('emergency_contact_relation', { required: 'Requis' })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500">
                    <option value="">Sélectionner</option>
                    <option value="Conjoint(e)">Conjoint(e)</option>
                    <option value="Parent">Parent</option>
                    <option value="Frère/Sœur">Frère/Sœur</option>
                    <option value="Enfant">Enfant</option>
                    <option value="Ami(e)">Ami(e)</option>
                    <option value="Autre">Autre</option>
                  </select>
                  {errors.emergency_contact_relation && <p className="text-red-500 text-xs mt-1">{errors.emergency_contact_relation.message}</p>}
                </div>
              </div>
            </div>

            {/* Section 5: Informations professionnelles */}
            <div className="bg-green-50 rounded-xl p-4 border border-green-200">
              <h4 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">5</span>
                Informations professionnelles
              </h4>
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Matricule *</label>
                  <input {...register('matricule', { required: 'Requis' })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500 font-mono" />
                  {errors.matricule && <p className="text-red-500 text-xs mt-1">{errors.matricule.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
                  <input {...register('grade')} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500" placeholder="Ex: Inspecteur" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Service/Département</label>
                  <input {...register('department')} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Date d'embauche</label>
                  <input {...register('hire_date')} type="date" className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500" />
                </div>
                <div className="col-span-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Frontière assignée *</label>
                  <select {...register('point_of_exit', { required: 'Requis' })} className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-green-500">
                    <option value="">Sélectionner une frontière</option>
                    {borders.map((border) => (
                      <option key={border.id} value={border.id}>{border.name} ({border.code})</option>
                    ))}
                  </select>
                  {errors.point_of_exit && <p className="text-red-500 text-xs mt-1">{errors.point_of_exit.message}</p>}
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button type="button" onClick={onCancel} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200">
              Annuler
            </button>
            <button type="submit" disabled={isLoading} className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <PaperAirplaneIcon className="w-4 h-4" />
              {isLoading ? 'Envoi...' : 'Envoyer l\'invitation'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AgentDetailModalProps {
  agent: Agent;
  onClose: () => void;
  onToggleActive: (is_active: boolean) => void;
}

function AgentDetailModal({ agent, onClose, onToggleActive }: AgentDetailModalProps) {
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR');
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-white text-2xl font-medium">
              {agent.first_name[0]}{agent.last_name[0]}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">{agent.full_name}</h3>
              <p className="text-blue-100">{agent.grade || 'Agent douanier'} • {agent.department || 'Douane'}</p>
              <div className="flex items-center gap-3 mt-1">
                <span className="text-blue-200 text-sm font-mono">🪪 {agent.matricule || '-'}</span>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                  agent.is_active ? 'bg-green-500/20 text-green-100' : 'bg-red-500/20 text-red-100'
                }`}>
                  {agent.is_active ? '● Actif' : '○ Inactif'}
                </span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
          <div className="grid grid-cols-2 gap-6">
            {/* Colonne gauche */}
            <div className="space-y-4">
              {/* Informations professionnelles */}
              <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-green-600 text-white rounded-full flex items-center justify-center text-xs">🎖️</span>
                  Informations professionnelles
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Matricule</p>
                    <p className="font-mono font-medium text-gray-900">{agent.matricule || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Grade</p>
                    <p className="font-medium text-gray-900">{agent.grade || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Service</p>
                    <p className="font-medium text-gray-900">{agent.department || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date d'embauche</p>
                    <p className="font-medium text-gray-900">{formatDate(agent.hire_date)}</p>
                  </div>
                </div>
              </div>

              {/* Frontière assignée */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center text-xs">📍</span>
                  Frontière assignée
                </h4>
                {agent.point_of_exit_name ? (
                  <div className="flex items-center gap-3">
                    <MapPinIcon className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="font-semibold text-gray-900">{agent.point_of_exit_name}</p>
                      <p className="text-sm text-gray-500">Code: {agent.point_of_exit_code}</p>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-400">Non assigné</p>
                )}
              </div>

              {/* Statistiques */}
              <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-purple-600 text-white rounded-full flex items-center justify-center text-xs">📊</span>
                  Statistiques
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{agent.validations_count || 0}</p>
                    <p className="text-xs text-gray-500">Validations totales</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 text-center">
                    <p className="text-2xl font-bold text-purple-600">{agent.validations_today || 0}</p>
                    <p className="text-xs text-gray-500">Aujourd'hui</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Colonne droite */}
            <div className="space-y-4">
              {/* Identification personnelle */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs">👤</span>
                  Identification personnelle
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-gray-500">Date de naissance</p>
                    <p className="font-medium text-gray-900">{formatDate(agent.date_of_birth)}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Lieu de naissance</p>
                    <p className="font-medium text-gray-900">{agent.place_of_birth || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Nationalité</p>
                    <p className="font-medium text-gray-900">{agent.nationality || '-'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">N° Carte d'identité</p>
                    <p className="font-mono font-medium text-gray-900">{agent.national_id || '-'}</p>
                  </div>
                </div>
              </div>

              {/* Adresse */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs">🏠</span>
                  Adresse de résidence
                </h4>
                <div className="text-sm space-y-1">
                  <p className="font-medium text-gray-900">{agent.address || '-'}</p>
                  <p className="text-gray-600">{agent.city || '-'}, {agent.province || '-'}</p>
                </div>
              </div>

              {/* Contact */}
              <div className="bg-gray-50 rounded-xl p-4">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-gray-600 text-white rounded-full flex items-center justify-center text-xs">📞</span>
                  Contact
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{agent.email}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-gray-400" />
                    <span className="text-gray-900">{agent.phone || '-'}</span>
                  </div>
                </div>
              </div>

              {/* Contact d'urgence */}
              <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="w-6 h-6 bg-amber-500 text-white rounded-full flex items-center justify-center text-xs">🆘</span>
                  Contact d'urgence
                </h4>
                <div className="text-sm space-y-1">
                  <p className="font-medium text-gray-900">{agent.emergency_contact_name || '-'}</p>
                  <p className="text-gray-600">{agent.emergency_contact_relation || '-'}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <PhoneIcon className="w-4 h-4 text-amber-600" />
                    <span className="text-amber-700 font-medium">{agent.emergency_contact_phone || '-'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Dates système */}
          <div className="mt-4 pt-4 border-t border-gray-200 flex justify-between text-xs text-gray-400">
            <span>Compte créé le {formatDate(agent.created_at)}</span>
            <span>Dernière connexion: {agent.last_login ? formatDate(agent.last_login) : 'Jamais'}</span>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Fermer
          </button>
          {agent.is_active ? (
            <button
              onClick={() => onToggleActive(false)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <XCircleIcon className="w-4 h-4" />
              Désactiver
            </button>
          ) : (
            <button
              onClick={() => onToggleActive(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <CheckCircleIcon className="w-4 h-4" />
              Activer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
