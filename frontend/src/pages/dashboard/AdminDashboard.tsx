import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { reportsApi } from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import {
  ArrowUpIcon,
  DocumentTextIcon,
  BanknotesIcon,
  CheckBadgeIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Doughnut } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

// Format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('fr-FR').format(Math.round(amount));
};

// Format compact number
const formatCompact = (amount: number) => {
  if (amount >= 1000000) return `${(amount / 1000000).toFixed(1)}M`;
  if (amount >= 1000) return `${(amount / 1000).toFixed(0)}k`;
  return amount.toString();
};

// Colors for items
const COLORS = ['bg-blue-500', 'bg-emerald-500', 'bg-amber-500', 'bg-purple-500', 'bg-rose-500'];

interface TopMerchant {
  invoice__merchant__id: string;
  invoice__merchant__name: string;
  forms_count: number;
  total_vat: number;
  total_refund: number;
}

interface TopPoint {
  point_of_exit__id: string;
  point_of_exit__name: string;
  point_of_exit__code: string;
  validations_count: number;
  validated: number;
  refused: number;
}

interface DailyTrend {
  date: string;
  count: number;
  vat_amount?: number;
  refund_amount?: number;
}

export default function AdminDashboard() {
  const [days, setDays] = useState(30);

  // Fetch real data from API with auto-refresh every 30 seconds
  const { data: reportData, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard-stats', days],
    queryFn: async () => {
      const response = await reportsApi.getSummary({ days });
      return response.data;
    },
    refetchInterval: 30000, // Rafraîchir toutes les 30 secondes
    refetchIntervalInBackground: true, // Continuer même si l'onglet n'est pas actif
    staleTime: 10000, // Considérer les données comme fraîches pendant 10 secondes
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
      </div>
    );
  }

  if (error || !reportData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Erreur lors du chargement des données</p>
        </div>
      </div>
    );
  }

  const { forms, refunds, validations, merchants, users, top_merchants, top_points_of_exit, trends } = reportData;

  // Calculate status counts
  const statusData = forms?.by_status || {};
  const validatedCount = statusData['VALIDATED'] || 0;
  const pendingCount = (statusData['VALIDATION_PENDING'] || 0) + (statusData['REFUND_PENDING'] || 0) + (statusData['ISSUED'] || 0);
  const refusedCount = statusData['REFUSED'] || 0;
  const refundedCount = statusData['REFUNDED'] || 0;
  const totalFormsCount = forms?.total || 0;

  // Validation rate
  const validationRate = validations?.validation_rate || 0;

  // Doughnut chart data for status distribution
  const statusDistributionData = {
    labels: ['Validés', 'En attente', 'Refusés', 'Remboursés'],
    datasets: [
      {
        data: [validatedCount, pendingCount, refusedCount, refundedCount],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6'],
        borderWidth: 0,
        cutout: '70%',
      },
    ],
  };

  // Line chart for trends (last 14 days) - fill missing days with 0
  const dailyForms: DailyTrend[] = trends?.daily_forms || [];
  
  // Generate all dates for the last 14 days
  const generateLast14Days = () => {
    const dates: { date: string; label: string }[] = [];
    const today = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().split('T')[0]; // YYYY-MM-DD format
      dates.push({
        date: dateStr,
        label: `${d.getDate()}/${d.getMonth() + 1}`,
      });
    }
    return dates;
  };
  
  const last14Days = generateLast14Days();
  
  // Create a map of existing data by date
  const dataByDate = new Map<string, number>();
  dailyForms.forEach((d) => {
    const dateStr = typeof d.date === 'string' ? d.date.split('T')[0] : d.date;
    dataByDate.set(dateStr, d.count);
  });
  
  // Fill in all 14 days with data (0 if no data exists)
  const trendLabels = last14Days.map((d) => d.label);
  const trendCounts = last14Days.map((d) => dataByDate.get(d.date) || 0);
  
  const trendData = {
    labels: trendLabels,
    datasets: [
      {
        label: 'Bordereaux',
        data: trendCounts,
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      },
    ],
  };


  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <FadeIn delay={0} duration={400}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tableau de bord</h1>
            <p className="text-gray-500 mt-1">Vue d'ensemble du système Tax Free</p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-primary-500"
            >
              <option value={7}>7 derniers jours</option>
              <option value={30}>30 derniers jours</option>
              <option value={90}>90 derniers jours</option>
              <option value={365}>Cette année</option>
            </select>
          </div>
        </div>
      </FadeIn>

      {/* Main Stats Cards */}
      <FadeIn delay={100} duration={500}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* TVA Collectée */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-blue-100 flex items-center justify-center">
              <BanknotesIcon className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">TVA Collectée</p>
          <p className="text-2xl font-bold text-gray-900">{formatCurrency(forms?.total_vat || 0)} <span className="text-lg text-gray-400">CDF</span></p>
          <p className="text-xs text-gray-400 mt-2">{days} derniers jours</p>
        </div>

        {/* Bordereaux */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center">
              <DocumentTextIcon className="w-6 h-6 text-emerald-600" />
            </div>
            {totalFormsCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">
                <ArrowUpIcon className="w-3 h-3" />
                Actif
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mb-1">Bordereaux émis</p>
          <p className="text-2xl font-bold text-gray-900">{totalFormsCount}</p>
          <p className="text-xs text-gray-400 mt-2">Remboursés: {refundedCount}</p>
        </div>

        {/* Taux de validation */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-amber-100 flex items-center justify-center">
              <CheckBadgeIcon className="w-6 h-6 text-amber-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Taux de validation</p>
          <p className="text-2xl font-bold text-gray-900">{validationRate}%</p>
          <p className="text-xs text-gray-400 mt-2">Validations: {validations?.total || 0}</p>
        </div>

        {/* Commerçants */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 rounded-xl bg-purple-100 flex items-center justify-center">
              <BuildingStorefrontIcon className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-sm text-gray-500 mb-1">Commerçants actifs</p>
          <p className="text-2xl font-bold text-gray-900">{merchants?.total || 0}</p>
          <p className="text-xs text-gray-400 mt-2">Points de vente: {merchants?.total_outlets || 0}</p>
        </div>
        </div>
      </FadeIn>

      {/* Middle Section */}
      <FadeIn delay={200} duration={500}>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Répartition par statut */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Répartition par statut</h3>
          <div className="h-48 flex items-center justify-center">
            <Doughnut 
              data={statusDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                  legend: { 
                    display: true,
                    position: 'bottom',
                    labels: { boxWidth: 12, padding: 15 }
                  } 
                },
              }}
            />
          </div>
        </div>

        {/* Évolution des bordereaux */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des bordereaux</h3>
          <div className="h-48">
            <Line
              data={trendData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { 
                    grid: { display: false },
                    ticks: { font: { size: 11 }, color: '#9ca3af' }
                  },
                  y: { 
                    beginAtZero: true,
                    grid: { color: '#f3f4f6' },
                    ticks: { font: { size: 11 }, color: '#9ca3af' }
                  },
                },
              }}
            />
          </div>
        </div>
        </div>
      </FadeIn>

      {/* Bottom Section */}
      <FadeIn delay={300} duration={500}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Commerçants */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Top Commerçants</h3>
            <Link to="/admin/merchants" className="text-sm text-primary-600 hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="space-y-3">
            {(top_merchants as TopMerchant[] || []).slice(0, 5).map((merchant, index) => (
              <div key={merchant.invoice__merchant__id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-full ${COLORS[index % COLORS.length]} flex items-center justify-center text-white text-sm font-bold`}>
                    {index + 1}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{merchant.invoice__merchant__name || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{merchant.forms_count} bordereaux</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{formatCompact(merchant.total_vat || 0)} CDF</p>
                  <p className="text-xs text-gray-500">TVA</p>
                </div>
              </div>
            ))}
            {(!top_merchants || top_merchants.length === 0) && (
              <p className="text-center text-gray-500 py-4">Aucune donnée disponible</p>
            )}
          </div>
        </div>

        {/* Points de sortie */}
        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Points de sortie</h3>
            <Link to="/admin/borders" className="text-sm text-primary-600 hover:underline">
              Voir tout
            </Link>
          </div>
          <div className="space-y-3">
            {(top_points_of_exit as TopPoint[] || []).slice(0, 5).map((point, index) => (
              <div key={point.point_of_exit__id || index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-gray-200 flex items-center justify-center">
                    <MapPinIcon className="w-4 h-4 text-gray-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{point.point_of_exit__name || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{point.point_of_exit__code}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{point.validations_count} validations</p>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-emerald-600">{point.validated} ✓</span>
                    <span className="text-red-500">{point.refused} ✗</span>
                  </div>
                </div>
              </div>
            ))}
            {(!top_points_of_exit || top_points_of_exit.length === 0) && (
              <p className="text-center text-gray-500 py-4">Aucune donnée disponible</p>
            )}
          </div>
        </div>
        </div>
      </FadeIn>

      {/* Quick Stats */}
      <FadeIn delay={400} duration={500}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl p-4 text-white">
            <p className="text-sm opacity-80">Utilisateurs actifs</p>
            <p className="text-2xl font-bold">{users?.total || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl p-4 text-white">
            <p className="text-sm opacity-80">Agents douaniers</p>
            <p className="text-2xl font-bold">{users?.customs_agents || 0}</p>
          </div>
          <div className="bg-gradient-to-br from-amber-500 to-amber-600 rounded-xl p-4 text-white">
            <p className="text-sm opacity-80">Montant remboursé</p>
            <p className="text-2xl font-bold">{formatCompact(refunds?.total_net || 0)}</p>
          </div>
          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-xl p-4 text-white">
            <p className="text-sm opacity-80">Haut risque</p>
            <p className="text-2xl font-bold">{forms?.high_risk_count || 0}</p>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
