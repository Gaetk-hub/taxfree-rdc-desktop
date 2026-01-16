import { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { customsApi } from '../../services/api';
import toast from 'react-hot-toast';
import FadeIn from '../../components/ui/FadeIn';
import { CloudArrowUpIcon, WifiIcon, TrashIcon, ExclamationTriangleIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline';
import { v4 as uuidv4 } from 'uuid';

export interface OfflineValidation {
  id: string;
  form_id: string;
  form_number: string;
  traveler_name?: string;
  refund_amount?: number;
  currency?: string;
  decision: 'VALIDATED' | 'REFUSED';
  refusal_reason?: string;
  refusal_details?: string;
  physical_control_done?: boolean;
  control_notes?: string;
  timestamp: string;
  synced: boolean;
  sync_error?: string;
  sync_result?: 'success' | 'conflict' | 'error';
  server_validation?: {
    decision: string;
    agent_name: string;
    decided_at: string;
    point_of_exit: string;
  };
}

export const OFFLINE_STORAGE_KEY = 'taxfree_offline_validations';

export function getOfflineValidations(): OfflineValidation[] {
  const stored = localStorage.getItem(OFFLINE_STORAGE_KEY);
  return stored ? JSON.parse(stored) : [];
}

export function saveOfflineValidation(validation: Omit<OfflineValidation, 'id' | 'synced'>): void {
  const validations = getOfflineValidations();
  const newValidation: OfflineValidation = {
    ...validation,
    id: uuidv4(),
    synced: false,
  };
  validations.push(newValidation);
  localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(validations));
}

export default function CustomsOfflinePage() {
  const [validations, setValidations] = useState<OfflineValidation[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncResults, setSyncResults] = useState<{
    total: number;
    successful: number;
    failed: number;
    conflicts: number;
    errors: Array<{ form_number: string; error: string; server_info?: any }>;
  } | null>(null);

  useEffect(() => {
    // Load from localStorage
    setValidations(getOfflineValidations());

    // Listen for online/offline events
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const saveValidations = (newValidations: OfflineValidation[]) => {
    setValidations(newValidations);
    localStorage.setItem(OFFLINE_STORAGE_KEY, JSON.stringify(newValidations));
  };

  const syncMutation = useMutation({
    mutationFn: (data: { batch_id: string; validations: any[] }) => customsApi.syncOffline(data),
    onSuccess: (res) => {
      const { successful, failed, errors, total } = res.data;
      
      // Count conflicts
      const conflicts = errors?.filter((e: any) => e.error === 'Already validated' || e.is_conflict) || [];
      
      setSyncResults({
        total,
        successful,
        failed,
        conflicts: conflicts.length,
        errors: errors || [],
      });
      
      // Update validations with sync results
      const updatedValidations = validations.map(v => {
        const error = errors?.find((e: any) => e.form_id === v.form_id);
        if (error) {
          return {
            ...v,
            synced: false,
            sync_result: error.is_conflict ? 'conflict' as const : 'error' as const,
            sync_error: error.error,
            server_validation: error.server_validation,
          };
        }
        return { ...v, synced: true, sync_result: 'success' as const };
      });
      
      // Remove successfully synced, keep failed/conflicts for review
      const remaining = updatedValidations.filter(v => !v.synced || v.sync_result !== 'success');
      saveValidations(remaining);
      
      if (successful > 0) {
        toast.success(`${successful} validation(s) synchronisée(s) avec succès`);
      }
      if (conflicts.length > 0) {
        toast.error(`${conflicts.length} conflit(s) détecté(s) - Déjà validé(s) par un autre agent`);
      }
      if (failed - conflicts.length > 0) {
        toast.error(`${failed - conflicts.length} erreur(s) de synchronisation`);
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erreur de synchronisation');
    },
  });

  const handleSync = () => {
    const unsynced = validations.filter(v => !v.synced);
    if (unsynced.length === 0) {
      toast.error('Aucune validation à synchroniser');
      return;
    }

    const batchId = `BATCH-${Date.now()}-${uuidv4().slice(0, 8)}`;

    syncMutation.mutate({
      batch_id: batchId,
      validations: unsynced.map(v => ({
        form_id: v.form_id,
        decision: v.decision,
        refusal_reason: v.refusal_reason || '',
        refusal_details: v.refusal_details || '',
        physical_control_done: v.physical_control_done || false,
        control_notes: v.control_notes || '',
        offline_timestamp: v.timestamp,
      })),
    });
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Supprimer cette validation ?')) {
      saveValidations(validations.filter(v => v.id !== id));
      setSyncResults(null);
    }
  };

  const handleClearAll = () => {
    if (window.confirm('Supprimer toutes les validations en attente ?')) {
      saveValidations([]);
      setSyncResults(null);
    }
  };

  const handleDismissConflict = (id: string) => {
    saveValidations(validations.filter(v => v.id !== id));
  };

  const unsyncedCount = validations.filter(v => !v.synced && v.sync_result !== 'conflict').length;
  const conflictCount = validations.filter(v => v.sync_result === 'conflict').length;

  return (
    <FadeIn duration={400}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Mode hors-ligne</h1>

      {/* Connection Status */}
      <div className={`rounded-xl p-4 mb-6 border ${isOnline ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${isOnline ? 'bg-green-100' : 'bg-yellow-100'}`}>
            <WifiIcon className={`h-5 w-5 ${isOnline ? 'text-green-600' : 'text-yellow-600'}`} />
          </div>
          <div>
            <p className={`font-medium ${isOnline ? 'text-green-800' : 'text-yellow-800'}`}>
              {isOnline ? 'Connecté' : 'Hors ligne'}
            </p>
            <p className="text-sm text-gray-600">
              {isOnline
                ? 'Vous pouvez synchroniser les validations en attente'
                : 'Les validations seront stockées localement jusqu\'au retour du réseau'}
            </p>
          </div>
        </div>
      </div>

      {/* Sync Results Summary */}
      {syncResults && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="font-semibold text-gray-900 mb-3">Résultat de la synchronisation</h3>
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="bg-green-50 rounded-lg p-3">
              <CheckCircleIcon className="w-6 h-6 text-green-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-green-600">{syncResults.successful}</p>
              <p className="text-xs text-gray-600">Synchronisé(s)</p>
            </div>
            <div className="bg-orange-50 rounded-lg p-3">
              <ExclamationTriangleIcon className="w-6 h-6 text-orange-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-orange-600">{syncResults.conflicts}</p>
              <p className="text-xs text-gray-600">Conflit(s)</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <XCircleIcon className="w-6 h-6 text-red-600 mx-auto mb-1" />
              <p className="text-2xl font-bold text-red-600">{syncResults.failed - syncResults.conflicts}</p>
              <p className="text-xs text-gray-600">Erreur(s)</p>
            </div>
          </div>
          <button 
            onClick={() => setSyncResults(null)}
            className="mt-3 text-sm text-gray-500 hover:text-gray-700"
          >
            Fermer
          </button>
        </div>
      )}

      {/* Conflicts Section */}
      {conflictCount > 0 && (
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <ExclamationTriangleIcon className="w-5 h-5 text-orange-600" />
            <h3 className="font-semibold text-orange-800">Conflits détectés ({conflictCount})</h3>
          </div>
          <p className="text-sm text-orange-700 mb-4">
            Ces bordereaux ont déjà été validés par un autre agent pendant que vous étiez hors ligne. 
            Votre décision n'a pas été enregistrée.
          </p>
          <div className="space-y-3">
            {validations.filter(v => v.sync_result === 'conflict').map((v) => (
              <div key={v.id} className="bg-white rounded-lg p-4 border border-orange-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono font-medium text-gray-900">{v.form_number}</p>
                    {v.traveler_name && (
                      <p className="text-sm text-gray-500">{v.traveler_name}</p>
                    )}
                  </div>
                  <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-800">
                    Conflit
                  </span>
                </div>
                
                <div className="mt-3 grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-gray-50 rounded p-2">
                    <p className="text-xs text-gray-500 mb-1">Votre décision (non enregistrée)</p>
                    <p className={`font-medium ${v.decision === 'VALIDATED' ? 'text-green-600' : 'text-red-600'}`}>
                      {v.decision === 'VALIDATED' ? 'Validé' : 'Refusé'}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(v.timestamp).toLocaleString('fr-FR')}</p>
                  </div>
                  {v.server_validation && (
                    <div className="bg-blue-50 rounded p-2">
                      <p className="text-xs text-gray-500 mb-1">Décision serveur (enregistrée)</p>
                      <p className={`font-medium ${v.server_validation.decision === 'VALIDATED' ? 'text-green-600' : 'text-red-600'}`}>
                        {v.server_validation.decision === 'VALIDATED' ? 'Validé' : 'Refusé'}
                      </p>
                      <p className="text-xs text-gray-400">
                        Par {v.server_validation.agent_name}
                      </p>
                    </div>
                  )}
                </div>
                
                <button
                  onClick={() => handleDismissConflict(v.id)}
                  className="mt-3 text-sm text-orange-600 hover:text-orange-800"
                >
                  J'ai compris, supprimer
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pending Validations */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">
            Validations en attente ({unsyncedCount})
          </h2>
          <div className="flex gap-2">
            {validations.length > 0 && (
              <button onClick={handleClearAll} className="btn btn-secondary text-sm flex items-center">
                <TrashIcon className="h-4 w-4 mr-1" />
                Tout effacer
              </button>
            )}
            <button
              onClick={handleSync}
              disabled={!isOnline || unsyncedCount === 0 || syncMutation.isPending}
              className="btn btn-primary text-sm flex items-center disabled:opacity-50"
            >
              <CloudArrowUpIcon className="h-4 w-4 mr-1" />
              {syncMutation.isPending ? 'Synchronisation...' : 'Synchroniser'}
            </button>
          </div>
        </div>

        {validations.filter(v => !v.synced && v.sync_result !== 'conflict').length === 0 ? (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CloudArrowUpIcon className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-500">Aucune validation en attente</p>
            <p className="text-sm text-gray-400 mt-1">
              Les validations effectuées hors ligne apparaîtront ici
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {validations.filter(v => !v.synced && v.sync_result !== 'conflict').map((v) => (
              <div
                key={v.id}
                className={`p-4 rounded-lg border ${
                  v.sync_result === 'error' 
                    ? 'bg-red-50 border-red-200' 
                    : 'bg-white border-gray-200'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-mono font-medium text-gray-900">{v.form_number}</p>
                    {v.traveler_name && (
                      <p className="text-sm text-gray-500">{v.traveler_name}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(v.timestamp).toLocaleString('fr-FR')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {v.refund_amount && (
                      <span className="text-sm font-medium text-gray-600">
                        {v.refund_amount.toLocaleString()} {v.currency}
                      </span>
                    )}
                    <span
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        v.decision === 'VALIDATED'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {v.decision === 'VALIDATED' ? 'Validé' : 'Refusé'}
                    </span>
                    <button
                      onClick={() => handleDelete(v.id)}
                      className="text-gray-400 hover:text-red-600"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                {v.refusal_reason && (
                  <p className="text-sm text-gray-600 mt-2">
                    Motif: {v.refusal_reason}
                  </p>
                )}
                {v.sync_error && (
                  <p className="text-sm text-red-600 mt-2">
                    Erreur: {v.sync_error}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Instructions */}
      <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-200">
        <h3 className="font-medium text-blue-800 mb-2">Comment ça marche ?</h3>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Scannez et validez les bordereaux même sans connexion internet</li>
          <li>• Les décisions sont stockées localement avec horodatage</li>
          <li>• Dès que le réseau revient, cliquez sur "Synchroniser"</li>
          <li>• En cas de conflit (déjà validé ailleurs), la décision serveur prévaut</li>
        </ul>
      </div>
      </div>
    </FadeIn>
  );
}
