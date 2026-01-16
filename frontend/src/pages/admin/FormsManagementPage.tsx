import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import usePermissions from '../../hooks/usePermissions';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

interface TaxFreeForm {
  id: string;
  form_number: string;
  status: string;
  status_display: string;
  traveler_name: string;
  traveler_passport: string;
  merchant_name: string;
  outlet_name: string;
  currency: string;
  eligible_amount: string;
  vat_amount: string;
  refund_amount: string;
  risk_score: number;
  requires_control: boolean;
  validation_status: {
    decision: string;
    decided_at: string;
    agent_name: string;
  } | null;
  refund_status: {
    status: string;
    method: string;
    paid_at: string;
    payout_currency: string | null;
    payout_amount: string | null;
    actual_payout_amount: string | null;
    service_gain: string | null;
  } | null;
  created_by_name: string;
  is_expired: boolean;
  issued_at: string;
  expires_at: string;
  validated_at: string;
  created_at: string;
}

interface Stats {
  status_counts: Record<string, number>;
  totals: {
    count: number;
    eligible_amount: number;
    vat_amount: number;
    refund_amount: number;
  };
  validation: {
    validated: number;
    refused: number;
    pending: number;
  };
  refund: {
    paid: number;
    pending: number;
    failed: number;
  };
  risk: {
    high_risk: number;
    control_required: number;
  };
  expired: number;
}

const STATUS_OPTIONS = [
  { value: '', label: 'Tous les statuts' },
  { value: 'CREATED', label: 'Créé' },
  { value: 'ISSUED', label: 'Émis' },
  { value: 'VALIDATION_PENDING', label: 'En attente validation' },
  { value: 'VALIDATED', label: 'Validé' },
  { value: 'REFUNDED', label: 'Remboursé' },
  { value: 'REFUSED', label: 'Refusé' },
  { value: 'EXPIRED', label: 'Expiré' },
  { value: 'CANCELLED', label: 'Annulé' },
];

const VALIDATION_OPTIONS = [
  { value: '', label: 'Toutes validations' },
  { value: 'validated', label: 'Validés' },
  { value: 'refused', label: 'Refusés' },
  { value: 'pending', label: 'En attente' },
];

const REFUND_OPTIONS = [
  { value: '', label: 'Tous remboursements' },
  { value: 'paid', label: 'Payés' },
  { value: 'pending', label: 'En attente' },
  { value: 'failed', label: 'Échoués' },
  { value: 'none', label: 'Sans remboursement' },
];

const RISK_OPTIONS = [
  { value: '', label: 'Tous niveaux' },
  { value: 'high', label: 'Risque élevé (≥70)' },
  { value: 'medium', label: 'Risque moyen (40-69)' },
  { value: 'low', label: 'Risque faible (<40)' },
];

export default function FormsManagementPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Check export permission
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canExport = isSuperAdmin || hasPermission('FORMS', 'EXPORT');
  const [filters, setFilters] = useState({
    status: '',
    validation_status: '',
    refund_status: '',
    risk_level: '',
    date_from: '',
    date_to: '',
    is_expired: '',
  });

  const pageSize = 5;

  // Build query params
  const buildParams = () => {
    const params: Record<string, string> = {
      page: page.toString(),
      page_size: pageSize.toString(),
    };
    if (search) params.search = search;
    if (filters.status) params.status = filters.status;
    if (filters.validation_status) params.validation_status = filters.validation_status;
    if (filters.refund_status) params.refund_status = filters.refund_status;
    if (filters.risk_level) params.risk_level = filters.risk_level;
    if (filters.date_from) params.date_from = filters.date_from;
    if (filters.date_to) params.date_to = filters.date_to;
    if (filters.is_expired) params.is_expired = filters.is_expired;
    return params;
  };

  // Fetch forms
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-forms', page, search, filters],
    queryFn: async () => {
      const response = await api.get('/taxfree/admin/forms/', { params: buildParams() });
      return response.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery<Stats>({
    queryKey: ['admin-forms-stats', filters.date_from, filters.date_to],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (filters.date_from) params.date_from = filters.date_from;
      if (filters.date_to) params.date_to = filters.date_to;
      const response = await api.get('/taxfree/admin/forms/stats/', { params });
      return response.data;
    },
  });

  const forms: TaxFreeForm[] = data?.results || [];
  const totalCount = data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    refetch();
  };

  const handleExport = async () => {
    try {
      const response = await api.get('/taxfree/admin/forms/export/', {
        params: buildParams(),
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'bordereaux_export.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const resetFilters = () => {
    setFilters({
      status: '',
      validation_status: '',
      refund_status: '',
      risk_level: '',
      date_from: '',
      date_to: '',
      is_expired: '',
    });
    setPage(1);
  };

  const formatAmount = (amount: string | number) => {
    return new Intl.NumberFormat('fr-FR').format(Number(amount));
  };

  const formatDate = (dateStr: string) => {
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
      CREATED: 'bg-gray-100 text-gray-700',
      ISSUED: 'bg-blue-100 text-blue-700',
      VALIDATION_PENDING: 'bg-yellow-100 text-yellow-700',
      VALIDATED: 'bg-green-100 text-green-700',
      REFUNDED: 'bg-emerald-100 text-emerald-700',
      REFUSED: 'bg-red-100 text-red-700',
      EXPIRED: 'bg-orange-100 text-orange-700',
      CANCELLED: 'bg-gray-100 text-gray-500',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100'}`}>
        {statusDisplay}
      </span>
    );
  };

  const getValidationBadge = (validation: TaxFreeForm['validation_status']) => {
    if (!validation) {
      return <span className="text-gray-400 text-xs">-</span>;
    }
    if (validation.decision === 'VALIDATED') {
      return (
        <span className="flex items-center gap-1 text-green-600 text-xs">
          <CheckCircleIcon className="w-4 h-4" />
          Validé
        </span>
      );
    }
    if (validation.decision === 'REFUSED') {
      return (
        <span className="flex items-center gap-1 text-red-600 text-xs">
          <XCircleIcon className="w-4 h-4" />
          Refusé
        </span>
      );
    }
    return <span className="text-yellow-600 text-xs">En attente</span>;
  };

  const getRefundBadge = (refund: TaxFreeForm['refund_status'], currency: string, refundAmount: string) => {
    if (!refund) {
      return <span className="text-gray-400 text-xs">-</span>;
    }
    const styles: Record<string, string> = {
      PENDING: 'text-yellow-600',
      INITIATED: 'text-blue-600',
      PAID: 'text-green-600',
      FAILED: 'text-red-600',
      CANCELLED: 'text-gray-500',
    };
    
    // Determine display currency and amount
    const payoutCurrency = refund.payout_currency || currency;
    const displayAmount = refund.actual_payout_amount || refund.payout_amount || refundAmount;
    const hasServiceGain = refund.service_gain && parseFloat(refund.service_gain) > 0;
    const isDifferentCurrency = refund.payout_currency && refund.payout_currency !== currency;
    
    return (
      <div className="flex flex-col">
        <span className={`flex items-center gap-1 text-xs ${styles[refund.status] || ''}`}>
          <BanknotesIcon className="w-4 h-4" />
          {refund.status === 'PAID' ? 'Payé' : refund.status === 'PENDING' ? 'En attente' : refund.status}
        </span>
        {refund.status === 'PAID' && (
          <span className={`text-[10px] font-medium mt-0.5 ${isDifferentCurrency ? 'text-blue-600' : 'text-gray-500'}`}>
            {isDifferentCurrency && '💱 '}
            {formatAmount(displayAmount)} {payoutCurrency}
          </span>
        )}
        {refund.status === 'PAID' && hasServiceGain && (
          <span className="text-[10px] text-amber-600 font-medium">
            💰 +{formatAmount(refund.service_gain!)} gain
          </span>
        )}
      </div>
    );
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <DocumentTextIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">Bordereaux Tax Free</h1>
                <p className="text-blue-100 mt-0.5">Gestion et traçabilité complète des bordereaux</p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              className="p-2.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
            <button
              onClick={handleExport}
              disabled={!canExport}
              title={!canExport ? 'Vous n\'avez pas la permission d\'exporter' : ''}
              className={`flex items-center gap-2 px-4 py-2.5 backdrop-blur border rounded-xl text-sm font-medium transition-colors ${
                canExport 
                  ? 'bg-white/10 border-white/20 text-white hover:bg-white/20' 
                  : 'bg-gray-500/20 border-gray-500/20 text-gray-400 cursor-not-allowed'
              }`}
            >
              <ArrowDownTrayIcon className="w-4 h-4" />
              Exporter Excel
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-gradient-to-br from-slate-50 to-slate-100 rounded-xl p-3 border border-slate-200">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total</p>
              <div className="w-6 h-6 rounded-md bg-slate-200 flex items-center justify-center">
                <DocumentTextIcon className="w-3 h-3 text-slate-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-slate-900 mt-1">{stats.totals.count}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-100 rounded-xl p-3 border border-green-200">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-green-600 uppercase tracking-wider">Validés</p>
              <div className="w-6 h-6 rounded-md bg-green-200 flex items-center justify-center">
                <CheckCircleIcon className="w-3 h-3 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-green-700 mt-1">{stats.validation.validated}</p>
          </div>
          <div className="bg-gradient-to-br from-red-50 to-rose-100 rounded-xl p-3 border border-red-200">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-red-600 uppercase tracking-wider">Refusés</p>
              <div className="w-6 h-6 rounded-md bg-red-200 flex items-center justify-center">
                <XCircleIcon className="w-3 h-3 text-red-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-red-700 mt-1">{stats.validation.refused}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-teal-100 rounded-xl p-3 border border-emerald-200">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-emerald-600 uppercase tracking-wider">Remboursés</p>
              <div className="w-6 h-6 rounded-md bg-emerald-200 flex items-center justify-center">
                <BanknotesIcon className="w-3 h-3 text-emerald-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-emerald-700 mt-1">{stats.refund.paid}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-amber-100 rounded-xl p-3 border border-orange-200">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-orange-600 uppercase tracking-wider">Risque élevé</p>
              <div className="w-6 h-6 rounded-md bg-orange-200 flex items-center justify-center">
                <ExclamationTriangleIcon className="w-3 h-3 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-orange-700 mt-1">{stats.risk.high_risk}</p>
          </div>
          <div className="bg-gradient-to-br from-blue-50 to-indigo-100 rounded-xl p-3 border border-blue-200">
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">TVA totale</p>
              <div className="w-6 h-6 rounded-md bg-blue-200 flex items-center justify-center">
                <BanknotesIcon className="w-3 h-3 text-blue-600" />
              </div>
            </div>
            <p className="text-lg font-bold text-blue-700 mt-1">{formatAmount(stats.totals.vat_amount)} <span className="text-xs font-medium">CDF</span></p>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search */}
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
          
          {/* Filter toggle */}
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

        {/* Expanded Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
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
                <label className="block text-xs font-medium text-gray-500 mb-1">Validation</label>
                <select
                  value={filters.validation_status}
                  onChange={(e) => setFilters({ ...filters, validation_status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {VALIDATION_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Remboursement</label>
                <select
                  value={filters.refund_status}
                  onChange={(e) => setFilters({ ...filters, refund_status: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {REFUND_OPTIONS.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Niveau risque</label>
                <select
                  value={filters.risk_level}
                  onChange={(e) => setFilters({ ...filters, risk_level: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                >
                  {RISK_OPTIONS.map(opt => (
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
                  Montant
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Validation
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Remboursement
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <ArrowPathIcon className="w-6 h-6 animate-spin mx-auto mb-2" />
                    Chargement...
                  </td>
                </tr>
              ) : forms.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    <DocumentTextIcon className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                    Aucun bordereau trouvé
                  </td>
                </tr>
              ) : (
                forms.map((form) => (
                  <tr 
                    key={form.id} 
                    className="hover:bg-blue-50/50 cursor-pointer transition-colors group"
                    onClick={() => navigate(`/admin/forms/${form.id}`)}
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                          <DocumentTextIcon className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <span className="font-mono text-sm font-semibold text-gray-900 group-hover:text-blue-600">
                            {form.form_number}
                          </span>
                          <div className="flex items-center gap-1 mt-0.5">
                            {form.requires_control && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-orange-100 text-orange-700 text-xs rounded">
                                <ExclamationTriangleIcon className="w-3 h-3" />
                                Contrôle
                              </span>
                            )}
                            {form.is_expired && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">
                                <ClockIcon className="w-3 h-3" />
                                Expiré
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{form.traveler_name}</p>
                        <p className="text-xs text-gray-500 font-mono">{form.traveler_passport}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{form.merchant_name}</p>
                        <p className="text-xs text-gray-500">{form.outlet_name}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">
                          {formatAmount(form.refund_amount)} <span className="text-xs font-normal text-gray-500">{form.currency}</span>
                        </p>
                        <p className="text-xs text-gray-400">TVA: {formatAmount(form.vat_amount)}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      {getStatusBadge(form.status, form.status_display)}
                    </td>
                    <td className="px-4 py-4">
                      {getValidationBadge(form.validation_status)}
                    </td>
                    <td className="px-4 py-4">
                      {getRefundBadge(form.refund_status, form.currency, form.refund_amount)}
                    </td>
                    <td className="px-4 py-4">
                      <p className="text-sm text-gray-600">{formatDate(form.created_at)}</p>
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
              {totalCount} résultat{totalCount > 1 ? 's' : ''} - Page {page} sur {totalPages}
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
      </div>
    </FadeIn>
  );
}
