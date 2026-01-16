import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { taxfreeApi, refundsApi } from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import {
  BanknotesIcon,
  MagnifyingGlassIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  VALIDATED: { label: 'En attente', color: 'bg-amber-100 text-amber-700', icon: ClockIcon },
  REFUNDED: { label: 'Remboursé', color: 'bg-green-100 text-green-700', icon: CheckCircleIcon },
  REFUSED: { label: 'Refusé', color: 'bg-red-100 text-red-700', icon: XCircleIcon },
  FAILED: { label: 'Échoué', color: 'bg-orange-100 text-orange-700', icon: ExclamationTriangleIcon },
  CANCELLED: { label: 'Annulé', color: 'bg-gray-100 text-gray-700', icon: ExclamationTriangleIcon },
};

const ITEMS_PER_PAGE = 5;

export default function RefundsListPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch VALIDATED, REFUNDED, and REFUSED forms
  const { data: validatedData, isLoading: loadingValidated } = useQuery({
    queryKey: ['forms-validated'],
    queryFn: () => taxfreeApi.listForms({ status: 'VALIDATED' }),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: refundedData, isLoading: loadingRefunded } = useQuery({
    queryKey: ['forms-refunded'],
    queryFn: () => taxfreeApi.listForms({ status: 'REFUNDED' }),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  // Fetch REFUSED forms (validation refused by customs)
  const { data: refusedData, isLoading: loadingRefused } = useQuery({
    queryKey: ['forms-refused'],
    queryFn: () => taxfreeApi.listForms({ status: 'REFUSED' }),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  // Fetch FAILED and CANCELLED refunds
  const { data: failedRefundsData, isLoading: loadingFailed } = useQuery({
    queryKey: ['refunds-failed'],
    queryFn: () => refundsApi.list({ status: 'FAILED' }),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const { data: cancelledRefundsData, isLoading: loadingCancelled } = useQuery({
    queryKey: ['refunds-cancelled'],
    queryFn: () => refundsApi.list({ status: 'CANCELLED' }),
    refetchInterval: 10000,
    refetchOnWindowFocus: true,
  });

  const isLoading = loadingValidated || loadingRefunded || loadingRefused || loadingFailed || loadingCancelled;
  
  // Transform refunds to form-like objects for display
  const transformRefundToForm = (refund: any, status: string) => ({
    id: refund.form_data?.id || refund.form || refund.id,
    form_number: refund.form_data?.form_number || refund.form_number,
    traveler: refund.form_data?.traveler,
    merchant_name: refund.merchant_name,
    refund_amount: refund.net_amount,
    currency: refund.currency,
    status: status,
    refund: refund,
    validation: null,
    updated_at: refund.cancelled_at || refund.updated_at || refund.created_at,
    cancellation_reason: refund.cancellation_reason,
  });

  // Combine all forms and refunds
  const failedForms = (failedRefundsData?.data?.results || []).map((r: any) => transformRefundToForm(r, 'FAILED'));
  const cancelledForms = (cancelledRefundsData?.data?.results || []).map((r: any) => transformRefundToForm(r, 'CANCELLED'));
  
  const allForms = [
    ...(validatedData?.data?.results || []),
    ...(refundedData?.data?.results || []),
    ...(refusedData?.data?.results || []),
    ...failedForms,
    ...cancelledForms,
  ].sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime());

  // Filter by status and search
  const filteredForms = allForms.filter((form: any) => {
    // Status filter
    if (statusFilter !== 'all' && form.status !== statusFilter) return false;
    
    // Search filter
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      form.form_number?.toLowerCase().includes(query) ||
      form.traveler?.first_name?.toLowerCase().includes(query) ||
      form.traveler?.last_name?.toLowerCase().includes(query) ||
      form.merchant_name?.toLowerCase().includes(query)
    );
  });

  // Pagination
  const totalPages = Math.ceil(filteredForms.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedForms = filteredForms.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const pendingCount = allForms.filter((f: any) => f.status === 'VALIDATED').length;
  const refundedCount = allForms.filter((f: any) => f.status === 'REFUNDED').length;
  const refusedCount = allForms.filter((f: any) => f.status === 'REFUSED').length;
  const failedCount = allForms.filter((f: any) => f.status === 'FAILED').length;
  const cancelledCount = allForms.filter((f: any) => f.status === 'CANCELLED').length;

  return (
    <FadeIn duration={400}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <BanknotesIcon className="w-7 h-7 text-primary-600" />
          Remboursements
        </h1>
        <p className="text-gray-500 mt-1">Gestion des remboursements des bordereaux validés</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-6">
        <button
          onClick={() => handleStatusFilter('all')}
          className={`p-4 rounded-lg border transition-colors ${statusFilter === 'all' ? 'bg-primary-50 border-primary-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
        >
          <p className="text-2xl font-bold text-gray-900">{allForms.length}</p>
          <p className="text-sm text-gray-500">Total</p>
        </button>
        <button
          onClick={() => handleStatusFilter('VALIDATED')}
          className={`p-4 rounded-lg border transition-colors ${statusFilter === 'VALIDATED' ? 'bg-amber-50 border-amber-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
        >
          <p className="text-2xl font-bold text-amber-600">{pendingCount}</p>
          <p className="text-sm text-gray-500">En attente</p>
        </button>
        <button
          onClick={() => handleStatusFilter('REFUNDED')}
          className={`p-4 rounded-lg border transition-colors ${statusFilter === 'REFUNDED' ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
        >
          <p className="text-2xl font-bold text-green-600">{refundedCount}</p>
          <p className="text-sm text-gray-500">Remboursés</p>
        </button>
        <button
          onClick={() => handleStatusFilter('REFUSED')}
          className={`p-4 rounded-lg border transition-colors ${statusFilter === 'REFUSED' ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
        >
          <p className="text-2xl font-bold text-red-600">{refusedCount}</p>
          <p className="text-sm text-gray-500">Refusés</p>
        </button>
        <button
          onClick={() => handleStatusFilter('FAILED')}
          className={`p-4 rounded-lg border transition-colors ${statusFilter === 'FAILED' ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
        >
          <p className="text-2xl font-bold text-orange-600">{failedCount}</p>
          <p className="text-sm text-gray-500">Échoués</p>
        </button>
        <button
          onClick={() => handleStatusFilter('CANCELLED')}
          className={`p-4 rounded-lg border transition-colors ${statusFilter === 'CANCELLED' ? 'bg-gray-100 border-gray-400' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
        >
          <p className="text-2xl font-bold text-gray-600">{cancelledCount}</p>
          <p className="text-sm text-gray-500">Annulés</p>
        </button>
      </div>

      {/* Search */}
      <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
        <div className="flex-1 relative">
          <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher par numéro, nom, commerçant..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          />
        </div>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : filteredForms.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <BanknotesIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Aucun remboursement trouvé</p>
          <p className="text-sm text-gray-400 mt-2">Les bordereaux validés apparaîtront ici</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Bordereau</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voyageur</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Commerçant</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">Montant</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedForms.map((form: any) => {
                const statusConfig = STATUS_CONFIG[form.status] || STATUS_CONFIG.VALIDATED;
                const StatusIcon = statusConfig.icon;
                const isRefunded = form.status === 'REFUNDED';
                const isRefused = form.status === 'REFUSED';
                const isFailed = form.status === 'FAILED';
                const isCancelled = form.status === 'CANCELLED';
                const isProblematic = isFailed || isCancelled || isRefused;
                
                return (
                  <tr 
                    key={form.id} 
                    className={`hover:bg-gray-50 cursor-pointer ${isProblematic ? 'bg-red-50/30' : ''}`}
                    onClick={() => navigate(`/customs/refund/${form.id}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-mono font-medium text-gray-900">{form.form_number}</p>
                      {form.cancellation_reason && (
                        <p className="text-xs text-red-500 mt-1 truncate max-w-[150px]" title={form.cancellation_reason}>
                          {form.cancellation_reason}
                        </p>
                      )}
                      {isRefused && (form.validation?.refusal_reason_display || form.validation?.refusal_reason) && (
                        <p className="text-xs text-red-500 mt-1 truncate max-w-[150px]" title={form.validation?.refusal_reason_display || form.validation?.refusal_reason}>
                          {form.validation?.refusal_reason_display || form.validation?.refusal_reason}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{form.traveler?.first_name} {form.traveler?.last_name}</p>
                      <p className="text-xs text-gray-500">***{form.traveler?.passport_number_last4}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-gray-900">{form.merchant_name}</p>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <p className={`font-semibold ${isRefunded ? 'text-green-600' : isProblematic ? 'text-red-600 line-through' : 'text-gray-900'}`}>
                        {/* Show actual payout amount if refunded, otherwise show expected amount */}
                        {isRefunded && form.refund?.actual_payout_amount
                          ? parseFloat(form.refund.actual_payout_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                          : isRefunded && form.refund?.payout_amount
                            ? parseFloat(form.refund.payout_amount).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                            : parseFloat(form.refund_amount || 0).toLocaleString()
                        }
                      </p>
                      <p className="text-xs text-gray-500">
                        {isRefunded && form.refund?.payout_currency 
                          ? form.refund.payout_currency 
                          : form.currency}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${statusConfig.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <p className="text-gray-900">
                        {form.refund?.cancelled_at
                          ? new Date(form.refund.cancelled_at).toLocaleDateString('fr-FR')
                          : form.refund?.paid_at 
                            ? new Date(form.refund.paid_at).toLocaleDateString('fr-FR')
                            : form.validation?.decided_at 
                              ? new Date(form.validation.decided_at).toLocaleDateString('fr-FR') 
                              : '-'}
                      </p>
                      <p className="text-xs text-gray-500">
                        {isCancelled 
                          ? (form.refund?.cancelled_by_name || 'Annulé')
                          : isFailed 
                            ? 'Échec' 
                            : isRefused 
                              ? (form.validation?.agent_name || 'Refusé')
                              : isRefunded 
                                ? (form.refund?.initiated_by_name || 'Remboursé')
                                : (form.validation?.agent_name || '-')}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      {isRefunded || isProblematic ? (
                        <button
                          onClick={() => navigate(`/customs/refund/${form.id}`)}
                          className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors inline-flex items-center gap-1"
                        >
                          <EyeIcon className="w-4 h-4" />
                          Détails
                        </button>
                      ) : (
                        <button
                          onClick={() => navigate(`/customs/refund/${form.id}`)}
                          className="px-3 py-1.5 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700 transition-colors"
                        >
                          Rembourser →
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 flex items-center justify-between">
              <div className="text-sm text-gray-500">
                Affichage {startIndex + 1}-{Math.min(startIndex + ITEMS_PER_PAGE, filteredForms.length)} sur {filteredForms.length} résultats
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum;
                    if (totalPages <= 5) {
                      pageNum = i + 1;
                    } else if (currentPage <= 3) {
                      pageNum = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      pageNum = totalPages - 4 + i;
                    } else {
                      pageNum = currentPage - 2 + i;
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          currentPage === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-lg border border-gray-300 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
      </div>
    </FadeIn>
  );
}
