import {
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface PendingForm {
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

interface PendingFormsListProps {
  forms: PendingForm[];
  onSelectForm: (form: PendingForm) => void;
  isLoading?: boolean;
}

export default function PendingFormsList({ forms, onSelectForm, isLoading }: PendingFormsListProps) {
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' CDF';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
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

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (forms.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <CheckCircleIcon className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
        <p className="text-gray-500">Aucun bordereau en attente de validation</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-amber-500" />
          <h3 className="font-semibold text-gray-900">Bordereaux en attente</h3>
          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
            {forms.length}
          </span>
        </div>
      </div>

      <div className="divide-y divide-gray-100 max-h-[400px] overflow-y-auto">
        {forms.map((form) => (
          <div
            key={form.id}
            className="px-5 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
            onClick={() => onSelectForm(form)}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center text-white font-medium text-sm">
                  {form.traveler_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-gray-900">{form.form_number}</p>
                    {form.is_expired && (
                      <span className="px-1.5 py-0.5 bg-red-100 text-red-700 text-xs rounded">Expiré</span>
                    )}
                    {form.requires_control && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-700 text-xs rounded flex items-center gap-1">
                        <ExclamationTriangleIcon className="w-3 h-3" />
                        Contrôle
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <span className="text-lg">{getFlag(form.traveler_nationality)}</span>
                    <span>{form.traveler_name}</span>
                    <span className="text-gray-300">•</span>
                    <span className="font-mono text-xs">{form.traveler_passport}</span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">{formatAmount(form.total_amount)}</p>
                <p className="text-xs text-emerald-600">TVA: {formatAmount(form.refund_amount)}</p>
              </div>
            </div>
            <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
              <span>{form.merchant_name}</span>
              <span>{formatDate(form.created_at)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
