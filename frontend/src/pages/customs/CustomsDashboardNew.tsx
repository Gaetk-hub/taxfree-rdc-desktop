import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import FadeIn from '../../components/ui/FadeIn';
import {
  QrCodeIcon,
  ClipboardDocumentCheckIcon,
  BanknotesIcon,
  CalendarDaysIcon,
  ArrowUpIcon,
  DocumentTextIcon,
  ClockIcon,
  ArrowPathIcon,
  ChartBarIcon,
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
import { Bar, Doughnut } from 'react-chartjs-2';
import api from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import ShiftManager from './components/ShiftManager';
import ValidationModal from './components/ValidationModal';

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

interface DashboardData {
  agent: {
    id: string;
    name: string;
    email: string;
  };
  point_of_exit: {
    id: string;
    code: string;
    name: string;
    type: string;
    city: string;
  } | null;
  stats: {
    my_validations_today: number;
    my_validations_week: number;
    my_validations_month: number;
    my_validations_total: number;
    my_validated_today: number;
    my_refused_today: number;
    my_validated_count: number;
    my_refused_count: number;
    my_validation_rate: number;
    my_refunds_today: number;
    my_refunds_paid_today: number;
    my_refunds_total: number;
    my_refunds_paid_total: number;
    my_amount_validated_today: number;
    my_tva_validated_today: number;
    my_amount_validated_total: number;
    my_amount_refunded_today: number;
    my_amount_refunded_total: number;
    pending_forms_count: number;
  };
  pending_forms: any[];
  recent_validations: any[];
  daily_chart: any[];
}

interface ShiftData {
  has_active_shift: boolean;
  current_shift: any;
  recent_shifts: any[];
  today_stats: {
    shifts_count: number;
    total_hours: number;
    validations: number;
  };
  point_of_exit: {
    id: string;
    code: string;
    name: string;
    type: string;
  };
}

export default function CustomsDashboardNew() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [selectedForm, setSelectedForm] = useState<any | null>(null);
  const [selectedTab, setSelectedTab] = useState<'validations' | 'montants'>('validations');

  // Check if user is OPERATOR (operators don't need shift management)
  const isOperator = user?.role === 'OPERATOR';

  // Fetch shift data (only for CUSTOMS_AGENT, not OPERATOR)
  const { data: shiftData, isLoading: shiftLoading, refetch: refetchShift } = useQuery<ShiftData>({
    queryKey: ['agent-shift'],
    queryFn: async () => {
      const response = await api.get('/customs/agent/shift/');
      return response.data;
    },
    refetchInterval: 60000,
    enabled: !isOperator, // Operators don't need shift
  });

  // For operators, simulate always having an active shift
  const effectiveShiftData = isOperator 
    ? { has_active_shift: true, current_shift: null, recent_shifts: [], today_stats: { shifts_count: 0, total_hours: 0, validations: 0 } }
    : shiftData;

  // Fetch dashboard data
  const { data: dashboardData, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ['customs-dashboard'],
    queryFn: async () => {
      const response = await api.get('/customs/agent/dashboard/');
      return response.data;
    },
    refetchInterval: 30000,
    enabled: isOperator || effectiveShiftData?.has_active_shift !== false,
  });

  const handleShiftChange = () => {
    refetchShift();
    refetch();
  };

  // Validation mutation
  const validateMutation = useMutation({
    mutationFn: async ({ formId, decision, data }: { formId: string; decision: string; data: any }) => {
      const response = await api.post(`/customs/forms/${formId}/decide/`, {
        decision,
        ...data,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['customs-dashboard'] });
      toast.success(
        variables.decision === 'VALIDATED' 
          ? 'Bordereau validé avec succès' 
          : 'Bordereau refusé'
      );
      setSelectedForm(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erreur lors de la validation');
    },
  });

  const handleValidate = (formId: string, decision: 'VALIDATED' | 'REFUSED', data: any) => {
    validateMutation.mutate({ formId, decision, data });
  };

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

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR');
  };

  // Loading state
  if (isLoading && shiftLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  // Error state
  if (error || (dashboardData && !dashboardData.point_of_exit)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ClockIcon className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune frontière assignée</h2>
          <p className="text-gray-500 max-w-md">
            Vous n'êtes pas encore assigné à une frontière. Veuillez contacter l'administrateur.
          </p>
        </div>
      </div>
    );
  }

  // If no active shift (only for CUSTOMS_AGENT, not OPERATOR)
  if (!isOperator && shiftData && !shiftData.has_active_shift) {
    return (
      <div className="space-y-6">
        <ShiftManager 
          shiftData={shiftData} 
          isLoading={shiftLoading} 
          onShiftChange={handleShiftChange} 
        />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
      </div>
    );
  }

  const { point_of_exit, stats, daily_chart } = dashboardData;

  // Chart data
  const chartData = selectedTab === 'validations' ? {
    labels: daily_chart.map((d: any) => d.date),
    datasets: [
      {
        label: 'Validés',
        data: daily_chart.map((d: any) => d.validated),
        backgroundColor: '#10b981',
        borderRadius: 4,
      },
      {
        label: 'Refusés',
        data: daily_chart.map((d: any) => d.refused),
        backgroundColor: '#ef4444',
        borderRadius: 4,
      },
    ],
  } : {
    labels: daily_chart.map((d: any) => d.date),
    datasets: [{
      label: 'Montant validé',
      data: daily_chart.map((d: any) => d.validated * 50000), // Approximation
      backgroundColor: '#3b82f6',
      borderRadius: 4,
    }],
  };

  // Status distribution
  const statusDistributionData = {
    labels: ['Validés', 'Refusés'],
    datasets: [{
      data: [stats.my_validated_count, stats.my_refused_count],
      backgroundColor: ['#10b981', '#ef4444'],
      borderWidth: 0,
      cutout: '70%',
    }],
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6 pb-8">
        {/* Shift Manager - only for CUSTOMS_AGENT, not OPERATOR */}
        {!isOperator && shiftData?.has_active_shift && (
          <ShiftManager 
          shiftData={shiftData} 
          isLoading={shiftLoading} 
          onShiftChange={handleShiftChange} 
        />
      )}

      {/* Welcome Banner */}
      <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="customs-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#customs-grid)" />
          </svg>
        </div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-blue-200 text-sm mb-2">
              <CalendarDaysIcon className="w-4 h-4" />
              <span className="capitalize">{formattedDate}</span>
            </div>
            <h2 className="text-2xl font-bold mb-1">
              {getGreeting()}, {user?.first_name || dashboardData.agent.name} 👋
            </h2>
            <p className="text-blue-200 text-sm">
              {point_of_exit?.name} • Agent Douanier
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              title="Actualiser"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
            <Link 
              to="/customs/scan"
              className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
            >
              <QrCodeIcon className="w-5 h-5" />
              <span className="font-medium">Scanner QR</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Main Stats Card */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Montant Total Validé</p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-gray-900">{formatAmount(stats.my_amount_validated_total)}</span>
              <span className="text-2xl text-gray-400">CDF</span>
            </div>
            <p className="text-sm text-gray-400 mt-1">depuis le début de votre carrière</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-gray-500 mb-1">Aujourd'hui</p>
            <p className="text-2xl font-bold text-blue-600">{formatAmount(stats.my_amount_validated_today)} CDF</p>
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Validations aujourd'hui */}
          <div className="bg-blue-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Validations</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center text-white font-bold">
                {stats.my_validations_today}
              </div>
              <span className="text-xs text-gray-500">aujourd'hui</span>
            </div>
          </div>

          {/* Validés */}
          <div className="bg-emerald-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Validés</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                {stats.my_validated_count}
              </div>
              <div className="flex items-center text-emerald-600 text-xs">
                <ArrowUpIcon className="w-3 h-3" />
                {stats.my_validation_rate}%
              </div>
            </div>
          </div>

          {/* Refusés */}
          <div className="bg-red-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Refusés</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-red-500 flex items-center justify-center text-white font-bold text-sm">
                {stats.my_refused_count}
              </div>
            </div>
          </div>

          {/* Remboursés */}
          <div className="bg-purple-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Remboursés</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-purple-500 flex items-center justify-center text-white font-bold text-sm">
                {stats.my_refunds_paid_total}
              </div>
              <span className="text-xs text-purple-600">+{stats.my_refunds_paid_today} auj.</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-4 mb-2 text-sm flex-wrap">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-gray-600">Validés</span>
            <span className="text-xs text-gray-400">{stats.my_validated_count}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">Refusés</span>
            <span className="text-xs text-gray-400">{stats.my_refused_count}</span>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden flex bg-gray-100">
          {stats.my_validations_total > 0 && (
            <>
              <div className="bg-emerald-500 h-full" style={{ width: `${stats.my_validation_rate}%` }}></div>
              <div className="bg-red-500 h-full" style={{ width: `${100 - stats.my_validation_rate}%` }}></div>
            </>
          )}
        </div>
      </div>

      {/* Middle Section - 3 columns */}
      <div className="grid grid-cols-12 gap-6">
        {/* Donut Chart */}
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
            <p className="text-2xl font-bold text-gray-900">{stats.my_validation_rate}%</p>
            <p className="text-xs text-gray-500">Taux de validation</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="col-span-5 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Actions rapides</h3>
          <div className="grid grid-cols-2 gap-3">
            <Link 
              to="/customs/scan" 
              className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors"
            >
              <div className="p-2 bg-blue-500 rounded-lg">
                <QrCodeIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Scanner QR</p>
                <p className="text-xs text-gray-500">Valider un bordereau</p>
              </div>
            </Link>
            <Link 
              to="/customs/refunds" 
              className="flex items-center gap-3 p-4 bg-purple-50 rounded-xl hover:bg-purple-100 transition-colors"
            >
              <div className="p-2 bg-purple-500 rounded-lg">
                <BanknotesIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Remboursements</p>
                <p className="text-xs text-gray-500">Gérer les paiements</p>
              </div>
            </Link>
            <Link 
              to="/customs/reports" 
              className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
            >
              <div className="p-2 bg-emerald-500 rounded-lg">
                <ChartBarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Mes Rapports</p>
                <p className="text-xs text-gray-500">Statistiques détaillées</p>
              </div>
            </Link>
            <Link 
              to="/customs/offline" 
              className="flex items-center gap-3 p-4 bg-amber-50 rounded-xl hover:bg-amber-100 transition-colors"
            >
              <div className="p-2 bg-amber-500 rounded-lg">
                <DocumentTextIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="font-medium text-gray-900">Mode hors-ligne</p>
                <p className="text-xs text-gray-500">Validations en attente</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Performance ce mois */}
        <div className="col-span-4 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Ma Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <ClipboardDocumentCheckIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Cette semaine</p>
                  <p className="font-semibold text-gray-900">{stats.my_validations_week} validations</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <CalendarDaysIcon className="w-5 h-5 text-indigo-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Ce mois</p>
                  <p className="font-semibold text-gray-900">{stats.my_validations_month} validations</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <BanknotesIcon className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-gray-500">Remboursé ce mois</p>
                  <p className="font-semibold text-gray-900">{formatAmount(stats.my_amount_refunded_today)} CDF</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Évolution (7 derniers jours)</h3>
          <div className="flex gap-2">
            {(['validations', 'montants'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  selectedTab === tab
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {tab === 'validations' ? 'Validations' : 'Montants'}
              </button>
            ))}
          </div>
        </div>
        <div className="h-64">
          <Bar
            data={chartData}
            options={{
              responsive: true,
              maintainAspectRatio: false,
              plugins: {
                legend: { position: 'bottom' },
              },
              scales: {
                y: { beginAtZero: true },
              },
            }}
          />
        </div>
      </div>

      {/* Validation Modal */}
      {selectedForm && (
        <ValidationModal
          form={selectedForm}
          onClose={() => setSelectedForm(null)}
          onValidate={handleValidate}
          isLoading={validateMutation.isPending}
        />
      )}
      </div>
    </FadeIn>
  );
}
