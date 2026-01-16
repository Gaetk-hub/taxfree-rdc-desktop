import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  BanknotesIcon,
  UserIcon,
  BuildingStorefrontIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  CreditCardIcon,
  DevicePhoneMobileIcon,
  BuildingLibraryIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface RefundDetail {
  id: string;
  form: string;
  form_info: {
    id: string;
    form_number: string;
    status: string;
    status_display: string;
    traveler: {
      id: string;
      full_name: string;
      passport_last4: string;
      email: string;
      phone: string;
    };
    merchant: {
      id: string;
      name: string;
    } | null;
    outlet: {
      id: string;
      name: string;
    } | null;
    validation: {
      decision: string;
      decision_display: string;
      decided_at: string;
      agent_name: string;
      point_of_exit: string;
    } | null;
    eligible_amount: string;
    vat_amount: string;
    refund_amount: string;
    created_at: string;
  };
  currency: string;
  gross_amount: string;
  operator_fee: string;
  net_amount: string;
  payout_currency: string | null;
  exchange_rate_applied: string | null;
  payout_amount: string | null;
  actual_payout_amount: string | null;
  service_gain: string | null;
  service_gain_cdf: string | null;
  method: string;
  method_display: string;
  payment_details: Record<string, any>;
  status: string;
  status_display: string;
  initiated_at: string;
  initiated_by_info: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    role_display: string;
  } | null;
  paid_at: string | null;
  cash_collected: boolean;
  cash_collected_at: string | null;
  cash_collected_by_info: {
    id: string;
    email: string;
    full_name: string;
  } | null;
  cancelled_at: string | null;
  cancelled_by_info: {
    id: string;
    email: string;
    full_name: string;
  } | null;
  cancellation_reason: string;
  retry_count: number;
  max_retries: number;
  next_retry_at: string | null;
  attempts: Array<{
    id: string;
    provider: string;
    provider_request_id: string;
    provider_response_id: string;
    status: string;
    status_display: string;
    error_code: string;
    error_message: string;
    started_at: string;
    completed_at: string;
  }>;
  audit_trail: Array<{
    action: string;
    timestamp: string;
    actor_email: string;
    actor_role: string;
    metadata: Record<string, any>;
  }>;
  created_at: string;
  updated_at: string;
}

export default function RefundDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: refund, isLoading, error, refetch } = useQuery<RefundDetail>({
    queryKey: ['admin-refund-detail', id],
    queryFn: async () => {
      const response = await api.get(`/taxfree/admin/refunds/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });

  const formatAmount = (amount: string | number) => {
    return new Intl.NumberFormat('fr-FR').format(Number(amount));
  };

  const formatDate = (dateStr: string | null, includeTime = true) => {
    if (!dateStr) return '-';
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    };
    if (includeTime) {
      options.hour = '2-digit';
      options.minute = '2-digit';
    }
    return new Date(dateStr).toLocaleDateString('fr-FR', options);
  };

  const getMethodIcon = (method: string) => {
    switch (method) {
      case 'CARD':
        return <CreditCardIcon className="w-6 h-6" />;
      case 'BANK_TRANSFER':
        return <BuildingLibraryIcon className="w-6 h-6" />;
      case 'MOBILE_MONEY':
        return <DevicePhoneMobileIcon className="w-6 h-6" />;
      case 'CASH':
        return <CurrencyDollarIcon className="w-6 h-6" />;
      default:
        return <BanknotesIcon className="w-6 h-6" />;
    }
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      REFUND_INITIATED: 'Remboursement initié',
      REFUND_RETRY: 'Nouvelle tentative',
      REFUND_CANCELLED: 'Remboursement annulé',
      CASH_COLLECTED: 'Espèces collectées',
      RECEIPT_SENT: 'Reçu envoyé',
    };
    return labels[action] || action;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <ArrowPathIcon className="w-8 h-8 animate-spin text-blue-500" />
      </div>
    );
  }

  if (error || !refund) {
    return (
      <div className="text-center py-12">
        <BanknotesIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Remboursement non trouvé</h2>
        <p className="text-gray-500 mt-2">Le remboursement demandé n'existe pas.</p>
        <Link to="/admin/refunds" className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
          <ArrowLeftIcon className="w-4 h-4" />
          Retour à la liste
        </Link>
      </div>
    );
  }

  const getStatusIcon = () => {
    switch (refund.status) {
      case 'PAID':
        return <CheckCircleIcon className="w-6 h-6 text-white" />;
      case 'FAILED':
        return <XCircleIcon className="w-6 h-6 text-white" />;
      case 'CANCELLED':
        return <XCircleIcon className="w-6 h-6 text-white" />;
      default:
        return <ClockIcon className="w-6 h-6 text-white" />;
    }
  };

  const getHeaderGradient = () => {
    switch (refund.status) {
      case 'PAID':
        return 'from-emerald-500 via-emerald-600 to-teal-600';
      case 'FAILED':
        return 'from-red-500 via-red-600 to-rose-600';
      case 'CANCELLED':
        return 'from-gray-500 via-gray-600 to-slate-600';
      case 'INITIATED':
        return 'from-blue-500 via-blue-600 to-indigo-600';
      default:
        return 'from-amber-500 via-amber-600 to-orange-600';
    }
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className={`bg-gradient-to-r ${getHeaderGradient()} rounded-2xl p-6 text-white shadow-lg`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link
              to="/admin/refunds"
              className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors mt-1"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
                    {getStatusIcon()}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold">Remboursement</h1>
                    <p className="text-white/70 text-sm mt-0.5">
                      Bordereau{' '}
                      <Link to={`/admin/forms/${refund.form_info.id}`} className="text-white hover:text-white/80 font-mono underline">
                        {refund.form_info.form_number}
                      </Link>
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className="px-3 py-1.5 text-sm font-semibold rounded-lg bg-white/20 backdrop-blur border border-white/30">
                  {refund.status_display}
                </span>
                <span className="px-3 py-1.5 text-sm font-medium rounded-lg bg-white/10 border border-white/20">
                  {refund.method_display}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 lg:self-start">
            <button
              onClick={() => refetch()}
              className="p-2.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
              title="Actualiser"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Quick Stats in Header */}
        <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-white/20">
          <div className="text-center">
            <p className="text-white/70 text-xs uppercase tracking-wider">Montant brut</p>
            <p className="text-xl font-bold mt-1">{formatAmount(refund.gross_amount)} <span className="text-sm font-normal text-white/70">{refund.currency}</span></p>
          </div>
          <div className="text-center">
            <p className="text-amber-200 text-xs uppercase tracking-wider">Frais opérateur</p>
            <p className="text-xl font-bold text-amber-100 mt-1">-{formatAmount(refund.operator_fee)} <span className="text-sm font-normal text-amber-200">{refund.currency}</span></p>
          </div>
          <div className="text-center">
            <p className="text-emerald-200 text-xs uppercase tracking-wider">Montant net</p>
            <p className="text-xl font-bold text-emerald-100 mt-1">{formatAmount(refund.net_amount)} <span className="text-sm font-normal text-emerald-200">{refund.currency}</span></p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Method & Status Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Méthode de paiement</h2>
            <div className="flex items-center gap-4">
              <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${
                refund.status === 'PAID' ? 'bg-green-100 text-green-600' :
                refund.status === 'FAILED' ? 'bg-red-100 text-red-600' :
                'bg-blue-100 text-blue-600'
              }`}>
                {getMethodIcon(refund.method)}
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">{refund.method_display}</p>
                <p className={`text-sm ${
                  refund.status === 'PAID' ? 'text-green-600' :
                  refund.status === 'FAILED' ? 'text-red-600' :
                  'text-gray-500'
                }`}>
                  {refund.status_display}
                </p>
              </div>
            </div>

            {/* Payment Details */}
            {Object.keys(refund.payment_details).length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-2">Détails du paiement</p>
                <div className="bg-gray-50 rounded-lg p-3 text-sm">
                  {Object.entries(refund.payment_details).map(([key, value]) => (
                    <div key={key} className="flex justify-between py-1">
                      <span className="text-gray-500">{key}</span>
                      <span className="font-medium">{String(value)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Payout Currency Info */}
            {refund.payout_currency && refund.payout_currency !== refund.currency && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  💱 Conversion de devise
                </p>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Devise de paiement</p>
                      <p className="text-lg font-bold text-blue-700">{refund.payout_currency}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Taux de change appliqué</p>
                      <p className="text-sm font-medium">{refund.exchange_rate_applied || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Montant attendu</p>
                      <p className="text-sm font-medium">{formatAmount(refund.payout_amount || '0')} {refund.payout_currency}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Montant réellement payé</p>
                      <p className="text-lg font-bold text-blue-700">{formatAmount(refund.actual_payout_amount || refund.payout_amount || '0')} {refund.payout_currency}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Service Gain Info */}
            {refund.service_gain && parseFloat(refund.service_gain) > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <p className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                  💰 Gain de service
                </p>
                <div className="bg-amber-50 rounded-lg p-4 border border-amber-200">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500">Gain ({refund.payout_currency || refund.currency})</p>
                      <p className="text-lg font-bold text-amber-700">{formatAmount(refund.service_gain)} {refund.payout_currency || refund.currency}</p>
                    </div>
                    {refund.service_gain_cdf && parseFloat(refund.service_gain_cdf) > 0 && (
                      <div>
                        <p className="text-xs text-gray-500">Équivalent CDF</p>
                        <p className="text-sm font-medium">{formatAmount(refund.service_gain_cdf)} CDF</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Retry Info */}
            {refund.retry_count > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">Tentatives</span>
                  <span className="text-sm font-medium">{refund.retry_count} / {refund.max_retries}</span>
                </div>
                {refund.next_retry_at && (
                  <p className="text-xs text-gray-500 mt-1">
                    Prochaine tentative: {formatDate(refund.next_retry_at)}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Payment Attempts */}
          {refund.attempts.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-gray-400" />
                Historique des tentatives ({refund.attempts.length})
              </h2>
              <div className="space-y-3">
                {refund.attempts.map((attempt, index) => (
                  <div
                    key={attempt.id}
                    className={`p-4 rounded-lg border ${
                      attempt.status === 'SUCCESS' ? 'bg-green-50 border-green-200' :
                      attempt.status === 'FAILED' ? 'bg-red-50 border-red-200' :
                      'bg-gray-50 border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        {attempt.status === 'SUCCESS' ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        ) : attempt.status === 'FAILED' ? (
                          <XCircleIcon className="w-5 h-5 text-red-600" />
                        ) : (
                          <ClockIcon className="w-5 h-5 text-gray-500" />
                        )}
                        <div>
                          <p className="font-medium text-gray-900">
                            Tentative #{refund.attempts.length - index}
                          </p>
                          <p className="text-sm text-gray-500">{attempt.provider}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-gray-500">{formatDate(attempt.started_at)}</p>
                        <span className={`text-xs font-medium ${
                          attempt.status === 'SUCCESS' ? 'text-green-600' :
                          attempt.status === 'FAILED' ? 'text-red-600' :
                          'text-gray-500'
                        }`}>
                          {attempt.status_display}
                        </span>
                      </div>
                    </div>
                    
                    {attempt.error_message && (
                      <div className="mt-2 p-2 bg-red-100 rounded text-sm text-red-700">
                        <span className="font-medium">Erreur:</span> {attempt.error_message}
                        {attempt.error_code && (
                          <span className="ml-2 text-red-500">({attempt.error_code})</span>
                        )}
                      </div>
                    )}
                    
                    {(attempt.provider_request_id || attempt.provider_response_id) && (
                      <div className="mt-2 text-xs text-gray-500">
                        {attempt.provider_request_id && (
                          <p>Request ID: {attempt.provider_request_id}</p>
                        )}
                        {attempt.provider_response_id && (
                          <p>Response ID: {attempt.provider_response_id}</p>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Trail */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <DocumentTextIcon className="w-5 h-5 text-gray-400" />
              Historique des actions
            </h2>
            <div className="space-y-3">
              {refund.audit_trail.map((log, index) => (
                <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <BanknotesIcon className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{getActionLabel(log.action)}</p>
                    <p className="text-xs text-gray-500">
                      {log.actor_email} ({log.actor_role}) - {formatDate(log.timestamp)}
                    </p>
                  </div>
                </div>
              ))}
              {refund.audit_trail.length === 0 && (
                <p className="text-sm text-gray-500 text-center py-4">Aucune action enregistrée</p>
              )}
            </div>
          </div>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Traveler Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <UserIcon className="w-5 h-5 text-gray-400" />
              Voyageur
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{refund.form_info.traveler.full_name}</p>
                <p className="text-xs text-gray-500">Passeport: ***{refund.form_info.traveler.passport_last4}</p>
              </div>
              {refund.form_info.traveler.email && (
                <p className="text-xs text-gray-600">{refund.form_info.traveler.email}</p>
              )}
              {refund.form_info.traveler.phone && (
                <p className="text-xs text-gray-600">{refund.form_info.traveler.phone}</p>
              )}
            </div>
          </div>

          {/* Merchant Card */}
          {refund.form_info.merchant && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BuildingStorefrontIcon className="w-5 h-5 text-gray-400" />
                Commerçant
              </h2>
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">{refund.form_info.merchant.name}</p>
                {refund.form_info.outlet && (
                  <p className="text-xs text-gray-500">Point de vente: {refund.form_info.outlet.name}</p>
                )}
              </div>
            </div>
          )}

          {/* Validation Card */}
          {refund.form_info.validation && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-gray-400" />
                Validation douanière
              </h2>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  {refund.form_info.validation.decision === 'VALIDATED' ? (
                    <CheckCircleIcon className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircleIcon className="w-5 h-5 text-red-500" />
                  )}
                  <span className="text-sm font-medium">{refund.form_info.validation.decision_display}</span>
                </div>
                <p className="text-xs text-gray-500">Agent: {refund.form_info.validation.agent_name}</p>
                <p className="text-xs text-gray-500">Poste: {refund.form_info.validation.point_of_exit}</p>
                <p className="text-xs text-gray-500">{formatDate(refund.form_info.validation.decided_at)}</p>
              </div>
            </div>
          )}

          {/* Actors Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Acteurs</h2>
            <div className="space-y-4">
              {refund.initiated_by_info && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Initié par</p>
                  <p className="text-sm font-medium text-gray-900">{refund.initiated_by_info.full_name}</p>
                  <p className="text-xs text-gray-500">{refund.initiated_by_info.role_display}</p>
                  <p className="text-xs text-gray-500">{formatDate(refund.initiated_at)}</p>
                </div>
              )}
              
              {refund.cash_collected && refund.cash_collected_by_info && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-gray-500 uppercase">Espèces collectées par</p>
                  <p className="text-sm font-medium text-gray-900">{refund.cash_collected_by_info.full_name}</p>
                  <p className="text-xs text-gray-500">{formatDate(refund.cash_collected_at)}</p>
                </div>
              )}
              
              {refund.cancelled_by_info && (
                <div className="pt-3 border-t border-gray-100">
                  <p className="text-xs text-red-500 uppercase">Annulé par</p>
                  <p className="text-sm font-medium text-gray-900">{refund.cancelled_by_info.full_name}</p>
                  <p className="text-xs text-gray-500">{formatDate(refund.cancelled_at)}</p>
                  {refund.cancellation_reason && (
                    <p className="text-xs text-red-600 mt-1">{refund.cancellation_reason}</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Dates Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-gray-400" />
              Dates clés
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Créé</span>
                <span className="font-medium">{formatDate(refund.created_at)}</span>
              </div>
              {refund.initiated_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Initié</span>
                  <span className="font-medium">{formatDate(refund.initiated_at)}</span>
                </div>
              )}
              {refund.paid_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Payé</span>
                  <span className="font-medium text-green-600">{formatDate(refund.paid_at)}</span>
                </div>
              )}
              {refund.cash_collected_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Espèces collectées</span>
                  <span className="font-medium">{formatDate(refund.cash_collected_at)}</span>
                </div>
              )}
              {refund.cancelled_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Annulé</span>
                  <span className="font-medium text-red-600">{formatDate(refund.cancelled_at)}</span>
                </div>
              )}
            </div>
          </div>

          {/* Link to Form */}
          <Link
            to={`/admin/forms/${refund.form_info.id}`}
            className="block bg-blue-50 rounded-xl border border-blue-100 p-4 hover:bg-blue-100 transition-colors"
          >
            <div className="flex items-center gap-3">
              <DocumentTextIcon className="w-6 h-6 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-blue-700">Voir le bordereau complet</p>
                <p className="text-xs text-blue-600 font-mono">{refund.form_info.form_number}</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
      </div>
    </FadeIn>
  );
}
