import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { merchantManageApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import FadeIn from '../../components/ui/FadeIn';
import {
  DocumentPlusIcon,
  ClipboardDocumentListIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ArrowUpIcon,
  GlobeAltIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { StarIcon as StarIconSolid } from '@heroicons/react/24/solid';
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
import { Line, Bar, Doughnut } from 'react-chartjs-2';

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

interface NationalityData {
  name: string;
  flag: string;
  count: number;
  percentage: number;
}

export default function MerchantDashboard() {
  const { user } = useAuthStore();
  const [selectedTab, setSelectedTab] = useState<'TVA' | 'Bordereaux' | 'Taux'>('TVA');
  
  // Fetch dashboard data from API
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: async () => {
      const response = await merchantManageApi.dashboard();
      return response.data;
    },
  });

  // Use API data or defaults
  const stats = {
    total: dashboardData?.total_forms || 0,
    validated: dashboardData?.validated || 0,
    pending: dashboardData?.pending || 0,
    refused: dashboardData?.refused || 0,
    refunded: dashboardData?.refunded || 0,
    cancelled: dashboardData?.cancelled || 0,
    totalAmount: dashboardData?.total_refund_amount || 0,
    totalSales: dashboardData?.total_sales_amount || 0,
    bestAmount: dashboardData?.best_form_amount || 0,
    growthPct: dashboardData?.growth_percentage || 0,
  };

  const validationRate = dashboardData?.validation_rate || 0;
  const refundRate = dashboardData?.refund_rate || 0;

  const today = new Date();
  const formattedDate = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  // Chart data - TVA Evolution (from API)
  const monthlyChartData = dashboardData?.monthly_chart || [];
  
  // Get chart data based on selected tab
  const getChartData = () => {
    if (selectedTab === 'TVA') {
      return {
        labels: monthlyChartData.map((d: any) => d.month),
        datasets: [{
          label: 'TVA Collectée',
          data: monthlyChartData.map((d: any) => d.amount),
          backgroundColor: '#10b981',
          borderRadius: 6,
          barThickness: 24,
        }],
      };
    } else if (selectedTab === 'Bordereaux') {
      return {
        labels: monthlyChartData.map((d: any) => d.month),
        datasets: [{
          label: 'Bordereaux',
          data: monthlyChartData.map((d: any) => d.count),
          backgroundColor: '#3b82f6',
          borderRadius: 6,
          barThickness: 24,
        }],
      };
    } else {
      return {
        labels: monthlyChartData.map((d: any) => d.month),
        datasets: [{
          label: 'Taux de validation',
          data: monthlyChartData.map((d: any) => d.validation_rate),
          backgroundColor: '#8b5cf6',
          borderRadius: 6,
          barThickness: 24,
        }],
      };
    }
  };

  const chartData = getChartData();
  
  // Chart title and unit based on tab
  const getChartInfo = () => {
    if (selectedTab === 'TVA') return { title: 'Évolution TVA', unit: 'CDF' };
    if (selectedTab === 'Bordereaux') return { title: 'Bordereaux créés', unit: '' };
    return { title: 'Taux de validation', unit: '%' };
  };
  const chartInfo = getChartInfo();

  // Bordereaux dynamique chart data (from API)
  const dailyChartData = dashboardData?.daily_chart || [];
  const formsDynamicData = {
    labels: dailyChartData.map((d: any) => d.day),
    datasets: [
      {
        label: 'Bordereaux',
        data: dailyChartData.map((d: any) => d.count),
        borderColor: '#10b981',
        backgroundColor: 'rgba(16, 185, 129, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 0,
      },
    ],
  };

  // Répartition par statut
  const statusDistributionData = {
    labels: ['Validés', 'En attente', 'Refusés', 'Remboursés', 'Annulés'],
    datasets: [
      {
        data: [stats.validated, stats.pending, stats.refused, stats.refunded, stats.cancelled],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#6b7280'],
        borderWidth: 0,
        cutout: '70%',
      },
    ],
  };

  // Nationalités des voyageurs (from API)
  const nationalities = dashboardData?.nationalities || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <FadeIn delay={0} duration={400}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Tableau de bord</h1>
        </div>
      </FadeIn>

      {/* Welcome Banner */}
      <FadeIn delay={100} duration={500}>
        <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="merchant-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#merchant-grid)" />
          </svg>
        </div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-sm mb-2">
              <CalendarDaysIcon className="w-4 h-4" />
              <span className="capitalize">{formattedDate}</span>
            </div>
            <h2 className="text-2xl font-bold mb-1">
              {getGreeting()}, {user?.first_name} 👋
            </h2>
            <p className="text-emerald-200 text-sm">
              {user?.merchant_name || 'Votre boutique'} • Commerçant Tax Free
            </p>
          </div>
          <Link 
            to="/merchant/sales/new"
            className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
          >
            <DocumentPlusIcon className="w-5 h-5" />
            <span className="font-medium">Nouvelle vente</span>
          </Link>
        </div>
        </div>
      </FadeIn>

      {/* Main Stats Card */}
      <FadeIn delay={200} duration={500}>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">TVA Collectée</p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-gray-900">{stats.totalAmount.toLocaleString('fr-FR')}</span>
              <span className="text-2xl text-gray-400">CDF</span>
              {stats.growthPct !== 0 && (
                <span className={`flex items-center gap-1 text-sm px-2 py-0.5 rounded-full ${stats.growthPct >= 0 ? 'text-emerald-600 bg-emerald-50' : 'text-red-600 bg-red-50'}`}>
                  <ArrowUpIcon className={`w-3 h-3 ${stats.growthPct < 0 ? 'rotate-180' : ''}`} />
                  {stats.growthPct >= 0 ? '+' : ''}{stats.growthPct}%
                </span>
              )}
            </div>
            <p className="text-sm text-gray-400 mt-1">vs mois précédent</p>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {/* Total bordereaux */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Bordereaux</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-600 flex items-center justify-center text-white font-bold">
                {stats.total}
              </div>
              <span className="text-xs text-gray-500">ce mois</span>
            </div>
          </div>

          {/* Meilleur bordereau */}
          <div className="bg-gray-50 rounded-xl p-4 relative">
            <div className="absolute top-3 right-3">
              <StarIconSolid className="w-4 h-4 text-amber-400" />
            </div>
            <p className="text-xs text-gray-500 mb-2">Meilleur bordereau</p>
            <p className="text-2xl font-bold text-gray-900">{stats.bestAmount.toLocaleString('fr-FR')}</p>
            <p className="text-xs text-gray-600 mt-2">CDF</p>
          </div>

          {/* Validés */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Validés</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                {stats.validated}
              </div>
              <div className="flex items-center text-emerald-600 text-xs">
                <ArrowUpIcon className="w-3 h-3" />
                {validationRate}%
              </div>
            </div>
          </div>

          {/* Remboursés */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Remboursés</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {stats.refunded}
              </div>
              <div className="flex items-center text-purple-600 text-xs">
                {refundRate}%
              </div>
            </div>
          </div>

          {/* Taux validation */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Taux validation</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full border-4 border-emerald-500 flex items-center justify-center">
                <span className="text-xs font-medium">{validationRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar with segments */}
        <div className="flex items-center gap-4 mb-2 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-gray-600">Validés</span>
            <span className="text-xs text-gray-400">{stats.validated}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-gray-600">En attente</span>
            <span className="text-xs text-gray-400">{stats.pending}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">Refusés</span>
            <span className="text-xs text-gray-400">{stats.refused}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-purple-500"></div>
            <span className="text-gray-600">Remboursés</span>
            <span className="text-xs text-gray-400">{stats.refunded}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-gray-500"></div>
            <span className="text-gray-600">Annulés</span>
            <span className="text-xs text-gray-400">{stats.cancelled}</span>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden flex bg-gray-100">
          {stats.total > 0 && (
            <>
              <div className="bg-emerald-500 h-full" style={{ width: `${(stats.validated / stats.total) * 100}%` }}></div>
              <div className="bg-amber-500 h-full" style={{ width: `${(stats.pending / stats.total) * 100}%` }}></div>
              <div className="bg-red-500 h-full" style={{ width: `${(stats.refused / stats.total) * 100}%` }}></div>
              <div className="bg-purple-500 h-full" style={{ width: `${(stats.refunded / stats.total) * 100}%` }}></div>
              <div className="bg-gray-500 h-full" style={{ width: `${(stats.cancelled / stats.total) * 100}%` }}></div>
            </>
          )}
        </div>
        </div>
      </FadeIn>

      {/* Middle Section - 3 columns */}
      <FadeIn delay={300} duration={500}>
        <div className="grid grid-cols-12 gap-6">
        {/* Nationalités voyageurs */}
        <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                <GlobeAltIcon className="w-4 h-4 text-gray-500" />
              </div>
              <span className="text-sm font-medium text-gray-900">Nationalités</span>
            </div>
          </div>
          <div className="space-y-3">
            {nationalities.map((nat: NationalityData) => (
              <div key={nat.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{nat.flag}</span>
                  <span className="text-sm text-gray-700">{nat.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{nat.count}</span>
                  <span className="text-xs text-gray-400">{nat.percentage}%</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Donut Chart - Statuts */}
        <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-900">Répartition</span>
          </div>
          <div className="h-32 flex items-center justify-center">
            <Doughnut 
              data={statusDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
          <div className="text-center mt-2">
            <p className="text-xs text-gray-500">par statut</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link 
              to="/merchant/sales/new" 
              className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              <div className="p-2 bg-emerald-500 rounded-lg">
                <DocumentPlusIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Nouvelle vente</p>
                <p className="text-xs text-gray-500">Créer un bordereau</p>
              </div>
            </Link>
            <Link 
              to="/merchant/forms" 
              className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <div className="p-2 bg-blue-500 rounded-lg">
                <ClipboardDocumentListIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Mes bordereaux</p>
                <p className="text-xs text-gray-500">Voir la liste</p>
              </div>
            </Link>
            <Link 
              to="/merchant/settings/travelers" 
              className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
            >
              <div className="p-2 bg-purple-500 rounded-lg">
                <UserGroupIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Voyageurs</p>
                <p className="text-xs text-gray-500">Historique clients</p>
              </div>
            </Link>
            <Link 
              to="/merchant/settings/reports" 
              className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
            >
              <div className="p-2 bg-amber-500 rounded-lg">
                <BanknotesIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Rapports</p>
                <p className="text-xs text-gray-500">Statistiques</p>
              </div>
            </Link>
          </div>
        </div>
        </div>
      </FadeIn>

      {/* Bottom Section - 2 columns */}
      <FadeIn delay={400} duration={500}>
        <div className="grid grid-cols-12 gap-6">
        {/* TVA Evolution Chart */}
        <div className="col-span-5 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-900">{chartInfo.title}</span>
              <span className="text-xs text-gray-400">Mensuel</span>
            </div>
            <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-0.5">
              {(['TVA', 'Bordereaux', 'Taux'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    selectedTab === tab 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
          
          <div className="h-52">
            <Bar
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { 
                  legend: { display: false },
                  tooltip: {
                    backgroundColor: '#1f2937',
                    titleFont: { size: 12 },
                    bodyFont: { size: 11 },
                    padding: 10,
                    cornerRadius: 8,
                    callbacks: {
                      label: (context: any) => {
                        const value = context.raw;
                        if (selectedTab === 'TVA') return `${value.toLocaleString('fr-FR')} CDF`;
                        if (selectedTab === 'Taux') return `${value}%`;
                        return `${value} bordereaux`;
                      }
                    }
                  }
                },
                scales: {
                  x: { 
                    grid: { display: false },
                    ticks: { font: { size: 10 }, color: '#9ca3af' }
                  },
                  y: { 
                    grid: { color: 'rgba(243, 244, 246, 0.8)' },
                    ticks: { 
                      font: { size: 10 }, 
                      color: '#9ca3af',
                      callback: (value: any) => {
                        if (selectedTab === 'TVA') {
                          return value.toLocaleString('fr-FR');
                        }
                        if (selectedTab === 'Taux') return `${value}%`;
                        return value;
                      }
                    },
                    beginAtZero: true,
                    max: selectedTab === 'Taux' ? 100 : undefined
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Recent Forms + Line chart */}
        <div className="col-span-7 space-y-6">
          {/* Bordereaux dynamique */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-900">Activité de la semaine</span>
            </div>
            <div className="h-24">
              <Line
                data={formsDynamicData}
                options={{
                  responsive: true,
                  maintainAspectRatio: false,
                  plugins: { legend: { display: false } },
                  scales: {
                    x: { 
                      grid: { display: false },
                      ticks: { font: { size: 10 }, color: '#9ca3af' }
                    },
                    y: { display: false },
                  },
                }}
              />
            </div>
          </div>

          {/* Stats summary */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-900">Résumé du mois</span>
              <Link to="/merchant/forms" className="text-xs text-emerald-600 hover:text-emerald-700">
                Voir les bordereaux →
              </Link>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Total ventes</span>
                <span className="text-sm font-bold text-gray-900">{stats.totalSales.toLocaleString('fr-FR')} CDF</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">TVA collectée</span>
                <span className="text-sm font-bold text-emerald-600">{stats.totalAmount.toLocaleString('fr-FR')} CDF</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-gray-50">
                <span className="text-sm text-gray-600">Meilleur bordereau</span>
                <span className="text-sm font-bold text-amber-600">{stats.bestAmount.toLocaleString('fr-FR')} CDF</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-600">Croissance</span>
                <span className={`text-sm font-bold ${stats.growthPct >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {stats.growthPct >= 0 ? '+' : ''}{stats.growthPct}%
                </span>
              </div>
            </div>
          </div>
        </div>
        </div>
      </FadeIn>
    </div>
  );
}
