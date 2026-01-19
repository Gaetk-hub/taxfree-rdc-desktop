import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useMutation, useQuery } from '@tanstack/react-query';
import jsQR from 'jsqr';
import api, { taxfreeApi } from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import toast from 'react-hot-toast';
import { saveOfflineValidation, getOfflineValidations } from './CustomsOfflinePage';
import {
  CheckCircleIcon,
  XCircleIcon,
  ExclamationTriangleIcon,
  MagnifyingGlassIcon,
  QrCodeIcon,
  ShieldCheckIcon,
  UserIcon,
  BuildingStorefrontIcon,
  ArrowPathIcon,
  XMarkIcon,
  InformationCircleIcon,
  CameraIcon,
  ChevronDownIcon,
  ChevronRightIcon,
} from '@heroicons/react/24/outline';

interface CheckItem {
  code: string;
  label: string;
  status: 'OK' | 'WARNING' | 'BLOCKED' | 'CONTROL_REQUIRED';
  message: string;
  details?: any;
}

interface ScanResult {
  form: any;
  checks: {
    items: CheckItem[];
    blocking_count: number;
    warning_count: number;
    ok_count: number;
    overall_status: 'OK' | 'WARNING' | 'BLOCKED' | 'CONTROL_REQUIRED';
    overall_message: string;
  };
  can_validate: boolean;
  overall_status: string;
  overall_message: string;
}

interface SearchResult {
  id: string;
  form_number: string;
  status: string;
  status_display: string;
  traveler: {
    name: string;
    passport_masked: string;
    nationality: string;
  };
  merchant_name: string;
  refund_amount: number;
  currency: string;
  created_at: string;
  expires_at: string;
  is_expired: boolean;
  is_validated: boolean;
  can_validate: boolean;
}

type ViewMode = 'scan' | 'search' | 'result';

const REFUSAL_REASONS = [
  { value: 'EXPIRED', label: 'Bordereau expiré' },
  { value: 'GOODS_NOT_PRESENT', label: 'Marchandises non présentées' },
  { value: 'GOODS_MISMATCH', label: 'Marchandises non conformes' },
  { value: 'DOCUMENT_INVALID', label: 'Document invalide ou falsifié' },
  { value: 'TRAVELER_MISMATCH', label: 'Identité voyageur non conforme' },
  { value: 'ALREADY_USED', label: 'Bordereau déjà utilisé' },
  { value: 'OTHER', label: 'Autre motif' },
];

export default function CustomsScanPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<ViewMode>('scan');
  const [qrInput, setQrInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showDecisionModal, setShowDecisionModal] = useState(false);
  const [decisionType, setDecisionType] = useState<'VALIDATED' | 'REFUSED' | null>(null);
  const [refusalReason, setRefusalReason] = useState('');
  const [refusalDetails, setRefusalDetails] = useState('');
  const [physicalControlDone, setPhysicalControlDone] = useState(false);
  const [controlNotes, setControlNotes] = useState('');
  
  // Autocomplete state
  const [autocompleteResults, setAutocompleteResults] = useState<SearchResult[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [searchDebounceTimer, setSearchDebounceTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  
  // Camera scanner state - Using jsQR for faster detection
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const scanIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  
  // Loading state for bordereau lookup
  const [isLoadingBordereau, setIsLoadingBordereau] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Accordion state for collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    voyageur: false,
    commercant: false,
    dates: false,
    produits: true,
    controles: false,
  });

  // Offline mode state
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineValidationsCount, setOfflineValidationsCount] = useState(0);

  // Listen for online/offline events
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    // Update offline validations count
    setOfflineValidationsCount(getOfflineValidations().filter(v => !v.synced).length);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  // Fetch validated forms awaiting refund
  const { data: pendingRefundsData } = useQuery({
    queryKey: ['validated-forms-pending-refund'],
    queryFn: () => taxfreeApi.listForms({ status: 'VALIDATED' }),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const pendingRefundForms = pendingRefundsData?.data?.results || [];

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  const openCameraModal = () => {
    setShowCameraModal(true);
    setCameraError(null);
    setTimeout(() => startCamera(), 300);
  };

  const closeCameraModal = () => {
    stopCamera();
    setShowCameraModal(false);
    setCameraError(null);
  };

  // Start camera using jsQR - much faster detection
  const startCamera = async () => {
    if (isCameraActive) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { min: 320, ideal: 1280, max: 1920 },
          height: { min: 240, ideal: 720, max: 1080 },
          facingMode: 'environment'
        }
      });

      if (videoRef.current) {
        const video = videoRef.current;
        video.srcObject = stream;
        video.muted = true;
        video.playsInline = true;
        video.autoplay = true;

        video.onloadedmetadata = async () => {
          try {
            await video.play();
            setIsCameraActive(true);
            startContinuousScanning();
          } catch (err) {
            console.error('Video play error:', err);
          }
        };
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      let errorMessage = 'Impossible d\'accéder à la caméra';
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Permission caméra refusée';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'Aucune caméra détectée';
      }
      setCameraError(errorMessage);
    }
  };

  // Continuous scanning with jsQR - scans every 100ms for fast detection
  const startContinuousScanning = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }

    scanIntervalRef.current = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || isScanning) return;

      const video = videoRef.current;
      const canvas = canvasRef.current;
      const context = canvas.getContext('2d');

      if (video.readyState === video.HAVE_ENOUGH_DATA && context && video.videoWidth > 0) {
        // Use native video resolution for better quality
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        context.imageSmoothingEnabled = true;
        context.imageSmoothingQuality = 'high';
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        
        // jsQR detection - very fast
        const code = jsQR(imageData.data, imageData.width, imageData.height);
        
        if (code) {
          handleQRDetected(code.data);
        }
      }
    }, 100); // Scan every 100ms - very responsive
  };

  const handleQRDetected = (decodedText: string) => {
    setIsScanning(true);
    setQrInput(decodedText);
    stopCamera();
    scanMutation.mutate(decodedText);
  };

  const stopCamera = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }

    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }

    setIsCameraActive(false);
  };
  

  // Animate loading steps
  useEffect(() => {
    if (isLoadingBordereau) {
      setLoadingStep(0);
      const steps = [0, 1, 2, 3];
      let currentStep = 0;
      const interval = setInterval(() => {
        currentStep = (currentStep + 1) % steps.length;
        setLoadingStep(currentStep);
      }, 800);
      return () => clearInterval(interval);
    }
  }, [isLoadingBordereau]);

  // Scan mutation (QR code)
  const scanMutation = useMutation({
    mutationFn: async (qr: string) => {
      setIsLoadingBordereau(true);
      setShowCameraModal(false);
      const response = await api.post('/customs/scan/', { qr_string: qr });
      return response.data;
    },
    onSuccess: (data) => {
      setTimeout(() => {
        setScanResult(data);
        setViewMode('result');
        setIsLoadingBordereau(false);
        setIsScanning(false);
      }, 1500); // Minimum loading time for smooth UX
    },
    onError: (err: any) => {
      const errorMsg = err.response?.data?.qr_string?.[0] || err.response?.data?.error || 'Erreur de scan';
      toast.error(errorMsg);
      setIsLoadingBordereau(false);
      setIsScanning(false);
    },
  });

  // Lookup by form number
  const lookupMutation = useMutation({
    mutationFn: async (formNumber: string) => {
      setIsLoadingBordereau(true);
      const response = await api.get(`/customs/lookup/${formNumber}/`);
      return response.data;
    },
    onSuccess: (data) => {
      setTimeout(() => {
        setScanResult(data);
        setViewMode('result');
        setIsLoadingBordereau(false);
      }, 1500); // Minimum loading time for smooth UX
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Bordereau non trouvé');
      setIsLoadingBordereau(false);
    },
  });

  // Decision mutation
  const decideMutation = useMutation({
    mutationFn: async (data: {
      formId: string;
      decision: string;
      refusal_reason?: string;
      refusal_details?: string;
      physical_control_done: boolean;
      control_notes?: string;
    }) => {
      const response = await api.post(`/customs/forms/${data.formId}/decide/`, {
        decision: data.decision,
        refusal_reason: data.refusal_reason,
        refusal_details: data.refusal_details,
        physical_control_done: data.physical_control_done,
        control_notes: data.control_notes,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      if (variables.decision === 'VALIDATED') {
        toast.success('✅ Bordereau validé ! Redirection vers le remboursement...');
        // Redirect to refund page
        navigate(`/customs/refund/${variables.formId}`, {
          state: { validationData: scanResult }
        });
      } else {
        toast.success('❌ Bordereau refusé');
        resetAll();
      }
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erreur lors de la décision');
    },
  });

  const resetAll = () => {
    setScanResult(null);
    setQrInput('');
    setSearchQuery('');
    setAutocompleteResults([]);
    setShowAutocomplete(false);
    setShowDecisionModal(false);
    setDecisionType(null);
    setRefusalReason('');
    setRefusalDetails('');
    setPhysicalControlDone(false);
    setControlNotes('');
    setViewMode('scan');
  };

  const handleScan = () => {
    if (qrInput.trim()) {
      scanMutation.mutate(qrInput.trim());
    }
  };

  // Universal search with autocomplete
  const handleSearchQueryChange = (value: string) => {
    setSearchQuery(value);
    
    // Clear previous timer
    if (searchDebounceTimer) {
      clearTimeout(searchDebounceTimer);
    }
    
    if (value.trim().length < 2) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }
    
    // Debounce search
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        // Universal search with 'q' parameter
        const response = await api.get('/customs/search/', {
          params: { q: value }
        });
        setAutocompleteResults(response.data.results.slice(0, 8));
        setShowAutocomplete(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setIsSearching(false);
      }
    }, 300);
    
    setSearchDebounceTimer(timer);
  };

  const handleSelectAutocomplete = (result: SearchResult) => {
    setShowAutocomplete(false);
    setSearchQuery('');
    lookupMutation.mutate(result.form_number);
  };

  const handleSearchSubmit = () => {
    if (searchQuery.trim()) {
      setShowAutocomplete(false);
      // Try to lookup directly by form number first
      lookupMutation.mutate(searchQuery.trim());
    }
  };

  const openDecisionModal = (type: 'VALIDATED' | 'REFUSED') => {
    setDecisionType(type);
    setShowDecisionModal(true);
  };

  const submitDecision = () => {
    if (!scanResult?.form || !decisionType) return;

    if (decisionType === 'REFUSED' && !refusalReason) {
      toast.error('Veuillez sélectionner un motif de refus');
      return;
    }

    // If offline, save locally
    if (!navigator.onLine) {
      saveOfflineValidation({
        form_id: scanResult.form.id,
        form_number: scanResult.form.form_number,
        traveler_name: scanResult.form.traveler 
          ? `${scanResult.form.traveler.first_name} ${scanResult.form.traveler.last_name}`
          : undefined,
        refund_amount: parseFloat(scanResult.form.refund_amount),
        currency: scanResult.form.currency,
        decision: decisionType,
        refusal_reason: refusalReason || undefined,
        refusal_details: refusalDetails || undefined,
        physical_control_done: physicalControlDone,
        control_notes: controlNotes || undefined,
        timestamp: new Date().toISOString(),
      });
      
      setOfflineValidationsCount(prev => prev + 1);
      toast.success(
        `📴 Validation enregistrée hors ligne. Synchronisez quand le réseau sera disponible.`,
        { duration: 5000 }
      );
      setShowDecisionModal(false);
      resetAll();
      return;
    }

    decideMutation.mutate({
      formId: scanResult.form.id,
      decision: decisionType,
      refusal_reason: refusalReason,
      refusal_details: refusalDetails,
      physical_control_done: physicalControlDone,
      control_notes: controlNotes,
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'OK':
        return <CheckCircleIcon className="w-5 h-5 text-emerald-500" />;
      case 'WARNING':
        return <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />;
      case 'BLOCKED':
        return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'CONTROL_REQUIRED':
        return <ShieldCheckIcon className="w-5 h-5 text-orange-500" />;
      default:
        return <InformationCircleIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'OK':
        return 'bg-emerald-50 border-emerald-200';
      case 'WARNING':
        return 'bg-amber-50 border-amber-200';
      case 'BLOCKED':
        return 'bg-red-50 border-red-200';
      case 'CONTROL_REQUIRED':
        return 'bg-orange-50 border-orange-200';
      default:
        return 'bg-gray-50 border-gray-200';
    }
  };

  // Render camera modal
  const renderCameraModal = () => {
    if (!showCameraModal) return null;

    return (
      <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              <span className="font-medium text-gray-900">Scanner QR Actif</span>
            </div>
            <button
              onClick={closeCameraModal}
              className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>

          {/* Scanner area - Using jsQR for fast detection */}
          {isScanning ? (
            <div className="p-8 flex flex-col items-center justify-center">
              <div className="relative">
                <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
                <QrCodeIcon className="w-6 h-6 text-blue-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="mt-4 text-gray-600 font-medium">Vérification en cours...</p>
              <p className="text-sm text-gray-400">Récupération des informations</p>
            </div>
          ) : (
            <>
              <div className="relative bg-black" style={{ height: '320px', width: '100%' }}>
                <video
                  ref={videoRef}
                  className="w-full h-full object-cover"
                  playsInline
                  muted
                  autoPlay
                />
                <canvas ref={canvasRef} className="hidden" />
                
                {/* Scan overlay with corners */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="w-56 h-56 border-2 border-white/50 rounded-xl relative">
                    <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-blue-400 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-blue-400 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-blue-400 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-blue-400 rounded-br-xl" />
                    {/* Animated scan line */}
                    <div className="absolute inset-x-0 top-1/2 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-pulse" />
                  </div>
                </div>

                {/* Camera initializing overlay */}
                {!isCameraActive && !cameraError && (
                  <div className="absolute inset-0 bg-gray-900/90 flex items-center justify-center">
                    <div className="text-center text-white">
                      <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm">Initialisation de la caméra...</p>
                    </div>
                  </div>
                )}
              </div>
              {cameraError ? (
                <div className="p-4 bg-red-50">
                  <p className="text-sm text-red-700 text-center">{cameraError}</p>
                </div>
              ) : (
                <div className="p-3 bg-gray-50 text-center">
                  <p className="text-sm text-gray-500">Placez le QR code dans le cadre - Détection ultra-rapide</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    );
  };

  // Render scan/search input section
  const renderInputSection = () => (
    <div className="space-y-6">
      {/* Offline mode indicator */}
      {!isOnline && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center">
              <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600" />
            </div>
            <div className="flex-1">
              <p className="font-medium text-yellow-800">Mode hors-ligne actif</p>
              <p className="text-sm text-yellow-600">
                Les validations seront enregistrées localement et synchronisées au retour du réseau
              </p>
            </div>
            {offlineValidationsCount > 0 && (
              <Link
                to="/customs/offline"
                className="px-3 py-1.5 bg-yellow-600 text-white rounded-lg text-sm font-medium hover:bg-yellow-700 transition-colors"
              >
                {offlineValidationsCount} en attente →
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Online with pending offline validations */}
      {isOnline && offlineValidationsCount > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <ArrowPathIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="font-medium text-blue-800">
                  {offlineValidationsCount} validation{offlineValidationsCount > 1 ? 's' : ''} en attente de synchronisation
                </p>
                <p className="text-sm text-blue-600">Synchronisez maintenant pour enregistrer vos décisions</p>
              </div>
            </div>
            <Link
              to="/customs/offline"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Synchroniser →
            </Link>
          </div>
        </div>
      )}

      {/* Alert for pending refunds */}
      {pendingRefundForms.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center">
                <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="font-medium text-amber-800">
                  {pendingRefundForms.length} bordereau{pendingRefundForms.length > 1 ? 'x' : ''} validé{pendingRefundForms.length > 1 ? 's' : ''} en attente de remboursement
                </p>
                <p className="text-sm text-amber-600">Cliquez pour voir et traiter les remboursements</p>
              </div>
            </div>
            <Link
              to="/customs/refunds"
              className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 transition-colors"
            >
              Voir →
            </Link>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Scanner un code QR</h2>
          
          {/* Camera Scanner Button */}
          <button
            onClick={openCameraModal}
            className="w-full py-6 border-2 border-dashed border-gray-300 rounded-xl hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center justify-center gap-2 mb-4"
          >
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <CameraIcon className="w-7 h-7 text-blue-600" />
            </div>
            <div className="text-center">
              <p className="font-medium text-gray-900">Scanner avec la caméra</p>
              <p className="text-xs text-gray-500">Cliquez pour ouvrir le scanner</p>
            </div>
          </button>

          {/* Manual QR Input */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-sm text-gray-500 mb-3">Ou collez le code QR manuellement :</p>
            <div className="flex gap-3">
              <input
                type="text"
                className="flex-1 px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                placeholder="Collez le code QR ici..."
                value={qrInput}
                onChange={(e) => setQrInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleScan()}
              />
              <button
                onClick={handleScan}
                disabled={scanMutation.isPending || !qrInput.trim()}
                className="px-6 py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {scanMutation.isPending ? (
                  <ArrowPathIcon className="w-5 h-5 animate-spin" />
                ) : (
                  <QrCodeIcon className="w-5 h-5" />
                )}
                Vérifier
              </button>
            </div>
          </div>

          {/* Universal search with autocomplete */}
          <div className="border-t border-gray-100 pt-4 mt-4">
            <p className="text-sm text-gray-500 mb-3">Ou recherchez par n° bordereau, passeport, nom voyageur, commerçant :</p>
            <div className="relative">
              <div className="flex gap-3">
                <div className="relative flex-1">
                  <input
                    type="text"
                    className="w-full px-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="N° bordereau, passeport, nom, commerçant..."
                    value={searchQuery}
                    onChange={(e) => handleSearchQueryChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearchSubmit()}
                    onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                    onFocus={() => autocompleteResults.length > 0 && setShowAutocomplete(true)}
                  />
                  {isSearching && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <ArrowPathIcon className="w-5 h-5 text-gray-400 animate-spin" />
                    </div>
                  )}
                  
                  {/* Autocomplete dropdown */}
                  {showAutocomplete && autocompleteResults.length > 0 && (
                    <div className="absolute z-50 w-full mt-1 bg-white rounded-xl shadow-lg border border-gray-200 max-h-80 overflow-y-auto">
                      {autocompleteResults.map((result) => (
                        <button
                          key={result.id}
                          onClick={() => handleSelectAutocomplete(result)}
                          className="w-full text-left px-4 py-3 hover:bg-blue-50 border-b border-gray-100 last:border-b-0 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-medium text-gray-900">{result.form_number}</span>
                            <span className={`text-xs px-2 py-0.5 rounded-full ${
                              result.is_validated ? 'bg-gray-100 text-gray-600' :
                              result.is_expired ? 'bg-red-100 text-red-700' :
                              result.can_validate ? 'bg-emerald-100 text-emerald-700' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {result.is_validated ? 'Traité' : result.is_expired ? 'Expiré' : result.status_display}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                            <UserIcon className="w-3.5 h-3.5" />
                            <span>{result.traveler.name}</span>
                            <span className="text-gray-300">•</span>
                            <span className="font-mono text-xs">{result.traveler.passport_masked}</span>
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-sm text-gray-500">
                            <BuildingStorefrontIcon className="w-3.5 h-3.5" />
                            <span>{result.merchant_name}</span>
                            <span className="text-gray-300">•</span>
                            <span className="font-medium text-emerald-600">{result.refund_amount.toLocaleString()} {result.currency}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={handleSearchSubmit}
                  disabled={lookupMutation.isPending || !searchQuery.trim()}
                  className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors disabled:opacity-50 flex items-center gap-2"
                >
                  {lookupMutation.isPending ? (
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                  ) : (
                    <MagnifyingGlassIcon className="w-4 h-4" />
                  )}
                  Rechercher
                </button>
              </div>
            </div>
          </div>
        </div>
    </div>
  );

  // Render result section
  const renderResultSection = () => {
    if (!scanResult) return null;

    const { form, checks, overall_status, overall_message, can_validate } = scanResult;

    return (
      <div className="space-y-5">
        {/* Header - Clean and minimal */}
        <div className="flex items-center justify-between">
          <button
            onClick={resetAll}
            className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
          >
            ← Retour
          </button>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
            form.status === 'ISSUED' ? 'bg-blue-100 text-blue-700' :
            form.status === 'VALIDATED' ? 'bg-green-100 text-green-700' :
            form.status === 'REFUSED' ? 'bg-red-100 text-red-700' :
            form.status === 'CANCELLED' ? 'bg-gray-100 text-gray-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {form.status_display}
          </span>
        </div>

        {/* Main Card - Document style */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          {/* Document Header */}
          <div className="border-b border-gray-200 p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wider">Bordereau N°</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{form.form_number}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400">Remboursement</p>
                <p className="text-3xl font-bold text-green-600">{parseFloat(form.refund_amount).toLocaleString()}</p>
                <p className="text-sm text-gray-500">{form.currency}</p>
              </div>
            </div>
          </div>

          {/* Status Alert */}
          <div className={`px-5 py-3 border-b ${
            overall_status === 'OK' ? 'bg-green-50 border-green-100' :
            overall_status === 'WARNING' ? 'bg-yellow-50 border-yellow-100' :
            overall_status === 'BLOCKED' ? 'bg-red-50 border-red-100' :
            'bg-orange-50 border-orange-100'
          }`}>
            <div className="flex items-center gap-3">
              {getStatusIcon(overall_status)}
              <div className="flex-1">
                <p className="text-sm font-medium text-gray-900">{overall_message}</p>
              </div>
              <div className="text-xs text-gray-500">
                {checks.ok_count} ✓ · {checks.warning_count} ⚠ · {checks.blocking_count} ✗
              </div>
            </div>
          </div>

          {/* Cancellation Alert */}
          {form.status === 'CANCELLED' && form.cancellation_info && (
            <div className="px-5 py-3 bg-red-50 border-b border-red-100">
              <div className="flex items-center gap-2 text-red-700">
                <XCircleIcon className="w-5 h-5" />
                <span className="font-medium">Annulé par {form.cancellation_info.cancelled_by_name}</span>
                <span className="text-red-500">·</span>
                <span className="text-sm">{form.cancellation_info.reason}</span>
              </div>
            </div>
          )}

          {/* Financial Summary */}
          <div className="grid grid-cols-4 divide-x divide-gray-100 border-b border-gray-200">
            <div className="p-4 text-center">
              <p className="text-xs text-gray-400 uppercase">Total TTC</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{parseFloat(form.invoice?.total_amount || form.eligible_amount).toLocaleString()}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-gray-400 uppercase">TVA</p>
              <p className="text-lg font-semibold text-gray-900 mt-1">{parseFloat(form.vat_amount).toLocaleString()}</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-xs text-gray-400 uppercase">Frais</p>
              <p className="text-lg font-semibold text-gray-500 mt-1">-{parseFloat(form.operator_fee || 0).toLocaleString()}</p>
            </div>
            <div className="p-4 text-center bg-green-50">
              <p className="text-xs text-green-600 uppercase font-medium">Net à rembourser</p>
              <p className="text-lg font-bold text-green-700 mt-1">{parseFloat(form.refund_amount).toLocaleString()} {form.currency}</p>
            </div>
          </div>

          {/* Two Column Layout */}
          <div className="grid grid-cols-2 divide-x divide-gray-100">
            {/* Left Column - Traveler */}
            <div className="p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <UserIcon className="w-4 h-4" /> Voyageur
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Nom complet</span>
                  <span className="font-medium text-gray-900">{form.traveler?.first_name} {form.traveler?.last_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Passeport</span>
                  <span className="font-mono text-gray-900">{form.traveler?.passport_number || `***${form.traveler?.passport_number_last4}`}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Nationalité</span>
                  <span className="text-gray-900">{form.traveler?.nationality}</span>
                </div>
                {form.traveler?.residence_country && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Résidence</span>
                    <span className="text-gray-900">{form.traveler.residence_country}</span>
                  </div>
                )}
                {form.traveler?.email && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Email</span>
                    <span className="text-gray-900 text-xs">{form.traveler.email}</span>
                  </div>
                )}
                {form.traveler?.phone && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Téléphone</span>
                    <span className="text-gray-900">{form.traveler.phone}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column - Merchant */}
            <div className="p-5">
              <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <BuildingStorefrontIcon className="w-4 h-4" /> Commerçant
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Enseigne</span>
                  <span className="font-medium text-gray-900">{form.merchant_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">N° Facture</span>
                  <span className="font-mono text-gray-900">{form.invoice_number}</span>
                </div>
                {form.invoice?.outlet_name && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Point de vente</span>
                    <span className="text-gray-900">{form.invoice.outlet_name}</span>
                  </div>
                )}
                {form.invoice?.invoice_date && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Date achat</span>
                    <span className="text-gray-900">{new Date(form.invoice.invoice_date).toLocaleDateString('fr-FR')}</span>
                  </div>
                )}
                {form.created_by_name && (
                  <div className="flex justify-between pt-2 border-t border-gray-100 mt-2">
                    <span className="text-gray-500">Créé par</span>
                    <span className="text-gray-900">{form.created_by_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Dates Row */}
          <div className="grid grid-cols-4 divide-x divide-gray-100 border-t border-gray-200 bg-gray-50">
            <div className="p-3 text-center">
              <p className="text-[10px] text-gray-400 uppercase">Créé le</p>
              <p className="text-sm font-medium text-gray-700">{new Date(form.created_at).toLocaleDateString('fr-FR')}</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[10px] text-gray-400 uppercase">Expire le</p>
              <p className={`text-sm font-medium ${form.is_expired ? 'text-red-600' : 'text-gray-700'}`}>
                {form.is_expired ? 'EXPIRÉ' : new Date(form.expires_at).toLocaleDateString('fr-FR')}
              </p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[10px] text-gray-400 uppercase">Risque</p>
              <p className={`text-sm font-medium ${
                form.risk_score >= 70 ? 'text-red-600' :
                form.risk_score >= 40 ? 'text-orange-600' :
                'text-green-600'
              }`}>{form.risk_score}/100</p>
            </div>
            <div className="p-3 text-center">
              <p className="text-[10px] text-gray-400 uppercase">Contrôle</p>
              <p className={`text-sm font-medium ${form.requires_control ? 'text-orange-600' : 'text-green-600'}`}>
                {form.requires_control ? 'Requis' : 'Non requis'}
              </p>
            </div>
          </div>
        </div>

        {/* Products Table - Accordion */}
        {form.invoice?.items && form.invoice.items.length > 0 && (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <button
              onClick={() => toggleSection('produits')}
              className="w-full bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
            >
              <span className="font-semibold text-gray-900 text-sm">Produits ({form.invoice.items.length})</span>
              {expandedSections.produits ? <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
            </button>
            {expandedSections.produits && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-600">Produit</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-600">Code-barres</th>
                      <th className="px-2 py-1.5 text-left font-medium text-gray-600">Catégorie</th>
                      <th className="px-2 py-1.5 text-right font-medium text-gray-600">Qté</th>
                      <th className="px-2 py-1.5 text-right font-medium text-gray-600">P.U.</th>
                      <th className="px-2 py-1.5 text-right font-medium text-gray-600">TVA %</th>
                      <th className="px-2 py-1.5 text-right font-medium text-gray-600">Total</th>
                      <th className="px-2 py-1.5 text-center font-medium text-gray-600">Élig.</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {form.invoice.items.map((item: any, idx: number) => (
                      <tr key={idx} className={!item.is_eligible ? 'bg-red-50' : ''}>
                        <td className="px-2 py-1.5">
                          <div className="font-medium text-gray-900">{item.product_name}</div>
                          {item.product_code && <div className="text-gray-400 text-[10px]">{item.product_code}</div>}
                        </td>
                        <td className="px-2 py-1.5 font-mono text-[10px] text-gray-500">{item.barcode || '-'}</td>
                        <td className="px-2 py-1.5 text-gray-600">{item.category_display || item.product_category}</td>
                        <td className="px-2 py-1.5 text-right">{item.quantity}</td>
                        <td className="px-2 py-1.5 text-right font-mono">{parseFloat(item.unit_price).toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-right">{item.vat_rate}%</td>
                        <td className="px-2 py-1.5 text-right font-mono font-medium">{parseFloat(item.line_total).toLocaleString()}</td>
                        <td className="px-2 py-1.5 text-center">
                          {item.is_eligible ? (
                            <span className="text-green-600">✓</span>
                          ) : (
                            <span className="text-red-600" title={item.ineligibility_reason}>✗</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 border-t border-gray-200">
                    <tr>
                      <td colSpan={6} className="px-2 py-1.5 text-right font-medium">Total</td>
                      <td className="px-2 py-1.5 text-right font-mono font-bold">{parseFloat(form.invoice.total_amount).toLocaleString()} {form.currency}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Automated Checks - Accordion */}
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <button
            onClick={() => toggleSection('controles')}
            className="w-full bg-gray-50 px-3 py-2 border-b border-gray-200 flex items-center justify-between hover:bg-gray-100 transition-colors"
          >
            <span className="font-semibold text-gray-900 text-sm">Contrôles automatiques ({checks.items.length})</span>
            {expandedSections.controles ? <ChevronDownIcon className="w-4 h-4 text-gray-400" /> : <ChevronRightIcon className="w-4 h-4 text-gray-400" />}
          </button>
          {expandedSections.controles && (
            <div className="divide-y divide-gray-100">
              {checks.items.map((check: any, index: number) => (
              <div key={index} className={`flex items-center gap-2 px-3 py-2 text-sm ${getStatusBgColor(check.status)}`}>
                <div className="flex-shrink-0">{getStatusIcon(check.status)}</div>
                <div className="flex-1 min-w-0">
                  <span className="font-medium text-gray-900">{check.label}</span>
                  <span className="text-gray-400 mx-2">—</span>
                  <span className="text-gray-600">{check.message}</span>
                </div>
              </div>
            ))}
            </div>
          )}
        </div>

        {/* Decision Buttons - Compact */}
        {can_validate && !form.validation && (
          <div className="bg-white rounded-lg border border-gray-200 p-3">
            {overall_status === 'CONTROL_REQUIRED' && (
              <div className="bg-orange-50 border border-orange-200 rounded px-3 py-2 mb-3 text-sm">
                <p className="text-orange-800 font-medium">⚠️ Contrôle physique obligatoire avant validation</p>
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={() => openDecisionModal('VALIDATED')}
                disabled={decideMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 text-white rounded-lg font-medium text-sm hover:bg-emerald-700 transition-colors disabled:opacity-50"
              >
                <CheckCircleIcon className="w-5 h-5" />
                Valider
              </button>
              <button
                onClick={() => openDecisionModal('REFUSED')}
                disabled={decideMutation.isPending}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-red-600 text-white rounded-lg font-medium text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                <XCircleIcon className="w-5 h-5" />
                Refuser
              </button>
            </div>
          </div>
        )}

        {/* Already validated info - Compact */}
        {form.validation && (
          <div className={`rounded-lg p-3 text-sm ${
            form.validation.decision === 'VALIDATED' ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'
          }`}>
            <p className={`font-semibold ${form.validation.decision === 'VALIDATED' ? 'text-emerald-800' : 'text-red-800'}`}>
              {form.validation.decision === 'VALIDATED' ? '✅ Validé' : '❌ Refusé'} par {form.validation.agent_name}
            </p>
            <p className="text-gray-600 text-xs mt-1">
              Le {new Date(form.validation.decided_at).toLocaleString('fr-FR')} à {form.validation.point_of_exit_name}
              {form.validation.refusal_reason && ` • Motif: ${form.validation.refusal_reason}`}
            </p>
          </div>
        )}
      </div>
    );
  };

  // Decision Modal
  const renderDecisionModal = () => {
    if (!showDecisionModal) return null;

    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl shadow-xl max-w-lg w-full p-6 max-h-[90vh] overflow-y-auto">
          <h3 className={`text-xl font-bold mb-4 ${
            decisionType === 'VALIDATED' ? 'text-emerald-700' : 'text-red-700'
          }`}>
            {decisionType === 'VALIDATED' ? '✅ Confirmer la validation' : '❌ Confirmer le refus'}
          </h3>

          {decisionType === 'REFUSED' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Motif du refus *
              </label>
              <select
                value={refusalReason}
                onChange={(e) => setRefusalReason(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
              >
                <option value="">Sélectionnez un motif...</option>
                {REFUSAL_REASONS.map((reason) => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
            </div>
          )}

          {decisionType === 'REFUSED' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Détails supplémentaires
              </label>
              <textarea
                value={refusalDetails}
                onChange={(e) => setRefusalDetails(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                placeholder="Précisions sur le motif du refus..."
              />
            </div>
          )}

          <div className="mb-4">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={physicalControlDone}
                onChange={(e) => setPhysicalControlDone(e.target.checked)}
                className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-sm text-gray-700">Contrôle physique des marchandises effectué</span>
            </label>
          </div>

          {physicalControlDone && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Notes de contrôle
              </label>
              <textarea
                value={controlNotes}
                onChange={(e) => setControlNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Observations lors du contrôle..."
              />
            </div>
          )}

          <div className="flex gap-3 mt-6">
            <button
              onClick={() => setShowDecisionModal(false)}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Annuler
            </button>
            <button
              onClick={submitDecision}
              disabled={decideMutation.isPending || (decisionType === 'REFUSED' && !refusalReason)}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                decisionType === 'VALIDATED' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {decideMutation.isPending ? 'Traitement...' : 'Confirmer'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Loading screen component - Light theme
  const renderLoadingScreen = () => {
    const loadingSteps = [
      { icon: QrCodeIcon, label: 'Lecture du code...', color: 'text-blue-600' },
      { icon: MagnifyingGlassIcon, label: 'Recherche du bordereau...', color: 'text-indigo-600' },
      { icon: ShieldCheckIcon, label: 'Vérification des contrôles...', color: 'text-purple-600' },
      { icon: CheckCircleIcon, label: 'Préparation des données...', color: 'text-emerald-600' },
    ];

    return (
      <div className="fixed inset-0 bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 z-50 flex items-center justify-center">
        {/* Animated background circles */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-200/50 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-200/50 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        </div>

        <div className="relative z-10 text-center px-6">
          {/* Main loader */}
          <div className="relative w-32 h-32 mx-auto mb-8">
            {/* Outer ring */}
            <div className="absolute inset-0 border-4 border-gray-200 rounded-full" />
            {/* Spinning ring */}
            <div className="absolute inset-0 border-4 border-transparent border-t-blue-500 border-r-blue-500 rounded-full animate-spin" />
            {/* Inner circle with icon */}
            <div className="absolute inset-4 bg-white shadow-lg rounded-full flex items-center justify-center">
              <QrCodeIcon className="w-12 h-12 text-blue-600 animate-pulse" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Chargement du bordereau</h2>
          <p className="text-gray-500 mb-8">Veuillez patienter quelques instants...</p>

          {/* Progress steps */}
          <div className="max-w-sm mx-auto space-y-3">
            {loadingSteps.map((step, index) => {
              const isActive = index === loadingStep;
              const isCompleted = index < loadingStep;
              const StepIcon = step.icon;

              return (
                <div
                  key={index}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${
                    isActive 
                      ? 'bg-white shadow-lg scale-105 border border-blue-200' 
                      : isCompleted 
                        ? 'bg-white/80 border border-gray-100' 
                        : 'bg-gray-100/50 border border-transparent'
                  }`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${
                    isActive 
                      ? 'bg-blue-100' 
                      : isCompleted 
                        ? 'bg-emerald-100' 
                        : 'bg-gray-200'
                  }`}>
                    {isCompleted ? (
                      <CheckCircleIcon className="w-5 h-5 text-emerald-600" />
                    ) : (
                      <StepIcon className={`w-5 h-5 ${isActive ? step.color : 'text-gray-400'}`} />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    isActive ? 'text-gray-900' : isCompleted ? 'text-emerald-700' : 'text-gray-400'
                  }`}>
                    {step.label}
                  </span>
                  {isActive && (
                    <div className="ml-auto flex gap-1">
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Tax Free RDC branding */}
          <div className="mt-12 flex items-center justify-center gap-2 text-gray-400">
            <ShieldCheckIcon className="w-5 h-5" />
            <span className="text-sm font-medium">Tax Free RDC</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <FadeIn duration={400}>
      {isLoadingBordereau && renderLoadingScreen()}
      <div className="max-w-5xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Validation de bordereau</h1>
      
      {viewMode === 'result' ? renderResultSection() : renderInputSection()}
      {renderDecisionModal()}
      {renderCameraModal()}
      </div>
    </FadeIn>
  );
}
