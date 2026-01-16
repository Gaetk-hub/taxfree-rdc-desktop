import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { taxfreeApi } from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import toast from 'react-hot-toast';
import { 
  PrinterIcon, 
  XMarkIcon, 
  EnvelopeIcon,
  ArrowLeftIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';
import { getCountryName } from '../../data/countries';

// Mapping des catégories en français
const CATEGORY_LABELS: Record<string, string> = {
  'ELECTRONICS': 'Électronique',
  'CLOTHING': 'Vêtements',
  'JEWELRY': 'Bijouterie',
  'COSMETICS': 'Cosmétiques',
  'FOOD': 'Alimentation',
  'ALCOHOL': 'Alcool',
  'TOBACCO': 'Tabac',
  'LUXURY': 'Luxe',
  'WATCHES': 'Montres',
  'ACCESSORIES': 'Accessoires',
  'LEATHER': 'Maroquinerie',
  'PERFUME': 'Parfumerie',
  'SPORTS': 'Sport',
  'TOYS': 'Jouets',
  'HOME': 'Maison',
  'BOOKS': 'Livres',
  'SERVICES': 'Services',
  'OTHER': 'Autre',
};

const getCategoryLabel = (category: string): string => {
  return CATEGORY_LABELS[category?.toUpperCase()] || category || 'Non spécifié';
};

const getStatusConfig = (status: string) => {
  switch (status) {
    case 'VALIDATED':
      return { 
        bg: 'bg-gradient-to-r from-green-500 to-emerald-600', 
        text: 'text-white',
        icon: CheckCircleIcon,
        label: 'Validé par la douane'
      };
    case 'REFUNDED':
      return { 
        bg: 'bg-gradient-to-r from-emerald-600 to-teal-600', 
        text: 'text-white',
        icon: BanknotesIcon,
        label: 'Remboursé'
      };
    case 'REFUSED':
      return { 
        bg: 'bg-gradient-to-r from-red-500 to-rose-600', 
        text: 'text-white',
        icon: XCircleIcon,
        label: 'Refusé par la douane'
      };
    case 'EXPIRED':
      return { 
        bg: 'bg-gradient-to-r from-gray-400 to-gray-500', 
        text: 'text-white',
        icon: ClockIcon,
        label: 'Expiré'
      };
    case 'CANCELLED':
      return { 
        bg: 'bg-gradient-to-r from-gray-500 to-gray-600', 
        text: 'text-white',
        icon: XMarkIcon,
        label: 'Annulé'
      };
    case 'VALIDATION_PENDING':
      return { 
        bg: 'bg-gradient-to-r from-amber-400 to-orange-500', 
        text: 'text-white',
        icon: ClockIcon,
        label: 'En attente de validation'
      };
    case 'ISSUED':
    case 'CREATED':
    default:
      return { 
        bg: 'bg-gradient-to-r from-blue-500 to-indigo-600', 
        text: 'text-white',
        icon: ClockIcon,
        label: 'En attente de validation douane'
      };
  }
};

export default function FormDetailPage() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [itemsPage, setItemsPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const { data, isLoading } = useQuery({
    queryKey: ['form', id],
    queryFn: () => taxfreeApi.getForm(id!),
    enabled: !!id,
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => taxfreeApi.cancelForm(id!, reason),
    onSuccess: () => {
      toast.success('Bordereau annulé avec succès');
      queryClient.invalidateQueries({ queryKey: ['form', id] });
      setShowCancelModal(false);
      setCancelReason('');
    },
    onError: () => {
      toast.error('Erreur lors de l\'annulation');
    },
  });

  const sendEmailMutation = useMutation({
    mutationFn: () => taxfreeApi.sendEmail(id!),
    onSuccess: () => {
      toast.success('Email envoyé avec succès !');
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Erreur lors de l\'envoi';
      toast.error(message);
    },
  });

  const handlePrint = async () => {
    try {
      const response = await taxfreeApi.viewPdf(id!);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const printWindow = window.open(url, '_blank');
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print();
        };
      }
    } catch (error) {
      console.error('Error loading PDF:', error);
      toast.error('Erreur lors du chargement du PDF');
    }
  };

  const handleDownloadPdf = async () => {
    try {
      const response = await taxfreeApi.downloadPdf(id!);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `bordereau_${form?.form_number || id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast.success('PDF téléchargé avec succès');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Erreur lors du téléchargement du PDF');
    }
  };

  const handleCancel = () => {
    setShowCancelModal(true);
  };
  
  const confirmCancel = () => {
    if (cancelReason.trim()) {
      cancelMutation.mutate(cancelReason);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement du bordereau...</p>
        </div>
      </div>
    );
  }

  const form = data?.data;
  if (!form) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <ExclamationTriangleIcon className="h-16 w-16 text-gray-400 mx-auto" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">Bordereau non trouvé</h2>
          <p className="mt-2 text-gray-600">Ce bordereau n'existe pas ou a été supprimé.</p>
          <Link to="/merchant/forms" className="mt-4 inline-flex items-center gap-2 text-blue-600 hover:text-blue-700">
            <ArrowLeftIcon className="h-4 w-4" />
            Retour à la liste
          </Link>
        </div>
      </div>
    );
  }

  const statusConfig = getStatusConfig(form.status);
  const StatusIcon = statusConfig.icon;
  
  // Determine if cancel should be disabled (already refunded or validated)
  const canCancel = form.can_cancel && !['REFUNDED', 'VALIDATED', 'CANCELLED', 'EXPIRED'].includes(form.status);

  return (
    <FadeIn duration={400}>
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Back link */}
        <Link 
        to="/merchant/forms" 
        className="inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <ArrowLeftIcon className="h-4 w-4" />
        <span>Retour aux bordereaux</span>
      </Link>

      {/* Header Card - Premium Design */}
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        {/* Gradient Header */}
        <div className="relative overflow-hidden">
          <div className={`${statusConfig.bg} px-8 py-10`}>
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-0 right-0 w-96 h-96 bg-white rounded-full -translate-y-1/2 translate-x-1/2"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-white rounded-full translate-y-1/2 -translate-x-1/2"></div>
            </div>
            
            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              {/* Left Side - Form Info */}
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                  <StatusIcon className="h-10 w-10 text-white" />
                </div>
                <div>
                  <p className="text-white/70 text-xs font-semibold uppercase tracking-[0.2em] mb-1">Bordereau de détaxe</p>
                  <h1 className="text-3xl md:text-4xl font-black text-white tracking-tight mb-3">{form.form_number}</h1>
                  <div className="inline-flex items-center gap-2 bg-white/25 backdrop-blur-sm px-4 py-1.5 rounded-full shadow-sm">
                    <span className="w-2.5 h-2.5 bg-white rounded-full animate-pulse shadow-lg"></span>
                    <span className="text-white text-sm font-semibold">{form.status_display}</span>
                  </div>
                </div>
              </div>
              
              {/* Right Side - Actions */}
              <div className="flex flex-wrap gap-2">
                {form.traveler?.email && (
                  <button 
                    onClick={() => sendEmailMutation.mutate()}
                    disabled={sendEmailMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-white text-gray-800 rounded-xl font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all disabled:opacity-50"
                  >
                    <EnvelopeIcon className="h-5 w-5 text-blue-600" />
                    <span className="hidden sm:inline">{sendEmailMutation.isPending ? 'Envoi...' : 'Email'}</span>
                  </button>
                )}
                <button 
                  onClick={handlePrint}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-semibold transition-all border border-white/30"
                >
                  <PrinterIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">Imprimer</span>
                </button>
                <button 
                  onClick={handleDownloadPdf}
                  className="inline-flex items-center gap-2 px-5 py-3 bg-white/20 backdrop-blur-sm hover:bg-white/30 text-white rounded-xl font-semibold transition-all border border-white/30"
                >
                  <DocumentTextIcon className="h-5 w-5" />
                  <span className="hidden sm:inline">PDF</span>
                </button>
                {canCancel ? (
                  <button 
                    onClick={handleCancel}
                    disabled={cancelMutation.isPending}
                    className="inline-flex items-center gap-2 px-5 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-semibold shadow-lg transition-all disabled:opacity-50"
                  >
                    <XMarkIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">{cancelMutation.isPending ? 'Annulation...' : 'Annuler'}</span>
                  </button>
                ) : form.can_cancel === false && ['REFUNDED', 'VALIDATED'].includes(form.status) ? (
                  <button 
                    disabled
                    className="inline-flex items-center gap-2 px-5 py-3 bg-gray-400/50 text-white/70 rounded-xl font-semibold cursor-not-allowed"
                    title="Impossible d'annuler un bordereau déjà validé ou remboursé"
                  >
                    <XMarkIcon className="h-5 w-5" />
                    <span className="hidden sm:inline">Annuler</span>
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Financial Summary Cards */}
        <div className="p-6 bg-gradient-to-b from-gray-50 to-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Montant éligible */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <BanknotesIcon className="h-5 w-5 text-blue-600" />
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Montant éligible</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{Number(form.eligible_amount).toLocaleString('fr-FR')}</p>
              <p className="text-sm text-gray-400 mt-1">{form.currency}</p>
            </div>
            
            {/* TVA */}
            <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 bg-indigo-100 rounded-xl flex items-center justify-center">
                  <DocumentTextIcon className="h-5 w-5 text-indigo-600" />
                </div>
                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">TVA</p>
              </div>
              <p className="text-2xl font-bold text-gray-900">{Number(form.vat_amount).toLocaleString('fr-FR')}</p>
              <p className="text-sm text-gray-400 mt-1">{form.currency}</p>
            </div>
            
            {/* Remboursement */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-5 border-2 border-green-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-200 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50"></div>
              <div className="relative">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center shadow-lg">
                    <CheckCircleIcon className="h-5 w-5 text-white" />
                  </div>
                  <p className="text-xs text-green-700 uppercase tracking-wider font-bold">Remboursement</p>
                </div>
                <p className="text-3xl font-black text-green-600">{Number(form.refund_amount).toLocaleString('fr-FR')}</p>
                <p className="text-sm text-green-500 font-semibold mt-1">{form.currency}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Table Layout */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Section: Informations générales */}
        <div className="border-b border-gray-200">
          <div className="px-6 py-3 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Informations générales</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 w-1/4 font-medium">N° Bordereau</td>
                  <td className="px-6 py-3 font-mono font-bold text-blue-600">{form.form_number}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 w-1/4 font-medium">Statut</td>
                  <td className="px-6 py-3">
                    <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                      form.status === 'VALIDATED' || form.status === 'REFUNDED' ? 'bg-green-100 text-green-800' :
                      form.status === 'CANCELLED' || form.status === 'REFUSED' ? 'bg-red-100 text-red-800' :
                      form.status === 'EXPIRED' ? 'bg-gray-100 text-gray-800' :
                      'bg-blue-100 text-blue-800'
                    }`}>
                      {form.status_display}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 font-medium">N° Facture</td>
                  <td className="px-6 py-3 font-mono font-medium">{form.invoice_number || form.invoice?.invoice_number}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 font-medium">Date facture</td>
                  <td className="px-6 py-3">{form.invoice?.invoice_date ? new Date(form.invoice.invoice_date).toLocaleDateString('fr-FR') : '-'}</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 font-medium">Commerçant</td>
                  <td className="px-6 py-3 font-medium">{form.merchant_name || form.invoice?.merchant_name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 font-medium">Point de vente</td>
                  <td className="px-6 py-3">{form.invoice?.outlet_name || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Voyageur */}
        <div className="border-b border-gray-200">
          <div className="px-6 py-3 bg-blue-50">
            <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wider">Informations voyageur</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 w-1/4 font-medium">Nom complet</td>
                  <td className="px-6 py-3 font-bold text-gray-900">{form.traveler?.first_name} {form.traveler?.last_name}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 w-1/4 font-medium">Date de naissance</td>
                  <td className="px-6 py-3">{form.traveler?.date_of_birth ? new Date(form.traveler.date_of_birth).toLocaleDateString('fr-FR') : '-'}</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 font-medium">N° Passeport</td>
                  <td className="px-6 py-3 font-mono font-bold text-gray-900 bg-yellow-50">{form.traveler?.passport_number || form.traveler?.passport_display}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 font-medium">Pays d'émission</td>
                  <td className="px-6 py-3">
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{getFlagEmoji(form.traveler?.passport_country)}</span>
                      <span>{getCountryName(form.traveler?.passport_country)}</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 font-medium">Date émission passeport</td>
                  <td className="px-6 py-3">{form.traveler?.passport_issue_date ? new Date(form.traveler.passport_issue_date).toLocaleDateString('fr-FR') : '-'}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 font-medium">Date expiration passeport</td>
                  <td className="px-6 py-3">{form.traveler?.passport_expiry_date ? new Date(form.traveler.passport_expiry_date).toLocaleDateString('fr-FR') : '-'}</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 font-medium">Nationalité</td>
                  <td className="px-6 py-3">
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{getFlagEmoji(form.traveler?.nationality)}</span>
                      <span>{getCountryName(form.traveler?.nationality)}</span>
                    </span>
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 font-medium">Pays de résidence</td>
                  <td className="px-6 py-3">
                    <span className="flex items-center gap-2">
                      <span className="text-lg">{getFlagEmoji(form.traveler?.residence_country)}</span>
                      <span>{getCountryName(form.traveler?.residence_country)}</span>
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 font-medium">Email</td>
                  <td className="px-6 py-3">
                    {form.traveler?.email ? (
                      <a href={`mailto:${form.traveler.email}`} className="text-blue-600 hover:underline">{form.traveler.email}</a>
                    ) : '-'}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 font-medium">Téléphone</td>
                  <td className="px-6 py-3">{form.traveler?.phone || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Montants */}
        <div className="border-b border-gray-200">
          <div className="px-6 py-3 bg-green-50">
            <h3 className="text-sm font-semibold text-green-700 uppercase tracking-wider">Montants & Remboursement</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 w-1/4 font-medium">Montant éligible</td>
                  <td className="px-6 py-3 font-medium">{Number(form.eligible_amount).toLocaleString('fr-FR')} {form.currency}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 w-1/4 font-medium">TVA (16%)</td>
                  <td className="px-6 py-3 font-medium">{Number(form.vat_amount).toLocaleString('fr-FR')} {form.currency}</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-green-100 font-bold">💰 Remboursement net</td>
                  <td className="px-6 py-3 text-xl font-bold text-green-600 bg-green-50">{Number(form.refund_amount).toLocaleString('fr-FR')} {form.currency}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 font-medium"></td>
                  <td className="px-6 py-3"></td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Dates */}
        <div className="border-b border-gray-200">
          <div className="px-6 py-3 bg-purple-50">
            <h3 className="text-sm font-semibold text-purple-700 uppercase tracking-wider">Dates & Validité</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <tbody className="divide-y divide-gray-100">
                <tr>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 w-1/4 font-medium">Créé le</td>
                  <td className="px-6 py-3">{new Date(form.created_at).toLocaleString('fr-FR')}</td>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 w-1/4 font-medium">Émis le</td>
                  <td className="px-6 py-3">{form.issued_at ? new Date(form.issued_at).toLocaleString('fr-FR') : '-'}</td>
                </tr>
                <tr>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 font-medium">Expire le</td>
                  <td className={`px-6 py-3 font-medium ${form.is_expired ? 'text-red-600 bg-red-50' : ''}`}>
                    {new Date(form.expires_at).toLocaleString('fr-FR')}
                    {form.is_expired && <span className="ml-2 text-xs bg-red-200 text-red-800 px-2 py-0.5 rounded-full">EXPIRÉ</span>}
                  </td>
                  <td className="px-6 py-3 text-sm text-gray-500 bg-gray-50 font-medium">Validé le</td>
                  <td className={`px-6 py-3 ${form.validated_at ? 'text-green-600 font-medium bg-green-50' : ''}`}>
                    {form.validated_at ? new Date(form.validated_at).toLocaleString('fr-FR') : '-'}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: QR Code */}
        <div className="border-b border-gray-200">
          <div className="px-6 py-3 bg-gray-50">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">QR Code pour validation douane</h3>
          </div>
          <div className="p-6 flex items-center gap-6">
            <div className="bg-white p-3 rounded-xl border-2 border-gray-200 shadow-sm">
              <img 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(form.qr_code_data || form.form_number)}`}
                alt="QR Code"
                className="w-32 h-32"
              />
            </div>
            <div className="text-sm text-gray-600">
              <p className="font-medium mb-2">Instructions:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Présentez ce QR code à la douane lors de votre sortie du territoire</li>
                <li>Le bordereau doit être validé avant la date d'expiration</li>
                <li>Conservez vos articles avec vous pour le contrôle</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Risk Alert */}
        {form.requires_control && (
          <div className="border-b border-gray-200">
            <div className="px-6 py-3 bg-amber-100">
              <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                <ShieldExclamationIcon className="h-5 w-5" />
                Contrôle requis
              </h3>
            </div>
            <div className="p-6 bg-amber-50">
              <div className="flex items-center gap-4">
                <div>
                  <p className="text-sm text-amber-700">Score de risque:</p>
                  <p className="text-3xl font-bold text-amber-800">{form.risk_score}</p>
                </div>
                {form.risk_flags && form.risk_flags.length > 0 && (
                  <div>
                    <p className="text-sm text-amber-700 mb-2">Indicateurs:</p>
                    <div className="flex flex-wrap gap-1">
                      {form.risk_flags.map((flag: string, i: number) => (
                        <span key={i} className="text-xs bg-amber-200 text-amber-800 px-2 py-1 rounded-full">{flag}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Products Table - Full Width - Premium Design */}
      {form.invoice?.items && form.invoice.items.length > 0 && (
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header - Light Theme */}
          <div className="px-6 py-5 bg-gradient-to-r from-blue-50 to-indigo-50 border-b border-gray-200">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800">
                  Articles achetés
                </h3>
                <p className="text-gray-500 text-sm mt-1">{form.invoice.items.length} article{form.invoice.items.length > 1 ? 's' : ''} dans cette transaction</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 bg-green-100 border border-green-200 px-3 py-1.5 rounded-lg">
                  <span className="w-2.5 h-2.5 bg-green-500 rounded-full"></span>
                  <span className="text-green-700 text-xs font-medium">Éligible</span>
                </div>
                <div className="flex items-center gap-2 bg-red-100 border border-red-200 px-3 py-1.5 rounded-lg">
                  <span className="w-2.5 h-2.5 bg-red-500 rounded-full"></span>
                  <span className="text-red-700 text-xs font-medium">Non éligible</span>
                </div>
              </div>
            </div>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500 border-b border-gray-200">
                <tr>
                  <th className="px-4 py-4 text-left font-bold w-12">#</th>
                  <th className="px-4 py-4 text-left font-bold">Produit</th>
                  <th className="px-4 py-4 text-left font-bold">Catégorie</th>
                  <th className="px-4 py-4 text-center font-bold">Éligibilité</th>
                  <th className="px-4 py-4 text-center font-bold w-20">Qté</th>
                  <th className="px-4 py-4 text-right font-bold">Prix unit.</th>
                  <th className="px-4 py-4 text-right font-bold">TVA</th>
                  <th className="px-4 py-4 text-right font-bold">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(() => {
                  const allItems = form.invoice.items || [];
                  const totalItems = allItems.length;
                  void totalItems; // totalPages calculated in pagination UI below
                  const startIndex = (itemsPage - 1) * ITEMS_PER_PAGE;
                  const paginatedItems = allItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
                  
                  return paginatedItems.map((item: any, idx: number) => {
                    const index = startIndex + idx;
                    // Determine eligibility: check item.is_eligible first, then fallback to rule_snapshot excluded_categories
                    const excludedCategories = form.rule_snapshot?.excluded_categories || [];
                    const categoryExcluded = excludedCategories.some(
                      (cat: string) => cat.toUpperCase() === (item.product_category || '').toUpperCase()
                    );
                    const isExcluded = item.is_eligible === false || categoryExcluded;
                    const ineligibilityReason = item.ineligibility_reason || (categoryExcluded ? 'Catégorie exclue de la détaxe' : '');
                  
                  const vatAmount = Number(item.vat_amount || (item.quantity * item.unit_price * (item.vat_rate || 16) / 100));
                  const lineTotal = Number(item.line_total || item.quantity * item.unit_price);
                  
                  return (
                    <tr key={item.id || index} className={`transition-colors ${isExcluded ? 'bg-red-50/50 hover:bg-red-50' : 'hover:bg-gray-50'}`}>
                      <td className="px-4 py-4">
                        <span className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center text-sm font-bold text-gray-600">
                          {index + 1}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div>
                          <p className={`font-semibold ${isExcluded ? 'text-red-700' : 'text-gray-900'}`}>{item.product_name}</p>
                          {item.barcode && <p className="text-xs text-gray-500 mt-0.5 font-mono">📊 {item.barcode}</p>}
                          {item.product_code && <p className="text-xs text-gray-400 mt-0.5">Réf: {item.product_code}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700">
                          {getCategoryLabel(item.product_category)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-center">
                        {isExcluded ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-100 text-red-700 border border-red-200">
                              <XCircleIcon className="w-4 h-4" />
                              Non éligible
                            </span>
                            <span className="text-xs text-red-500 mt-1 max-w-[150px] text-center">
                              {ineligibilityReason || 'Catégorie exclue'}
                            </span>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-green-100 text-green-700 border border-green-200">
                            <CheckCircleIcon className="w-4 h-4" />
                            Éligible
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="font-bold text-gray-900">{item.quantity}</span>
                      </td>
                      <td className={`px-4 py-4 text-right ${isExcluded ? 'text-red-400' : 'text-gray-700'}`}>
                        <span className={isExcluded ? 'line-through' : ''}>{Number(item.unit_price).toLocaleString('fr-FR')}</span>
                        <span className="text-xs text-gray-400 ml-1">{form.currency}</span>
                      </td>
                      <td className={`px-4 py-4 text-right ${isExcluded ? 'text-red-400' : 'text-gray-500'}`}>
                        <span className={isExcluded ? 'line-through' : ''}>{vatAmount.toLocaleString('fr-FR')}</span>
                        <span className="text-xs text-gray-400 ml-1">{form.currency}</span>
                        <p className="text-xs text-gray-400">{item.vat_rate || 16}%</p>
                      </td>
                      <td className={`px-4 py-4 text-right ${isExcluded ? 'text-red-400' : ''}`}>
                        <span className={`font-bold ${isExcluded ? 'line-through text-red-400' : 'text-gray-900'}`}>
                          {lineTotal.toLocaleString('fr-FR')}
                        </span>
                        <span className="text-xs text-gray-400 ml-1">{form.currency}</span>
                        {isExcluded && (
                          <p className="text-xs text-red-500 font-medium mt-1">TVA non remboursable</p>
                        )}
                      </td>
                    </tr>
                  );
                });
                })()}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 border-t-2 border-gray-200">
                  <td colSpan={7} className="px-4 py-3 text-right text-sm text-gray-600 font-medium">Sous-total HT:</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">{Number(form.invoice.subtotal).toLocaleString('fr-FR')} {form.currency}</td>
                </tr>
                <tr className="bg-gray-50">
                  <td colSpan={7} className="px-4 py-3 text-right text-sm text-gray-600 font-medium">Total TVA:</td>
                  <td className="px-4 py-3 text-right font-bold text-gray-800">{Number(form.invoice.total_vat).toLocaleString('fr-FR')} {form.currency}</td>
                </tr>
                <tr className="bg-gradient-to-r from-blue-100 to-indigo-100 border-t-2 border-blue-200">
                  <td colSpan={7} className="px-4 py-4 text-right text-blue-800 font-bold text-lg">TOTAL TTC:</td>
                  <td className="px-4 py-4 text-right text-2xl font-black text-blue-600">{Number(form.invoice.total_amount).toLocaleString('fr-FR')} {form.currency}</td>
                </tr>
              </tfoot>
            </table>
          </div>
          
          {/* Pagination for items */}
          {form.invoice.items.length > ITEMS_PER_PAGE && (
            <div className="px-6 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Affichage de {((itemsPage - 1) * ITEMS_PER_PAGE) + 1} à {Math.min(itemsPage * ITEMS_PER_PAGE, form.invoice.items.length)} sur {form.invoice.items.length} articles
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setItemsPage(p => Math.max(1, p - 1))}
                  disabled={itemsPage === 1}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Précédent
                </button>
                <span className="text-sm text-gray-600">
                  Page {itemsPage} / {Math.ceil(form.invoice.items.length / ITEMS_PER_PAGE)}
                </span>
                <button
                  onClick={() => setItemsPage(p => Math.min(Math.ceil(form.invoice.items.length / ITEMS_PER_PAGE), p + 1))}
                  disabled={itemsPage >= Math.ceil(form.invoice.items.length / ITEMS_PER_PAGE)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                </button>
              </div>
            </div>
          )}
          
          {/* Summary of eligibility */}
          {(() => {
            const eligibleItems = form.invoice.items.filter((i: any) => i.is_eligible !== false);
            const excludedItems = form.invoice.items.filter((i: any) => i.is_eligible === false);
            const eligibleTotal = eligibleItems.reduce((sum: number, i: any) => sum + Number(i.line_total || i.quantity * i.unit_price), 0);
            const excludedTotal = excludedItems.reduce((sum: number, i: any) => sum + Number(i.line_total || i.quantity * i.unit_price), 0);
            
            if (excludedItems.length > 0) {
              return (
                <div className="px-6 py-4 bg-amber-50 border-t border-amber-200">
                  <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="w-6 h-6 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-amber-800">Attention : certains articles ne sont pas éligibles</p>
                        <p className="text-sm text-amber-700 mt-1">
                          {excludedItems.length} article{excludedItems.length > 1 ? 's' : ''} exclu{excludedItems.length > 1 ? 's' : ''} du remboursement 
                          (total: {excludedTotal.toLocaleString('fr-FR')} {form.currency})
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-4 text-sm">
                      <div className="bg-green-100 px-4 py-2 rounded-lg">
                        <p className="text-green-600 font-medium">Éligible</p>
                        <p className="text-green-800 font-bold">{eligibleTotal.toLocaleString('fr-FR')} {form.currency}</p>
                      </div>
                      <div className="bg-red-100 px-4 py-2 rounded-lg">
                        <p className="text-red-600 font-medium">Exclu</p>
                        <p className="text-red-800 font-bold">{excludedTotal.toLocaleString('fr-FR')} {form.currency}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            return null;
          })()}
        </div>
      )}
      {/* Cancellation Info Banner - Show if form is cancelled */}
      {form.status === 'CANCELLED' && form.cancellation_info && (
        <div className="bg-red-50 border-2 border-red-200 rounded-2xl p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 bg-red-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <XCircleIcon className="w-6 h-6 text-red-600" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold text-red-800 mb-2">Bordereau annulé</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <p className="text-red-600 font-medium">Date d'annulation</p>
                  <p className="text-red-800">{new Date(form.cancellation_info.cancelled_at).toLocaleString('fr-FR')}</p>
                </div>
                <div>
                  <p className="text-red-600 font-medium">Annulé par</p>
                  <p className="text-red-800">{form.cancellation_info.cancelled_by_name}</p>
                  {form.cancellation_info.cancelled_by_email && (
                    <p className="text-red-500 text-xs">{form.cancellation_info.cancelled_by_email}</p>
                  )}
                </div>
                <div>
                  <p className="text-red-600 font-medium">Motif</p>
                  <p className="text-red-800">{form.cancellation_info.reason}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden">
            <div className="bg-red-50 px-6 py-4 border-b border-red-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-red-800">Annuler le bordereau</h3>
                  <p className="text-sm text-red-600">Cette action est irréversible</p>
                </div>
              </div>
            </div>
            
            <div className="p-6">
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="text-sm text-gray-600">Bordereau</p>
                <p className="font-mono font-bold text-gray-900">{form.form_number}</p>
                <p className="text-sm text-gray-500 mt-1">
                  Montant: {Number(form.refund_amount).toLocaleString('fr-FR')} {form.currency}
                </p>
              </div>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Motif d'annulation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e.target.value)}
                  placeholder="Expliquez la raison de l'annulation..."
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
                  rows={3}
                />
                {cancelReason.trim().length === 0 && (
                  <p className="text-xs text-red-500 mt-1">Le motif est obligatoire</p>
                )}
              </div>
              
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
                <p className="text-sm text-amber-800">
                  <strong>Attention :</strong> L'annulation sera enregistrée avec votre identité et la date/heure exacte. Cette information sera visible dans l'historique du bordereau.
                </p>
              </div>
            </div>
            
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3 justify-end">
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(''); }}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-xl hover:bg-gray-50 font-medium"
              >
                Annuler
              </button>
              <button
                onClick={confirmCancel}
                disabled={!cancelReason.trim() || cancelMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {cancelMutation.isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Annulation...
                  </>
                ) : (
                  <>
                    <XCircleIcon className="w-4 h-4" />
                    Confirmer l'annulation
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </FadeIn>
  );
}

// Helper function to get flag emoji from country code
function getFlagEmoji(countryCode: string | undefined): string {
  if (!countryCode) return '🌍';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map(char => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
