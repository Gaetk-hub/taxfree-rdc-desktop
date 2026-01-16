import { useState } from 'react';
import { 
  CheckIcon, 
  XMarkIcon, 
  EyeIcon,
  ClockIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';

interface MerchantRequest {
  id: string;
  company_name: string;
  trade_name?: string;
  email: string;
  phone: string;
  province: string;
  city: string;
  registration_number: string;
  created_at: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
}

interface MerchantRequestsWidgetProps {
  requests: MerchantRequest[];
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  onViewDetails: (request: MerchantRequest) => void;
  isLoading?: boolean;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function MerchantRequestsWidget({
  requests,
  onApprove,
  onReject,
  onViewDetails,
  isLoading = false,
}: MerchantRequestsWidgetProps) {
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  const pendingRequests = requests.filter(r => r.status === 'PENDING');

  const handleReject = (id: string) => {
    if (rejectReason.trim()) {
      onReject(id, rejectReason);
      setRejectingId(null);
      setRejectReason('');
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <BuildingStorefrontIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Demandes d'inscription
              </h3>
              <p className="text-sm text-gray-500">
                {pendingRequests.length} en attente d'approbation
              </p>
            </div>
          </div>
          
          {pendingRequests.length > 0 && (
            <span className="flex items-center justify-center w-8 h-8 bg-amber-500 text-white text-sm font-bold rounded-full animate-pulse">
              {pendingRequests.length}
            </span>
          )}
        </div>
      </div>

      <div className="divide-y divide-gray-100 max-h-96 overflow-y-auto">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto" />
            <p className="text-gray-500 text-sm mt-3">Chargement...</p>
          </div>
        ) : pendingRequests.length === 0 ? (
          <div className="p-8 text-center">
            <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Aucune demande en attente</p>
          </div>
        ) : (
          pendingRequests.map((request) => (
            <div key={request.id} className="p-4 hover:bg-gray-50 transition-colors">
              {rejectingId === request.id ? (
                <div className="space-y-3">
                  <p className="text-sm font-medium text-gray-900">
                    Motif du rejet pour {request.company_name}
                  </p>
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    placeholder="Indiquez le motif du rejet..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleReject(request.id)}
                      disabled={!rejectReason.trim()}
                      className="flex-1 px-3 py-2 bg-rose-500 text-white text-sm font-medium rounded-lg hover:bg-rose-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Confirmer le rejet
                    </button>
                    <button
                      onClick={() => {
                        setRejectingId(null);
                        setRejectReason('');
                      }}
                      className="px-3 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {request.company_name.charAt(0).toUpperCase()}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-medium text-gray-900 truncate">
                          {request.company_name}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {request.email}
                        </p>
                      </div>
                      <span className="text-xs text-gray-400 whitespace-nowrap">
                        {formatDate(request.created_at)}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                      <span>{request.city}, {request.province}</span>
                      <span>•</span>
                      <span>RCCM: {request.registration_number}</span>
                    </div>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => onApprove(request.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-emerald-500 text-white text-xs font-medium rounded-lg hover:bg-emerald-600 transition-colors"
                      >
                        <CheckIcon className="w-4 h-4" />
                        Approuver
                      </button>
                      <button
                        onClick={() => setRejectingId(request.id)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-rose-100 text-rose-600 text-xs font-medium rounded-lg hover:bg-rose-200 transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4" />
                        Rejeter
                      </button>
                      <button
                        onClick={() => onViewDetails(request)}
                        className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-600 text-xs font-medium rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        <EyeIcon className="w-4 h-4" />
                        Détails
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
