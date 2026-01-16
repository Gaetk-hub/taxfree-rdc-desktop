import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  MapPinIcon,
  QrCodeIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
// Import modular components
import StatsCards from './components/StatsCards';
import PendingFormsList from './components/PendingFormsList';
import RecentValidations from './components/RecentValidations';
import DailyChart from './components/DailyChart';
import ValidationModal from './components/ValidationModal';
import ShiftManager from './components/ShiftManager';

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
    // Validation stats
    my_validations_today: number;
    my_validations_week: number;
    my_validations_month: number;
    my_validations_total: number;
    my_validated_today: number;
    my_refused_today: number;
    my_validated_count: number;
    my_refused_count: number;
    my_validation_rate: number;
    // Refund stats
    my_refunds_today: number;
    my_refunds_paid_today: number;
    my_refunds_total: number;
    my_refunds_paid_total: number;
    // Amount stats
    my_amount_validated_today: number;
    my_tva_validated_today: number;
    my_amount_validated_total: number;
    my_amount_refunded_today: number;
    my_amount_refunded_total: number;
    // Pending
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

export default function CustomsDashboard() {
  const queryClient = useQueryClient();
  const [selectedForm, setSelectedForm] = useState<any | null>(null);

  // Fetch shift data
  const { data: shiftData, isLoading: shiftLoading, refetch: refetchShift } = useQuery<ShiftData>({
    queryKey: ['agent-shift'],
    queryFn: async () => {
      const response = await api.get('/customs/agent/shift/');
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  // Fetch dashboard data (only if shift is active)
  const { data: dashboardData, isLoading, error, refetch } = useQuery<DashboardData>({
    queryKey: ['customs-dashboard'],
    queryFn: async () => {
      const response = await api.get('/customs/agent/dashboard/');
      return response.data;
    },
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: shiftData?.has_active_shift !== false, // Always fetch initially, then based on shift
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

  const getBorderTypeIcon = (type: string) => {
    switch (type) {
      case 'AIRPORT': return '✈️';
      case 'LAND_BORDER': return '🚗';
      case 'PORT': return '🚢';
      case 'RAIL': return '🚂';
      default: return '📍';
    }
  };

  // Error state - no border assigned
  if (error || (dashboardData && !dashboardData.point_of_exit)) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ExclamationTriangleIcon className="w-8 h-8 text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Aucune frontière assignée</h2>
          <p className="text-gray-500 max-w-md">
            Vous n'êtes pas encore assigné à une frontière. Veuillez contacter l'administrateur pour être affecté à un poste.
          </p>
        </div>
      </div>
    );
  }

  // Loading state
  if (isLoading && shiftLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  // If no active shift, show the start service screen
  if (shiftData && !shiftData.has_active_shift) {
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

  // Wait for dashboard data to load
  if (!dashboardData) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Chargement du tableau de bord...</p>
        </div>
      </div>
    );
  }

  const { point_of_exit, stats, pending_forms, recent_validations, daily_chart } = dashboardData;

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Shift status bar when active */}
        {shiftData?.has_active_shift && (
          <FadeIn delay={0} duration={400}>
          <ShiftManager 
            shiftData={shiftData} 
            isLoading={shiftLoading} 
            onShiftChange={handleShiftChange} 
          />
        </FadeIn>
      )}

      {/* Header with border info */}
      <FadeIn delay={100} duration={500}>
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
              {getBorderTypeIcon(point_of_exit?.type || '')}
            </div>
            <div>
              <p className="text-blue-100 text-sm">Poste assigné</p>
              <h1 className="text-2xl font-bold">{point_of_exit?.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <MapPinIcon className="w-4 h-4 text-blue-200" />
                <span className="text-blue-100">{point_of_exit?.city}</span>
                <span className="text-blue-200">•</span>
                <span className="text-blue-200 font-mono text-sm">{point_of_exit?.code}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => refetch()}
              className="p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
              title="Actualiser"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
            <button
              onClick={() => window.location.href = '/customs/scan'}
              className="flex items-center gap-2 px-4 py-3 bg-white text-blue-600 rounded-xl font-medium hover:bg-blue-50 transition-colors"
            >
              <QrCodeIcon className="w-5 h-5" />
              Scanner QR
            </button>
          </div>
        </div>

        {/* Quick stats in header - Agent's personal stats */}
        <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/20">
          <div>
            <p className="text-blue-100 text-sm">Mes validations (aujourd'hui)</p>
            <p className="text-2xl font-bold">{stats.my_validations_today}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Validés</p>
            <p className="text-2xl font-bold text-emerald-300">{stats.my_validated_today}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Refusés</p>
            <p className="text-2xl font-bold text-red-300">{stats.my_refused_today}</p>
          </div>
          <div>
            <p className="text-blue-100 text-sm">Taux de validation</p>
            <p className="text-2xl font-bold text-yellow-300">{stats.my_validation_rate}%</p>
          </div>
        </div>
        </div>
      </FadeIn>

      {/* Stats Cards */}
      <FadeIn delay={200} duration={500}>
        <StatsCards stats={stats} />
      </FadeIn>

      {/* Main Content Grid */}
      <FadeIn delay={300} duration={500}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Pending Forms */}
          <PendingFormsList
            forms={pending_forms}
            onSelectForm={setSelectedForm}
          />

          {/* Recent Validations */}
          <RecentValidations validations={recent_validations} />
        </div>
      </FadeIn>

      {/* Daily Chart */}
      <FadeIn delay={400} duration={500}>
        <DailyChart data={daily_chart} />
      </FadeIn>

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
