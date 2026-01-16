import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refundsApi, taxfreeApi, rulesApi } from '../../services/api';
import toast from 'react-hot-toast';
import FadeIn from '../../components/ui/FadeIn';
import {
  CheckCircleIcon,
  BanknotesIcon,
  ArrowLeftIcon,
  DocumentArrowDownIcon,
  EnvelopeIcon,
  UserIcon,
  BuildingStorefrontIcon,
  PrinterIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';

const REFUND_METHODS = [
  { value: 'CASH', label: 'Espèces', icon: '💵', description: 'Paiement en espèces au guichet', available: true },
  { value: 'MOBILE_MONEY', label: 'Mobile Money', icon: '📱', description: 'Bientôt disponible', available: false },
  { value: 'BANK_TRANSFER', label: 'Virement', icon: '🏦', description: 'Bientôt disponible', available: false },
];

export default function RefundPage() {
  const { formId } = useParams<{ formId: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  
  // State from navigation (if coming from validation)
  const validationData = location.state?.validationData;
  
  const [step, setStep] = useState<'method' | 'count' | 'confirm' | 'complete'>('method');
  const [selectedMethod, setSelectedMethod] = useState('CASH');
  const [paymentDetails, setPaymentDetails] = useState<any>({});
  const [countedAmount, setCountedAmount] = useState('');
  const [refundId, setRefundId] = useState<string | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState('CDF');
  const [showServiceGainModal, setShowServiceGainModal] = useState(false);
  const [pendingServiceGain, setPendingServiceGain] = useState<{ counted: number; expected: number; gain: number } | null>(null);

  // Fetch active currencies
  const { data: currenciesData } = useQuery({
    queryKey: ['active-currencies'],
    queryFn: () => rulesApi.getActiveCurrencies(),
  });

  const currencies = currenciesData?.data || [];
  const selectedCurrencyData = currencies.find((c: any) => c.code === selectedCurrency);
  
  // Calculate payout amount in selected currency
  const calculatePayoutAmount = (amountCDF: number) => {
    if (selectedCurrency === 'CDF' || !selectedCurrencyData) {
      return amountCDF;
    }
    return amountCDF * parseFloat(selectedCurrencyData.exchange_rate);
  };

  // Fetch form data with refund info
  const { data: formData, isLoading: loadingForm } = useQuery({
    queryKey: ['taxfree-form-detail', formId],
    queryFn: () => taxfreeApi.getForm(formId!),
    enabled: !!formId,
  });

  const form = formData?.data || validationData?.form;

  // Check if form already has a refund and set the refundId
  useEffect(() => {
    if (form?.refund) {
      setRefundId(form.refund.id);
      // Set step based on refund status
      if (form.refund.status === 'PAID') {
        setStep('complete');
      } else if (form.refund.status === 'INITIATED' && form.refund.method === 'CASH') {
        setStep('count');
        setSelectedMethod('CASH');
      } else if (form.refund.status === 'INITIATED') {
        setStep('complete');
      }
    }
  }, [form?.refund]);

  // Initiate refund mutation
  const initiateMutation = useMutation({
    mutationFn: (data: { method: string; payment_details: any; payout_currency: string }) =>
      refundsApi.initiate(formId!, data),
    onSuccess: (response) => {
      setRefundId(response.data.id);
      if (selectedMethod === 'CASH') {
        setStep('count');
      } else {
        setStep('complete');
        toast.success('Remboursement initié avec succès');
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'initiation');
    },
  });

  // Collect cash mutation
  const collectCashMutation = useMutation({
    mutationFn: (actualAmount: number) => refundsApi.collectCash(refundId!, { actual_amount: actualAmount }),
    onSuccess: () => {
      setStep('complete');
      toast.success('Remboursement confirmé ! Le voyageur a reçu son argent.');
      queryClient.invalidateQueries({ queryKey: ['refund', refundId] });
      queryClient.invalidateQueries({ queryKey: ['taxfree-form-detail', formId] });
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.error;
      if (errorMsg === 'Refund must be initiated to collect') {
        toast.error('Ce remboursement a déjà été collecté ou n\'est pas prêt. Veuillez rafraîchir la page.');
      } else if (errorMsg === 'Only cash refunds can be collected') {
        toast.error('Seuls les remboursements en espèces peuvent être collectés manuellement.');
      } else {
        toast.error(errorMsg || 'Erreur lors de la confirmation du remboursement');
      }
    },
  });

  // Send receipt mutation
  const sendReceiptMutation = useMutation({
    mutationFn: () => refundsApi.sendReceipt(refundId!),
    onSuccess: () => {
      toast.success('Reçu envoyé par email !');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erreur lors de l\'envoi');
    },
  });

  // Download receipt
  const handleDownloadReceipt = async () => {
    if (!refundId) return;
    try {
      const response = await refundsApi.downloadReceipt(refundId);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recu_${form?.form_number || 'remboursement'}.pdf`;
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error('Erreur lors du téléchargement');
    }
  };

  const handleInitiateRefund = () => {
    initiateMutation.mutate({
      method: selectedMethod,
      payment_details: paymentDetails,
      payout_currency: selectedCurrency,
    });
  };

  // Process refund with actual amount
  const processRefund = (actualAmount: number) => {
    if (!refundId) {
      initiateMutation.mutate({
        method: 'CASH',
        payment_details: {},
        payout_currency: selectedCurrency,
      }, {
        onSuccess: (response) => {
          const newRefundId = response.data.id;
          setRefundId(newRefundId);
          refundsApi.collectCash(newRefundId, { actual_amount: actualAmount })
            .then(() => {
              setStep('complete');
              toast.success('Remboursement confirmé ! Le voyageur a reçu son argent.');
              queryClient.invalidateQueries({ queryKey: ['taxfree-form-detail', formId] });
            })
            .catch((err: any) => {
              toast.error(err.response?.data?.error || 'Erreur lors de la confirmation');
            });
        },
      });
    } else {
      collectCashMutation.mutate(actualAmount);
    }
  };

  const handleConfirmCash = async () => {
    const expectedAmount = selectedCurrency === 'CDF' || !selectedCurrencyData
      ? parseFloat(form?.refund_amount || 0)
      : calculatePayoutAmount(parseFloat(form?.refund_amount || 0));
    const counted = parseFloat(countedAmount);
    
    if (counted > expectedAmount + 0.01) {
      toast.error(`Le montant donné (${counted.toFixed(2)} ${selectedCurrency}) ne peut pas dépasser le montant prévu (${expectedAmount.toFixed(2)} ${selectedCurrency})`);
      return;
    }
    
    if (counted <= 0) {
      toast.error('Le montant doit être supérieur à 0');
      return;
    }
    
    const serviceGain = expectedAmount - counted;
    if (serviceGain > 0.01) {
      setPendingServiceGain({ counted, expected: expectedAmount, gain: serviceGain });
      setShowServiceGainModal(true);
      return;
    }
    
    processRefund(counted);
  };

  const handleConfirmServiceGain = () => {
    if (pendingServiceGain) {
      processRefund(pendingServiceGain.counted);
      setShowServiceGainModal(false);
      setPendingServiceGain(null);
    }
  };

  if (loadingForm) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!form) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Bordereau non trouvé</p>
        <button
          onClick={() => navigate('/customs/scan')}
          className="mt-4 text-primary-600 hover:text-primary-700"
        >
          Retour au scanner
        </button>
      </div>
    );
  }

  // If form is REFUSED, show refusal details instead of refund process
  if (form.status === 'REFUSED') {
    return (
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
            onClick={() => navigate('/customs/refunds')}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            Retour à la liste
          </button>
          <h1 className="text-2xl font-bold text-gray-900">Bordereau Refusé</h1>
          <p className="text-gray-500">N° {form.form_number}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Refusal Info */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <XMarkIcon className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-red-800">Validation Refusée</h2>
                <p className="text-sm text-red-600">
                  {form.validation?.decided_at 
                    ? new Date(form.validation.decided_at).toLocaleDateString('fr-FR', { 
                        day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' 
                      })
                    : '-'}
                </p>
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-red-700">Motif du refus</p>
                <p className="text-red-900 font-medium">{form.validation?.refusal_reason_display || form.validation?.refusal_reason || 'Non spécifié'}</p>
              </div>
              
              {form.validation?.refusal_details && (
                <div>
                  <p className="text-sm font-medium text-red-700">Détails</p>
                  <p className="text-red-800">{form.validation.refusal_details}</p>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-red-700">Agent</p>
                <p className="text-red-800">{form.validation?.agent_name || '-'}</p>
              </div>
            </div>
          </div>

          {/* Form Details */}
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Détails du bordereau</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <UserIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Voyageur</p>
                  <p className="font-medium text-gray-900">{form.traveler?.first_name} {form.traveler?.last_name}</p>
                  <p className="text-sm text-gray-500">***{form.traveler?.passport_number_last4}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <BuildingStorefrontIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Commerçant</p>
                  <p className="font-medium text-gray-900">{form.merchant_name}</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <BanknotesIcon className="w-5 h-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Montant (non remboursé)</p>
                  <p className="font-medium text-gray-900 line-through text-red-600">
                    {parseFloat(form.refund_amount).toLocaleString()} {form.currency}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Montant éligible</p>
                <p className="font-medium text-gray-900">{parseFloat(form.eligible_amount).toLocaleString()} {form.currency}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">TVA</p>
                <p className="font-medium text-gray-900">{parseFloat(form.vat_amount).toLocaleString()} {form.currency}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <FadeIn duration={400}>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <button
          onClick={() => navigate('/customs/scan')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 mb-4"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Retour
        </button>
        <h1 className="text-2xl font-bold text-gray-900">Remboursement</h1>
        <p className="text-gray-500">Bordereau N° {form.form_number}</p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          {['Méthode', 'Comptage', 'Confirmation', 'Terminé'].map((label, idx) => {
            const stepNames = ['method', 'count', 'confirm', 'complete'];
            const currentIdx = stepNames.indexOf(step);
            const isActive = idx <= currentIdx;
            const isCurrent = idx === currentIdx;
            
            return (
              <div key={label} className="flex-1 flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  isActive ? 'bg-primary-600 text-white' : 'bg-gray-200 text-gray-500'
                } ${isCurrent ? 'ring-2 ring-primary-300' : ''}`}>
                  {idx + 1}
                </div>
                <span className={`ml-2 text-sm ${isActive ? 'text-gray-900' : 'text-gray-400'}`}>
                  {label}
                </span>
                {idx < 3 && (
                  <div className={`flex-1 h-0.5 mx-4 ${isActive && idx < currentIdx ? 'bg-primary-600' : 'bg-gray-200'}`} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left - Form Summary */}
        <div className="lg:col-span-1">
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-4">
            {/* Amount Header - Dynamic based on selected currency */}
            <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 text-white">
              <p className="text-green-100 text-sm">Montant à rembourser</p>
              <p className="text-4xl font-bold mt-1">
                {selectedCurrency === 'CDF' || !selectedCurrencyData
                  ? parseFloat(form.refund_amount).toLocaleString()
                  : calculatePayoutAmount(parseFloat(form.refund_amount)).toFixed(2)
                }
              </p>
              <p className="text-green-100">{selectedCurrency}</p>
              {selectedCurrency !== 'CDF' && selectedCurrencyData && (
                <p className="text-green-200 text-xs mt-1">
                  ({parseFloat(form.refund_amount).toLocaleString()} CDF)
                </p>
              )}
            </div>
            
            {/* Details */}
            <div className="p-4 space-y-4">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <UserIcon className="w-3 h-3" /> Voyageur
                </p>
                <p className="font-medium text-gray-900">{form.traveler?.first_name} {form.traveler?.last_name}</p>
                <p className="text-sm text-gray-500">{form.traveler?.passport_number || `***${form.traveler?.passport_number_last4}`}</p>
              </div>
              
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider flex items-center gap-1">
                  <BuildingStorefrontIcon className="w-3 h-3" /> Commerçant
                </p>
                <p className="font-medium text-gray-900">{form.merchant_name}</p>
                <p className="text-sm text-gray-500">Facture: {form.invoice_number}</p>
              </div>
              
              <div className="pt-3 border-t border-gray-100">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">TVA brute</span>
                  <span>{parseFloat(form.vat_amount).toLocaleString()} CDF</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Frais</span>
                  <span>-{parseFloat(form.operator_fee || 0).toLocaleString()} CDF</span>
                </div>
                <div className="flex justify-between font-semibold text-green-600 mt-2 pt-2 border-t border-gray-100">
                  <span>Net</span>
                  <span>
                    {selectedCurrency === 'CDF' || !selectedCurrencyData
                      ? `${parseFloat(form.refund_amount).toLocaleString()} CDF`
                      : `${calculatePayoutAmount(parseFloat(form.refund_amount)).toFixed(2)} ${selectedCurrency}`
                    }
                  </span>
                </div>
                {selectedCurrency !== 'CDF' && selectedCurrencyData && (
                  <div className="text-xs text-gray-500 mt-1 text-right">
                    Taux: 1 {selectedCurrency} = {Math.round(1 / parseFloat(selectedCurrencyData.exchange_rate)).toLocaleString()} CDF
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right - Steps Content */}
        <div className="lg:col-span-2">
          {/* Step 1: Select Method */}
          {step === 'method' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Choisir le mode de remboursement</h2>
              
              {/* Currency Selection */}
              {currencies.length > 1 && (
                <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h3 className="font-medium text-blue-900 mb-3">💱 Devise de remboursement</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {currencies.map((currency: any) => (
                      <label
                        key={currency.code}
                        className={`flex items-center justify-center p-3 rounded-lg border-2 cursor-pointer transition-all ${
                          selectedCurrency === currency.code
                            ? 'border-blue-500 bg-blue-100'
                            : 'border-gray-200 bg-white hover:border-blue-300'
                        }`}
                      >
                        <input
                          type="radio"
                          name="currency"
                          value={currency.code}
                          checked={selectedCurrency === currency.code}
                          onChange={(e) => setSelectedCurrency(e.target.value)}
                          className="sr-only"
                        />
                        <div className="text-center">
                          <span className="font-bold text-lg">{currency.symbol}</span>
                          <span className="ml-1 text-sm text-gray-600">{currency.code}</span>
                        </div>
                      </label>
                    ))}
                  </div>
                  {selectedCurrency !== 'CDF' && selectedCurrencyData && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-gray-600">Montant à rembourser :</span>
                        <span className="font-bold text-blue-700">
                          {calculatePayoutAmount(parseFloat(form.refund_amount)).toFixed(2)} {selectedCurrency}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Taux : 1 {selectedCurrency} = {Math.round(1 / parseFloat(selectedCurrencyData.exchange_rate)).toLocaleString()} CDF
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                {REFUND_METHODS.map((method) => (
                  <label
                    key={method.value}
                    className={`flex items-center p-4 rounded-lg border-2 transition-all ${
                      !method.available
                        ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'
                        : selectedMethod === method.value
                          ? 'border-primary-500 bg-primary-50 cursor-pointer'
                          : 'border-gray-200 hover:border-gray-300 cursor-pointer'
                    }`}
                  >
                    <input
                      type="radio"
                      name="method"
                      value={method.value}
                      checked={selectedMethod === method.value}
                      onChange={(e) => method.available && setSelectedMethod(e.target.value)}
                      disabled={!method.available}
                      className="sr-only"
                    />
                    <span className="text-2xl mr-4">{method.icon}</span>
                    <div className="flex-1">
                      <p className={`font-medium ${method.available ? 'text-gray-900' : 'text-gray-400'}`}>{method.label}</p>
                      <p className={`text-sm ${method.available ? 'text-gray-500' : 'text-gray-400 italic'}`}>{method.description}</p>
                    </div>
                    {method.available && selectedMethod === method.value && (
                      <CheckCircleIcon className="w-6 h-6 text-primary-600" />
                    )}
                    {!method.available && (
                      <span className="px-2 py-1 text-xs bg-gray-200 text-gray-500 rounded-full">Indisponible</span>
                    )}
                  </label>
                ))}
              </div>

              {/* Mobile Money Details */}
              {selectedMethod === 'MOBILE_MONEY' && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Détails Mobile Money</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Numéro de téléphone</label>
                      <input
                        type="tel"
                        value={paymentDetails.phone_number || form.traveler?.phone || ''}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, phone_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        placeholder="+243..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Opérateur</label>
                      <select
                        value={paymentDetails.provider || ''}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, provider: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      >
                        <option value="">Sélectionner</option>
                        <option value="MPESA">M-Pesa</option>
                        <option value="ORANGE">Orange Money</option>
                        <option value="AIRTEL">Airtel Money</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Bank Transfer Details */}
              {selectedMethod === 'BANK_TRANSFER' && (
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-medium text-gray-900 mb-3">Détails bancaires</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Numéro de compte</label>
                      <input
                        type="text"
                        value={paymentDetails.account_number || ''}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, account_number: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-gray-600 mb-1">Code banque</label>
                      <input
                        type="text"
                        value={paymentDetails.bank_code || ''}
                        onChange={(e) => setPaymentDetails({ ...paymentDetails, bank_code: e.target.value })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              <button
                onClick={() => {
                  if (selectedMethod === 'CASH') {
                    setStep('count');
                  } else {
                    // For non-cash methods, initiate immediately
                    handleInitiateRefund();
                  }
                }}
                disabled={initiateMutation.isPending}
                className="mt-6 w-full py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {initiateMutation.isPending ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Traitement...
                  </>
                ) : (
                  <>
                    <BanknotesIcon className="w-5 h-5" />
                    Continuer
                  </>
                )}
              </button>
            </div>
          )}

          {/* Step 2: Count Cash */}
          {step === 'count' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">Comptage des espèces</h2>
              <p className="text-gray-500 mb-6">Comptez le montant exact à remettre au voyageur</p>
              
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <p className="text-yellow-800 font-medium">⚠️ Montant à remettre</p>
                <p className="text-3xl font-bold text-yellow-900 mt-2">
                  {selectedCurrency === 'CDF' || !selectedCurrencyData
                    ? `${parseFloat(form.refund_amount).toLocaleString()} CDF`
                    : `${calculatePayoutAmount(parseFloat(form.refund_amount)).toFixed(2)} ${selectedCurrency}`
                  }
                </p>
                {selectedCurrency !== 'CDF' && selectedCurrencyData && (
                  <p className="text-sm text-yellow-700 mt-1">
                    ({parseFloat(form.refund_amount).toLocaleString()} CDF • Taux: 1 {selectedCurrency} = {Math.round(1 / parseFloat(selectedCurrencyData.exchange_rate)).toLocaleString()} CDF)
                  </p>
                )}
              </div>

              {/* Quick confirm checkbox */}
              {(() => {
                const expectedAmount = selectedCurrency === 'CDF' || !selectedCurrencyData
                  ? parseFloat(form.refund_amount)
                  : calculatePayoutAmount(parseFloat(form.refund_amount));
                const expectedAmountStr = selectedCurrency === 'CDF' || !selectedCurrencyData
                  ? parseFloat(form.refund_amount).toFixed(2)
                  : calculatePayoutAmount(parseFloat(form.refund_amount)).toFixed(2);
                
                return (
                  <>
                    <div className="mb-6">
                      <label className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg cursor-pointer hover:bg-green-100 transition-colors">
                        <input
                          type="checkbox"
                          checked={countedAmount === expectedAmountStr}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setCountedAmount(expectedAmountStr);
                            } else {
                              setCountedAmount('');
                            }
                          }}
                          className="w-5 h-5 text-green-600 rounded focus:ring-green-500"
                        />
                        <div>
                          <p className="font-medium text-green-800">J'ai compté le montant exact</p>
                          <p className="text-sm text-green-600">
                            {selectedCurrency === 'CDF' || !selectedCurrencyData
                              ? `${parseFloat(form.refund_amount).toLocaleString()} CDF`
                              : `${calculatePayoutAmount(parseFloat(form.refund_amount)).toFixed(2)} ${selectedCurrency}`
                            }
                          </p>
                        </div>
                      </label>
                    </div>

                    <div className="relative mb-6">
                      <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-gray-200"></div>
                      </div>
                      <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-white text-gray-500">ou saisir manuellement</span>
                      </div>
                    </div>

                    <div className="mb-6">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Montant compté ({selectedCurrency})
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={countedAmount}
                        onChange={(e) => setCountedAmount(e.target.value)}
                        className="w-full px-4 py-3 text-2xl font-bold border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-center"
                        placeholder="0"
                      />
                    </div>

                    {countedAmount && (() => {
                      const counted = parseFloat(countedAmount);
                      const diff = counted - expectedAmount;
                      const isExact = Math.abs(diff) < 0.01;
                      const isLess = diff < -0.01;
                      const isMore = diff > 0.01;
                      const serviceGain = isLess ? Math.abs(diff) : 0;
                      
                      return (
                        <div className={`p-4 rounded-lg mb-6 ${
                          isExact ? 'bg-green-50 border border-green-200' :
                          isLess ? 'bg-blue-50 border border-blue-200' :
                          'bg-red-50 border border-red-200'
                        }`}>
                          {isExact && (
                            <p className="text-green-700 flex items-center gap-2">
                              <CheckCircleIcon className="w-5 h-5" />
                              Montant correct !
                            </p>
                          )}
                          {isLess && (
                            <div className="text-blue-700">
                              <p className="flex items-center gap-2 font-medium">
                                <BanknotesIcon className="w-5 h-5" />
                                Gain de service : {serviceGain.toFixed(2)} {selectedCurrency}
                              </p>
                              <p className="text-sm mt-1 text-blue-600">
                                Le voyageur recevra {counted.toFixed(2)} {selectedCurrency} au lieu de {expectedAmount.toFixed(2)} {selectedCurrency}
                              </p>
                            </div>
                          )}
                          {isMore && (
                            <p className="text-red-700 flex items-center gap-2">
                              <XMarkIcon className="w-5 h-5" />
                              Erreur : Le montant ne peut pas dépasser {expectedAmount.toFixed(2)} {selectedCurrency}
                            </p>
                          )}
                        </div>
                      );
                    })()}
                  </>
                );
              })()}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep('method')}
                  className="flex-1 py-3 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
                >
                  Retour
                </button>
                <button
                  onClick={handleConfirmCash}
                  disabled={!countedAmount || collectCashMutation.isPending}
                  className="flex-1 py-3 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {collectCashMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Confirmation...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      Confirmer le remboursement
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Complete */}
          {step === 'complete' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="w-12 h-12 text-green-600" />
              </div>
              
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Remboursement effectué !</h2>
              <p className="text-gray-500 mb-8">
                Le remboursement de <span className="font-semibold text-green-600">{parseFloat(form.refund_amount).toLocaleString()} {form.currency}</span> a été confirmé.
              </p>

              {/* Receipt Actions */}
              <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-4 mb-6 border border-gray-200">
                <h3 className="font-semibold text-gray-900 mb-3 text-center text-sm">Reçu de remboursement</h3>
                <div className="grid grid-cols-3 gap-3">
                  <button
                    onClick={handleDownloadReceipt}
                    className="group flex flex-col items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-blue-400 hover:shadow-md transition-all duration-200"
                  >
                    <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                      <DocumentArrowDownIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 group-hover:text-blue-600">Télécharger</span>
                  </button>
                  <button
                    onClick={handleDownloadReceipt}
                    className="group flex flex-col items-center gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:border-purple-400 hover:shadow-md transition-all duration-200"
                  >
                    <div className="w-9 h-9 bg-purple-100 rounded-full flex items-center justify-center group-hover:bg-purple-200 transition-colors">
                      <PrinterIcon className="w-4 h-4 text-purple-600" />
                    </div>
                    <span className="text-xs font-medium text-gray-700 group-hover:text-purple-600">Imprimer</span>
                  </button>
                  {form.traveler?.email && (
                    <button
                      onClick={() => sendReceiptMutation.mutate()}
                      disabled={sendReceiptMutation.isPending}
                      className="group flex flex-col items-center gap-2 p-3 bg-gradient-to-br from-green-500 to-green-600 rounded-lg border border-green-500 hover:from-green-600 hover:to-green-700 hover:shadow-md transition-all duration-200 disabled:opacity-50"
                    >
                      <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
                        {sendReceiptMutation.isPending ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        ) : (
                          <EnvelopeIcon className="w-4 h-4 text-white" />
                        )}
                      </div>
                      <span className="text-xs font-medium text-white">Email</span>
                    </button>
                  )}
                </div>
                {form.traveler?.email && (
                  <p className="text-xs text-gray-500 mt-3 text-center">
                    {form.traveler.email}
                  </p>
                )}
              </div>

              <button
                onClick={() => navigate('/customs/scan')}
                className="w-full py-3 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
              >
                Nouveau scan
              </button>
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Service Gain Confirmation Modal */}
      {showServiceGainModal && pendingServiceGain && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                  <BanknotesIcon className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-white">Confirmation du gain de service</h3>
                  <p className="text-blue-100 text-sm">Vérifiez les détails avant de confirmer</p>
                </div>
              </div>
            </div>
            
            {/* Content */}
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Montant prévu</span>
                  <span className="font-semibold text-gray-900">{pendingServiceGain.expected.toFixed(2)} {selectedCurrency}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Montant à donner</span>
                  <span className="font-semibold text-gray-900">{pendingServiceGain.counted.toFixed(2)} {selectedCurrency}</span>
                </div>
                <div className="border-t border-gray-200 pt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-blue-600 font-medium">Gain de service</span>
                    <span className="font-bold text-blue-600 text-lg">{pendingServiceGain.gain.toFixed(2)} {selectedCurrency}</span>
                  </div>
                </div>
              </div>
              
              <p className="text-sm text-gray-500 text-center">
                Le voyageur recevra <strong>{pendingServiceGain.counted.toFixed(2)} {selectedCurrency}</strong> et le gain de service sera enregistré.
              </p>
            </div>
            
            {/* Actions */}
            <div className="px-6 pb-6 flex gap-3">
              <button
                onClick={() => {
                  setShowServiceGainModal(false);
                  setPendingServiceGain(null);
                }}
                className="flex-1 py-3 px-4 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                onClick={handleConfirmServiceGain}
                disabled={collectCashMutation.isPending || initiateMutation.isPending}
                className="flex-1 py-3 px-4 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {(collectCashMutation.isPending || initiateMutation.isPending) ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Traitement...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Confirmer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </FadeIn>
  );
}
