import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { documentRequestApi } from '../../services/api';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  ArrowUpTrayIcon,
  PaperClipIcon,
  XMarkIcon,
  BuildingStorefrontIcon,
  ClockIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface DocumentRequest {
  id: string;
  company_name: string;
  merchant_email: string;
  merchant_name: string;
  message: string;
  documents_requested: string[];
  status: string;
  created_at: string;
}

interface UploadedDocument {
  name: string;
  file_path: string;
  file_type: string;
  file_size: number;
}

export default function CompleteRegistrationPage() {
  const { token } = useParams<{ token: string }>();
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [documentRequest, setDocumentRequest] = useState<DocumentRequest | null>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDocument[]>([]);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Force page reload on first access to ensure fresh state
  useEffect(() => {
    const reloadKey = `complete-registration-${token}`;
    const hasReloaded = sessionStorage.getItem(reloadKey);
    
    if (!hasReloaded && token) {
      sessionStorage.setItem(reloadKey, 'true');
      window.location.reload();
      return;
    }
  }, [token]);

  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Token manquant dans l\'URL.');
        setIsInitialized(true);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);
        const response = await documentRequestApi.validateToken(token);
        if (response.data && response.data.valid) {
          setDocumentRequest(response.data.document_request);
        } else {
          setError('Ce lien n\'est plus valide.');
        }
      } catch (err: any) {
        const errorMessage = err.response?.data?.detail || err.message || 'Lien invalide ou expiré.';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
        setIsInitialized(true);
      }
    };

    validateToken();
  }, [token]);

  const submitMutation = useMutation({
    mutationFn: () => documentRequestApi.submitDocuments(token!, {
      response_message: responseMessage,
      documents: uploadedDocs.map(doc => ({
        name: doc.name,
        file_path: doc.file_path,
        file_type: doc.file_type,
        file_size: doc.file_size,
      })),
    }),
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: (err: any) => {
      setError(err.response?.data?.detail || 'Erreur lors de la soumission.');
    },
  });

  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !token) return;
    
    setIsUploading(true);
    setError(null);
    
    try {
      for (const file of Array.from(files)) {
        const response = await documentRequestApi.uploadFile(token, file);
        if (response.data) {
          const newDoc: UploadedDocument = {
            name: response.data.name,
            file_path: response.data.file_path,
            file_type: response.data.file_type,
            file_size: response.data.file_size,
          };
          setUploadedDocs((prev) => [...prev, newDoc]);
        }
      }
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Erreur lors de l\'upload du fichier.');
    } finally {
      setIsUploading(false);
      // Reset input
      e.target.value = '';
    }
  };

  const removeDocument = (index: number) => {
    setUploadedDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!responseMessage.trim()) {
      setError('Veuillez saisir un message de réponse.');
      return;
    }
    submitMutation.mutate();
  };

  const goToStep = (step: number) => {
    if (step === 2 && uploadedDocs.length === 0) {
      setError('Veuillez d\'abord importer au moins un document.');
      return;
    }
    setError(null);
    setCurrentStep(step);
  };

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-20 h-20 bg-white rounded-2xl shadow-lg flex items-center justify-center mx-auto mb-6">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-200 border-t-blue-600"></div>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Vérification en cours</h2>
          <p className="text-gray-500">Nous vérifions la validité de votre lien...</p>
        </div>
      </div>
    );
  }

  if (error && !documentRequest) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-orange-50 to-amber-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <ExclamationTriangleIcon className="w-10 h-10 text-red-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Lien invalide</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">{error}</p>
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-2xl p-8 sm:p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Documents soumis !</h1>
          <p className="text-gray-600 mb-8 leading-relaxed">
            Votre réponse a été envoyée avec succès. Notre équipe examinera votre dossier 
            et vous recevrez une notification par email.
          </p>
          <div className="bg-emerald-50 rounded-2xl p-5 text-left mb-8 border border-emerald-100">
            <div className="flex items-center gap-3 mb-3">
              <BuildingStorefrontIcon className="w-5 h-5 text-emerald-600" />
              <span className="font-medium text-emerald-900">{documentRequest?.company_name}</span>
            </div>
            <div className="flex items-center gap-3">
              <PaperClipIcon className="w-5 h-5 text-emerald-600" />
              <span className="text-emerald-800">{uploadedDocs.length} document(s) soumis</span>
            </div>
          </div>
          <Link
            to="/"
            className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 transition-all shadow-lg hover:shadow-xl"
          >
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 sm:py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center">
                <DocumentTextIcon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-gray-900">Tax Free RDC</h1>
                <p className="text-xs sm:text-sm text-gray-500">Complément de dossier</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-xs sm:text-sm text-gray-500">
              <ShieldCheckIcon className="w-4 h-4 text-emerald-500" />
              <span className="hidden sm:inline">Lien sécurisé</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-6 sm:py-10">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-2 sm:gap-4 mb-8">
          <button
            onClick={() => goToStep(1)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all ${
              currentStep === 1 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">1</span>
            <span className="hidden sm:inline">Documents</span>
          </button>
          <div className="w-8 sm:w-12 h-0.5 bg-gray-200"></div>
          <button
            onClick={() => goToStep(2)}
            className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium transition-all ${
              currentStep === 2 
                ? 'bg-blue-600 text-white shadow-lg' 
                : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300'
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-xs">2</span>
            <span className="hidden sm:inline">Message</span>
          </button>
          <div className="w-8 sm:w-12 h-0.5 bg-gray-200"></div>
          <div className="flex items-center gap-2 px-3 sm:px-4 py-2 rounded-full text-sm font-medium bg-white text-gray-400 border border-gray-200">
            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs">3</span>
            <span className="hidden sm:inline">Envoi</span>
          </div>
        </div>

        {/* Company Card */}
        <div className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-6 mb-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <BuildingStorefrontIcon className="w-6 h-6 sm:w-7 sm:h-7 text-blue-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                {documentRequest?.company_name}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {documentRequest?.merchant_name}
              </p>
              <p className="text-sm text-gray-400">
                {documentRequest?.merchant_email}
              </p>
            </div>
          </div>
        </div>

        {/* Admin Message Card */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-2xl sm:rounded-3xl p-5 sm:p-6 mb-6">
          <div className="flex items-start gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h3 className="font-semibold text-amber-900">Message de notre équipe</h3>
              <div className="flex items-center gap-2 mt-1 text-xs text-amber-700">
                <ClockIcon className="w-3.5 h-3.5" />
                <span>Demande du {documentRequest?.created_at ? new Date(documentRequest.created_at).toLocaleDateString('fr-FR') : ''}</span>
              </div>
            </div>
          </div>
          <p className="text-amber-900 whitespace-pre-wrap leading-relaxed bg-white/50 rounded-xl p-4">
            {documentRequest?.message}
          </p>
          
          {documentRequest?.documents_requested && documentRequest.documents_requested.length > 0 && (
            <div className="mt-5 pt-5 border-t border-amber-200">
              <p className="font-semibold text-amber-900 mb-3 flex items-center gap-2">
                <PaperClipIcon className="w-4 h-4" />
                Documents demandés :
              </p>
              <div className="grid gap-2">
                {documentRequest.documents_requested.map((doc, index) => (
                  <div key={index} className="flex items-center gap-3 bg-white/60 rounded-lg px-4 py-2.5">
                    <div className="w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold text-amber-800">
                      {index + 1}
                    </div>
                    <span className="text-amber-900 font-medium">{doc}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Response Form */}
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 p-5 sm:p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-5">Votre réponse</h3>
          
          {error && (
            <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-start gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Step 1: Documents */}
          {currentStep === 1 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Joindre des documents <span className="text-red-500">*</span>
                </label>
                <div className={`border-2 border-dashed rounded-xl p-6 sm:p-8 text-center transition-all ${
                  isUploading 
                    ? 'border-blue-400 bg-blue-50/50' 
                    : 'border-gray-200 hover:border-blue-400 hover:bg-blue-50/30 cursor-pointer'
                }`}>
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                    accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
                    disabled={isUploading}
                  />
                  <label htmlFor="file-upload" className={isUploading ? '' : 'cursor-pointer'}>
                    {isUploading ? (
                      <>
                        <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <div className="animate-spin rounded-full h-7 w-7 border-2 border-blue-200 border-t-blue-600"></div>
                        </div>
                        <p className="text-sm font-medium text-blue-600 mb-1">
                          Upload en cours...
                        </p>
                        <p className="text-xs text-blue-400">
                          Veuillez patienter
                        </p>
                      </>
                    ) : (
                      <>
                        <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4">
                          <ArrowUpTrayIcon className="w-7 h-7 text-blue-600" />
                        </div>
                        <p className="text-sm font-medium text-gray-700 mb-1">
                          Cliquez pour sélectionner des fichiers
                        </p>
                        <p className="text-xs text-gray-400">
                          PDF, JPG, PNG, DOC • Max 10 Mo par fichier
                        </p>
                      </>
                    )}
                  </label>
                </div>
              </div>

              {/* Uploaded files list */}
              {uploadedDocs.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-gray-700">{uploadedDocs.length} fichier(s) sélectionné(s)</p>
                  {uploadedDocs.map((doc, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-xl border border-gray-100"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                          <PaperClipIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                          <p className="text-xs text-gray-500">
                            {(doc.file_size / 1024).toFixed(1)} Ko
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeDocument(index)}
                        className="p-2 hover:bg-red-100 rounded-lg transition-colors flex-shrink-0"
                      >
                        <XMarkIcon className="w-5 h-5 text-red-500" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <button
                type="button"
                onClick={() => goToStep(2)}
                disabled={uploadedDocs.length === 0}
                className="w-full py-3.5 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuer
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
          )}

          {/* Step 2: Message */}
          {currentStep === 2 && (
            <div className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Message de réponse <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={responseMessage}
                  onChange={(e) => setResponseMessage(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-gray-900 placeholder-gray-400"
                  placeholder="Expliquez les documents fournis ou apportez des précisions sur votre dossier..."
                  required
                />
                <p className="text-xs text-gray-400 mt-2">
                  Décrivez les documents que vous fournissez et toute information utile pour le traitement de votre dossier.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="flex-1 py-3.5 bg-gray-100 text-gray-700 font-semibold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Retour
                </button>
                <button
                  type="submit"
                  disabled={submitMutation.isPending || !responseMessage.trim()}
                  className="flex-1 py-3.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 shadow-lg"
                >
                  {submitMutation.isPending ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-2 border-white/30 border-t-white"></div>
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <CheckCircleIcon className="w-5 h-5" />
                      Soumettre ma réponse
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </form>

        {/* Footer */}
        <div className="text-center mt-8 pb-8">
          <p className="text-sm text-gray-500">
            En cas de problème, contactez-nous à{' '}
            <a href="mailto:support@taxfree-rdc.cd" className="text-blue-600 hover:underline font-medium">
              support@taxfree-rdc.cd
            </a>
          </p>
          <p className="text-xs text-gray-400 mt-2">
            © 2026 Tax Free RDC • Tous droits réservés
          </p>
        </div>
      </div>
    </div>
  );
}
