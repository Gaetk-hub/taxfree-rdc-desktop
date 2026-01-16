import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantsApi } from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import toast from 'react-hot-toast';
import usePermissions from '../../hooks/usePermissions';
import {
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  BuildingStorefrontIcon,
  MapPinIcon,
  PhoneIcon,
  CalendarIcon,
  XMarkIcon,
  ExclamationTriangleIcon,
  ArrowPathIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserIcon,
  BanknotesIcon,
  BriefcaseIcon,
  DocumentPlusIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  PaperClipIcon,
} from '@heroicons/react/24/outline';

interface DocumentRequest {
  id: string;
  message: string;
  documents_requested: string[];
  status: string;
  requested_by_name: string;
  merchant_response: string;
  submitted_at: string;
  reviewed_by_name: string;
  reviewed_at: string;
  review_notes: string;
  documents: Array<{ id: string; name: string; file_path: string; file_type: string }>;
  created_at: string;
}

interface RegistrationComment {
  id: string;
  comment_type: string;
  author_display_name: string;
  content: string;
  old_status: string;
  new_status: string;
  is_internal: boolean;
  created_at: string;
}

interface RegistrationRequest {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  company_name: string;
  trade_name: string;
  registration_number: string;
  tax_id: string;
  national_id: string;
  address: string;
  city: string;
  province: string;
  commune: string;
  company_phone: string;
  company_email: string;
  bank_name: string;
  bank_account_number: string;
  mobile_money_number: string;
  mobile_money_provider: string;
  business_sector: string;
  business_description: string;
  status: string;
  rejection_reason: string;
  created_at: string;
  reviewed_at: string;
  comments?: RegistrationComment[];
  document_requests?: DocumentRequest[];
  pending_document_request?: DocumentRequest;
}

const StatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente' },
    PENDING_DOCUMENTS: { bg: 'bg-orange-100', text: 'text-orange-700', label: 'Docs requis' },
    APPROVED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Approuvé' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejeté' },
  };
  const config = statusConfig[status] || statusConfig.PENDING;
  return (
    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  );
};

const RequestDetailModal = ({ 
  request, 
  onClose, 
  onApprove, 
  onReject,
  onRequestDocuments,
  onReviewDocuments,
  isApproving,
  isRejecting,
  isRequestingDocs,
  isReviewingDocs,
  canApprove,
}: { 
  request: RegistrationRequest; 
  onClose: () => void;
  onApprove: () => void;
  onReject: (reason: string) => void;
  onRequestDocuments: (message: string, documents: string[]) => void;
  onReviewDocuments: (action: 'accept' | 'request_more' | 'reject', data: { notes?: string; message?: string; documents_requested?: string[]; rejection_reason?: string }) => void;
  isApproving: boolean;
  isRejecting: boolean;
  isRequestingDocs: boolean;
  isReviewingDocs: boolean;
  canApprove: boolean;
}) => {
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showDocRequestForm, setShowDocRequestForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reason, setReason] = useState('');
  const [docMessage, setDocMessage] = useState('');
  const [docsList, setDocsList] = useState('');
  const [reviewAction, setReviewAction] = useState<'accept' | 'request_more' | 'reject'>('accept');
  const [reviewNotes, setReviewNotes] = useState('');

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-2xl shadow-2xl max-w-4xl w-full mx-auto overflow-hidden transform transition-all">
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <BuildingStorefrontIcon className="w-6 h-6 text-white" />
                </div>
                <div className="text-left">
                  <h2 className="text-xl font-bold text-white">{request.company_name}</h2>
                  <p className="text-blue-100 text-sm">Demande d'inscription</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <StatusBadge status={request.status} />
                <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                  <XMarkIcon className="w-5 h-5 text-white" />
                </button>
              </div>
            </div>
          </div>

          <div className="p-6 max-h-[70vh] overflow-y-auto">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-6 pb-4 border-b border-gray-100">
              <CalendarIcon className="w-4 h-4" />
              <span>Soumis le {new Date(request.created_at).toLocaleDateString('fr-FR')}</span>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <UserIcon className="w-4 h-4 text-blue-500" />
                  Responsable
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Nom complet</p>
                    <p className="text-sm font-medium text-gray-900">{request.first_name} {request.last_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{request.email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Téléphone</p>
                    <p className="text-sm font-medium text-gray-900">{request.phone}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <BuildingStorefrontIcon className="w-4 h-4 text-emerald-500" />
                  Entreprise
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Nom commercial</p>
                    <p className="text-sm font-medium text-gray-900">{request.trade_name || request.company_name}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">N° RCCM</p>
                    <p className="text-sm font-medium text-gray-900 font-mono">{request.registration_number}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">N° NIF</p>
                    <p className="text-sm font-medium text-gray-900 font-mono">{request.tax_id}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <MapPinIcon className="w-4 h-4 text-amber-500" />
                  Localisation
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Adresse</p>
                    <p className="text-sm font-medium text-gray-900">{request.address}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Ville</p>
                    <p className="text-sm font-medium text-gray-900">{request.city}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Province</p>
                    <p className="text-sm font-medium text-gray-900">{request.province}</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-purple-500" />
                  Contact entreprise
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Email</p>
                    <p className="text-sm font-medium text-gray-900">{request.company_email}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Téléphone</p>
                    <p className="text-sm font-medium text-gray-900">{request.company_phone}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <BanknotesIcon className="w-4 h-4 text-green-500" />
                  Informations bancaires
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  {request.bank_name ? (
                    <>
                      <div>
                        <p className="text-xs text-gray-500">Banque</p>
                        <p className="text-sm font-medium text-gray-900">{request.bank_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">N° Compte</p>
                        <p className="text-sm font-medium text-gray-900 font-mono">{request.bank_account_number}</p>
                      </div>
                    </>
                  ) : request.mobile_money_number ? (
                    <>
                      <div>
                        <p className="text-xs text-gray-500">Mobile Money</p>
                        <p className="text-sm font-medium text-gray-900">{request.mobile_money_provider}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500">Numéro</p>
                        <p className="text-sm font-medium text-gray-900">{request.mobile_money_number}</p>
                      </div>
                    </>
                  ) : (
                    <p className="text-sm text-gray-500">Non renseigné</p>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <BriefcaseIcon className="w-4 h-4 text-indigo-500" />
                  Activité
                </h3>
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  <div>
                    <p className="text-xs text-gray-500">Secteur</p>
                    <p className="text-sm font-medium text-gray-900">{request.business_sector}</p>
                  </div>
                  {request.business_description && (
                    <div>
                      <p className="text-xs text-gray-500">Description</p>
                      <p className="text-sm text-gray-700">{request.business_description}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Reject Form */}
            {showRejectForm && (
              <div className="mb-6 p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-start gap-3 mb-3">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">Rejeter cette demande</h4>
                    <p className="text-sm text-red-600">Le commerçant sera notifié du rejet.</p>
                  </div>
                </div>
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motif du rejet (obligatoire)..."
                  className="w-full px-3 py-2 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 mb-3"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (reason.trim()) {
                        onReject(reason);
                      } else {
                        toast.error('Veuillez indiquer un motif');
                      }
                    }}
                    disabled={isRejecting}
                    className="px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
                    style={{ backgroundColor: '#dc2626', color: '#ffffff' }}
                  >
                    {isRejecting ? 'En cours...' : 'Confirmer le rejet'}
                  </button>
                  <button
                    onClick={() => { setShowRejectForm(false); setReason(''); }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Document Request Form */}
            {showDocRequestForm && (
              <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
                <div className="flex items-start gap-3 mb-3">
                  <DocumentPlusIcon className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-800">Demander un complément de dossier</h4>
                    <p className="text-sm text-orange-600">Le commerçant recevra un email avec un lien sécurisé.</p>
                  </div>
                </div>
                <textarea
                  value={docMessage}
                  onChange={(e) => setDocMessage(e.target.value)}
                  placeholder="Décrivez précisément les documents ou informations manquants..."
                  className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 mb-3"
                  rows={4}
                />
                <input
                  type="text"
                  value={docsList}
                  onChange={(e) => setDocsList(e.target.value)}
                  placeholder="Documents demandés (séparés par des virgules, optionnel)"
                  className="w-full px-3 py-2 border border-orange-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (docMessage.trim()) {
                        const docs = docsList.split(',').map(d => d.trim()).filter(Boolean);
                        onRequestDocuments(docMessage, docs);
                      } else {
                        toast.error('Veuillez décrire les documents demandés');
                      }
                    }}
                    disabled={isRequestingDocs}
                    className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                  >
                    {isRequestingDocs ? 'Envoi...' : 'Envoyer la demande'}
                  </button>
                  <button
                    onClick={() => { setShowDocRequestForm(false); setDocMessage(''); setDocsList(''); }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Review Documents Form */}
            {showReviewForm && request.pending_document_request?.status === 'SUBMITTED' && (
              <div className="mb-6 p-4 bg-blue-50 rounded-xl border border-blue-200">
                <div className="flex items-start gap-3 mb-3">
                  <ChatBubbleLeftRightIcon className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-blue-800">Réviser les documents soumis</h4>
                    <p className="text-sm text-blue-600">Le commerçant a répondu à votre demande.</p>
                  </div>
                </div>
                <div className="bg-white rounded-lg p-3 mb-3 border border-blue-100">
                  <p className="text-sm text-gray-700">{request.pending_document_request.merchant_response}</p>
                  {request.pending_document_request.documents?.length > 0 && (
                    <div className="mt-2 pt-2 border-t border-gray-100">
                      <p className="text-xs text-gray-500 mb-1">Documents joints :</p>
                      {request.pending_document_request.documents.map((doc) => (
                        <div key={doc.id} className="flex items-center gap-2 text-sm text-blue-600">
                          <PaperClipIcon className="w-4 h-4" />
                          {doc.name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setReviewAction('accept')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${reviewAction === 'accept' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    Approuver
                  </button>
                  <button
                    onClick={() => setReviewAction('request_more')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${reviewAction === 'request_more' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    Demander plus
                  </button>
                  <button
                    onClick={() => setReviewAction('reject')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium ${reviewAction === 'reject' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                  >
                    Rejeter
                  </button>
                </div>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder={reviewAction === 'request_more' ? 'Décrivez les documents supplémentaires...' : 'Notes (optionnel)...'}
                  className="w-full px-3 py-2 border border-blue-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 mb-3"
                  rows={3}
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      if (reviewAction === 'request_more' && !reviewNotes.trim()) {
                        toast.error('Veuillez décrire les documents supplémentaires');
                        return;
                      }
                      onReviewDocuments(reviewAction, {
                        notes: reviewNotes,
                        message: reviewAction === 'request_more' ? reviewNotes : undefined,
                        rejection_reason: reviewAction === 'reject' ? reviewNotes : undefined,
                      });
                    }}
                    disabled={isReviewingDocs}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isReviewingDocs ? 'En cours...' : 'Confirmer'}
                  </button>
                  <button
                    onClick={() => { setShowReviewForm(false); setReviewNotes(''); }}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
                  >
                    Annuler
                  </button>
                </div>
              </div>
            )}

            {/* Pending Document Request Info */}
            {request.status === 'PENDING_DOCUMENTS' && request.pending_document_request && !showReviewForm && (
              <div className="mb-6 p-4 bg-orange-50 rounded-xl border border-orange-200">
                <div className="flex items-start gap-3">
                  <ClockIcon className="w-5 h-5 text-orange-500 mt-0.5" />
                  <div className="flex-1">
                    <h4 className="font-medium text-orange-800">En attente de documents</h4>
                    <p className="text-sm text-orange-600 mt-1">{request.pending_document_request.message}</p>
                    {request.pending_document_request.status === 'SUBMITTED' && (
                      <div className="mt-3">
                        <span className="inline-flex items-center px-2 py-1 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                          Documents soumis - En attente de révision
                        </span>
                        <button
                          onClick={() => setShowReviewForm(true)}
                          className="ml-3 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                        >
                          Réviser les documents
                        </button>
                      </div>
                    )}
                    {request.pending_document_request.status === 'PENDING' && (
                      <p className="text-xs text-orange-500 mt-2">
                        Demande envoyée le {new Date(request.pending_document_request.created_at).toLocaleDateString('fr-FR')}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons for PENDING status */}
            {request.status === 'PENDING' && !showRejectForm && !showDocRequestForm && (
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100">
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={!canApprove}
                  title={!canApprove ? 'Vous n\'avez pas la permission de rejeter' : ''}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                    canApprove 
                      ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <XCircleIcon className="w-4 h-4" />
                  Rejeter
                </button>
                <button
                  onClick={() => setShowDocRequestForm(true)}
                  className="flex items-center gap-2 px-4 py-2.5 bg-orange-50 text-orange-600 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors"
                >
                  <DocumentPlusIcon className="w-4 h-4" />
                  Demander un complément
                </button>
                <button
                  onClick={onApprove}
                  disabled={isApproving || !canApprove}
                  title={!canApprove ? 'Vous n\'avez pas la permission d\'approuver' : ''}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                    canApprove 
                      ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                  }`}
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  {isApproving ? 'Approbation...' : 'Approuver'}
                </button>
              </div>
            )}

            {/* Comments/History Section */}
            {request.comments && request.comments.length > 0 && (
              <div className="mt-6 pt-4 border-t border-gray-100">
                <h4 className="font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <ChatBubbleLeftRightIcon className="w-4 h-4 text-gray-500" />
                  Historique des échanges
                </h4>
                <div className="space-y-3 max-h-48 overflow-y-auto">
                  {request.comments.map((comment) => (
                    <div key={comment.id} className={`p-3 rounded-lg ${comment.comment_type === 'MERCHANT_RESPONSE' ? 'bg-blue-50 border-l-4 border-blue-400' : 'bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-gray-700">{comment.author_display_name}</span>
                        <span className="text-xs text-gray-400">{new Date(comment.created_at).toLocaleString('fr-FR')}</span>
                      </div>
                      <p className="text-sm text-gray-600">{comment.content}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {request.status === 'REJECTED' && request.rejection_reason && (
              <div className="p-4 bg-red-50 rounded-xl border border-red-200">
                <div className="flex items-start gap-3">
                  <XCircleIcon className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-red-800">Demande rejetée</h4>
                    <p className="text-sm text-red-600 mt-1">{request.rejection_reason}</p>
                  </div>
                </div>
              </div>
            )}

            {request.status === 'APPROVED' && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                <div className="flex items-start gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-emerald-800">Demande approuvée</h4>
                    <p className="text-sm text-emerald-600 mt-1">Un email d'activation a été envoyé au commerçant.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default function MerchantsManagementPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<RegistrationRequest | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 5;
  
  // Check permissions for approve action
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canApprove = isSuperAdmin || hasPermission('MERCHANTS', 'APPROVE');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['registration-requests', statusFilter, searchQuery, currentPage],
    queryFn: () => merchantsApi.getRegistrationRequests({ 
      status: statusFilter || undefined,
      search: searchQuery || undefined,
      page: currentPage,
      page_size: pageSize
    }),
    refetchInterval: 10000, // Rafraîchissement automatique toutes les 10 secondes
    refetchIntervalInBackground: false, // Ne pas rafraîchir si l'onglet n'est pas actif
  });

  // Requête séparée pour les statistiques globales (sans filtres)
  const { data: statsData } = useQuery({
    queryKey: ['registration-requests-stats'],
    queryFn: async () => {
      const [all, pending, approved, rejected, pendingDocs] = await Promise.all([
        merchantsApi.getRegistrationRequests({ page_size: 1 }),
        merchantsApi.getRegistrationRequests({ status: 'PENDING', page_size: 1 }),
        merchantsApi.getRegistrationRequests({ status: 'APPROVED', page_size: 1 }),
        merchantsApi.getRegistrationRequests({ status: 'REJECTED', page_size: 1 }),
        merchantsApi.getRegistrationRequests({ status: 'PENDING_DOCUMENTS', page_size: 1 }),
      ]);
      return {
        total: all.data?.count || 0,
        pending: (pending.data?.count || 0) + (pendingDocs.data?.count || 0),
        approved: approved.data?.count || 0,
        rejected: rejected.data?.count || 0,
      };
    },
    refetchInterval: 10000,
    refetchIntervalInBackground: false,
  });

  const approveMutation = useMutation({
    mutationFn: (id: string) => merchantsApi.approveRequest(id),
    onSuccess: () => {
      toast.success('Demande approuvée ! Email d\'activation envoyé.');
      queryClient.invalidateQueries({ queryKey: ['registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['registration-requests-stats'] });
      setSelectedRequest(null);
    },
    onError: () => {
      toast.error('Erreur lors de l\'approbation');
    }
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) => merchantsApi.rejectRequest(id, reason),
    onSuccess: () => {
      toast.success('Demande rejetée.');
      queryClient.invalidateQueries({ queryKey: ['registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['registration-requests-stats'] });
      setSelectedRequest(null);
    },
    onError: () => {
      toast.error('Erreur lors du rejet');
    }
  });

  const requestDocsMutation = useMutation({
    mutationFn: ({ id, message, documents_requested }: { id: string; message: string; documents_requested: string[] }) => 
      merchantsApi.requestDocuments(id, { message, documents_requested }),
    onSuccess: () => {
      toast.success('Demande de complément envoyée au commerçant.');
      queryClient.invalidateQueries({ queryKey: ['registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['registration-requests-stats'] });
      setSelectedRequest(null);
    },
    onError: () => {
      toast.error('Erreur lors de l\'envoi de la demande');
    }
  });

  const reviewDocsMutation = useMutation({
    mutationFn: ({ id, action, data }: { id: string; action: 'accept' | 'request_more' | 'reject'; data: Record<string, unknown> }) => 
      merchantsApi.reviewDocuments(id, { action, ...data }),
    onSuccess: (_, variables) => {
      if (variables.action === 'accept') {
        toast.success('Dossier approuvé ! Email d\'activation envoyé.');
      } else if (variables.action === 'request_more') {
        toast.success('Nouvelle demande de complément envoyée.');
      } else {
        toast.success('Demande rejetée.');
      }
      queryClient.invalidateQueries({ queryKey: ['registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['registration-requests-stats'] });
      setSelectedRequest(null);
    },
    onError: () => {
      toast.error('Erreur lors de la révision');
    }
  });

  const requests = data?.data?.results || data?.data || [];
  const totalCount = data?.data?.count || (Array.isArray(requests) ? requests.length : 0);
  const totalPages = Math.ceil(totalCount / pageSize);
  const allRequests = Array.isArray(requests) ? requests : [];

  // Utiliser les statistiques globales de la requête dédiée
  const stats = statsData || {
    total: totalCount,
    pending: 0,
    approved: 0,
    rejected: 0,
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Demandes d'inscription</h1>
          <p className="text-sm text-gray-500 mt-1">Gérez les demandes d'inscription des commerçants</p>
        </div>
        <button 
          onClick={() => {
            refetch().then(() => {
              toast.success('Liste actualisée avec succès');
            });
          }}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Actualiser
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
          <p className="text-sm text-gray-500">Total demandes</p>
          <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <p className="text-sm text-amber-600">En attente</p>
          <p className="text-2xl font-bold text-amber-700">{stats.pending}</p>
        </div>
        <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-100">
          <p className="text-sm text-emerald-600">Approuvées</p>
          <p className="text-2xl font-bold text-emerald-700">{stats.approved}</p>
        </div>
        <div className="bg-red-50 rounded-xl p-4 border border-red-100">
          <p className="text-sm text-red-600">Rejetées</p>
          <p className="text-2xl font-bold text-red-700">{stats.rejected}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-4 border border-gray-100 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, email, n° RCCM..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-4 py-2.5 bg-gray-50 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Tous les statuts</option>
              <option value="PENDING">En attente</option>
              <option value="APPROVED">Approuvées</option>
              <option value="REJECTED">Rejetées</option>
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : allRequests.length === 0 ? (
          <div className="text-center py-12">
            <BuildingStorefrontIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune demande d'inscription</p>
            <p className="text-sm text-gray-400">Les nouvelles demandes apparaîtront ici</p>
          </div>
        ) : (
          <>
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Entreprise</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">N° RCCM</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Ville</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Contact</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Statut</th>
                  <th className="text-left px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {allRequests.map((request: RegistrationRequest) => (
                  <tr key={request.id} className="hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => navigate(`/admin/merchants/${request.id}`)}>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <BuildingStorefrontIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{request.company_name}</p>
                          <p className="text-xs text-gray-500">{request.business_sector}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600 font-mono">{request.registration_number}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <MapPinIcon className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{request.city}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900">{request.first_name} {request.last_name}</p>
                        <p className="text-xs text-gray-500">{request.email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-sm text-gray-600">
                        {new Date(request.created_at).toLocaleDateString('fr-FR')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={request.status} />
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/admin/merchants/${request.id}`); }}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                      >
                        <EyeIcon className="w-4 h-4" />
                        Examiner
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100">
                <p className="text-sm text-gray-500">
                  Page {currentPage} sur {totalPages}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                  >
                    <ChevronLeftIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="p-2 rounded-lg border border-gray-200 disabled:opacity-50 hover:bg-gray-50"
                  >
                    <ChevronRightIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedRequest && (
        <RequestDetailModal
          request={selectedRequest}
          onClose={() => setSelectedRequest(null)}
          onApprove={() => approveMutation.mutate(selectedRequest.id)}
          onReject={(reason) => rejectMutation.mutate({ id: selectedRequest.id, reason })}
          onRequestDocuments={(message, documents) => requestDocsMutation.mutate({ id: selectedRequest.id, message, documents_requested: documents })}
          onReviewDocuments={(action, data) => reviewDocsMutation.mutate({ id: selectedRequest.id, action, data })}
          isApproving={approveMutation.isPending}
          isRejecting={rejectMutation.isPending}
          canApprove={canApprove}
          isRequestingDocs={requestDocsMutation.isPending}
          isReviewingDocs={reviewDocsMutation.isPending}
        />
      )}
      </div>
    </FadeIn>
  );
}
