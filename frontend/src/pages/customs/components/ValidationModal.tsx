import { useState } from 'react';
import {
  XMarkIcon,
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  DocumentTextIcon,
  UserIcon,
  BuildingStorefrontIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';

interface FormData {
  id: string;
  form_number: string;
  traveler_name: string;
  traveler_passport: string;
  traveler_nationality: string;
  merchant_name: string;
  total_amount: number;
  refund_amount: number;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
  requires_control: boolean;
  risk_score: number;
}

interface ValidationModalProps {
  form: FormData;
  onClose: () => void;
  onValidate: (formId: string, decision: 'VALIDATED' | 'REFUSED', data: any) => void;
  isLoading?: boolean;
}

const refusalReasons = [
  { value: 'EXPIRED', label: 'Bordereau expiré' },
  { value: 'INVALID_DOCUMENTS', label: 'Documents invalides' },
  { value: 'GOODS_NOT_PRESENT', label: 'Marchandises absentes' },
  { value: 'GOODS_MISMATCH', label: 'Marchandises non conformes' },
  { value: 'TRAVELER_MISMATCH', label: 'Identité voyageur non conforme' },
  { value: 'SUSPECTED_FRAUD', label: 'Fraude suspectée' },
  { value: 'OTHER', label: 'Autre raison' },
];

export default function ValidationModal({ form, onClose, onValidate, isLoading }: ValidationModalProps) {
  const [decision, setDecision] = useState<'VALIDATED' | 'REFUSED' | null>(null);
  const [refusalReason, setRefusalReason] = useState('');
  const [refusalDetails, setRefusalDetails] = useState('');
  const [physicalControlDone, setPhysicalControlDone] = useState(false);
  const [controlNotes, setControlNotes] = useState('');

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' CDF';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getFlag = (countryCode: string) => {
    if (!countryCode || countryCode.length !== 2) return '🌍';
    try {
      return String.fromCodePoint(
        ...countryCode.toUpperCase().split('').map(c => 0x1F1E6 + c.charCodeAt(0) - 65)
      );
    } catch {
      return '🌍';
    }
  };

  const handleSubmit = () => {
    if (!decision) return;
    
    if (decision === 'REFUSED' && !refusalReason) {
      return;
    }

    onValidate(form.id, decision, {
      refusal_reason: refusalReason,
      refusal_details: refusalDetails,
      physical_control_done: physicalControlDone,
      control_notes: controlNotes,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <DocumentTextIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">{form.form_number}</h3>
              <p className="text-blue-100">Validation douanière</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center"
          >
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          {/* Alerts */}
          {form.is_expired && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
              <span className="text-red-700 text-sm font-medium">Ce bordereau est expiré</span>
            </div>
          )}
          {form.requires_control && (
            <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
              <span className="text-amber-700 text-sm font-medium">Contrôle physique requis</span>
            </div>
          )}

          {/* Form Info */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <UserIcon className="w-4 h-4 text-gray-400" />
                <p className="text-xs font-medium text-gray-500 uppercase">Voyageur</p>
              </div>
              <p className="font-medium text-gray-900">{form.traveler_name}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-lg">{getFlag(form.traveler_nationality)}</span>
                <span className="text-sm text-gray-600 font-mono">{form.traveler_passport}</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <BuildingStorefrontIcon className="w-4 h-4 text-gray-400" />
                <p className="text-xs font-medium text-gray-500 uppercase">Commerçant</p>
              </div>
              <p className="font-medium text-gray-900">{form.merchant_name}</p>
              <p className="text-sm text-gray-500 mt-1">{formatDate(form.created_at)}</p>
            </div>
            <div className="bg-emerald-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <BanknotesIcon className="w-4 h-4 text-emerald-500" />
                <p className="text-xs font-medium text-gray-500 uppercase">Montant total</p>
              </div>
              <p className="text-xl font-bold text-gray-900">{formatAmount(form.total_amount)}</p>
            </div>
            <div className="bg-purple-50 rounded-xl p-4">
              <div className="flex items-center gap-2 mb-2">
                <BanknotesIcon className="w-4 h-4 text-purple-500" />
                <p className="text-xs font-medium text-gray-500 uppercase">TVA à rembourser</p>
              </div>
              <p className="text-xl font-bold text-emerald-600">{formatAmount(form.refund_amount)}</p>
            </div>
          </div>

          {/* Physical Control */}
          <div className="mb-6">
            <label className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
              <input
                type="checkbox"
                checked={physicalControlDone}
                onChange={(e) => setPhysicalControlDone(e.target.checked)}
                className="w-5 h-5 text-blue-600 rounded"
              />
              <div>
                <p className="font-medium text-gray-900">Contrôle physique effectué</p>
                <p className="text-sm text-gray-500">Les marchandises ont été vérifiées</p>
              </div>
            </label>
            {physicalControlDone && (
              <textarea
                value={controlNotes}
                onChange={(e) => setControlNotes(e.target.value)}
                placeholder="Notes du contrôle (optionnel)..."
                className="mt-2 w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 resize-none"
                rows={2}
              />
            )}
          </div>

          {/* Decision Buttons */}
          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">Décision</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setDecision('VALIDATED')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  decision === 'VALIDATED'
                    ? 'border-emerald-500 bg-emerald-50'
                    : 'border-gray-200 hover:border-emerald-300 hover:bg-emerald-50/50'
                }`}
              >
                <CheckCircleIcon className={`w-8 h-8 mx-auto mb-2 ${
                  decision === 'VALIDATED' ? 'text-emerald-600' : 'text-gray-400'
                }`} />
                <p className={`font-medium ${
                  decision === 'VALIDATED' ? 'text-emerald-700' : 'text-gray-700'
                }`}>Valider</p>
                <p className="text-xs text-gray-500">Autoriser le remboursement</p>
              </button>
              <button
                onClick={() => setDecision('REFUSED')}
                className={`p-4 rounded-xl border-2 transition-all ${
                  decision === 'REFUSED'
                    ? 'border-red-500 bg-red-50'
                    : 'border-gray-200 hover:border-red-300 hover:bg-red-50/50'
                }`}
              >
                <XCircleIcon className={`w-8 h-8 mx-auto mb-2 ${
                  decision === 'REFUSED' ? 'text-red-600' : 'text-gray-400'
                }`} />
                <p className={`font-medium ${
                  decision === 'REFUSED' ? 'text-red-700' : 'text-gray-700'
                }`}>Refuser</p>
                <p className="text-xs text-gray-500">Rejeter la demande</p>
              </button>
            </div>
          </div>

          {/* Refusal Reason */}
          {decision === 'REFUSED' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motif du refus *
                </label>
                <select
                  value={refusalReason}
                  onChange={(e) => setRefusalReason(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500"
                >
                  <option value="">Sélectionner un motif</option>
                  {refusalReasons.map((reason) => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Détails (optionnel)
                </label>
                <textarea
                  value={refusalDetails}
                  onChange={(e) => setRefusalDetails(e.target.value)}
                  placeholder="Précisions sur le motif du refus..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 resize-none"
                  rows={3}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Annuler
          </button>
          <button
            onClick={handleSubmit}
            disabled={!decision || (decision === 'REFUSED' && !refusalReason) || isLoading}
            className={`px-6 py-2 rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed ${
              decision === 'VALIDATED'
                ? 'bg-emerald-600 text-white hover:bg-emerald-700'
                : decision === 'REFUSED'
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-gray-300 text-gray-500'
            }`}
          >
            {isLoading ? 'Traitement...' : decision === 'VALIDATED' ? 'Confirmer la validation' : decision === 'REFUSED' ? 'Confirmer le refus' : 'Sélectionner une décision'}
          </button>
        </div>
      </div>
    </div>
  );
}
