import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { disputesApi } from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import { useAuthStore } from '../../store/authStore';
import {
  TicketIcon,
  PlusIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  ArrowUpIcon,
  UserIcon,
  ChatBubbleLeftIcon,
} from '@heroicons/react/24/outline';

interface Ticket {
  id: string;
  ticket_number: string;
  type: string;
  type_display: string;
  subject: string;
  description: string;
  priority: string;
  priority_display: string;
  status: string;
  status_display: string;
  assigned_to: string | null;
  assigned_to_name: string | null;
  created_by_name: string | null;
  is_escalated: boolean;
  is_overdue: boolean;
  sla_due_at: string | null;
  messages_count: number;
  created_at: string;
  updated_at: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700',
};

const STATUS_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700',
  OPEN: 'bg-blue-100 text-blue-700',
  IN_PROGRESS: 'bg-amber-100 text-amber-700',
  NEED_INFO: 'bg-purple-100 text-purple-700',
  UNDER_REVIEW: 'bg-indigo-100 text-indigo-700',
  ESCALATED: 'bg-red-100 text-red-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-gray-100 text-gray-700',
  REJECTED: 'bg-red-100 text-red-700',
};

const TICKET_TYPES = [
  { value: '', label: 'Tous les types' },
  { value: 'VALIDATION_MISSED', label: 'Validation manquée' },
  { value: 'AMOUNT_ERROR', label: 'Erreur de montant' },
  { value: 'REFUND_NOT_RECEIVED', label: 'Remboursement non reçu' },
  { value: 'TECHNICAL', label: 'Problème technique' },
  { value: 'ACCOUNT', label: 'Problème de compte' },
  { value: 'OTHER', label: 'Autre' },
];

export default function TicketsPage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isSupport = user?.role === 'ADMIN' || user?.role === 'OPERATOR' || user?.role === 'AUDITOR';
  const isCustoms = user?.role === 'CUSTOMS_AGENT';

  // Determine the base path for ticket details based on user role
  const getTicketDetailPath = (ticketId: string) => {
    if (isSupport) return `/admin/support/tickets/${ticketId}`;
    if (isCustoms) return `/customs/tickets/${ticketId}`;
    return `/merchant/tickets/${ticketId}`;
  };

  // Fetch tickets
  const { data: ticketsData, isLoading } = useQuery({
    queryKey: ['tickets', statusFilter, priorityFilter, typeFilter],
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (statusFilter) params.status = statusFilter;
      if (priorityFilter) params.priority = priorityFilter;
      if (typeFilter) params.type = typeFilter;
      const response = await disputesApi.list(params);
      return response.data;
    },
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['ticket-stats'],
    queryFn: async () => {
      const response = await disputesApi.stats();
      return response.data;
    },
    enabled: isSupport,
  });

  // Take ticket mutation
  const takeTicket = useMutation({
    mutationFn: (id: string) => disputesApi.take(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
  });

  const tickets = ticketsData?.results || ticketsData || [];
  
  const filteredTickets = tickets.filter((ticket: Ticket) =>
    ticket.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.ticket_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ticket.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tickets Support</h1>
          <p className="text-gray-500 mt-1">Gérez les demandes d'assistance</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
        >
          <PlusIcon className="w-5 h-5" />
          Nouveau ticket
        </button>
      </div>

      {/* Stats Cards (for support) */}
      {isSupport && statsData && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Total</p>
            <p className="text-2xl font-bold text-gray-900">{statsData.total}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Non assignés</p>
            <p className="text-2xl font-bold text-amber-600">{statsData.unassigned}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">En retard</p>
            <p className="text-2xl font-bold text-red-600">{statsData.overdue}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">En cours</p>
            <p className="text-2xl font-bold text-blue-600">{statsData.by_status?.IN_PROGRESS || 0}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <p className="text-sm text-gray-500">Résolus</p>
            <p className="text-2xl font-bold text-emerald-600">{statsData.by_status?.RESOLVED || 0}</p>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-xl p-4 border border-gray-200">
        <div className="flex flex-wrap items-center gap-4">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par numéro, sujet..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-gray-200 rounded-lg py-2 px-3 text-sm"
          >
            <option value="">Tous les statuts</option>
            <option value="NEW">Nouveau</option>
            <option value="OPEN">Ouvert</option>
            <option value="IN_PROGRESS">En cours</option>
            <option value="NEED_INFO">Info requise</option>
            <option value="ESCALATED">Escaladé</option>
            <option value="RESOLVED">Résolu</option>
            <option value="CLOSED">Fermé</option>
          </select>

          {/* Priority filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="border border-gray-200 rounded-lg py-2 px-3 text-sm"
          >
            <option value="">Toutes priorités</option>
            <option value="URGENT">Urgente</option>
            <option value="HIGH">Haute</option>
            <option value="MEDIUM">Moyenne</option>
            <option value="LOW">Basse</option>
          </select>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="border border-gray-200 rounded-lg py-2 px-3 text-sm"
          >
            {TICKET_TYPES.map((type) => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary-600"></div>
          </div>
        ) : filteredTickets.length === 0 ? (
          <div className="text-center py-12">
            <TicketIcon className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500">Aucun ticket trouvé</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredTickets.map((ticket: Ticket) => (
              <Link
                key={ticket.id}
                to={getTicketDetailPath(ticket.id)}
                className="block p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-sm text-gray-500">{ticket.ticket_number}</span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${PRIORITY_COLORS[ticket.priority]}`}>
                        {ticket.priority_display}
                      </span>
                      <span className={`px-2 py-0.5 text-xs rounded-full ${STATUS_COLORS[ticket.status]}`}>
                        {ticket.status_display}
                      </span>
                      {ticket.is_escalated && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                          <ArrowUpIcon className="w-3 h-3" />
                          Escaladé
                        </span>
                      )}
                      {ticket.is_overdue && (
                        <span className="px-2 py-0.5 text-xs rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                          <ExclamationTriangleIcon className="w-3 h-3" />
                          En retard
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900">{ticket.subject}</h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-1">{ticket.description}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-1">
                        <UserIcon className="w-3 h-3" />
                        {ticket.created_by_name || 'Anonyme'}
                      </span>
                      <span className="flex items-center gap-1">
                        <ClockIcon className="w-3 h-3" />
                        {formatDate(ticket.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <ChatBubbleLeftIcon className="w-3 h-3" />
                        {ticket.messages_count} messages
                      </span>
                      {ticket.assigned_to_name && (
                        <span className="text-primary-600">
                          Assigné à: {ticket.assigned_to_name}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {isSupport && !ticket.assigned_to && (
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        takeTicket.mutate(ticket.id);
                      }}
                      className="px-3 py-1.5 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700"
                    >
                      Prendre
                    </button>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Create Ticket Modal */}
      {showCreateModal && (
        <CreateTicketModal onClose={() => setShowCreateModal(false)} />
      )}
      </div>
    </FadeIn>
  );
}

// Create Ticket Modal Component
function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    type: 'OTHER',
    priority: 'MEDIUM',
    subject: '',
    description: '',
    contact_email: '',
    contact_phone: '',
  });

  const createTicket = useMutation({
    mutationFn: (data: Record<string, unknown>) => disputesApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      onClose();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createTicket.mutate(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Nouveau ticket</h2>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full border border-gray-200 rounded-lg py-2 px-3"
              >
                {TICKET_TYPES.slice(1).map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priorité</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full border border-gray-200 rounded-lg py-2 px-3"
              >
                <option value="LOW">Basse</option>
                <option value="MEDIUM">Moyenne</option>
                <option value="HIGH">Haute</option>
                <option value="URGENT">Urgente</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Sujet *</label>
            <input
              type="text"
              required
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              className="w-full border border-gray-200 rounded-lg py-2 px-3"
              placeholder="Décrivez brièvement le problème"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea
              required
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full border border-gray-200 rounded-lg py-2 px-3 resize-none"
              placeholder="Expliquez le problème en détail..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email de contact</label>
              <input
                type="email"
                value={formData.contact_email}
                onChange={(e) => setFormData({ ...formData, contact_email: e.target.value })}
                className="w-full border border-gray-200 rounded-lg py-2 px-3"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
              <input
                type="tel"
                value={formData.contact_phone}
                onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                className="w-full border border-gray-200 rounded-lg py-2 px-3"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createTicket.isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50"
            >
              {createTicket.isPending ? 'Création...' : 'Créer le ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
