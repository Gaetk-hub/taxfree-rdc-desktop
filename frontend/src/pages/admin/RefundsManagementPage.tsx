import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import usePermissions from '../../hooks/usePermissions';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  BuildingLibraryIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface Refund {
  id: string;
  form: string;
  form_number: string;
  traveler_name: string;
  merchant_name: string;
  outlet_name: string;
  currency: string;
  gross_amount: string;
  operator_fee: string;
  net_amount: string;
  payout_currency: string | null;
  exchange_rate_applied: string | null;
  payout_amount: string | null;
  actual_payout_amount: string | null;
  service_gain: string | null;
  service_gain_cdf: string | null;
  method: string;
  method_display: string;
  status: string;
  status_display: string;
  initiated_at: string;
  initiated_by_name: string;
  paid_at: string | null;
  cash_collected: boolean;
  cash_collected_at: string | null;
  retry_count: number;
  attempts_count: number;
  created_at: string;
}

interface Stats {
  status_counts: Record<string, { count: number; amount: number }>;
  method_counts: Record<string, number>;
  totals: {
    count: number;
    gross_amount: number;
    fees: number;
    net_amount: number;
  };
  paid: {
    count: number;
    amount: number;
  };
  can_retry: number;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'INITIATED', label: 'Initié' },
  { value: 'PAID', label: 'Payé' },
  { value: 'FAILED', label: 'Échoué' },
  { value: 'CANCELLED', label: 'Annulé' },
];

const METHOD_OPTIONS = [
  { value: '', label: 'Toutes méthodes' },
  { value: 'CARD', label: 'Carte bancaire' },
  { value: 'BANK_TRANSFER', label: 'Virement bancaire' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'CASH', label: 'Espèces' },
];

export default function RefundsManagementPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  
  // Check export permission
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canExport = isSuperAdmin || hasPermission('REFUNDS', 'EXPORT');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    method: '',
    date_from: '',
    date_to: '',
    has_retries: '',
  });

  const pageSize = 5;

  const buildParams = () => {
    const params: Record<string, string> = {
      page: page.toString(),
      page_size: pageSize.toString(),
    };
    if (search) params.search = search;
    if (filters.status) params.status = filters.status;
    if (filters.method) params.method = filters.method;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.has_retries) params.has_retries = filters.has_retries;
    return params;
  };

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-refunds', page, search, filters],
    queryFn: async () => {
      const response = await api.get('/taxfree/admin/refunds/', { params: buildParams() });
      return response.data;
    },
  });

  const { data: stats } = useQuery<Stats>({
    queryKey: ['admin-refunds-stats', filters.date_from, filters.date_to],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const response = await api.get('/taxfree/admin/refunds/stats/', { params });
      return response.data;
    },
  });

  const refunds: Refund[] = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/taxfree/admin/refunds/export/', {
        params: buildParams(),
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      const date = new Date().toISOString().split('T')[0];
      link.setAttribute('download', `rapport_remboursements_${date}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleRowClick = (refundId: string) => {
    navigate(`/admin/refunds/${refundId}`);
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      method: '',
      date_from: '',
      date_to: '',
      has_retries: '',
    });
    setPage(1);
  };

  const formatAmount = (amount: string | number) => {
    return new Intl.NumberFormat('fr-FR').format(Number(amount));
  };

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

  const getStatusBadge = (status: string, statusDisplay: string) => {
    const styles: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      INITIATED: 'bg-blue-100 text-blue-700',
      PAID: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700',
      CANCELLED: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100'}`}>
        {statusDisplay}
      </span>
    );
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'CARD':
        return <CreditCardIcon className="w-4 h-4" />;
      case 'BANK_TRANSFER':
        return <BuildingLibraryIcon className="w-4 h-4" />;
      case 'MOBILE_MONEY':
        return <DevicePhoneMobileIcon className="w-4 h-4" />;
      case 'CASH':
        return <CurrencyDollarIcon className="w-4 h-4" />;
      default:
        return <BanknotesIcon className="w-4 h-4" />;
    }
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Remboursements</h1>
          <p className="text-gray-500 mt-1">Suivi et traçabilité des remboursements</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ArrowPathIcon className="w-5 h-5" />
          </button>
          <button
            onClick={handleExport}
            disabled={!canExport}
            title={!canExport ? 'Vous n\'avez pas la permission d\'exporter' : ''}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${
              canExport 
                ? 'bg-white border-gray-200 text-gray-700 hover:bg-gray-50' 
                : 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <ArrowDownTrayIcon className="w-4 h-4" />
            Exporter
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totals.count}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Payés</p>
            <p className="text-2xl font-bold text-green-600 mt-1">{stats.paid.count}</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">En attente</p>
            <p className="text-2xl font-bold text-yellow-600 mt-1">
              {stats.status_counts.PENDING?.count || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Échoués</p>
            <p className="text-2xl font-bold text-red-600 mt-1">
              {stats.status_counts.FAILED?.count || 0}
            </p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Montant payé</p>
            <p className="text-lg font-bold text-green-600 mt-1">{formatAmount(stats.paid.amount)} CDF</p>
          </div>
          <div className="bg-white rounded-xl p-4 border border-gray-100">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Frais collectés</p>
            <p className="text-lg font-bold text-gray-900 mt-1">{formatAmount(stats.totals.fees)} CDF</p>
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
                placeholder="Rechercher par n° bordereau, voyageur, commerçant..."
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
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Statut</label>
                <select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {STATUS_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Méthode</label>
                <select
                  value={filters.method}
                  onChange={(e) => setFilters({ ...filters, method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {METHOD_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date début</label>
                <input
                  type="date"
                  value={filters.date_from}
                  onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Date fin</label>
                <input
                  type="date"
                  value={filters.date_to}
                  onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                />
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
                  N° Bordereau
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Voyageur
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Commerçant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Méthode
                </th>
                <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Initié par
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Chargement...
                  </td>
                </tr>
              ) : refunds.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    <BanknotesIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    Aucun remboursement trouvé
                  </td>
                </tr>
              ) : (
                refunds.map((refund) => (
                  <tr 
                    key={refund.id} 
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors"
                    onClick={() => handleRowClick(refund.id)}
                  >
                    <td className="px-4 py-4">
                      <Link 
                        to={`/admin/forms/${refund.form}`}
                        className="font-mono text-sm font-semibold text-blue-600 hover:text-blue-700"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {refund.form_number}
                      </Link>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm font-medium text-gray-900">{refund.traveler_name}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{refund.merchant_name}</p>
                        <p className="text-xs text-gray-500">{refund.outlet_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <span className="p-1.5 bg-gray-100 rounded-lg">
                          {getMethodIcon(refund.method)}
                        </span>
                        <span className="text-sm text-gray-700">{refund.method_display}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div>
                        <p className="text-sm font-bold text-gray-900">
                          {formatAmount(refund.net_amount)} {refund.currency}
                        </p>
                        <p className="text-xs text-gray-500">Frais: {formatAmount(refund.operator_fee)}</p>
                        {refund.payout_currency && refund.payout_currency !== refund.currency && (
                          <p className="text-xs text-blue-600 font-medium mt-0.5">
                            💱 {formatAmount(refund.actual_payout_amount || refund.payout_amount || '0')} {refund.payout_currency}
                          </p>
                        )}
                        {refund.service_gain && parseFloat(refund.service_gain) > 0 && (
                          <p className="text-xs text-amber-600 font-medium">
                            💰 +{formatAmount(refund.service_gain)} gain
                          </p>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusBadge(refund.status, refund.status_display)}
                        {refund.retry_count > 0 && (
                          <span className="text-xs text-orange-600 font-medium">({refund.retry_count}x)</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-600">{refund.initiated_by_name || '-'}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-gray-600">{formatDate(refund.created_at)}</p>
                        {refund.paid_at && (
                          <p className="text-xs text-green-600 font-medium">Payé: {formatDate(refund.paid_at)}</p>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-4 border-t border-gray-100 bg-gray-50/50">
          <div className="flex items-center gap-4">
            <p className="text-sm text-gray-600">
              <span className="font-semibold text-gray-900">{totalCount}</span> remboursement{totalCount > 1 ? 's' : ''}
            </p>
            {totalPages > 1 && (
              <p className="text-sm text-gray-500">
                Page <span className="font-medium">{page}</span> sur <span className="font-medium">{totalPages}</span>
              </p>
            )}
          </div>
          {totalPages > 1 && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage(1)}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Début
              </button>
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="w-5 h-5" />
              </button>
              
              {/* Page numbers */}
              <div className="flex items-center gap-1">
                {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                  let pageNum;
                  if (totalPages <= 5) {
                    pageNum = i + 1;
                  } else if (page <= 3) {
                    pageNum = i + 1;
                  } else if (page >= totalPages - 2) {
                    pageNum = totalPages - 4 + i;
                  } else {
                    pageNum = page - 2 + i;
                  }
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setPage(pageNum)}
                      className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                        page === pageNum
                          ? 'bg-blue-600 text-white'
                          : 'text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}
              </div>
              
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRightIcon className="w-5 h-5" />
              </button>
              <button
                onClick={() => setPage(totalPages)}
                disabled={page === totalPages}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Fin
              </button>
            </div>
          )}
        </div>
        </div>
      </div>
    </FadeIn>
  );
}
