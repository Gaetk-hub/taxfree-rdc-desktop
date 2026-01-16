import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Link, useNavigate } from 'react-router-dom';
import { taxfreeApi, merchantManageApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import FadeIn from '../../components/ui/FadeIn';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  DocumentTextIcon,
  EyeIcon,
  PrinterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EnvelopeIcon,
} from '@heroicons/react/24/outline';
import CreateSaleModal from '../../components/CreateSaleModal';

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts', color: 'gray' },
  { value: 'CREATED', label: 'Créé', color: 'blue' },
  { value: 'ISSUED', label: 'Émis', color: 'indigo' },
  { value: 'VALIDATION_PENDING', label: 'En attente', color: 'amber' },
  { value: 'VALIDATED', label: 'Validé', color: 'green' },
  { value: 'REFUSED', label: 'Refusé', color: 'red' },
  { value: 'EXPIRED', label: 'Expiré', color: 'gray' },
  { value: 'CANCELLED', label: 'Annulé', color: 'gray' },
];

const getStatusStyle = (status: string) => {
  switch (status) {
    case 'VALIDATED':
      return 'bg-green-100 text-green-700 border-green-200';
    case 'REFUSED':
    case 'CANCELLED':
      return 'bg-red-100 text-red-700 border-red-200';
    case 'EXPIRED':
      return 'bg-gray-100 text-gray-600 border-gray-200';
    case 'VALIDATION_PENDING':
      return 'bg-amber-100 text-amber-700 border-amber-200';
    case 'ISSUED':
      return 'bg-indigo-100 text-indigo-700 border-indigo-200';
    default:
      return 'bg-blue-100 text-blue-700 border-blue-200';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'VALIDATED':
      return <CheckCircleIcon className="w-4 h-4" />;
    case 'REFUSED':
    case 'CANCELLED':
      return <XCircleIcon className="w-4 h-4" />;
    case 'EXPIRED':
      return <ExclamationTriangleIcon className="w-4 h-4" />;
    default:
      return <ClockIcon className="w-4 h-4" />;
  }
};

export default function FormsListPage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [status, setStatus] = useState('');
  const [search, setSearch] = useState('');
  const [outletFilter, setOutletFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Fetch outlets for filter (for all merchant users)
  // Note: Backend role is 'MERCHANT' for merchant admins, 'MERCHANT_EMPLOYEE' for employees
  const isMerchantUser = ['MERCHANT', 'MERCHANT_EMPLOYEE'].includes(user?.role || '');
  const { data: outletsResponse } = useQuery({
    queryKey: ['my-outlets'],
    queryFn: () => merchantManageApi.outlets.list(),
    enabled: isMerchantUser,
  });
  // API returns axios response, data is in response.data
  // Could be array directly or paginated {results: [...]}
  const outletsData = outletsResponse?.data as any;
  const outlets: any[] = Array.isArray(outletsData) ? outletsData : (outletsData?.results || []);
  // Show filter if user is a merchant admin (not employee) and has outlets
  const showOutletFilter = user?.role === 'MERCHANT' && outlets.length >= 1;

  const { data, isLoading } = useQuery({
    queryKey: ['forms', status, search, outletFilter, page],
    queryFn: () => taxfreeApi.listForms({ 
      status: status || undefined, 
      search: search || undefined,
      outlet: outletFilter || undefined,
      page 
    }),
  });

  const sendEmailMutation = useMutation({
    mutationFn: (formId: string) => taxfreeApi.sendEmail(formId),
    onSuccess: () => {
      toast.success('Email envoyé avec succès !');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Erreur lors de l\'envoi de l\'email';
      toast.error(message);
    },
  });

  const forms = data?.data?.results || [];
  const totalCount = data?.data?.count || 0;
  const totalPages = Math.ceil(totalCount / 5);

  // Fetch dashboard stats for accurate counts (not just current page)
  const { data: dashboardData } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await merchantManageApi.dashboard();
      return response.data;
    },
  });

  // Stats from dashboard API (accurate global counts)
  const stats = {
    total: dashboardData?.total_forms || totalCount,
    pending: dashboardData?.pending || 0,
    validated: dashboardData?.validated || 0,  // Includes VALIDATED + REFUNDED
    cancelled: dashboardData?.cancelled || 0,
  };

  return (
    <FadeIn duration={400}>
      <div>
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes bordereaux</h1>
          <p className="text-gray-500 mt-1">Gérez vos bordereaux de détaxe</p>
        </div>
        <button 
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/25"
        >
          <PlusIcon className="w-5 h-5" />
          Nouveau bordereau
        </button>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
              <DocumentTextIcon className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              <p className="text-sm text-gray-500">Total bordereaux</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <ClockIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
              <p className="text-sm text-gray-500">En cours</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CheckCircleIcon className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.validated}</p>
              <p className="text-sm text-gray-500">Validés</p>
            </div>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-lg flex items-center justify-center">
              <XCircleIcon className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stats.cancelled}</p>
              <p className="text-sm text-gray-500">Annulés</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par numéro, nom du voyageur..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          {/* Outlet filter - only for merchant admins with multiple outlets */}
          {showOutletFilter && (
            <div className="flex items-center gap-2">
              <select
                className="px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                value={outletFilter}
                onChange={(e) => { setOutletFilter(e.target.value); setPage(1); }}
              >
                <option value="">Tous les points de vente</option>
                {outlets.map((outlet: any) => (
                  <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                ))}
              </select>
            </div>
          )}
          
          {/* Status filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              className="px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
            >
              {STATUS_OPTIONS.map(opt => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : forms.length === 0 ? (
          <div className="text-center py-12">
            <DocumentTextIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun bordereau trouvé</h3>
            <p className="text-gray-500 mb-4">
              {search || status ? 'Essayez de modifier vos filtres' : 'Créez votre premier bordereau de détaxe'}
            </p>
            {!search && !status && (
              <button 
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                <PlusIcon className="w-5 h-5" />
                Nouveau bordereau
              </button>
            )}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Numéro</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Voyageur</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Montant remboursable</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Créé le</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Expire le</th>
                    <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {forms.map((form: any) => (
                    <tr 
                      key={form.id} 
                      className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                      onClick={() => navigate(`/merchant/forms/${form.id}`)}
                    >
                      <td className="py-4 px-4">
                        <span className="font-mono font-semibold text-blue-600">
                          {form.form_number}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <div>
                          <p className="font-medium text-gray-900">{form.traveler?.full_name || '-'}</p>
                          <p className="text-xs text-gray-500">{form.traveler?.passport_display || ''}</p>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="font-semibold text-green-600">
                          {Number(form.refund_amount).toLocaleString('fr-FR')} {form.currency}
                        </span>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${getStatusStyle(form.status)}`}>
                          {getStatusIcon(form.status)}
                          {form.status_display}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-gray-600">
                        {new Date(form.created_at).toLocaleDateString('fr-FR', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        <span className={form.is_expired ? 'text-red-600 font-medium' : 'text-gray-600'}>
                          {new Date(form.expires_at).toLocaleDateString('fr-FR', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric'
                          })}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            to={`/merchant/forms/${form.id}`}
                            className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                            title="Voir les détails"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => sendEmailMutation.mutate(form.id)}
                            disabled={sendEmailMutation.isPending || !form.traveler?.email}
                            className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title={form.traveler?.email ? "Envoyer par email" : "Pas d'email renseigné"}
                          >
                            <EnvelopeIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={async () => {
                              try {
                                const response = await taxfreeApi.viewPdf(form.id);
                                const blob = new Blob([response.data], { type: 'application/pdf' });
                                const url = window.URL.createObjectURL(blob);
                                window.open(url, '_blank');
                              } catch (error) {
                                console.error('Error loading PDF:', error);
                                toast.error('Erreur lors du chargement du PDF');
                              }
                            }}
                            className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Imprimer"
                          >
                            <PrinterIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600">
                  Affichage de <span className="font-medium">{(page - 1) * 5 + 1}</span> à{' '}
                  <span className="font-medium">{Math.min(page * 5, totalCount)}</span> sur{' '}
                  <span className="font-medium">{totalCount}</span> résultats
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                    Précédent
                  </button>
                  <span className="px-3 py-1.5 text-sm font-medium">
                    {page} / {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Suivant
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Create Sale Modal */}
      <CreateSaleModal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)} 
      />
      </div>
    </FadeIn>
  );
}
