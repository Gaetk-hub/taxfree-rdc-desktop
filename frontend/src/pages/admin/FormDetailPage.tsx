import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import { usePermissions } from '../../hooks/usePermissions';
import {
  ArrowLeftIcon,
  ArrowPathIcon,
  DocumentTextIcon,
  UserIcon,
  BuildingStorefrontIcon,
  ShieldCheckIcon,
  BanknotesIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  EnvelopeIcon,
  IdentificationIcon,
  CubeIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  PencilSquareIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface FormDetail {
  id: string;
  form_number: string;
  status: string;
  status_display: string;
  currency: string;
  eligible_amount: string;
  vat_amount: string;
  refund_amount: string;
  operator_fee: string;
  risk_score: number;
  risk_flags: string[];
  requires_control: boolean;
  rule_snapshot: Record<string, any>;
  qr_code_data: string | null;
  is_expired: boolean;
  can_validate: boolean;
  can_cancel: boolean;
  issued_at: string | null;
  expires_at: string;
  validated_at: string | null;
  cancelled_at: string | null;
  cancelled_by_info: {
    id: string;
    email: string;
    full_name: string;
  } | null;
  cancellation_reason: string;
  created_by_info: {
    id: string;
    email: string;
    full_name: string;
    role: string;
    role_display: string;
  } | null;
  created_at: string;
  updated_at: string;
  traveler: {
    id: string;
    passport_number: string;
    passport_number_last4: string;
    passport_country: string;
    passport_issue_date: string;
    passport_expiry_date: string;
    first_name: string;
    last_name: string;
    full_name: string;
    date_of_birth: string;
    nationality: string;
    residence_country: string;
    residence_address: string;
    email: string;
    phone: string;
    preferred_refund_method: string;
    forms_count: number;
  };
  invoice: {
    id: string;
    invoice_number: string;
    invoice_date: string;
    currency: string;
    subtotal: string;
    total_vat: string;
    total_amount: string;
    payment_method: string;
    payment_reference: string;
    notes: string;
    is_cancelled: boolean;
    merchant: {
      id: string;
      name: string;
      trade_name: string;
      registration_number: string;
      tax_id: string;
      city: string;
      province: string;
      contact_name: string;
      contact_email: string;
      contact_phone: string;
    };
    outlet: {
      id: string;
      name: string;
      code: string;
      city: string;
      address_line1: string;
    };
    items: Array<{
      id: string;
      product_code: string;
      barcode: string;
      product_name: string;
      product_category: string;
      description: string;
      quantity: string;
      unit_price: string;
      line_total: string;
      vat_rate: string;
      vat_amount: string;
      is_eligible: boolean;
      ineligibility_reason: string;
    }>;
    created_by_info: {
      id: string;
      email: string;
      full_name: string;
      role: string;
      role_display: string;
    } | null;
  };
  customs_validation: {
    id: string;
    decision: string;
    decision_display: string;
    refusal_reason: string;
    refusal_reason_display: string;
    refusal_details: string;
    physical_control_done: boolean;
    control_notes: string;
    agent_info: {
      id: string;
      email: string;
      full_name: string;
      agent_code: string;
    };
    point_of_exit: {
      id: string;
      code: string;
      name: string;
      type: string;
      type_display: string;
      city: string;
    };
    is_offline: boolean;
    offline_batch_id: string;
    decided_at: string;
  } | null;
  refund: {
    id: string;
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
    cancelled_by_info: any;
    cancellation_reason: string;
    retry_count: number;
    attempts: Array<{
      id: string;
      provider: string;
      status: string;
      status_display: string;
      error_code: string;
      error_message: string;
      started_at: string;
      completed_at: string;
    }>;
  } | null;
  email_history: Array<{
    action: string;
    timestamp: string;
    actor_email: string;
    metadata: Record<string, any>;
  }>;
  audit_trail: Array<{
    action: string;
    timestamp: string;
    actor_email: string;
    actor_role: string;
    metadata: Record<string, any>;
  }>;
}

export default function FormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [showStatusModal, setShowStatusModal] = useState(false);

  // Permission checks
  const canEdit = isSuperAdmin || hasPermission('FORMS', 'EDIT');

  const { data: form, isLoading, error, refetch } = useQuery<FormDetail>({
    queryKey: ['admin-form-detail', id],
    queryFn: async () => {
      const response = await api.get(`/taxfree/admin/forms/${id}/`);
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      CREATED: 'bg-gray-100 text-gray-700 border-gray-200',
      ISSUED: 'bg-blue-100 text-blue-700 border-blue-200',
      VALIDATION_PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      VALIDATED: 'bg-green-100 text-green-700 border-green-200',
      REFUNDED: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      REFUSED: 'bg-red-100 text-red-700 border-red-200',
      EXPIRED: 'bg-orange-100 text-orange-700 border-orange-200',
      CANCELLED: 'bg-gray-100 text-gray-500 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-700';
  };

  const getActionLabel = (action: string) => {
    const labels: Record<string, string> = {
      TAXFREE_FORM_CREATED: 'Bordereau créé',
      TAXFREE_FORM_ISSUED: 'Bordereau émis',
      TAXFREE_FORM_CANCELLED: 'Bordereau annulé',
      TAXFREE_FORM_EMAILED: 'Email envoyé',
      TAXFREE_FORM_PDF_DOWNLOADED: 'PDF téléchargé',
      SCAN_FORM: 'Bordereau scanné',
      CUSTOMS_VALIDATION: 'Validation douanière',
      REFUND_INITIATED: 'Remboursement initié',
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

  if (error || !form) {
    return (
      <div className="text-center py-12">
        <DocumentTextIcon className="w-16 h-16 mx-auto text-gray-300 mb-4" />
        <h2 className="text-xl font-semibold text-gray-900">Bordereau non trouvé</h2>
        <p className="text-gray-500 mt-2">Le bordereau demandé n'existe pas ou a été supprimé.</p>
        <Link to="/admin/forms" className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
          <ArrowLeftIcon className="w-4 h-4" />
          Retour à la liste
        </Link>
      </div>
    );
  }

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-start gap-4">
            <Link
              to="/admin/forms"
              className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors mt-1"
            >
              <ArrowLeftIcon className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
                    <DocumentTextIcon className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold font-mono tracking-wide text-gray-900">{form.form_number}</h1>
                    <p className="text-gray-500 text-sm mt-0.5">Créé le {formatDate(form.created_at)}</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-3 flex-wrap">
                <span className={`px-3 py-1.5 text-sm font-semibold rounded-lg border ${getStatusColor(form.status)}`}>
                  {form.status_display}
                </span>
                {form.requires_control && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-orange-100 text-orange-700 border border-orange-200 rounded-lg">
                    <ExclamationTriangleIcon className="w-4 h-4" />
                    Contrôle requis
                  </span>
                )}
                {form.is_expired && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium bg-red-100 text-red-700 border border-red-200 rounded-lg">
                    <ClockIcon className="w-4 h-4" />
                    Expiré
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3 lg:self-start">
            <button
              onClick={() => setShowStatusModal(true)}
              disabled={!canEdit}
              title={!canEdit ? "Vous n'avez pas la permission de modifier les bordereaux" : "Corriger le statut"}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                canEdit
                  ? 'bg-amber-50 border border-amber-200 text-amber-700 hover:bg-amber-100'
                  : 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <PencilSquareIcon className="w-4 h-4" />
              Corriger statut
            </button>
            <button
              onClick={() => refetch()}
              className="p-2.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors"
              title="Actualiser"
            >
              <ArrowPathIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
        
        {/* Quick Stats in Header */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div className="text-center">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Montant éligible</p>
            <p className="text-xl font-bold text-gray-900 mt-1">{formatAmount(form.eligible_amount)} <span className="text-sm font-normal text-gray-500">{form.currency}</span></p>
          </div>
          <div className="text-center">
            <p className="text-blue-600 text-xs uppercase tracking-wider">TVA</p>
            <p className="text-xl font-bold text-blue-600 mt-1">{formatAmount(form.vat_amount)} <span className="text-sm font-normal text-blue-500">{form.currency}</span></p>
          </div>
          <div className="text-center">
            <p className="text-emerald-600 text-xs uppercase tracking-wider">Remboursement</p>
            <p className="text-xl font-bold text-emerald-600 mt-1">{formatAmount(form.refund_amount)} <span className="text-sm font-normal text-emerald-500">{form.currency}</span></p>
          </div>
          <div className="text-center">
            <p className="text-gray-500 text-xs uppercase tracking-wider">Score risque</p>
            <p className={`text-xl font-bold mt-1 ${
              form.risk_score >= 70 ? 'text-red-600' :
              form.risk_score >= 40 ? 'text-orange-600' : 'text-green-600'
            }`}>{form.risk_score}/100</p>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Amounts Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BanknotesIcon className="w-5 h-5 text-gray-400" />
              Montants
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase">Montant éligible</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatAmount(form.eligible_amount)} <span className="text-sm font-normal">{form.currency}</span>
                </p>
              </div>
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-xs text-blue-600 uppercase">TVA</p>
                <p className="text-xl font-bold text-blue-700 mt-1">
                  {formatAmount(form.vat_amount)} <span className="text-sm font-normal">{form.currency}</span>
                </p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-xs text-gray-500 uppercase">Frais opérateur</p>
                <p className="text-xl font-bold text-gray-900 mt-1">
                  {formatAmount(form.operator_fee)} <span className="text-sm font-normal">{form.currency}</span>
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <p className="text-xs text-green-600 uppercase">Remboursement</p>
                <p className="text-xl font-bold text-green-700 mt-1">
                  {formatAmount(form.refund_amount)} <span className="text-sm font-normal">{form.currency}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Products Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <CubeIcon className="w-5 h-5 text-gray-400" />
              Produits ({form.invoice.items.length})
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Produit</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code-barres</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Catégorie</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qté</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Prix unit.</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">TVA</th>
                    <th className="px-3 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    <th className="px-3 py-2 text-center text-xs font-medium text-gray-500 uppercase">Éligible</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {form.invoice.items.map((item) => (
                    <tr key={item.id} className={!item.is_eligible ? 'bg-red-50' : ''}>
                      <td className="px-3 py-2">
                        <p className="text-sm font-medium text-gray-900">{item.product_name}</p>
                        {item.product_code && (
                          <p className="text-xs text-gray-500">Code: {item.product_code}</p>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-mono text-xs text-gray-600">
                          {item.barcode || '-'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="text-xs text-gray-600">{item.product_category}</span>
                      </td>
                      <td className="px-3 py-2 text-right text-sm">{item.quantity}</td>
                      <td className="px-3 py-2 text-right text-sm">{formatAmount(item.unit_price)}</td>
                      <td className="px-3 py-2 text-right text-sm">
                        {formatAmount(item.vat_amount)}
                        <span className="text-xs text-gray-400 ml-1">({item.vat_rate}%)</span>
                      </td>
                      <td className="px-3 py-2 text-right text-sm font-medium">{formatAmount(item.line_total)}</td>
                      <td className="px-3 py-2 text-center">
                        {item.is_eligible ? (
                          <CheckCircleIcon className="w-5 h-5 text-green-500 mx-auto" />
                        ) : (
                          <div className="flex items-center justify-center gap-1">
                            <XCircleIcon className="w-5 h-5 text-red-500" />
                            <span className="text-xs text-red-600">{item.ineligibility_reason}</span>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Customs Validation Card */}
          {form.customs_validation && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <ShieldCheckIcon className="w-5 h-5 text-gray-400" />
                Validation Douanière
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    {form.customs_validation.decision === 'VALIDATED' ? (
                      <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center">
                        <CheckCircleIcon className="w-6 h-6 text-green-600" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                        <XCircleIcon className="w-6 h-6 text-red-600" />
                      </div>
                    )}
                    <div>
                      <p className="font-semibold text-gray-900">{form.customs_validation.decision_display}</p>
                      <p className="text-sm text-gray-500">{formatDate(form.customs_validation.decided_at)}</p>
                    </div>
                  </div>
                  
                  {form.customs_validation.refusal_reason && (
                    <div className="bg-red-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-red-700">Motif de refus</p>
                      <p className="text-sm text-red-600 mt-1">{form.customs_validation.refusal_reason_display}</p>
                      {form.customs_validation.refusal_details && (
                        <p className="text-sm text-red-600 mt-1">{form.customs_validation.refusal_details}</p>
                      )}
                    </div>
                  )}
                  
                  {form.customs_validation.physical_control_done && (
                    <div className="bg-blue-50 rounded-lg p-3">
                      <p className="text-sm font-medium text-blue-700">Contrôle physique effectué</p>
                      {form.customs_validation.control_notes && (
                        <p className="text-sm text-blue-600 mt-1">{form.customs_validation.control_notes}</p>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Agent douanier</p>
                    <p className="text-sm font-medium text-gray-900">{form.customs_validation.agent_info.full_name}</p>
                    <p className="text-xs text-gray-500">{form.customs_validation.agent_info.email}</p>
                    <p className="text-xs text-gray-500">Code: {form.customs_validation.agent_info.agent_code}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase">Point de sortie</p>
                    <p className="text-sm font-medium text-gray-900">{form.customs_validation.point_of_exit.name}</p>
                    <p className="text-xs text-gray-500">
                      {form.customs_validation.point_of_exit.type_display} - {form.customs_validation.point_of_exit.city}
                    </p>
                  </div>
                  {form.customs_validation.is_offline && (
                    <div className="bg-yellow-50 rounded-lg p-2">
                      <p className="text-xs text-yellow-700">Validé en mode hors-ligne</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Refund Card */}
          {form.refund && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <BanknotesIcon className="w-5 h-5 text-gray-400" />
                Remboursement
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                      form.refund.status === 'PAID' ? 'bg-green-100' : 
                      form.refund.status === 'FAILED' ? 'bg-red-100' : 'bg-yellow-100'
                    }`}>
                      <BanknotesIcon className={`w-6 h-6 ${
                        form.refund.status === 'PAID' ? 'text-green-600' : 
                        form.refund.status === 'FAILED' ? 'text-red-600' : 'text-yellow-600'
                      }`} />
                    </div>
                    <div>
                      <p className="font-semibold text-gray-900">{form.refund.status_display}</p>
                      <p className="text-sm text-gray-500">{form.refund.method_display}</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-3 gap-3">
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Brut</p>
                      <p className="text-sm font-medium">{formatAmount(form.refund.gross_amount)} {form.refund.currency}</p>
                    </div>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-xs text-gray-500">Frais</p>
                      <p className="text-sm font-medium">{formatAmount(form.refund.operator_fee)} {form.refund.currency}</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-3">
                      <p className="text-xs text-green-600">Net</p>
                      <p className="text-sm font-bold text-green-700">{formatAmount(form.refund.net_amount)} {form.refund.currency}</p>
                    </div>
                  </div>

                  {/* Payout Currency Info */}
                  {form.refund.payout_currency && form.refund.payout_currency !== form.refund.currency && (
                    <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs text-blue-600 uppercase font-medium mb-2">💱 Conversion de devise</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Devise de paiement</p>
                          <p className="text-sm font-bold text-blue-700">{form.refund.payout_currency}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Taux appliqué</p>
                          <p className="text-sm font-medium">{form.refund.exchange_rate_applied || '-'}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Montant attendu</p>
                          <p className="text-sm font-medium">{formatAmount(form.refund.payout_amount || '0')} {form.refund.payout_currency}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Montant réellement payé</p>
                          <p className="text-sm font-bold text-blue-700">{formatAmount(form.refund.actual_payout_amount || form.refund.payout_amount || '0')} {form.refund.payout_currency}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Service Gain Info */}
                  {form.refund.service_gain && parseFloat(form.refund.service_gain) > 0 && (
                    <div className="mt-4 p-4 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs text-amber-600 uppercase font-medium mb-2">💰 Gain de service</p>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-xs text-gray-500">Gain ({form.refund.payout_currency || form.refund.currency})</p>
                          <p className="text-sm font-bold text-amber-700">{formatAmount(form.refund.service_gain)} {form.refund.payout_currency || form.refund.currency}</p>
                        </div>
                        {form.refund.service_gain_cdf && parseFloat(form.refund.service_gain_cdf) > 0 && (
                          <div>
                            <p className="text-xs text-gray-500">Équivalent CDF</p>
                            <p className="text-sm font-medium">{formatAmount(form.refund.service_gain_cdf)} CDF</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="space-y-3">
                  {form.refund.initiated_by_info && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Initié par</p>
                      <p className="text-sm font-medium text-gray-900">{form.refund.initiated_by_info.full_name}</p>
                      <p className="text-xs text-gray-500">{formatDate(form.refund.initiated_at)}</p>
                    </div>
                  )}
                  {form.refund.paid_at && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Payé le</p>
                      <p className="text-sm font-medium text-gray-900">{formatDate(form.refund.paid_at)}</p>
                    </div>
                  )}
                  {form.refund.cash_collected && form.refund.cash_collected_by_info && (
                    <div>
                      <p className="text-xs text-gray-500 uppercase">Espèces collectées par</p>
                      <p className="text-sm font-medium text-gray-900">{form.refund.cash_collected_by_info.full_name}</p>
                      <p className="text-xs text-gray-500">{formatDate(form.refund.cash_collected_at)}</p>
                    </div>
                  )}
                  {form.refund.retry_count > 0 && (
                    <div className="bg-yellow-50 rounded-lg p-2">
                      <p className="text-xs text-yellow-700">{form.refund.retry_count} tentative(s) de paiement</p>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Payment Attempts */}
              {form.refund.attempts.length > 0 && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-sm font-medium text-gray-700 mb-2">Historique des tentatives</p>
                  <div className="space-y-2">
                    {form.refund.attempts.map((attempt) => (
                      <div key={attempt.id} className={`flex items-center justify-between p-2 rounded-lg ${
                        attempt.status === 'SUCCESS' ? 'bg-green-50' : 
                        attempt.status === 'FAILED' ? 'bg-red-50' : 'bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-2">
                          {attempt.status === 'SUCCESS' ? (
                            <CheckCircleIcon className="w-4 h-4 text-green-600" />
                          ) : attempt.status === 'FAILED' ? (
                            <XCircleIcon className="w-4 h-4 text-red-600" />
                          ) : (
                            <ClockIcon className="w-4 h-4 text-gray-500" />
                          )}
                          <span className="text-sm">{attempt.provider}</span>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-500">{formatDate(attempt.started_at)}</p>
                          {attempt.error_message && (
                            <p className="text-xs text-red-600">{attempt.error_message}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Audit Trail */}
          <AuditTrailSection auditTrail={form.audit_trail} formatDate={formatDate} getActionLabel={getActionLabel} />

          {/* Status Overrides History */}
          <StatusOverridesSection formId={form.id} />
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
                <p className="text-sm font-medium text-gray-900">{form.traveler.full_name}</p>
                <p className="text-xs text-gray-500">Passeport: {form.traveler.passport_number}</p>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-gray-500">Nationalité</p>
                  <p className="font-medium">{form.traveler.nationality}</p>
                </div>
                <div>
                  <p className="text-gray-500">Résidence</p>
                  <p className="font-medium">{form.traveler.residence_country}</p>
                </div>
                <div>
                  <p className="text-gray-500">Date naissance</p>
                  <p className="font-medium">{formatDate(form.traveler.date_of_birth, false)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Bordereaux</p>
                  <p className="font-medium">{form.traveler.forms_count}</p>
                </div>
              </div>
              {form.traveler.email && (
                <div className="flex items-center gap-2 text-xs">
                  <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                  <span>{form.traveler.email}</span>
                </div>
              )}
              {form.traveler.phone && (
                <div className="flex items-center gap-2 text-xs">
                  <IdentificationIcon className="w-4 h-4 text-gray-400" />
                  <span>{form.traveler.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Merchant Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <BuildingStorefrontIcon className="w-5 h-5 text-gray-400" />
              Commerçant
            </h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-gray-900">{form.invoice.merchant.name}</p>
                {form.invoice.merchant.trade_name && (
                  <p className="text-xs text-gray-500">{form.invoice.merchant.trade_name}</p>
                )}
              </div>
              <div className="text-xs space-y-1">
                <p><span className="text-gray-500">RCCM:</span> {form.invoice.merchant.registration_number}</p>
                <p><span className="text-gray-500">NIF:</span> {form.invoice.merchant.tax_id}</p>
                <p><span className="text-gray-500">Ville:</span> {form.invoice.merchant.city}</p>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <p className="text-xs text-gray-500 uppercase mb-1">Point de vente</p>
                <p className="text-sm font-medium">{form.invoice.outlet.name}</p>
                <p className="text-xs text-gray-500">{form.invoice.outlet.address_line1}, {form.invoice.outlet.city}</p>
              </div>
            </div>
          </div>

          {/* Creator Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <IdentificationIcon className="w-5 h-5 text-gray-400" />
              Créé par
            </h2>
            {form.created_by_info ? (
              <div className="space-y-2">
                <p className="text-sm font-medium text-gray-900">{form.created_by_info.full_name}</p>
                <p className="text-xs text-gray-500">{form.created_by_info.email}</p>
                <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                  {form.created_by_info.role_display}
                </span>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Information non disponible</p>
            )}
            {form.invoice.created_by_info && form.invoice.created_by_info.id !== form.created_by_info?.id && (
              <div className="mt-3 pt-3 border-t border-gray-100">
                <p className="text-xs text-gray-500 uppercase mb-1">Facture créée par</p>
                <p className="text-sm font-medium">{form.invoice.created_by_info.full_name}</p>
                <p className="text-xs text-gray-500">{form.invoice.created_by_info.role_display}</p>
              </div>
            )}
          </div>

          {/* Risk Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ExclamationTriangleIcon className="w-5 h-5 text-gray-400" />
              Analyse de risque
            </h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Score de risque</span>
                <span className={`text-lg font-bold ${
                  form.risk_score >= 70 ? 'text-red-600' :
                  form.risk_score >= 40 ? 'text-orange-600' : 'text-green-600'
                }`}>
                  {form.risk_score}/100
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className={`h-2 rounded-full ${
                    form.risk_score >= 70 ? 'bg-red-500' :
                    form.risk_score >= 40 ? 'bg-orange-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${form.risk_score}%` }}
                />
              </div>
              {form.risk_flags.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-gray-500 uppercase mb-2">Indicateurs</p>
                  <div className="flex flex-wrap gap-1">
                    {form.risk_flags.map((flag, i) => (
                      <span key={i} className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded">
                        {flag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Email History */}
          {form.email_history.length > 0 && (
            <div className="bg-white rounded-xl border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <EnvelopeIcon className="w-5 h-5 text-gray-400" />
                Emails envoyés
              </h2>
              <div className="space-y-2">
                {form.email_history.map((email, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircleIcon className="w-4 h-4 text-green-500" />
                      <span className="text-sm">{getActionLabel(email.action)}</span>
                    </div>
                    <span className="text-xs text-gray-500">{formatDate(email.timestamp)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dates Card */}
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <ClockIcon className="w-5 h-5 text-gray-400" />
              Dates clés
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Créé</span>
                <span className="font-medium">{formatDate(form.created_at)}</span>
              </div>
              {form.issued_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Émis</span>
                  <span className="font-medium">{formatDate(form.issued_at)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Expire</span>
                <span className={`font-medium ${form.is_expired ? 'text-red-600' : ''}`}>
                  {formatDate(form.expires_at)}
                </span>
              </div>
              {form.validated_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Validé</span>
                  <span className="font-medium">{formatDate(form.validated_at)}</span>
                </div>
              )}
              {form.cancelled_at && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Annulé</span>
                  <span className="font-medium text-red-600">{formatDate(form.cancelled_at)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Correction Modal */}
      {showStatusModal && (
        <StatusCorrectionModal
          formId={form.id}
          formNumber={form.form_number}
          currentStatusDisplay={form.status_display}
          onClose={() => setShowStatusModal(false)}
          onSuccess={() => {
            setShowStatusModal(false);
            queryClient.invalidateQueries({ queryKey: ['admin-form-detail', id] });
            refetch();
          }}
        />
      )}
      </div>
    </FadeIn>
  );
}

interface StatusCorrectionModalProps {
  formId: string;
  formNumber: string;
  currentStatusDisplay: string;
  onClose: () => void;
  onSuccess: () => void;
}

interface AvailableStatus {
  value: string;
  label: string;
  recommended: boolean;
  warning: string | null;
}

function StatusCorrectionModal({
  formId,
  formNumber,
  currentStatusDisplay,
  onClose,
  onSuccess,
}: StatusCorrectionModalProps) {
  const queryClient = useQueryClient();
  const [newStatus, setNewStatus] = useState('');
  const [reason, setReason] = useState('');
  const [referenceDocument, setReferenceDocument] = useState('');
  const [notifyParties, setNotifyParties] = useState(true);
  const [error, setError] = useState('');

  // Fetch available statuses
  const { data: statusData } = useQuery<{ available_statuses: AvailableStatus[] }>({
    queryKey: ['available-statuses', formId],
    queryFn: async () => {
      const response = await api.get(`/taxfree/admin/overrides/available-statuses/${formId}/`);
      return response.data;
    },
  });

  // Fetch override history
  const { data: historyData } = useQuery<{ overrides: any[]; total_overrides: number }>({
    queryKey: ['override-history', formId],
    queryFn: async () => {
      const response = await api.get(`/taxfree/admin/overrides/history/${formId}/`);
      return response.data;
    },
  });

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/taxfree/admin/overrides/correct-status/', {
        form_id: formId,
        new_status: newStatus,
        reason,
        reference_document: referenceDocument,
        notify_parties: notifyParties,
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Statut corrigé avec succès');
      // Invalidate queries for dynamic update
      queryClient.invalidateQueries({ queryKey: ['override-history', formId] });
      queryClient.invalidateQueries({ queryKey: ['admin-form-detail'] });
      onSuccess();
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Erreur lors de la correction');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!newStatus) {
      setError('Veuillez sélectionner un nouveau statut');
      return;
    }
    if (reason.length < 10) {
      setError('La raison doit contenir au moins 10 caractères');
      return;
    }
    
    mutation.mutate();
  };

  const selectedStatus = statusData?.available_statuses.find(s => s.value === newStatus);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-orange-500 p-6 rounded-t-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-white/20 flex items-center justify-center">
              <PencilSquareIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Correction de statut</h2>
              <p className="text-amber-100">Bordereau {formNumber}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Warning */}
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
            <ExclamationCircleIcon className="w-6 h-6 text-amber-600 flex-shrink-0" />
            <div className="text-sm text-amber-800">
              <p className="font-semibold">Action administrative sensible</p>
              <p className="mt-1">Cette action sera enregistrée dans l'historique d'audit. La décision originale sera conservée. Les parties concernées seront notifiées.</p>
            </div>
          </div>

          {/* Current Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Statut actuel</label>
            <div className="px-4 py-3 bg-gray-100 rounded-lg text-gray-900 font-medium">
              {currentStatusDisplay}
            </div>
          </div>

          {/* New Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nouveau statut *</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              required
            >
              <option value="">Sélectionner un statut</option>
              {statusData?.available_statuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label} {status.recommended ? '(Recommandé)' : ''}
                </option>
              ))}
            </select>
            {selectedStatus?.warning && (
              <p className="mt-2 text-sm text-orange-600 flex items-center gap-1">
                <ExclamationCircleIcon className="w-4 h-4" />
                {selectedStatus.warning}
              </p>
            )}
          </div>

          {/* Reason */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Raison de la correction * <span className="text-gray-400">(min. 10 caractères)</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={4}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="Expliquez en détail la raison de cette correction (ex: L'agent douanier a signalé une erreur, le voyageur a présenté les produits après le refus initial...)"
              required
              minLength={10}
            />
            <p className="mt-1 text-xs text-gray-500">{reason.length}/10 caractères minimum</p>
          </div>

          {/* Reference Document */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Référence document <span className="text-gray-400">(optionnel)</span>
            </label>
            <input
              type="text"
              value={referenceDocument}
              onChange={(e) => setReferenceDocument(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500"
              placeholder="N° ticket, email, ou autre référence"
            />
          </div>

          {/* Notify Parties */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="notifyParties"
              checked={notifyParties}
              onChange={(e) => setNotifyParties(e.target.checked)}
              className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
            />
            <label htmlFor="notifyParties" className="text-sm text-gray-700">
              Notifier les parties concernées (agent douanier, commerçant)
            </label>
          </div>

          {/* Previous Overrides */}
          {historyData && historyData.total_overrides > 0 && (
            <div className="bg-gray-50 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">
                Corrections précédentes ({historyData.total_overrides})
              </h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {historyData.overrides.map((override: any) => (
                  <div key={override.id} className="text-xs bg-white p-2 rounded-lg border border-gray-100">
                    <div className="flex justify-between">
                      <span className="font-medium">
                        {override.previous_status_display} → {override.new_status_display}
                      </span>
                      <span className="text-gray-500">{new Date(override.created_at).toLocaleDateString('fr-FR')}</span>
                    </div>
                    <p className="text-gray-600 mt-1 truncate">{override.reason}</p>
                    <p className="text-gray-400">Par: {override.performed_by.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-200 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={mutation.isPending || !newStatus || reason.length < 10}
              className="flex-1 px-4 py-3 bg-amber-500 text-white rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {mutation.isPending ? 'Correction en cours...' : 'Confirmer la correction'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface AuditTrailSectionProps {
  auditTrail: Array<{
    action: string;
    timestamp: string;
    actor_email: string;
    actor_role: string;
    metadata: Record<string, any>;
  }>;
  formatDate: (dateStr: string | null, includeTime?: boolean) => string;
  getActionLabel: (action: string) => string;
}

function AuditTrailSection({ auditTrail, formatDate, getActionLabel }: AuditTrailSectionProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleItem = (index: number) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedItems(newExpanded);
  };

  const displayedItems = isExpanded ? auditTrail : auditTrail.slice(0, 3);

  return (
    <div className="bg-white rounded-xl border border-gray-100 p-6">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between text-left"
      >
        <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <ClockIcon className="w-5 h-5 text-gray-400" />
          Historique des actions
          <span className="text-sm font-normal text-gray-500">({auditTrail.length})</span>
        </h2>
        {isExpanded ? (
          <ChevronDownIcon className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronRightIcon className="w-5 h-5 text-gray-400" />
        )}
      </button>
      
      {auditTrail.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-4 mt-4">Aucune action enregistrée</p>
      ) : (
        <div className="space-y-2 mt-4">
          {displayedItems.map((log, index) => (
            <div key={index} className="border border-gray-100 rounded-lg overflow-hidden">
              <button
                onClick={() => toggleItem(index)}
                className="w-full flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                  <DocumentTextIcon className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{getActionLabel(log.action)}</p>
                  <p className="text-xs text-gray-500">{formatDate(log.timestamp)}</p>
                </div>
                {expandedItems.has(index) ? (
                  <ChevronDownIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                ) : (
                  <ChevronRightIcon className="w-4 h-4 text-gray-400 flex-shrink-0" />
                )}
              </button>
              
              {expandedItems.has(index) && (
                <div className="p-3 bg-white border-t border-gray-100 text-sm space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Utilisateur</span>
                    <span className="font-medium text-gray-900">{log.actor_email}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Rôle</span>
                    <span className="font-medium text-gray-900">{log.actor_role}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date/Heure</span>
                    <span className="font-medium text-gray-900">{formatDate(log.timestamp)}</span>
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 uppercase mb-1">Métadonnées</p>
                      <pre className="text-xs bg-gray-50 p-2 rounded overflow-x-auto">
                        {JSON.stringify(log.metadata, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
          
          {auditTrail.length > 3 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="w-full py-2 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              {isExpanded ? 'Voir moins' : `Voir tout (${auditTrail.length} actions)`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

interface StatusOverridesSectionProps {
  formId: string;
}

function StatusOverridesSection({ formId }: StatusOverridesSectionProps) {
  const { data } = useQuery<{ overrides: any[]; total_overrides: number }>({
    queryKey: ['override-history', formId],
    queryFn: async () => {
      const response = await api.get(`/taxfree/admin/overrides/history/${formId}/`);
      return response.data;
    },
  });

  if (!data || data.total_overrides === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-6">
      <h2 className="text-lg font-semibold text-amber-900 mb-4 flex items-center gap-2">
        <PencilSquareIcon className="w-5 h-5 text-amber-600" />
        Corrections administratives
        <span className="text-sm font-normal text-amber-600">({data.total_overrides})</span>
      </h2>
      <div className="space-y-3">
        {data.overrides.map((override: any) => (
          <div key={override.id} className="bg-white rounded-lg border border-amber-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-700 rounded">
                  {override.previous_status_display}
                </span>
                <span className="text-gray-400">→</span>
                <span className="px-2 py-1 text-xs font-medium bg-amber-100 text-amber-700 rounded">
                  {override.new_status_display}
                </span>
              </div>
              <span className="text-xs text-gray-500">
                {new Date(override.created_at).toLocaleDateString('fr-FR', {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            
            <p className="text-sm text-gray-700 mb-2">{override.reason}</p>
            
            {override.reference_document && (
              <div className="flex items-center gap-2 mb-2 px-2 py-1 bg-blue-50 rounded-md w-fit">
                <span className="text-xs font-medium text-blue-700">N° Ticket:</span>
                <span className="text-xs text-blue-900 font-mono">{override.reference_document}</span>
              </div>
            )}
            
            <div className="flex items-center justify-between text-xs text-gray-500 pt-2 border-t border-gray-100">
              <span>Par: <span className="font-medium text-gray-700">{override.performed_by.name}</span></span>
              {override.original_validation && (
                <span>
                  Décision originale: {override.original_validation.decision} par {override.original_validation.agent_name}
                </span>
              )}
            </div>
            
            {override.notifications_sent && override.notifications_sent.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-100">
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircleIcon className="w-3 h-3" />
                  {override.notifications_sent.length} notification(s) envoyée(s)
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
