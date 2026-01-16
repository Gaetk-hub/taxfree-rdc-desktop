import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  PlayIcon,
  StopIcon,
  PauseIcon,
  ClockIcon,
  MapPinIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import api from '../../../services/api';

interface Shift {
  id: string;
  started_at: string;
  ended_at: string | null;
  status: 'ACTIVE' | 'PAUSED' | 'ENDED';
  status_display: string;
  duration_formatted: string;
  duration_hours: number;
  validations_count: number;
  validated_count: number;
  refused_count: number;
  total_amount_validated: number;
  point_of_exit_name: string;
  point_of_exit_code: string;
  notes: string;
}

interface ShiftData {
  has_active_shift: boolean;
  current_shift: Shift | null;
  recent_shifts: Shift[];
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

interface ShiftManagerProps {
  shiftData: ShiftData | null;
  isLoading: boolean;
  onShiftChange: () => void;
}

export default function ShiftManager({ shiftData, isLoading, onShiftChange }: ShiftManagerProps) {
  const queryClient = useQueryClient();
  const [showEndModal, setShowEndModal] = useState(false);
  const [endNotes, setEndNotes] = useState('');

  // Start shift mutation
  const startShiftMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/customs/agent/shift/start/', {
        device_info: {
          userAgent: navigator.userAgent,
          platform: navigator.platform,
          language: navigator.language,
        }
      });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Service démarré avec succès !');
      queryClient.invalidateQueries({ queryKey: ['agent-shift'] });
      queryClient.invalidateQueries({ queryKey: ['agent-shift-sidebar'] });
      queryClient.invalidateQueries({ queryKey: ['customs-dashboard'] });
      onShiftChange();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erreur lors du démarrage du service');
    },
  });

  // End shift mutation
  const endShiftMutation = useMutation({
    mutationFn: async (notes: string) => {
      const response = await api.post('/customs/agent/shift/end/', { notes });
      return response.data;
    },
    onSuccess: () => {
      toast.success('Service terminé avec succès !');
      setShowEndModal(false);
      setEndNotes('');
      queryClient.invalidateQueries({ queryKey: ['agent-shift'] });
      queryClient.invalidateQueries({ queryKey: ['agent-shift-sidebar'] });
      queryClient.invalidateQueries({ queryKey: ['customs-dashboard'] });
      onShiftChange();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erreur lors de la fin du service');
    },
  });

  // Pause shift mutation
  const pauseShiftMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/customs/agent/shift/pause/');
      return response.data;
    },
    onSuccess: () => {
      toast.success('Service mis en pause');
      queryClient.invalidateQueries({ queryKey: ['agent-shift'] });
      queryClient.invalidateQueries({ queryKey: ['agent-shift-sidebar'] });
      onShiftChange();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erreur');
    },
  });

  // Resume shift mutation
  const resumeShiftMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/customs/agent/shift/resume/');
      return response.data;
    },
    onSuccess: () => {
      toast.success('Service repris');
      queryClient.invalidateQueries({ queryKey: ['agent-shift'] });
      queryClient.invalidateQueries({ queryKey: ['agent-shift-sidebar'] });
      onShiftChange();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erreur');
    },
  });

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <div className="animate-pulse flex items-center gap-4">
          <div className="w-12 h-12 bg-gray-200 rounded-xl"></div>
          <div className="flex-1">
            <div className="h-4 bg-gray-200 rounded w-1/3 mb-2"></div>
            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!shiftData) return null;

  const { has_active_shift, current_shift, point_of_exit, today_stats } = shiftData;

  // No active shift - show start service screen
  if (!has_active_shift) {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl shadow-sm border border-blue-100 p-8">
        <div className="text-center max-w-md mx-auto">
          <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <ClockIcon className="w-10 h-10 text-blue-600" />
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Prêt à commencer votre service ?
          </h2>
          
          <div className="flex items-center justify-center gap-2 text-gray-600 mb-6">
            <MapPinIcon className="w-5 h-5" />
            <span className="font-medium">{point_of_exit.name}</span>
            <span className="text-gray-400">•</span>
            <span className="font-mono text-sm text-gray-500">{point_of_exit.code}</span>
          </div>

          <p className="text-gray-500 mb-8">
            Cliquez sur le bouton ci-dessous pour démarrer votre session de travail. 
            Toutes vos validations seront enregistrées et horodatées.
          </p>

          <button
            onClick={() => startShiftMutation.mutate()}
            disabled={startShiftMutation.isPending}
            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all shadow-lg shadow-blue-500/30 disabled:opacity-50"
          >
            {startShiftMutation.isPending ? (
              <>
                <ArrowPathIcon className="w-6 h-6 animate-spin" />
                Démarrage...
              </>
            ) : (
              <>
                <PlayIcon className="w-6 h-6" />
                Démarrer le service
              </>
            )}
          </button>

          {/* Today's stats */}
          {today_stats.shifts_count > 0 && (
            <div className="mt-8 pt-6 border-t border-blue-200">
              <p className="text-sm text-gray-500 mb-3">Aujourd'hui</p>
              <div className="flex justify-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{today_stats.shifts_count}</p>
                  <p className="text-xs text-gray-500">Service(s)</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{today_stats.total_hours.toFixed(1)}h</p>
                  <p className="text-xs text-gray-500">Heures</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-gray-900">{today_stats.validations}</p>
                  <p className="text-xs text-gray-500">Validations</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Active shift - show shift status bar
  return (
    <>
      <div className={`rounded-2xl shadow-sm border p-4 ${
        current_shift?.status === 'PAUSED' 
          ? 'bg-amber-50 border-amber-200' 
          : 'bg-emerald-50 border-emerald-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${
              current_shift?.status === 'PAUSED' 
                ? 'bg-amber-100' 
                : 'bg-emerald-100'
            }`}>
              {current_shift?.status === 'PAUSED' ? (
                <PauseIcon className="w-6 h-6 text-amber-600" />
              ) : (
                <div className="relative">
                  <ClockIcon className="w-6 h-6 text-emerald-600" />
                  <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></span>
                </div>
              )}
            </div>
            
            <div>
              <div className="flex items-center gap-2">
                <span className={`text-sm font-medium ${
                  current_shift?.status === 'PAUSED' ? 'text-amber-700' : 'text-emerald-700'
                }`}>
                  {current_shift?.status === 'PAUSED' ? '⏸️ En pause' : '🟢 En service'}
                </span>
                <span className="text-gray-400">•</span>
                <span className="text-sm text-gray-600 font-mono">
                  {current_shift?.duration_formatted}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Démarré à {new Date(current_shift?.started_at || '').toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          {/* Stats during shift */}
          <div className="hidden md:flex items-center gap-6">
            <div className="text-center">
              <p className="text-lg font-bold text-gray-900">{current_shift?.validations_count || 0}</p>
              <p className="text-xs text-gray-500">Validations</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-emerald-600">{current_shift?.validated_count || 0}</p>
              <p className="text-xs text-gray-500">Validés</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-bold text-red-600">{current_shift?.refused_count || 0}</p>
              <p className="text-xs text-gray-500">Refusés</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {current_shift?.status === 'ACTIVE' ? (
              <button
                onClick={() => pauseShiftMutation.mutate()}
                disabled={pauseShiftMutation.isPending}
                className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                title="Mettre en pause"
              >
                <PauseIcon className="w-5 h-5" />
              </button>
            ) : (
              <button
                onClick={() => resumeShiftMutation.mutate()}
                disabled={resumeShiftMutation.isPending}
                className="p-2 text-emerald-600 hover:bg-emerald-100 rounded-lg transition-colors"
                title="Reprendre"
              >
                <PlayIcon className="w-5 h-5" />
              </button>
            )}
            
            <button
              onClick={() => setShowEndModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
            >
              <StopIcon className="w-5 h-5" />
              <span className="hidden sm:inline">Terminer</span>
            </button>
          </div>
        </div>
      </div>

      {/* End shift modal */}
      {showEndModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 mb-4">
              Terminer le service ?
            </h3>
            
            {/* Shift summary */}
            <div className="bg-gray-50 rounded-xl p-4 mb-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{current_shift?.duration_formatted}</p>
                  <p className="text-xs text-gray-500">Durée</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-emerald-600">{current_shift?.validated_count || 0}</p>
                  <p className="text-xs text-gray-500">Validés</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-red-600">{current_shift?.refused_count || 0}</p>
                  <p className="text-xs text-gray-500">Refusés</p>
                </div>
              </div>
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes de fin de service (optionnel)
              </label>
              <textarea
                value={endNotes}
                onChange={(e) => setEndNotes(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Remarques, incidents, observations..."
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowEndModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={() => endShiftMutation.mutate(endNotes)}
                disabled={endShiftMutation.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {endShiftMutation.isPending ? 'Fermeture...' : 'Terminer le service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
