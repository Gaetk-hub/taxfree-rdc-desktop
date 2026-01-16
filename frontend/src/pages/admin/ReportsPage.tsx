import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import usePermissions from '../../hooks/usePermissions';
import {
  ChartBarIcon,
  ArrowDownTrayIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  MapPinIcon,
  TrophyIcon,
  ArrowTrendingUpIcon,
  ExclamationTriangleIcon,
  CalendarDaysIcon,
} from '@heroicons/react/24/outline';

// Status display names
const STATUS_DISPLAY: Record<string, string> = {
  ISSUED: 'Émis',
  VALIDATION_PENDING: 'En attente validation',
  VALIDATED: 'Validé',
  REFUSED: 'Refusé',
  REFUNDED: 'Remboursé',
  EXPIRED: 'Expiré',
  CANCELLED: 'Annulé',
  PENDING: 'En attente',
  INITIATED: 'Initié',
  PAID: 'Payé',
  FAILED: 'Échoué',
};

const METHOD_DISPLAY: Record<string, string> = {
  CASH: 'Espèces',
  CARD: 'Carte bancaire',
  MOBILE_MONEY: 'Mobile Money',
  BANK_TRANSFER: 'Virement bancaire',
};

const DECISION_DISPLAY: Record<string, string> = {
  VALIDATED: 'Validé',
  REFUSED: 'Refusé',
  CONTROL_REQUIRED: 'Contrôle requis',
};

export default function ReportsPage() {
  const [days, setDays] = useState(30);
  const [activeTab, setActiveTab] = useState<'overview' | 'merchants' | 'customs' | 'financial'>('overview');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportDateFrom, setExportDateFrom] = useState('');
  const [exportDateTo, setExportDateTo] = useState('');
  
  // Check export permissions
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canExportForms = isSuperAdmin || hasPermission('FORMS', 'EXPORT');
  const canExportRefunds = isSuperAdmin || hasPermission('REFUNDS', 'EXPORT');
  const canExportReports = isSuperAdmin || hasPermission('REPORTS', 'EXPORT');

  const { data, isLoading } = useQuery({
    queryKey: ['report-summary', days],
    queryFn: () => reportsApi.getSummary({ days }),
  });

  const handleExport = async (type: string) => {
    try {
      const response = await reportsApi.exportCsv(type, { days });
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const stats = data?.data;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(amount);
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ChartBarIcon className="w-7 h-7 text-primary-600" />
            Rapports & Statistiques
          </h1>
          <p className="text-gray-500 mt-1">Analyse complète de l'activité Tax Free</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
            <CalendarDaysIcon className="w-5 h-5 text-gray-400" />
            <select
              className="bg-transparent border-none focus:ring-0 text-sm font-medium text-gray-700"
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
            >
              <option value={7}>7 derniers jours</option>
              <option value={30}>30 derniers jours</option>
              <option value={90}>90 derniers jours</option>
              <option value={180}>6 mois</option>
              <option value={365}>1 an</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {[
            { id: 'overview', label: 'Vue d\'ensemble', icon: ChartBarIcon },
            { id: 'merchants', label: 'Commerçants', icon: BuildingStorefrontIcon },
            { id: 'customs', label: 'Douane', icon: CheckBadgeIcon },
            { id: 'financial', label: 'Financier', icon: BanknotesIcon },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-1 py-3 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-primary-600 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <tab.icon className="w-5 h-5" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      ) : stats ? (
        <>
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between">
                    <DocumentTextIcon className="w-8 h-8 opacity-80" />
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">{days}j</span>
                  </div>
                  <p className="text-3xl font-bold mt-3">{stats.forms?.total || 0}</p>
                  <p className="text-sm opacity-80 mt-1">Bordereaux créés</p>
                </div>
                
                <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between">
                    <BanknotesIcon className="w-8 h-8 opacity-80" />
                    <ArrowTrendingUpIcon className="w-5 h-5" />
                  </div>
                  <p className="text-3xl font-bold mt-3">{formatCurrency(stats.forms?.total_vat || 0)}</p>
                  <p className="text-sm opacity-80 mt-1">TVA totale (CDF)</p>
                </div>
                
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between">
                    <CheckBadgeIcon className="w-8 h-8 opacity-80" />
                    <span className="text-lg font-bold">{stats.validations?.validation_rate || 0}%</span>
                  </div>
                  <p className="text-3xl font-bold mt-3">{stats.validations?.total || 0}</p>
                  <p className="text-sm opacity-80 mt-1">Validations douane</p>
                </div>
                
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
                  <div className="flex items-center justify-between">
                    <BanknotesIcon className="w-8 h-8 opacity-80" />
                    <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Net</span>
                  </div>
                  <p className="text-3xl font-bold mt-3">{formatCurrency(stats.refunds?.total_net || 0)}</p>
                  <p className="text-sm opacity-80 mt-1">Remboursé (CDF)</p>
                </div>
              </div>

              {/* Status Breakdown */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Forms by Status */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                    Bordereaux par statut
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.forms?.by_status || {}).map(([status, count]) => {
                      const total = stats.forms?.total || 1;
                      const percent = Math.round((count as number) / total * 100);
                      return (
                        <div key={status}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{STATUS_DISPLAY[status] || status}</span>
                            <span className="font-medium">{count as number}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-blue-500 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Validations by Decision */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <CheckBadgeIcon className="w-5 h-5 text-amber-600" />
                    Décisions douanières
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.validations?.by_decision || {}).map(([decision, count]) => {
                      const total = stats.validations?.total || 1;
                      const percent = Math.round((count as number) / total * 100);
                      const color = decision === 'VALIDATED' ? 'bg-green-500' : decision === 'REFUSED' ? 'bg-red-500' : 'bg-amber-500';
                      return (
                        <div key={decision}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{DECISION_DISPLAY[decision] || decision}</span>
                            <span className="font-medium">{count as number} ({percent}%)</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${color} rounded-full transition-all`}
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Contrôles physiques</span>
                      <span className="font-medium">{stats.validations?.physical_control_count || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm mt-2">
                      <span className="text-gray-500">Validations hors-ligne</span>
                      <span className="font-medium">{stats.validations?.offline_count || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Refunds by Method */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <BanknotesIcon className="w-5 h-5 text-green-600" />
                    Remboursements par méthode
                  </h3>
                  <div className="space-y-3">
                    {Object.entries(stats.refunds?.by_method || {}).map(([method, count]) => {
                      const total = stats.refunds?.total || 1;
                      const percent = Math.round((count as number) / total * 100);
                      return (
                        <div key={method}>
                          <div className="flex justify-between text-sm mb-1">
                            <span className="text-gray-600">{METHOD_DISPLAY[method] || method}</span>
                            <span className="font-medium">{count as number}</span>
                          </div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-green-500 rounded-full transition-all"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Montant brut</span>
                      <span className="font-medium">{formatCurrency(stats.refunds?.total_gross || 0)} CDF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Frais opérateur</span>
                      <span className="font-medium text-amber-600">{formatCurrency(stats.refunds?.total_fees || 0)} CDF</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Lists */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Top Merchants */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <TrophyIcon className="w-5 h-5 text-amber-500" />
                    Top 10 Commerçants
                  </h3>
                  <div className="space-y-3">
                    {(stats.top_merchants || []).slice(0, 10).map((m: any, idx: number) => (
                      <div key={m.invoice__merchant__id} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-amber-100 text-amber-700' :
                          idx === 1 ? 'bg-gray-100 text-gray-700' :
                          idx === 2 ? 'bg-orange-100 text-orange-700' :
                          'bg-gray-50 text-gray-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{m.invoice__merchant__name}</p>
                          <p className="text-xs text-gray-500">{m.forms_count} bordereaux</p>
                        </div>
                        <span className="text-sm font-medium text-green-600">
                          {formatCurrency(m.total_refund || 0)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Points of Exit */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPinIcon className="w-5 h-5 text-blue-500" />
                    Top Points de Sortie
                  </h3>
                  <div className="space-y-3">
                    {(stats.top_points_of_exit || []).slice(0, 10).map((p: any, idx: number) => (
                      <div key={p.point_of_exit__id} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-50 text-gray-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{p.point_of_exit__name}</p>
                          <p className="text-xs text-gray-500">{p.point_of_exit__code}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{p.validations_count}</p>
                          <p className="text-xs text-green-600">{p.validated} ✓</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Agents */}
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                    <UserGroupIcon className="w-5 h-5 text-purple-500" />
                    Top Agents Douaniers
                  </h3>
                  <div className="space-y-3">
                    {(stats.top_agents || []).slice(0, 10).map((a: any, idx: number) => (
                      <div key={a.agent__id} className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          idx === 0 ? 'bg-purple-100 text-purple-700' : 'bg-gray-50 text-gray-500'
                        }`}>
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {a.agent__first_name} {a.agent__last_name}
                          </p>
                          <p className="text-xs text-gray-500">{a.agent__email}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{a.validations_count}</p>
                          <p className="text-xs">
                            <span className="text-green-600">{a.validated}✓</span>
                            {' / '}
                            <span className="text-red-600">{a.refused}✗</span>
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Merchants Tab */}
          {activeTab === 'merchants' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <BuildingStorefrontIcon className="w-8 h-8 text-indigo-500 mb-3" />
                  <p className="text-3xl font-bold">{stats.merchants?.total || 0}</p>
                  <p className="text-sm text-gray-500">Commerçants total</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <CheckBadgeIcon className="w-8 h-8 text-green-500 mb-3" />
                  <p className="text-3xl font-bold text-green-600">{stats.merchants?.by_status?.APPROVED || 0}</p>
                  <p className="text-sm text-gray-500">Approuvés</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <MapPinIcon className="w-8 h-8 text-blue-500 mb-3" />
                  <p className="text-3xl font-bold">{stats.merchants?.total_outlets || 0}</p>
                  <p className="text-sm text-gray-500">Points de vente</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <ArrowTrendingUpIcon className="w-8 h-8 text-emerald-500 mb-3" />
                  <p className="text-3xl font-bold text-emerald-600">{stats.merchants?.active_outlets || 0}</p>
                  <p className="text-sm text-gray-500">Points actifs</p>
                </div>
              </div>

              {/* Top Merchants Detail */}
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="font-semibold text-gray-900">Performance des commerçants</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">#</th>
                        <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Commerçant</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Bordereaux</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">TVA</th>
                        <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Remboursements</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {(stats.top_merchants || []).map((m: any, idx: number) => (
                        <tr key={m.invoice__merchant__id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 text-sm font-medium text-gray-500">{idx + 1}</td>
                          <td className="px-6 py-4 text-sm font-medium text-gray-900">{m.invoice__merchant__name}</td>
                          <td className="px-6 py-4 text-sm text-right">{m.forms_count}</td>
                          <td className="px-6 py-4 text-sm text-right font-medium">{formatCurrency(m.total_vat || 0)} CDF</td>
                          <td className="px-6 py-4 text-sm text-right font-medium text-green-600">{formatCurrency(m.total_refund || 0)} CDF</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Customs Tab */}
          {activeTab === 'customs' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <CheckBadgeIcon className="w-8 h-8 text-amber-500 mb-3" />
                  <p className="text-3xl font-bold">{stats.validations?.total || 0}</p>
                  <p className="text-sm text-gray-500">Validations totales</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="text-3xl font-bold text-green-600">{stats.validations?.validation_rate || 0}%</div>
                  <p className="text-sm text-gray-500 mt-2">Taux d'approbation</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <ExclamationTriangleIcon className="w-8 h-8 text-orange-500 mb-3" />
                  <p className="text-3xl font-bold">{stats.validations?.physical_control_count || 0}</p>
                  <p className="text-sm text-gray-500">Contrôles physiques</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-3xl font-bold">{stats.validations?.offline_count || 0}</p>
                  <p className="text-sm text-gray-500 mt-2">Validations hors-ligne</p>
                </div>
              </div>

              {/* Refusal Reasons */}
              {Object.keys(stats.validations?.by_refusal_reason || {}).length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Motifs de refus</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {Object.entries(stats.validations?.by_refusal_reason || {}).map(([reason, count]) => (
                      <div key={reason} className="bg-red-50 rounded-lg p-4">
                        <p className="text-2xl font-bold text-red-600">{count as number}</p>
                        <p className="text-sm text-red-700 mt-1">{reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top Agents & Points */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Performance des agents</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Agent</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Validés</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Refusés</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(stats.top_agents || []).map((a: any) => (
                          <tr key={a.agent__id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium">{a.agent__first_name} {a.agent__last_name}</p>
                              <p className="text-xs text-gray-500">{a.agent__email}</p>
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-medium">{a.validations_count}</td>
                            <td className="px-4 py-3 text-right text-sm text-green-600">{a.validated}</td>
                            <td className="px-4 py-3 text-right text-sm text-red-600">{a.refused}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="p-6 border-b border-gray-200">
                    <h3 className="font-semibold text-gray-900">Points de sortie</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600">Point</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Total</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Validés</th>
                          <th className="px-4 py-3 text-right text-xs font-semibold text-gray-600">Refusés</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {(stats.top_points_of_exit || []).map((p: any) => (
                          <tr key={p.point_of_exit__id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <p className="text-sm font-medium">{p.point_of_exit__name}</p>
                              <p className="text-xs text-gray-500">{p.point_of_exit__code}</p>
                            </td>
                            <td className="px-4 py-3 text-right text-sm font-medium">{p.validations_count}</td>
                            <td className="px-4 py-3 text-right text-sm text-green-600">{p.validated}</td>
                            <td className="px-4 py-3 text-right text-sm text-red-600">{p.refused}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Financial Tab */}
          {activeTab === 'financial' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-5 text-white">
                  <p className="text-sm opacity-80">Montant éligible</p>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(stats.forms?.total_eligible || 0)}</p>
                  <p className="text-sm opacity-80">CDF</p>
                </div>
                <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-xl p-5 text-white">
                  <p className="text-sm opacity-80">TVA collectée</p>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(stats.forms?.total_vat || 0)}</p>
                  <p className="text-sm opacity-80">CDF</p>
                </div>
                <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-xl p-5 text-white">
                  <p className="text-sm opacity-80">Remboursé (net)</p>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(stats.refunds?.total_net || 0)}</p>
                  <p className="text-sm opacity-80">CDF</p>
                </div>
                <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-5 text-white">
                  <p className="text-sm opacity-80">Frais opérateur</p>
                  <p className="text-2xl font-bold mt-2">{formatCurrency(stats.refunds?.total_fees || 0)}</p>
                  <p className="text-sm opacity-80">CDF</p>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-6">Récapitulatif financier</h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Montant total éligible</span>
                    <span className="font-semibold">{formatCurrency(stats.forms?.total_eligible || 0)} CDF</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">TVA totale à rembourser</span>
                    <span className="font-semibold">{formatCurrency(stats.forms?.total_vat || 0)} CDF</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Montant brut remboursé</span>
                    <span className="font-semibold">{formatCurrency(stats.refunds?.total_gross || 0)} CDF</span>
                  </div>
                  <div className="flex justify-between items-center py-3 border-b border-gray-100">
                    <span className="text-gray-600">Frais de service perçus</span>
                    <span className="font-semibold text-amber-600">- {formatCurrency(stats.refunds?.total_fees || 0)} CDF</span>
                  </div>
                  <div className="flex justify-between items-center py-3 bg-green-50 -mx-6 px-6 rounded-lg">
                    <span className="font-semibold text-green-800">Montant net versé aux voyageurs</span>
                    <span className="font-bold text-green-600 text-xl">{formatCurrency(stats.refunds?.total_net || 0)} CDF</span>
                  </div>
                </div>
              </div>

              {/* Average */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                  <p className="text-sm text-gray-500 mb-2">Montant moyen par bordereau</p>
                  <p className="text-3xl font-bold text-gray-900">{formatCurrency(stats.forms?.avg_amount || 0)}</p>
                  <p className="text-sm text-gray-500">CDF</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                  <p className="text-sm text-gray-500 mb-2">Bordereaux à haut risque</p>
                  <p className="text-3xl font-bold text-orange-600">{stats.forms?.high_risk_count || 0}</p>
                  <p className="text-sm text-gray-500">nécessitant contrôle</p>
                </div>
                <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
                  <p className="text-sm text-gray-500 mb-2">Taux de conversion</p>
                  <p className="text-3xl font-bold text-green-600">
                    {stats.forms?.total ? Math.round((stats.refunds?.by_status?.PAID || 0) / stats.forms.total * 100) : 0}%
                  </p>
                  <p className="text-sm text-gray-500">bordereaux remboursés</p>
                </div>
              </div>
            </div>
          )}

          {/* Export Section */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ArrowDownTrayIcon className="w-5 h-5 text-gray-500" />
              Exporter les données
            </h3>
            <div className="flex flex-wrap gap-3">
              <button 
                onClick={() => handleExport('forms')} 
                disabled={!canExportForms}
                title={!canExportForms ? 'Vous n\'avez pas la permission d\'exporter les bordereaux' : ''}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  canExportForms 
                    ? 'bg-blue-50 text-blue-700 hover:bg-blue-100' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <DocumentTextIcon className="w-5 h-5" />
                Bordereaux (CSV)
              </button>
              <button 
                onClick={() => handleExport('refunds')} 
                disabled={!canExportRefunds}
                title={!canExportRefunds ? 'Vous n\'avez pas la permission d\'exporter les remboursements' : ''}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  canExportRefunds 
                    ? 'bg-green-50 text-green-700 hover:bg-green-100' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <BanknotesIcon className="w-5 h-5" />
                Remboursements (CSV)
              </button>
              <button 
                onClick={() => handleExport('validations')} 
                disabled={!canExportForms}
                title={!canExportForms ? 'Vous n\'avez pas la permission d\'exporter les validations' : ''}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  canExportForms 
                    ? 'bg-amber-50 text-amber-700 hover:bg-amber-100' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                <CheckBadgeIcon className="w-5 h-5" />
                Validations (CSV)
              </button>
              <button 
                onClick={() => setShowExportModal(true)} 
                disabled={!canExportReports}
                title={!canExportReports ? 'Vous n\'avez pas la permission d\'exporter les rapports' : ''}
                className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  canExportReports 
                    ? 'bg-indigo-600 text-white hover:bg-indigo-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                <DocumentTextIcon className="w-5 h-5" />
                Rapport Fiscal (Excel)
              </button>
            </div>
          </div>
        </>
      ) : null}

      {/* Modal Export Rapport Fiscal */}
      {showExportModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="bg-gradient-to-r from-indigo-600 to-blue-600 px-6 py-4 rounded-t-2xl">
              <h3 className="text-lg font-semibold text-white">Rapport Fiscal - Export Excel</h3>
              <p className="text-indigo-100 text-sm">Pour les services fiscaux de la RDC</p>
            </div>
            
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Ce rapport contient toutes les informations nécessaires pour justifier les remboursements TVA auprès des services fiscaux.
              </p>
              
              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <h4 className="font-medium text-gray-900 text-sm">Sélectionner la période</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date de début</label>
                    <input
                      type="date"
                      value={exportDateFrom}
                      onChange={(e) => setExportDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Date de fin</label>
                    <input
                      type="date"
                      value={exportDateTo}
                      onChange={(e) => setExportDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
                <p className="text-xs text-gray-400">Laissez vide pour exporter toutes les données</p>
              </div>
              
              <div className="bg-blue-50 rounded-lg p-3 text-sm text-blue-700">
                <p className="font-medium mb-1">Le rapport contiendra :</p>
                <ul className="text-xs space-y-1 text-blue-600">
                  <li>• Vue globale des remboursements avec totaux</li>
                  <li>• Détail des bordereaux (commerçants, TVA, frais)</li>
                  <li>• Liste des produits vendus</li>
                  <li>• Récapitulatif fiscal par devise</li>
                  <li>• Attestation légale</li>
                </ul>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 rounded-b-2xl flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowExportModal(false);
                  setExportDateFrom('');
                  setExportDateTo('');
                }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Annuler
              </button>
              <button
                onClick={async () => {
                  try {
                    const params: Record<string, string> = {};
                    if (exportDateFrom) params.date_from = exportDateFrom;
                    if (exportDateTo) params.date_to = exportDateTo;
                    
                    const response = await reportsApi.exportRefundsExcel(params);
                    
                    const blob = new Blob([response.data], { 
                      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
                    });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `rapport_fiscal_${new Date().toISOString().split('T')[0]}.xlsx`;
                    a.click();
                    window.URL.revokeObjectURL(url);
                    
                    setShowExportModal(false);
                    setExportDateFrom('');
                    setExportDateTo('');
                  } catch (error) {
                    console.error('Export error:', error);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
              >
                <ArrowDownTrayIcon className="w-4 h-4" />
                Télécharger le rapport
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </FadeIn>
  );
}
