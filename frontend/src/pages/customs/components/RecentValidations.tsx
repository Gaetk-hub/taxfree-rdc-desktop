import {
  CheckCircleIcon,
  XCircleIcon,
  ClipboardDocumentCheckIcon,
} from '@heroicons/react/24/outline';

interface Validation {
  id: string;
  form_number: string;
  decision: string;
  traveler_name: string;
  total_amount: number;
  decided_at: string;
  physical_control_done: boolean;
}

interface RecentValidationsProps {
  validations: Validation[];
}

export default function RecentValidations({ validations }: RecentValidationsProps) {
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' CDF';
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    
    if (diffMins < 60) {
      return `Il y a ${diffMins} min`;
    }
    if (diffHours < 24) {
      return `Il y a ${diffHours}h`;
    }
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (validations.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
        <ClipboardDocumentCheckIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">Aucune validation récente</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
        <ClipboardDocumentCheckIcon className="w-5 h-5 text-blue-500" />
        <h3 className="font-semibold text-gray-900">Mes validations récentes</h3>
      </div>

      <div className="divide-y divide-gray-100">
        {validations.map((validation) => (
          <div key={validation.id} className="px-5 py-3 hover:bg-gray-50 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${
                  validation.decision === 'VALIDATED' 
                    ? 'bg-emerald-100' 
                    : 'bg-red-100'
                }`}>
                  {validation.decision === 'VALIDATED' ? (
                    <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-600" />
                  )}
                </div>
                <div>
                  <p className="font-medium text-gray-900">{validation.form_number}</p>
                  <p className="text-sm text-gray-500">{validation.traveler_name}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="font-medium text-gray-900">{formatAmount(validation.total_amount)}</p>
                <p className="text-xs text-gray-500">{formatDate(validation.decided_at)}</p>
              </div>
            </div>
            {validation.physical_control_done && (
              <div className="mt-2">
                <span className="inline-flex items-center px-2 py-0.5 bg-blue-50 text-blue-700 text-xs rounded-full">
                  Contrôle physique effectué
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
