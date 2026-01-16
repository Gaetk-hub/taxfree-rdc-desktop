import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { auditApi } from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import {
  ClipboardDocumentListIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  XMarkIcon,
  UserIcon,
  ComputerDesktopIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  EyeIcon,
  ChartBarIcon,
} from '@heroicons/react/24/outline';

// Action category colors
const ACTION_CATEGORY_COLORS: Record<string, string> = {
  AUTHENTICATION: 'bg-purple-100 text-purple-700 border-purple-200',
  USER_MANAGEMENT: 'bg-blue-100 text-blue-700 border-blue-200',
  MERCHANT: 'bg-indigo-100 text-indigo-700 border-indigo-200',
  TAXFREE_FORMS: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  CUSTOMS: 'bg-amber-100 text-amber-700 border-amber-200',
  REFUNDS: 'bg-green-100 text-green-700 border-green-200',
  ADMIN: 'bg-red-100 text-red-700 border-red-200',
  INVOICES: 'bg-cyan-100 text-cyan-700 border-cyan-200',
};

// Critical actions that need highlighting
const CRITICAL_ACTIONS = ['STATUS_OVERRIDE', 'USER_DEACTIVATED', 'CUSTOMS_REFUSED', 'REFUND_CANCELLED', 'MERCHANT_REJECTED'];

interface AuditLog {
  id: string;
  actor_id: string | null;
  actor_email: string;
  actor_role: string;
  role_display: string;
  actor_ip: string | null;
  action: string;
  action_display: string;
  entity: string;
  entity_display: string;
  entity_id: string;
  timestamp: string;
  metadata?: Record<string, any>;
  actor_last_login?: string | null;
  actor_last_logout?: string | null;
}

interface Filters {
  search: string;
  action: string;
  entity: string;
  role: string;
  category: string;
  period: string;
  start_date: string;
  end_date: string;
}

export default function AuditLogPage() {
  const [page, setPage] = useState(1);
  const [pageSize] = useState(25);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [filters, setFilters] = useState<Filters>({
    search: '',
    action: '',
    entity: '',
    role: '',
    category: '',
    period: '',
    start_date: '',
    end_date: '',
  });

  // Build query params
  const queryParams = useMemo(() => {
    const params: Record<string, any> = { page, page_size: pageSize };
    if (filters.search) params.search = filters.search;
    if (filters.action) params.action = filters.action;
    if (filters.entity) params.entity = filters.entity;
    if (filters.role) params.role = filters.role;
    if (filters.category) params.category = filters.category;
    if (filters.period) params.period = filters.period;
    if (filters.start_date) params.start_date = filters.start_date;
    if (filters.end_date) params.end_date = filters.end_date;
    return params;
  }, [page, pageSize, filters]);

  // Fetch logs
  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', queryParams],
    queryFn: () => auditApi.listLogs(queryParams),
  });

  // Fetch filter options
  const { data: filterOptions } = useQuery({
    queryKey: ['audit-filters'],
    queryFn: () => auditApi.getFilters(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['audit-stats'],
    queryFn: () => auditApi.getStats({ days: 30 }),
    staleTime: 60 * 1000,
  });

  const logs: AuditLog[] = data?.data?.results || [];
  const totalCount = data?.data?.count || 0;
  const totalPages = Math.ceil(totalCount / pageSize);
  const stats = statsData?.data;
  const options = filterOptions?.data;

  const activeFiltersCount = Object.values(filters).filter(v => v !== '').length;

  const clearFilters = () => {
    setFilters({
      search: '',
      action: '',
      entity: '',
      role: '',
      category: '',
      period: '',
      start_date: '',
      end_date: '',
    });
    setPage(1);
  };

  const handleExport = async () => {
    try {
      const response = await auditApi.export(queryParams);
      const blob = new Blob([response.data], { 
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
      });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      a.click();
    } catch (error) {
      console.error('Export error:', error);
    }
  };

  const getActionCategory = (action: string): string => {
    if (!options?.action_categories) return 'Autre';
    for (const [cat, actions] of Object.entries(options.action_categories)) {
      if ((actions as string[]).includes(action)) return cat;
    }
    return 'Autre';
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardDocumentListIcon className="w-7 h-7 text-primary-600" />
            Journal d'Audit
          </h1>
          <p className="text-gray-500 mt-1">Traçabilité complète de toutes les actions du système</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-4 py-2 rounded-lg border font-medium flex items-center gap-2 transition-colors ${
              showFilters || activeFiltersCount > 0
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <FunnelIcon className="w-5 h-5" />
            Filtres
            {activeFiltersCount > 0 && (
              <span className="bg-primary-600 text-white text-xs px-2 py-0.5 rounded-full">
                {activeFiltersCount}
              </span>
            )}
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 transition-colors flex items-center gap-2"
          >
            <ArrowDownTrayIcon className="w-5 h-5" />
            Exporter Excel
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                <p className="text-sm text-gray-500">Actions (30j)</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-100 rounded-lg">
                <DocumentTextIcon className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.by_entity?.TaxFreeForm || 0}</p>
                <p className="text-sm text-gray-500">Bordereaux</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-amber-100 rounded-lg">
                <UserIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.top_actors?.length || 0}</p>
                <p className="text-sm text-gray-500">Utilisateurs actifs</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg">
                <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{stats.recent_critical?.length || 0}</p>
                <p className="text-sm text-gray-500">Actions critiques</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Filtres avancés</h3>
            {activeFiltersCount > 0 && (
              <button
                onClick={clearFilters}
                className="text-sm text-red-600 hover:text-red-700 flex items-center gap-1"
              >
                <XMarkIcon className="w-4 h-4" />
                Effacer tout
              </button>
            )}
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recherche</label>
              <div className="relative">
                <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => { setFilters(f => ({ ...f, search: e.target.value })); setPage(1); }}
                  placeholder="Email, ID, action..."
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Catégorie</label>
              <select
                value={filters.category}
                onChange={(e) => { setFilters(f => ({ ...f, category: e.target.value, action: '' })); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Toutes les catégories</option>
                {options?.action_categories && Object.keys(options.action_categories).map((cat) => (
                  <option key={cat} value={cat}>{cat.replace('_', ' ')}</option>
                ))}
              </select>
            </div>

            {/* Action */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
              <select
                value={filters.action}
                onChange={(e) => { setFilters(f => ({ ...f, action: e.target.value })); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Toutes les actions</option>
                {options?.actions?.map((action: string) => (
                  <option key={action} value={action}>{action}</option>
                ))}
              </select>
            </div>

            {/* Entity */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Entité</label>
              <select
                value={filters.entity}
                onChange={(e) => { setFilters(f => ({ ...f, entity: e.target.value })); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Toutes les entités</option>
                {options?.entities?.map((entity: string) => (
                  <option key={entity} value={entity}>
                    {options?.entity_display?.[entity] || entity}
                  </option>
                ))}
              </select>
            </div>

            {/* Role */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Rôle</label>
              <select
                value={filters.role}
                onChange={(e) => { setFilters(f => ({ ...f, role: e.target.value })); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Tous les rôles</option>
                {options?.roles?.map((role: string) => (
                  <option key={role} value={role}>
                    {options?.role_display?.[role] || role}
                  </option>
                ))}
              </select>
            </div>

            {/* Period */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Période rapide</label>
              <select
                value={filters.period}
                onChange={(e) => { setFilters(f => ({ ...f, period: e.target.value, start_date: '', end_date: '' })); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">Toute la période</option>
                <option value="today">Aujourd'hui</option>
                <option value="yesterday">Hier</option>
                <option value="week">7 derniers jours</option>
                <option value="month">30 derniers jours</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date début</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => { setFilters(f => ({ ...f, start_date: e.target.value, period: '' })); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date fin</label>
              <input
                type="date"
                value={filters.end_date}
                onChange={(e) => { setFilters(f => ({ ...f, end_date: e.target.value, period: '' })); setPage(1); }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-600">
          <span className="font-medium">{totalCount}</span> événements trouvés
        </p>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardDocumentListIcon className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Aucun événement trouvé</p>
            <p className="text-sm text-gray-400 mt-1">Modifiez vos filtres pour voir plus de résultats</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date/Heure</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Action</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Entité</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Utilisateur</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Rôle</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">IP</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {logs.map((log) => {
                    const category = getActionCategory(log.action);
                    const isCritical = CRITICAL_ACTIONS.includes(log.action);
                    const categoryColor = ACTION_CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-700 border-gray-200';
                    
                    return (
                      <tr 
                        key={log.id} 
                        className={`hover:bg-gray-50 transition-colors ${isCritical ? 'bg-red-50/50' : ''}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <ClockIcon className="w-4 h-4 text-gray-400" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {new Date(log.timestamp).toLocaleDateString('fr-FR')}
                              </p>
                              <p className="text-xs text-gray-500">
                                {new Date(log.timestamp).toLocaleTimeString('fr-FR')}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${categoryColor}`}>
                              {isCritical && <ExclamationTriangleIcon className="w-3 h-3" />}
                              {log.action_display || log.action}
                            </span>
                            <p className="text-xs text-gray-400 font-mono">{log.action}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{log.entity_display}</p>
                          <p className="text-xs text-gray-500 font-mono truncate max-w-[150px]" title={log.entity_id}>
                            {log.entity_id.slice(0, 12)}...
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                              <UserIcon className="w-4 h-4 text-gray-500" />
                            </div>
                            <div>
                              <p className="text-sm font-medium text-gray-900">
                                {log.actor_email || 'Système'}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                            {log.role_display}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 text-sm text-gray-500">
                            <ComputerDesktopIcon className="w-4 h-4" />
                            {log.actor_ip || '-'}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <button
                            onClick={() => setSelectedLog(log)}
                            className="p-2 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                            title="Voir les détails"
                          >
                            <EyeIcon className="w-5 h-5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
                <p className="text-sm text-gray-600">
                  Page {page} sur {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage(1)}
                    disabled={page === 1}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Début
                  </button>
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                    className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronLeftIcon className="w-5 h-5" />
                  </button>
                  <span className="px-4 py-1.5 bg-white border border-gray-300 rounded-lg text-sm font-medium">
                    {page}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                    className="p-1.5 border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <ChevronRightIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setPage(totalPages)}
                    disabled={page === totalPages}
                    className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Fin
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Detail Modal */}
      {selectedLog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Détails de l'événement</h3>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Date/Heure</p>
                    <p className="font-medium">{new Date(selectedLog.timestamp).toLocaleString('fr-FR')}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Action</p>
                    <p className="font-medium">{selectedLog.action_display}</p>
                    <p className="text-xs text-gray-400 font-mono">{selectedLog.action}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Entité</p>
                    <p className="font-medium">{selectedLog.entity_display}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ID Entité</p>
                    <p className="font-mono text-sm break-all">{selectedLog.entity_id}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Utilisateur</p>
                    <p className="font-medium">{selectedLog.actor_email || 'Système'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Rôle</p>
                    <p className="font-medium">{selectedLog.role_display}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Adresse IP</p>
                    <p className="font-mono">{selectedLog.actor_ip || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">ID Utilisateur</p>
                    <p className="font-mono text-sm">{selectedLog.actor_id || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Dernière connexion</p>
                    <p className="font-medium">
                      {selectedLog.actor_last_login 
                        ? new Date(selectedLog.actor_last_login).toLocaleString('fr-FR')
                        : 'Jamais connecté'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Dernière déconnexion</p>
                    <p className="font-medium">
                      {selectedLog.actor_last_logout 
                        ? new Date(selectedLog.actor_last_logout).toLocaleString('fr-FR')
                        : 'Aucune'}
                    </p>
                  </div>
                </div>
                
                {selectedLog.metadata && Object.keys(selectedLog.metadata).length > 0 && (
                  <div className="mt-6">
                    <p className="text-sm text-gray-500 mb-2">Métadonnées</p>
                    <pre className="bg-gray-50 rounded-lg p-4 text-sm overflow-x-auto">
                      {JSON.stringify(selectedLog.metadata, null, 2)}
                    </pre>
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
