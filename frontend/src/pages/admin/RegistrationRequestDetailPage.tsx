import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { merchantsApi } from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import toast from 'react-hot-toast';
import usePermissions from '../../hooks/usePermissions';
import {
  ArrowLeftIcon,
  BuildingStorefrontIcon,
  UserIcon,
  MapPinIcon,
  PhoneIcon,
  EnvelopeIcon,
  BanknotesIcon,
  DocumentTextIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  PaperClipIcon,
  ChatBubbleLeftRightIcon,
  DocumentPlusIcon,
  ArrowPathIcon,
  CalendarIcon,
  UserCircleIcon,
  ChevronDownIcon,
} from '@heroicons/react/24/outline';

interface RegistrationDocument {
  id: string;
  name: string;
  file_path: string;
  file_type: string;
  uploaded_at: string;
}

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
  documents: RegistrationDocument[];
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
  rccm_document: string;
  nif_document: string;
  id_nat_document: string;
  status: string;
  rejection_reason: string;
  created_at: string;
  updated_at: string;
  reviewed_at: string;
  reviewed_by_name?: string;
  comments?: RegistrationComment[];
  document_requests?: DocumentRequest[];
  pending_document_request?: DocumentRequest;
  created_user?: string | null;
}

const StatusBadge = ({ status, size = 'md' }: { status: string; size?: 'sm' | 'md' | 'lg' }) => {
  const statusConfig: Record<string, { bg: string; text: string; label: string; icon: React.ReactNode }> = {
    PENDING: { 
      bg: 'bg-amber-100', 
      text: 'text-amber-700', 
      label: 'En attente de révision',
      icon: <ClockIcon className="w-4 h-4" />
    },
    PENDING_DOCUMENTS: { 
      bg: 'bg-orange-100', 
      text: 'text-orange-700', 
      label: 'Complément demandé',
      icon: <DocumentPlusIcon className="w-4 h-4" />
    },
    APPROVED: { 
      bg: 'bg-emerald-100', 
      text: 'text-emerald-700', 
      label: 'Approuvée',
      icon: <CheckCircleIcon className="w-4 h-4" />
    },
    REJECTED: { 
      bg: 'bg-red-100', 
      text: 'text-red-700', 
      label: 'Rejetée',
      icon: <XCircleIcon className="w-4 h-4" />
    },
  };

  const config = statusConfig[status] || statusConfig.PENDING;
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-2 text-base',
  };

  return (
    <span className={`inline-flex items-center gap-1.5 ${sizeClasses[size]} ${config.bg} ${config.text} rounded-full font-medium`}>
      {config.icon}
      {config.label}
    </span>
  );
};

const DocumentRequestStatusBadge = ({ status }: { status: string }) => {
  const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
    PENDING: { bg: 'bg-amber-100', text: 'text-amber-700', label: 'En attente de réponse' },
    SUBMITTED: { bg: 'bg-blue-100', text: 'text-blue-700', label: 'Documents soumis' },
    REVIEWED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Révisé' },
    ACCEPTED: { bg: 'bg-emerald-100', text: 'text-emerald-700', label: 'Accepté' },
    REJECTED: { bg: 'bg-red-100', text: 'text-red-700', label: 'Rejeté' },
  };

  const config = statusConfig[status] || statusConfig.PENDING;

  return (
    <span className={`inline-flex items-center px-2 py-0.5 text-xs ${config.bg} ${config.text} rounded-full font-medium`}>
      {config.label}
    </span>
  );
};

const formatDate = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDateShort = (dateString: string) => {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function RegistrationRequestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Check permissions for approve action
  const { hasPermission, isSuperAdmin } = usePermissions();
  const canApprove = isSuperAdmin || hasPermission('MERCHANTS', 'APPROVE');

  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showDocRequestForm, setShowDocRequestForm] = useState(false);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [docMessage, setDocMessage] = useState('');
  const [docsList, setDocsList] = useState('');
  const [reviewAction, setReviewAction] = useState<'accept' | 'request_more' | 'reject'>('accept');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewDocsList, setReviewDocsList] = useState('');
  const [previewDoc, setPreviewDoc] = useState<{ name: string; url: string; type: string } | null>(null);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const { data, isLoading, error } = useQuery({
    queryKey: ['registration-request', id],
    queryFn: () => merchantsApi.getRegistrationRequest(id!),
    enabled: !!id,
    refetchInterval: 15000,
  });

  const request = data?.data as RegistrationRequest | null;

  const approveMutation = useMutation({
    mutationFn: () => merchantsApi.approveRequest(id!),
    onSuccess: () => {
      toast.success('Demande approuvée ! Email d\'activation envoyé.');
      queryClient.invalidateQueries({ queryKey: ['registration-request', id] });
      queryClient.invalidateQueries({ queryKey: ['registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['registration-requests-stats'] });
    },
    onError: () => toast.error('Erreur lors de l\'approbation'),
  });

  const rejectMutation = useMutation({
    mutationFn: (reason: string) => merchantsApi.rejectRequest(id!, reason),
    onSuccess: () => {
      toast.success('Demande rejetée.');
      setShowRejectForm(false);
      setRejectReason('');
      queryClient.invalidateQueries({ queryKey: ['registration-request', id] });
      queryClient.invalidateQueries({ queryKey: ['registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['registration-requests-stats'] });
    },
    onError: () => toast.error('Erreur lors du rejet'),
  });

  const requestDocsMutation = useMutation({
    mutationFn: (data: { message: string; documents_requested: string[] }) => 
      merchantsApi.requestDocuments(id!, data),
    onSuccess: () => {
      toast.success('Demande de complément envoyée.');
      setShowDocRequestForm(false);
      setDocMessage('');
      setDocsList('');
      queryClient.invalidateQueries({ queryKey: ['registration-request', id] });
      queryClient.invalidateQueries({ queryKey: ['registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['registration-requests-stats'] });
    },
    onError: () => toast.error('Erreur lors de l\'envoi'),
  });

  const reviewDocsMutation = useMutation({
    mutationFn: (data: { action: 'accept' | 'request_more' | 'reject'; notes?: string; message?: string; documents_requested?: string[]; rejection_reason?: string }) => 
      merchantsApi.reviewDocuments(id!, data),
    onSuccess: () => {
      toast.success('Révision enregistrée.');
      setShowReviewForm(false);
      setReviewNotes('');
      setReviewDocsList('');
      queryClient.invalidateQueries({ queryKey: ['registration-request', id] });
      queryClient.invalidateQueries({ queryKey: ['registration-requests'] });
      queryClient.invalidateQueries({ queryKey: ['registration-requests-stats'] });
    },
    onError: () => toast.error('Erreur lors de la révision'),
  });

  const resendActivationMutation = useMutation({
    mutationFn: () => merchantsApi.resendActivation(id!),
    onSuccess: (response) => {
      toast.success(response.data.detail || 'Lien d\'activation renvoyé avec succès.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'envoi du lien.');
    },
  });

  const sendPasswordResetMutation = useMutation({
    mutationFn: () => merchantsApi.sendPasswordReset(id!),
    onSuccess: (response) => {
      toast.success(response.data.detail || 'Lien de réinitialisation envoyé avec succès.');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'envoi du lien.');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !request) {
    return (
      <div className="text-center py-12">
        <ExclamationTriangleIcon className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Demande introuvable</h2>
        <p className="text-gray-500 mb-4">Cette demande n'existe pas ou a été supprimée.</p>
        <Link to="/admin/merchants" className="text-blue-600 hover:underline">
          Retour à la liste
        </Link>
      </div>
    );
  }

  const pendingDocRequest = request.pending_document_request;
  const allDocRequests = request.document_requests || [];
  const comments = request.comments || [];

  // Build timeline from comments and document requests
  const timelineItems: Array<{
    id: string;
    type: 'status_change' | 'comment' | 'doc_request' | 'doc_submitted' | 'doc_reviewed';
    title: string;
    description: string;
    author: string;
    date: string;
    icon: React.ReactNode;
    color: string;
    details?: React.ReactNode;
  }> = [];

  // Add comments to timeline (excluding DOCUMENT_REQUEST and MERCHANT_RESPONSE as they are handled by document_requests)
  comments
    .filter((comment) => !['DOCUMENT_REQUEST', 'MERCHANT_RESPONSE'].includes(comment.comment_type))
    .forEach((comment) => {
      let icon = <ChatBubbleLeftRightIcon className="w-4 h-4" />;
      let color = 'bg-gray-100 text-gray-600';
      let title = 'Commentaire';

      if (comment.comment_type === 'STATUS_CHANGE') {
        icon = <ArrowPathIcon className="w-4 h-4" />;
        color = 'bg-blue-100 text-blue-600';
        title = 'Changement de statut';
      }

      timelineItems.push({
        id: comment.id,
        type: 'comment',
        title,
        description: comment.content,
        author: comment.author_display_name,
        date: comment.created_at,
        icon,
        color,
      });
    });

  // Add document requests to timeline
  allDocRequests.forEach((docReq) => {
    timelineItems.push({
      id: `docreq-${docReq.id}`,
      type: 'doc_request',
      title: 'Demande de documents',
      description: docReq.message,
      author: docReq.requested_by_name || 'Admin',
      date: docReq.created_at,
      icon: <DocumentPlusIcon className="w-4 h-4" />,
      color: 'bg-orange-100 text-orange-600',
      details: docReq.documents_requested?.length > 0 ? (
        <div className="mt-2 pl-4 border-l-2 border-orange-200">
          <p className="text-xs text-gray-500 mb-1">Documents demandés :</p>
          <ul className="text-sm text-gray-700">
            {docReq.documents_requested.map((doc, i) => (
              <li key={i}>• {doc}</li>
            ))}
          </ul>
        </div>
      ) : null,
    });

    if (docReq.submitted_at) {
      timelineItems.push({
        id: `docsub-${docReq.id}`,
        type: 'doc_submitted',
        title: 'Documents soumis',
        description: docReq.merchant_response || 'Le commerçant a soumis les documents demandés.',
        author: request.company_name,
        date: docReq.submitted_at,
        icon: <CheckCircleIcon className="w-4 h-4" />,
        color: 'bg-emerald-100 text-emerald-600',
        details: docReq.documents?.length > 0 ? (
          <div className="mt-2 pl-4 border-l-2 border-emerald-200">
            <p className="text-xs text-gray-500 mb-1">Fichiers joints :</p>
            {docReq.documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-2 text-sm">
                <PaperClipIcon className="w-4 h-4 text-gray-400" />
                <button
                  onClick={() => setPreviewDoc({ name: doc.name, url: doc.file_path, type: doc.file_type })}
                  className="text-blue-600 hover:underline hover:text-blue-800"
                >
                  {doc.name}
                </button>
              </div>
            ))}
          </div>
        ) : null,
      });
    }

    if (docReq.reviewed_at) {
      timelineItems.push({
        id: `docrev-${docReq.id}`,
        type: 'doc_reviewed',
        title: 'Documents révisés',
        description: docReq.review_notes || 'Les documents ont été révisés.',
        author: docReq.reviewed_by_name || 'Admin',
        date: docReq.reviewed_at,
        icon: <CheckCircleIcon className="w-4 h-4" />,
        color: 'bg-blue-100 text-blue-600',
      });
    }
  });

  // Sort timeline by date (newest first)
  timelineItems.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/admin/merchants')}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{request.company_name}</h1>
              <StatusBadge status={request.status} size="md" />
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Demande soumise le {formatDateShort(request.created_at)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {request.status === 'PENDING' && (
            <>
              <button
                onClick={() => setShowRejectForm(true)}
                disabled={!canApprove}
                title={!canApprove ? 'Vous n\'avez pas la permission de rejeter' : ''}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors ${
                  canApprove 
                    ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Rejeter
              </button>
              <button
                onClick={() => setShowDocRequestForm(true)}
                className="px-4 py-2 bg-orange-50 text-orange-600 rounded-xl text-sm font-medium hover:bg-orange-100 transition-colors"
              >
                Demander complément
              </button>
              <button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending || !canApprove}
                title={!canApprove ? 'Vous n\'avez pas la permission d\'approuver' : ''}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 ${
                  canApprove 
                    ? 'bg-emerald-600 text-white hover:bg-emerald-700' 
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {approveMutation.isPending ? 'Approbation...' : 'Approuver'}
              </button>
            </>
          )}
          {request.status === 'PENDING_DOCUMENTS' && pendingDocRequest?.status === 'SUBMITTED' && (
            <button
              onClick={() => setShowReviewForm(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Réviser les documents
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Column - Main Info */}
        <div className="col-span-2 space-y-6">
          {/* Company Info Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <BuildingStorefrontIcon className="w-5 h-5 text-blue-600" />
                Informations de l'entreprise
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Raison sociale</p>
                  <p className="font-medium text-gray-900">{request.company_name}</p>
                </div>
                {request.trade_name && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Nom commercial</p>
                    <p className="font-medium text-gray-900">{request.trade_name}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">N° RCCM</p>
                  <p className="font-medium text-gray-900 font-mono">{request.registration_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">N° NIF</p>
                  <p className="font-medium text-gray-900 font-mono">{request.tax_id}</p>
                </div>
                {request.national_id && (
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">N° Id. Nat.</p>
                    <p className="font-medium text-gray-900 font-mono">{request.national_id}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Secteur d'activité</p>
                  <p className="font-medium text-gray-900">{request.business_sector}</p>
                </div>
              </div>
              {request.business_description && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-gray-700">{request.business_description}</p>
                </div>
              )}
            </div>
          </div>

          {/* Contact & Location */}
          <div className="grid grid-cols-2 gap-6">
            {/* Contact Info */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <UserIcon className="w-5 h-5 text-blue-600" />
                  Responsable
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Nom complet</p>
                  <p className="font-medium text-gray-900">{request.first_name} {request.last_name}</p>
                </div>
                <div className="flex items-center gap-2">
                  <EnvelopeIcon className="w-4 h-4 text-gray-400" />
                  <a href={`mailto:${request.email}`} className="text-blue-600 hover:underline">{request.email}</a>
                </div>
                <div className="flex items-center gap-2">
                  <PhoneIcon className="w-4 h-4 text-gray-400" />
                  <span className="text-gray-700">{request.phone}</span>
                </div>
              </div>
            </div>

            {/* Location */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <MapPinIcon className="w-5 h-5 text-blue-600" />
                  Localisation
                </h2>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Adresse</p>
                  <p className="font-medium text-gray-900">{request.address}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Ville</p>
                    <p className="font-medium text-gray-900">{request.city}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Province</p>
                    <p className="font-medium text-gray-900">{request.province}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Banking Info */}
          {(request.bank_name || request.mobile_money_number) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <BanknotesIcon className="w-5 h-5 text-blue-600" />
                  Informations bancaires
                </h2>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-2 gap-6">
                  {request.bank_name && (
                    <>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Banque</p>
                        <p className="font-medium text-gray-900">{request.bank_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">N° Compte</p>
                        <p className="font-medium text-gray-900 font-mono">{request.bank_account_number}</p>
                      </div>
                    </>
                  )}
                  {request.mobile_money_number && (
                    <>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Mobile Money</p>
                        <p className="font-medium text-gray-900">{request.mobile_money_provider}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Numéro</p>
                        <p className="font-medium text-gray-900 font-mono">{request.mobile_money_number}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Pending Document Request Alert */}
          {pendingDocRequest && (
            <div className={`rounded-xl border p-6 ${
              pendingDocRequest.status === 'SUBMITTED' 
                ? 'bg-blue-50 border-blue-200' 
                : 'bg-orange-50 border-orange-200'
            }`}>
              <div className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${
                  pendingDocRequest.status === 'SUBMITTED' 
                    ? 'bg-blue-100' 
                    : 'bg-orange-100'
                }`}>
                  {pendingDocRequest.status === 'SUBMITTED' 
                    ? <CheckCircleIcon className="w-6 h-6 text-blue-600" />
                    : <ClockIcon className="w-6 h-6 text-orange-600" />
                  }
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className={`font-semibold ${
                      pendingDocRequest.status === 'SUBMITTED' 
                        ? 'text-blue-900' 
                        : 'text-orange-900'
                    }`}>
                      {pendingDocRequest.status === 'SUBMITTED' 
                        ? 'Documents soumis - En attente de révision'
                        : 'Complément de dossier demandé'
                      }
                    </h3>
                    <DocumentRequestStatusBadge status={pendingDocRequest.status} />
                  </div>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Message envoyé au commerçant :</p>
                      <p className="text-sm text-gray-700 bg-white/50 rounded-lg p-3">{pendingDocRequest.message}</p>
                    </div>
                    
                    {pendingDocRequest.documents_requested?.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Documents demandés :</p>
                        <ul className="text-sm text-gray-700">
                          {pendingDocRequest.documents_requested.map((doc, i) => (
                            <li key={i} className="flex items-center gap-2">
                              <span className="w-1.5 h-1.5 bg-gray-400 rounded-full"></span>
                              {doc}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <UserCircleIcon className="w-4 h-4" />
                        Demandé par {pendingDocRequest.requested_by_name}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-4 h-4" />
                        {formatDate(pendingDocRequest.created_at)}
                      </span>
                    </div>

                    {pendingDocRequest.status === 'SUBMITTED' && (
                      <div className="mt-4 pt-4 border-t border-blue-200">
                        <p className="text-xs text-gray-500 mb-2">Réponse du commerçant :</p>
                        <p className="text-sm text-gray-700 bg-white/50 rounded-lg p-3 mb-3">
                          {pendingDocRequest.merchant_response || 'Aucun message'}
                        </p>
                        
                        {pendingDocRequest.documents?.length > 0 && (
                          <div>
                            <p className="text-xs text-gray-500 mb-2">Documents joints :</p>
                            <div className="space-y-2">
                              {pendingDocRequest.documents.map((doc) => (
                                <a
                                  key={doc.id}
                                  href={doc.file_path}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 p-2 bg-white rounded-lg hover:bg-gray-50 transition-colors"
                                >
                                  <PaperClipIcon className="w-4 h-4 text-blue-600" />
                                  <span className="text-sm text-blue-600 hover:underline">{doc.name}</span>
                                </a>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mt-4 text-xs text-gray-500">
                          <CalendarIcon className="w-4 h-4" />
                          Soumis le {formatDate(pendingDocRequest.submitted_at)}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Timeline & Status */}
        <div className="space-y-6">
          {/* Status Card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-900">État du dossier</h2>
            </div>
            <div className="p-6">
              <div className="flex items-center justify-center mb-4">
                <StatusBadge status={request.status} size="lg" />
              </div>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Soumis le</span>
                  <span className="font-medium">{formatDateShort(request.created_at)}</span>
                </div>
                {request.reviewed_at && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Révisé le</span>
                    <span className="font-medium">{formatDateShort(request.reviewed_at)}</span>
                  </div>
                )}
                {request.reviewed_by_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Par</span>
                    <span className="font-medium">{request.reviewed_by_name}</span>
                  </div>
                )}
              </div>

              {request.status === 'REJECTED' && request.rejection_reason && (
                <div className="mt-4 p-3 bg-red-50 rounded-lg border border-red-100">
                  <p className="text-xs text-red-600 font-medium mb-1">Motif du rejet :</p>
                  <p className="text-sm text-red-700">{request.rejection_reason}</p>
                </div>
              )}

              {/* Bouton renvoyer lien d'activation - visible si approuvé et compte non créé */}
              {request.status === 'APPROVED' && !request.created_user && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-amber-600 mb-2">
                    ⚠️ Le commerçant n'a pas encore activé son compte
                  </p>
                  <button
                    onClick={() => resendActivationMutation.mutate()}
                    disabled={resendActivationMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors disabled:opacity-50"
                  >
                    <EnvelopeIcon className="w-4 h-4" />
                    {resendActivationMutation.isPending ? 'Envoi en cours...' : 'Renvoyer le lien d\'activation'}
                  </button>
                </div>
              )}

              {/* Bouton réinitialisation mot de passe - visible si compte activé */}
              {request.status === 'APPROVED' && request.created_user && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <p className="text-xs text-gray-500 mb-2">
                    Le commerçant a oublié son mot de passe ?
                  </p>
                  <button
                    onClick={() => sendPasswordResetMutation.mutate()}
                    disabled={sendPasswordResetMutation.isPending}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors disabled:opacity-50"
                  >
                    <EnvelopeIcon className="w-4 h-4" />
                    {sendPasswordResetMutation.isPending ? 'Envoi en cours...' : 'Envoyer lien de réinitialisation'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Timeline - Accordéon */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <ClockIcon className="w-5 h-5 text-blue-600" />
                Historique
                <span className="text-xs font-normal text-gray-400 ml-2">
                  {timelineItems.length} événement{timelineItems.length > 1 ? 's' : ''}
                </span>
              </h2>
            </div>
            <div className="divide-y divide-gray-100">
              {timelineItems.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Aucune activité enregistrée</p>
              ) : (
                timelineItems.map((item) => {
                  const isExpanded = expandedItems.has(item.id);
                  const hasDetails = item.details || item.description;
                  
                  return (
                    <div key={item.id} className="group">
                      {/* Header compact - toujours visible */}
                      <button
                        onClick={() => hasDetails && toggleExpand(item.id)}
                        className={`w-full px-4 py-3 flex items-center gap-3 text-left transition-colors ${
                          hasDetails ? 'hover:bg-gray-50 cursor-pointer' : 'cursor-default'
                        }`}
                      >
                        {/* Icône de l'événement */}
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${item.color}`}>
                          {item.icon}
                        </div>
                        
                        {/* Infos principales */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-900 truncate">{item.title}</span>
                          </div>
                          <div className="flex items-center gap-2 text-xs text-gray-400">
                            <span>{item.author}</span>
                            <span>•</span>
                            <span>{formatDate(item.date)}</span>
                          </div>
                        </div>
                        
                        {/* Chevron */}
                        {hasDetails && (
                          <ChevronDownIcon 
                            className={`w-5 h-5 text-gray-400 transition-transform duration-200 ${
                              isExpanded ? 'rotate-180' : ''
                            }`}
                          />
                        )}
                      </button>
                      
                      {/* Détails - affichés uniquement si déplié */}
                      {isExpanded && hasDetails && (
                        <div className="px-4 pb-4 pl-[60px] animate-in slide-in-from-top-2 duration-200">
                          {item.description && (
                            <p className="text-sm text-gray-600 mb-2 bg-gray-50 rounded-lg p-3">
                              {item.description}
                            </p>
                          )}
                          {item.details}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Original Documents */}
          {(request.rccm_document || request.nif_document || request.id_nat_document) && (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
                <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                  <DocumentTextIcon className="w-5 h-5 text-blue-600" />
                  Documents initiaux
                </h2>
              </div>
              <div className="p-6 space-y-3">
                {request.rccm_document && (
                  <a href={request.rccm_document} target="_blank" rel="noopener noreferrer" 
                     className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <PaperClipIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-600">Document RCCM</span>
                  </a>
                )}
                {request.nif_document && (
                  <a href={request.nif_document} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <PaperClipIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-600">Document NIF</span>
                  </a>
                )}
                {request.id_nat_document && (
                  <a href={request.id_nat_document} target="_blank" rel="noopener noreferrer"
                     className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <PaperClipIcon className="w-4 h-4 text-blue-600" />
                    <span className="text-sm text-blue-600">Document Id. Nat.</span>
                  </a>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reject Modal */}
      {showRejectForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-900/60" onClick={() => setShowRejectForm(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Rejeter cette demande</h3>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Motif du rejet (obligatoire)..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500/20 mb-4"
                rows={4}
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowRejectForm(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (rejectReason.trim()) {
                      rejectMutation.mutate(rejectReason);
                    } else {
                      toast.error('Veuillez indiquer un motif');
                    }
                  }}
                  disabled={rejectMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                >
                  {rejectMutation.isPending ? 'En cours...' : 'Confirmer le rejet'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Request Modal */}
      {showDocRequestForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-900/60" onClick={() => setShowDocRequestForm(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Demander un complément</h3>
              <textarea
                value={docMessage}
                onChange={(e) => setDocMessage(e.target.value)}
                placeholder="Décrivez les documents ou informations manquants..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 mb-3"
                rows={4}
              />
              <input
                type="text"
                value={docsList}
                onChange={(e) => setDocsList(e.target.value)}
                placeholder="Documents demandés (séparés par des virgules)"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20 mb-4"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowDocRequestForm(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (docMessage.trim()) {
                      const docs = docsList.split(',').map(d => d.trim()).filter(Boolean);
                      requestDocsMutation.mutate({ message: docMessage, documents_requested: docs });
                    } else {
                      toast.error('Veuillez décrire les documents demandés');
                    }
                  }}
                  disabled={requestDocsMutation.isPending}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-medium hover:bg-orange-700 disabled:opacity-50"
                >
                  {requestDocsMutation.isPending ? 'Envoi...' : 'Envoyer la demande'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Review Documents Modal */}
      {showReviewForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-gray-900/60" onClick={() => setShowReviewForm(false)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Réviser les documents</h3>
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setReviewAction('accept')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                    reviewAction === 'accept' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Approuver
                </button>
                <button
                  onClick={() => setReviewAction('request_more')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                    reviewAction === 'request_more' ? 'bg-orange-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Demander plus
                </button>
                <button
                  onClick={() => setReviewAction('reject')}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium ${
                    reviewAction === 'reject' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  Rejeter
                </button>
              </div>
              <textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  reviewAction === 'request_more' 
                    ? 'Message pour le commerçant...' 
                    : reviewAction === 'reject'
                    ? 'Motif du rejet...'
                    : 'Notes (optionnel)...'
                }
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 mb-4"
                rows={3}
              />
              
              {reviewAction === 'request_more' && (
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Documents demandés <span className="text-gray-400">(séparés par virgule)</span>
                  </label>
                  <input
                    type="text"
                    value={reviewDocsList}
                    onChange={(e) => setReviewDocsList(e.target.value)}
                    placeholder="Ex: Attestation fiscale, Carte d'identité, Relevé bancaire"
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500/20"
                  />
                  <p className="text-xs text-gray-400 mt-1">Ces documents seront listés dans l'email envoyé au commerçant</p>
                </div>
              )}
              
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowReviewForm(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium"
                >
                  Annuler
                </button>
                <button
                  onClick={() => {
                    if (reviewAction === 'request_more' && !reviewNotes.trim()) {
                      toast.error('Veuillez saisir un message');
                      return;
                    }
                    if (reviewAction === 'reject' && !reviewNotes.trim()) {
                      toast.error('Veuillez saisir le motif du rejet');
                      return;
                    }
                    const docsArray = reviewDocsList.trim() 
                      ? reviewDocsList.split(',').map(d => d.trim()).filter(d => d)
                      : undefined;
                    reviewDocsMutation.mutate({
                      action: reviewAction,
                      notes: reviewNotes,
                      message: reviewAction === 'request_more' ? reviewNotes : undefined,
                      documents_requested: reviewAction === 'request_more' ? docsArray : undefined,
                      rejection_reason: reviewAction === 'reject' ? reviewNotes : undefined,
                    });
                  }}
                  disabled={reviewDocsMutation.isPending}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {reviewDocsMutation.isPending ? 'En cours...' : 'Confirmer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 py-8">
            <div className="fixed inset-0 bg-gray-900/70" onClick={() => setPreviewDoc(null)} />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                    <PaperClipIcon className="w-5 h-5 text-blue-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{previewDoc.name}</h3>
                    <p className="text-xs text-gray-500">{previewDoc.type || 'Document'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={previewDoc.url}
                    download={previewDoc.name}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                  >
                    <ArrowPathIcon className="w-4 h-4" />
                    Télécharger
                  </a>
                  <button
                    onClick={() => setPreviewDoc(null)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <XCircleIcon className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>
              
              {/* Preview Content */}
              <div className="flex-1 overflow-auto p-4 bg-gray-50">
                {previewDoc.type?.startsWith('image/') || previewDoc.url.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                  <div className="flex items-center justify-center min-h-[400px]">
                    <img
                      src={previewDoc.url}
                      alt={previewDoc.name}
                      className="max-w-full max-h-[70vh] object-contain rounded-lg shadow-lg"
                    />
                  </div>
                ) : previewDoc.type === 'application/pdf' || previewDoc.url.match(/\.pdf$/i) ? (
                  <iframe
                    src={previewDoc.url}
                    title={previewDoc.name}
                    className="w-full h-[70vh] rounded-lg border border-gray-200"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-center">
                    <div className="w-20 h-20 bg-gray-200 rounded-2xl flex items-center justify-center mb-4">
                      <DocumentTextIcon className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-gray-600 mb-2">Aperçu non disponible pour ce type de fichier</p>
                    <p className="text-sm text-gray-400 mb-4">{previewDoc.type || 'Type inconnu'}</p>
                    <a
                      href={previewDoc.url}
                      download={previewDoc.name}
                      className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                    >
                      <ArrowPathIcon className="w-5 h-5" />
                      Télécharger le fichier
                    </a>
                  </div>
                )}
              </div>
              
              {/* Footer */}
              <div className="p-4 border-t border-gray-200 bg-white rounded-b-2xl">
                <div className="flex items-center justify-between text-sm text-gray-500">
                  <span>Cliquez en dehors ou sur × pour fermer</span>
                  <a
                    href={previewDoc.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:underline"
                  >
                    Ouvrir dans un nouvel onglet
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </FadeIn>
  );
}
