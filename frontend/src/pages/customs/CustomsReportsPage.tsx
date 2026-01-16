import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import toast from 'react-hot-toast';
import FadeIn from '../../components/ui/FadeIn';
import {
  ChartBarIcon,
  ClipboardDocumentCheckIcon,
  BanknotesIcon,
  ArrowDownTrayIcon,
  CalendarIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface ReportInfo {
  id: string;
  name: string;
  description: string;
  icon: string;
  export_url: string;
}

interface DashboardStats {
  point_of_exit: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
  validations: {
    total: number;
    validated: number;
    refused: number;
    validation_rate: number;
  };
  amounts: {
    total_vat_validated: number;
    total_refund_amount: number;
    total_refunded: number;
    currency: string;
  };
  refunds: {
    total: number;
    paid: number;
    pending: number;
  };
  performance: {
    avg_processing_time_minutes: number | null;
  };
}

interface DailyStat {
  date: string;
  total: number;
  validated: number;
  refused: number;
  refunded: number;
  total_amount: number;
  refunded_amount: number;
}


const getReportIcon = (iconName: string) => {
  switch (iconName) {
    case 'chart-bar':
      return <ChartBarIcon className="w-6 h-6" />;
    case 'clipboard-check':
      return <ClipboardDocumentCheckIcon className="w-6 h-6" />;
    case 'banknotes':
      return <BanknotesIcon className="w-6 h-6" />;
    default:
      return <ChartBarIcon className="w-6 h-6" />;
  }
};

export default function CustomsReportsPage() {
  const [dateFrom, setDateFrom] = useState<string>('');
  const [dateTo, setDateTo] = useState<string>('');
  const [isExporting, setIsExporting] = useState<string | null>(null);

  // Fetch available reports
  const { data: reportsData, isLoading: loadingReports } = useQuery({
    queryKey: ['customs-reports'],
    queryFn: () => api.get('/customs/reports/'),
  });

  // Fetch dashboard stats
  const { data: dashboardData, isLoading: loadingDashboard, refetch: refetchDashboard } = useQuery({
    queryKey: ['customs-reports-dashboard', dateFrom, dateTo],
    queryFn: () => api.get('/customs/reports/dashboard/', {
      params: {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }
    }),
  });

  // Fetch daily stats
  const { data: dailyData } = useQuery({
    queryKey: ['customs-reports-daily', dateFrom, dateTo],
    queryFn: () => api.get('/customs/reports/daily/', {
      params: {
        date_from: dateFrom || undefined,
        date_to: dateTo || undefined,
      }
    }),
  });


  const reports: ReportInfo[] = reportsData?.data?.reports || [];
  const stats: DashboardStats | null = dashboardData?.data || null;
  const dailyStats: DailyStat[] = dailyData?.data?.results || [];
  const pointOfExit = reportsData?.data?.point_of_exit;

  const handleExport = async (exportUrl: string, reportId: string) => {
    setIsExporting(reportId);
    try {
      const response = await api.get(exportUrl, {
        params: {
          date_from: dateFrom || undefined,
          date_to: dateTo || undefined,
        },
        responseType: 'blob',
      });

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from Content-Disposition header or use default
      const contentDisposition = response.headers['content-disposition'];
      let filename = `rapport_${reportId}_${new Date().toISOString().slice(0, 10)}.xlsx`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="(.+)"/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }
      
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Rapport téléchargé avec succès');
    } catch (error) {
      toast.error('Erreur lors du téléchargement');
    } finally {
      setIsExporting(null);
    }
  };

  const handleRefresh = () => {
    refetchDashboard();
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('fr-FR').format(amount);
  };

  if (loadingReports || loadingDashboard) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <FadeIn duration={400}>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes Rapports</h1>
          {pointOfExit && (
            <p className="text-gray-500 flex items-center gap-2 mt-1">
              <BuildingOfficeIcon className="w-4 h-4" />
              {pointOfExit.name} ({pointOfExit.code})
            </p>
          )}
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowPathIcon className="w-5 h-5" />
          Actualiser
        </button>
      </div>

      {/* Date Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Période :</span>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
            <span className="text-gray-500">à</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
          {(dateFrom || dateTo) && (
            <button
              onClick={() => { setDateFrom(''); setDateTo(''); }}
              className="text-sm text-primary-600 hover:text-primary-700"
            >
              Réinitialiser
            </button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Validations</p>
                <p className="text-2xl font-bold text-gray-900">{stats.validations.total}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <ClipboardDocumentCheckIcon className="w-6 h-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="flex items-center gap-1 text-green-600">
                <CheckCircleIcon className="w-4 h-4" />
                {stats.validations.validated} validés
              </span>
              <span className="flex items-center gap-1 text-red-600">
                <XCircleIcon className="w-4 h-4" />
                {stats.validations.refused} refusés
              </span>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Taux de Validation</p>
                <p className="text-2xl font-bold text-green-600">{stats.validations.validation_rate}%</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircleIcon className="w-6 h-6 text-green-600" />
              </div>
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-green-500 h-2 rounded-full" 
                  style={{ width: `${stats.validations.validation_rate}%` }}
                ></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">TVA Validée</p>
                <p className="text-2xl font-bold text-gray-900">{formatAmount(stats.amounts.total_vat_validated)}</p>
                <p className="text-xs text-gray-400">{stats.amounts.currency}</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
                <BanknotesIcon className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Remboursements</p>
                <p className="text-2xl font-bold text-gray-900">{stats.refunds.paid}</p>
                <p className="text-xs text-gray-400">sur {stats.refunds.total} total</p>
              </div>
              <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center">
                <ClockIcon className="w-6 h-6 text-amber-600" />
              </div>
            </div>
            <div className="mt-2 text-sm text-amber-600">
              {stats.refunds.pending} en attente
            </div>
          </div>
        </div>
      )}

      {/* Available Reports */}
      <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
            <ArrowDownTrayIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Rapports Disponibles</h2>
            <p className="text-sm text-gray-500">Téléchargez vos rapports personnalisés</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {reports.map((report, index) => {
            const colors = [
              { bg: 'from-blue-500 to-indigo-600', light: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-600' },
              { bg: 'from-emerald-500 to-teal-600', light: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-600' },
              { bg: 'from-purple-500 to-indigo-600', light: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-600' },
            ];
            const color = colors[index % colors.length];
            
            return (
              <div
                key={report.id}
                className={`${color.light} ${color.border} border-2 rounded-2xl p-6 hover:shadow-lg transition-all group`}
              >
                <div className={`w-14 h-14 bg-gradient-to-br ${color.bg} rounded-2xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform`}>
                  {getReportIcon(report.icon)}
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-2">{report.name}</h3>
                <p className="text-sm text-gray-600 mb-6 min-h-[48px]">{report.description}</p>
                <button
                  onClick={() => handleExport(report.export_url, report.id)}
                  disabled={isExporting === report.id}
                  className={`w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 ${color.border} ${color.text} rounded-xl font-semibold hover:bg-gray-50 transition-colors disabled:opacity-50`}
                >
                  {isExporting === report.id ? (
                    <>
                      <ArrowPathIcon className="w-5 h-5 animate-spin" />
                      Génération...
                    </>
                  ) : (
                    <>
                      <ArrowDownTrayIcon className="w-5 h-5" />
                      Télécharger Excel
                    </>
                  )}
                </button>
              </div>
            );
          })}
        </div>
      </div>

      {/* Daily Stats Table */}
      {dailyStats.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Statistiques Journalières</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">Date</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Total</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Validés</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Refusés</th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">Remboursés</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Montant Validé</th>
                  <th className="text-right py-3 px-4 text-sm font-medium text-gray-500">Montant Remboursé</th>
                </tr>
              </thead>
              <tbody>
                {dailyStats.slice(-10).reverse().map((day) => (
                  <tr key={day.date} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm text-gray-900">
                      {new Date(day.date).toLocaleDateString('fr-FR', { 
                        weekday: 'short', 
                        day: 'numeric', 
                        month: 'short' 
                      })}
                    </td>
                    <td className="py-3 px-4 text-sm text-center font-medium text-gray-900">{day.total}</td>
                    <td className="py-3 px-4 text-sm text-center text-green-600">{day.validated}</td>
                    <td className="py-3 px-4 text-sm text-center text-red-600">{day.refused}</td>
                    <td className="py-3 px-4 text-sm text-center text-blue-600">{day.refunded || 0}</td>
                    <td className="py-3 px-4 text-sm text-right text-gray-900">{formatAmount(day.total_amount)}</td>
                    <td className="py-3 px-4 text-sm text-right text-blue-600">{formatAmount(day.refunded_amount || 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      </div>
    </FadeIn>
  );
}
