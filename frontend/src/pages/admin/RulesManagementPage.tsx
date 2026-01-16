import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rulesApi } from '../../services/api';
import toast from 'react-hot-toast';
import FadeIn from '../../components/ui/FadeIn';
import { usePermissions } from '../../hooks/usePermissions';
import { 
  CheckCircleIcon, 
  PencilIcon, 
  XMarkIcon,
  CogIcon,
  BanknotesIcon,
  PercentBadgeIcon,
  ClockIcon,
  ShieldCheckIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from '@heroicons/react/24/outline';

interface RuleSet {
  id: string;
  version: string;
  name: string;
  description: string;
  min_purchase_amount: string;
  min_age: number;
  purchase_window_days: number;
  exit_deadline_months: number;
  default_vat_rate: string;
  operator_fee_percentage: string;
  operator_fee_fixed: string;
  min_operator_fee: string;
  risk_score_threshold: number;
  high_value_threshold: string;
  is_active: boolean;
  excluded_residence_countries: string[];
  excluded_categories: string[];
  allowed_refund_methods: string[];
}

export default function RulesManagementPage() {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [editingRuleset, setEditingRuleset] = useState<RuleSet | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isInitializing, setIsInitializing] = useState(false);
  const [initProgress, setInitProgress] = useState(0);
  const [initStep, setInitStep] = useState('');

  // Permission checks
  const canEdit = isSuperAdmin || hasPermission('RULES', 'EDIT');
  const canInitialize = isSuperAdmin;

  const { data, isLoading } = useQuery({
    queryKey: ['rulesets'],
    queryFn: () => rulesApi.listRulesets(),
  });

  const initializeMutation = useMutation({
    mutationFn: () => rulesApi.initializeRuleset(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rulesets'] });
      toast.success('🎉 Configuration initialisée avec succès !');
      setIsInitializing(false);
      setInitProgress(0);
    },
    onError: (error: any) => {
      const message = error.response?.data?.error || 'Erreur lors de l\'initialisation';
      toast.error(message);
      setIsInitializing(false);
      setInitProgress(0);
    },
  });

  const handleInitialize = async () => {
    setIsInitializing(true);
    setInitProgress(0);
    
    // Simulate progress steps for beautiful animation
    const steps = [
      { progress: 15, text: '🔧 Préparation du système...' },
      { progress: 30, text: '📋 Création des règles de base...' },
      { progress: 50, text: '💰 Configuration des frais...' },
      { progress: 70, text: '🛡️ Mise en place des règles de risque...' },
      { progress: 85, text: '✅ Activation de la configuration...' },
      { progress: 95, text: '🚀 Finalisation...' },
    ];

    for (const step of steps) {
      await new Promise(resolve => setTimeout(resolve, 400));
      setInitProgress(step.progress);
      setInitStep(step.text);
    }

    // Actually call the API
    initializeMutation.mutate();
    setInitProgress(100);
    setInitStep('✨ Configuration terminée !');
  };

  const activateMutation = useMutation({
    mutationFn: (id: string) => rulesApi.activateRuleset(id),
    onSuccess: () => {
      toast.success('Règles activées avec succès');
      queryClient.invalidateQueries({ queryKey: ['rulesets'] });
    },
    onError: () => {
      toast.error('Erreur lors de l\'activation');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<RuleSet> }) => 
      rulesApi.updateRuleset(id, data),
    onSuccess: () => {
      toast.success('Paramètres mis à jour avec succès');
      queryClient.invalidateQueries({ queryKey: ['rulesets'] });
      setShowEditModal(false);
      setEditingRuleset(null);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || 'Erreur lors de la mise à jour';
      toast.error(message);
    },
  });

  const rulesets = data?.data?.results || [];
  const activeRuleset = rulesets.find((rs: RuleSet) => rs.is_active);

  const handleEdit = (ruleset: RuleSet) => {
    setEditingRuleset({ ...ruleset });
    setShowEditModal(true);
  };

  const handleSave = () => {
    if (!editingRuleset) return;
    updateMutation.mutate({
      id: editingRuleset.id,
      data: {
        min_purchase_amount: editingRuleset.min_purchase_amount,
        min_age: editingRuleset.min_age,
        exit_deadline_months: editingRuleset.exit_deadline_months,
        default_vat_rate: editingRuleset.default_vat_rate,
        operator_fee_percentage: editingRuleset.operator_fee_percentage,
        operator_fee_fixed: editingRuleset.operator_fee_fixed,
        min_operator_fee: editingRuleset.min_operator_fee,
        risk_score_threshold: editingRuleset.risk_score_threshold,
        high_value_threshold: editingRuleset.high_value_threshold,
      },
    });
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuration Tax Free</h1>
          <p className="text-gray-600 mt-1">Gérez les paramètres de frais, montants et règles d'éligibilité</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
        </div>
      ) : isInitializing ? (
        /* Beautiful initialization animation */
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-8 text-white">
          <div className="max-w-md mx-auto text-center">
            <div className="relative w-24 h-24 mx-auto mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-white/20"></div>
              <div 
                className="absolute inset-0 rounded-full border-4 border-white border-t-transparent animate-spin"
                style={{ animationDuration: '1s' }}
              ></div>
              <div className="absolute inset-0 flex items-center justify-center">
                <CogIcon className="h-10 w-10 animate-pulse" />
              </div>
            </div>
            
            <h2 className="text-2xl font-bold mb-2">Initialisation en cours...</h2>
            <p className="text-blue-200 mb-6">{initStep}</p>
            
            {/* Progress bar */}
            <div className="bg-white/20 rounded-full h-3 overflow-hidden mb-2">
              <div 
                className="h-full bg-white rounded-full transition-all duration-500 ease-out"
                style={{ width: `${initProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-blue-200">{initProgress}%</p>
            
            {/* Animated dots */}
            <div className="flex justify-center gap-2 mt-6">
              {[0, 1, 2].map((i) => (
                <div 
                  key={i}
                  className="w-3 h-3 bg-white rounded-full animate-bounce"
                  style={{ animationDelay: `${i * 0.15}s` }}
                ></div>
              ))}
            </div>
          </div>
        </div>
      ) : !activeRuleset && rulesets.length === 0 ? (
        /* No configuration - Show initialize button */
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border-2 border-dashed border-amber-300 rounded-2xl p-8 text-center">
          <div className="max-w-md mx-auto">
            <div className="w-20 h-20 bg-amber-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ExclamationTriangleIcon className="h-10 w-10 text-amber-500" />
            </div>
            
            <h3 className="text-2xl font-bold text-gray-900 mb-2">Aucune configuration</h3>
            <p className="text-gray-600 mb-6">
              Le système Tax Free n'est pas encore configuré. Initialisez la configuration par défaut pour commencer.
            </p>
            
            {canInitialize ? (
              <button
                onClick={handleInitialize}
                className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <CogIcon className="h-6 w-6" />
                Initialiser la configuration
              </button>
            ) : (
              <p className="text-sm text-amber-600 bg-amber-100 rounded-lg px-4 py-2 inline-block">
                Seul un super administrateur peut initialiser la configuration.
              </p>
            )}
            
            <div className="mt-8 grid grid-cols-3 gap-4 text-left">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-2xl mb-2">💰</div>
                <p className="text-sm font-medium text-gray-900">Frais de service</p>
                <p className="text-xs text-gray-500">15% par défaut</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-2xl mb-2">📊</div>
                <p className="text-sm font-medium text-gray-900">TVA</p>
                <p className="text-xs text-gray-500">16% standard RDC</p>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="text-2xl mb-2">🛡️</div>
                <p className="text-sm font-medium text-gray-900">Règles de risque</p>
                <p className="text-xs text-gray-500">3 règles de base</p>
              </div>
            </div>
          </div>
        </div>
      ) : !activeRuleset ? (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6 text-center">
          <ExclamationTriangleIcon className="h-12 w-12 text-amber-500 mx-auto" />
          <h3 className="mt-4 text-lg font-semibold text-amber-800">Aucune configuration active</h3>
          <p className="mt-2 text-amber-700">Activez un jeu de règles pour commencer à utiliser le système.</p>
        </div>
      ) : (
        <>
          {/* Active Configuration Summary */}
          <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-6 text-white">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <CogIcon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{activeRuleset.name}</h2>
                  <p className="text-blue-200 text-sm">Version {activeRuleset.version} • Configuration active</p>
                </div>
              </div>
              <button
                onClick={() => handleEdit(activeRuleset)}
                disabled={!canEdit}
                title={!canEdit ? "Vous n'avez pas la permission de modifier les règles" : undefined}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all ${
                  canEdit
                    ? 'bg-white/20 hover:bg-white/30'
                    : 'bg-white/10 text-white/50 cursor-not-allowed'
                }`}
              >
                <PencilIcon className="h-5 w-5" />
                Modifier
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-200 text-sm mb-1">
                  <BanknotesIcon className="h-4 w-4" />
                  Montant minimum
                </div>
                <p className="text-2xl font-bold">{Number(activeRuleset.min_purchase_amount).toLocaleString('fr-FR')} <span className="text-sm font-normal">CDF</span></p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-200 text-sm mb-1">
                  <PercentBadgeIcon className="h-4 w-4" />
                  Frais de service
                </div>
                <p className="text-2xl font-bold">{activeRuleset.operator_fee_percentage}<span className="text-sm font-normal">%</span></p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-200 text-sm mb-1">
                  <PercentBadgeIcon className="h-4 w-4" />
                  TVA par défaut
                </div>
                <p className="text-2xl font-bold">{activeRuleset.default_vat_rate}<span className="text-sm font-normal">%</span></p>
              </div>
              <div className="bg-white/10 rounded-xl p-4">
                <div className="flex items-center gap-2 text-blue-200 text-sm mb-1">
                  <ClockIcon className="h-4 w-4" />
                  Délai de sortie
                </div>
                <p className="text-2xl font-bold">{activeRuleset.exit_deadline_months} <span className="text-sm font-normal">mois</span></p>
              </div>
            </div>
          </div>

          {/* Detailed Settings Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Fees Configuration */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <BanknotesIcon className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Frais & Commissions</h3>
                  <p className="text-sm text-gray-500">Configuration des frais de service</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">Pourcentage frais de service</p>
                    <p className="text-sm text-gray-500">Appliqué sur le montant de TVA</p>
                  </div>
                  <span className="text-lg font-bold text-green-600">{activeRuleset.operator_fee_percentage}%</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">Frais fixes par bordereau</p>
                    <p className="text-sm text-gray-500">Montant fixe ajouté</p>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{Number(activeRuleset.operator_fee_fixed).toLocaleString('fr-FR')} CDF</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <div>
                    <p className="font-medium text-gray-900">Frais minimum</p>
                    <p className="text-sm text-gray-500">Plancher des frais de service</p>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{Number(activeRuleset.min_operator_fee).toLocaleString('fr-FR')} CDF</span>
                </div>
              </div>
            </div>

            {/* Eligibility Rules */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <UserGroupIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Règles d'éligibilité</h3>
                  <p className="text-sm text-gray-500">Conditions pour bénéficier de la détaxe</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">Montant minimum d'achat</p>
                    <p className="text-sm text-gray-500">Pour être éligible à la détaxe</p>
                  </div>
                  <span className="text-lg font-bold text-blue-600">{Number(activeRuleset.min_purchase_amount).toLocaleString('fr-FR')} CDF</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">Âge minimum</p>
                    <p className="text-sm text-gray-500">Du voyageur</p>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{activeRuleset.min_age} ans</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <div>
                    <p className="font-medium text-gray-900">Délai de sortie du territoire</p>
                    <p className="text-sm text-gray-500">Après l'achat</p>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{activeRuleset.exit_deadline_months} mois</span>
                </div>
              </div>
            </div>

            {/* Risk Configuration */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center">
                  <ShieldCheckIcon className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Gestion des risques</h3>
                  <p className="text-sm text-gray-500">Seuils de contrôle et alertes</p>
                </div>
              </div>
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <div>
                    <p className="font-medium text-gray-900">Seuil de risque</p>
                    <p className="text-sm text-gray-500">Score déclenchant un contrôle</p>
                  </div>
                  <span className="text-lg font-bold text-amber-600">{activeRuleset.risk_score_threshold}</span>
                </div>
                <div className="flex justify-between items-center py-3">
                  <div>
                    <p className="font-medium text-gray-900">Montant haute valeur</p>
                    <p className="text-sm text-gray-500">Nécessite contrôle additionnel</p>
                  </div>
                  <span className="text-lg font-bold text-gray-900">{Number(activeRuleset.high_value_threshold).toLocaleString('fr-FR')} CDF</span>
                </div>
              </div>
            </div>

            {/* VAT Rates */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <PercentBadgeIcon className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">Taux de TVA</h3>
                  <p className="text-sm text-gray-500">Taux appliqués par catégorie</p>
                </div>
              </div>
              <div className="p-6">
                <div className="flex justify-between items-center py-3">
                  <div>
                    <p className="font-medium text-gray-900">Taux par défaut</p>
                    <p className="text-sm text-gray-500">Appliqué si catégorie non spécifiée</p>
                  </div>
                  <span className="text-lg font-bold text-purple-600">{activeRuleset.default_vat_rate}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* Other Rulesets */}
          {rulesets.filter((rs: RuleSet) => !rs.is_active).length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100">
                <h3 className="font-semibold text-gray-900">Autres versions disponibles</h3>
              </div>
              <div className="divide-y divide-gray-100">
                {rulesets.filter((rs: RuleSet) => !rs.is_active).map((rs: RuleSet) => (
                  <div key={rs.id} className="px-6 py-4 flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{rs.name}</p>
                      <p className="text-sm text-gray-500">Version {rs.version}</p>
                    </div>
                    <button
                      onClick={() => activateMutation.mutate(rs.id)}
                      disabled={activateMutation.isPending}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-all disabled:opacity-50"
                    >
                      <CheckCircleIcon className="h-4 w-4" />
                      Activer
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Edit Modal */}
      {showEditModal && editingRuleset && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-xl font-bold text-gray-900">⚙️ Configuration du système Tax Free</h2>
                <p className="text-sm text-gray-500">{editingRuleset.name} - Version {editingRuleset.version}</p>
              </div>
              <button
                onClick={() => setShowEditModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <XMarkIcon className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6 space-y-8">
              {/* Info Banner */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
                <InformationCircleIcon className="h-6 w-6 text-amber-600 flex-shrink-0" />
                <div className="text-sm text-amber-800">
                  <p className="font-bold">⚠️ Attention - Paramètres sensibles</p>
                  <p className="mt-1">Ces paramètres affectent directement le calcul des remboursements et les règles d'éligibilité. Les modifications s'appliquent immédiatement à tous les nouveaux bordereaux.</p>
                </div>
              </div>

              {/* Section 1: Frais de service */}
              <div className="bg-green-50 rounded-2xl p-6 border border-green-200">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <BanknotesIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">💰 Frais de service (Commission opérateur)</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Ce sont les frais que <strong>vous prélevez</strong> sur chaque remboursement de TVA. 
                      C'est votre rémunération en tant qu'opérateur Tax Free.
                    </p>
                  </div>
                </div>
                
                <div className="bg-white rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-700 mb-3">
                    <strong>📊 Comment ça marche ?</strong><br/>
                    Quand un voyageur achète pour 100 000 CDF avec 16% de TVA = 16 000 CDF de TVA remboursable.<br/>
                    Si vos frais sont de 15%, vous prélevez : 16 000 × 15% = <strong>2 400 CDF</strong><br/>
                    Le voyageur reçoit : 16 000 - 2 400 = <strong>13 600 CDF</strong>
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-green-200">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      📈 Pourcentage des frais
                    </label>
                    <p className="text-xs text-gray-500 mb-3">% prélevé sur la TVA remboursable</p>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={editingRuleset.operator_fee_percentage}
                        onChange={(e) => setEditingRuleset({ ...editingRuleset, operator_fee_percentage: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                    </div>
                    <p className="mt-2 text-xs text-green-600">Ex: 15 = vous gardez 15% de la TVA</p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-4 border border-green-200">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      ➕ Frais fixes par bordereau
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Montant fixe ajouté à chaque bordereau</p>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={editingRuleset.operator_fee_fixed}
                        onChange={(e) => setEditingRuleset({ ...editingRuleset, operator_fee_fixed: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">CDF</span>
                    </div>
                    <p className="mt-2 text-xs text-green-600">Ex: 1000 = +1000 CDF par bordereau</p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-4 border border-green-200">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      ⬇️ Frais minimum
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Plancher minimum des frais</p>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={editingRuleset.min_operator_fee}
                        onChange={(e) => setEditingRuleset({ ...editingRuleset, min_operator_fee: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-transparent text-lg font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">CDF</span>
                    </div>
                    <p className="mt-2 text-xs text-green-600">Ex: 5000 = minimum 5000 CDF de frais</p>
                  </div>
                </div>
              </div>

              {/* Section 2: Règles d'éligibilité */}
              <div className="bg-blue-50 rounded-2xl p-6 border border-blue-200">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <UserGroupIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">👥 Règles d'éligibilité</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Ces règles déterminent <strong>qui peut bénéficier</strong> de la détaxe et <strong>sous quelles conditions</strong>.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-blue-200">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      🛒 Montant minimum d'achat
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Le voyageur doit acheter au moins ce montant pour être éligible</p>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={editingRuleset.min_purchase_amount}
                        onChange={(e) => setEditingRuleset({ ...editingRuleset, min_purchase_amount: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">CDF</span>
                    </div>
                    <p className="mt-2 text-xs text-blue-600">Ex: 50000 = achat min de 50 000 CDF</p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-4 border border-blue-200">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      🎂 Âge minimum du voyageur
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Le voyageur doit avoir au moins cet âge</p>
                    <div className="relative">
                      <input
                        type="number"
                        value={editingRuleset.min_age}
                        onChange={(e) => setEditingRuleset({ ...editingRuleset, min_age: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">ans</span>
                    </div>
                    <p className="mt-2 text-xs text-blue-600">Ex: 16 = doit avoir 16 ans minimum</p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-4 border border-blue-200">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      ✈️ Délai de sortie du territoire
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Le voyageur doit quitter le pays dans ce délai après l'achat</p>
                    <div className="relative">
                      <input
                        type="number"
                        value={editingRuleset.exit_deadline_months}
                        onChange={(e) => setEditingRuleset({ ...editingRuleset, exit_deadline_months: parseInt(e.target.value) })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">mois</span>
                    </div>
                    <p className="mt-2 text-xs text-blue-600">Ex: 3 = bordereau valide 3 mois</p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-4 border border-blue-200">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      📊 Taux de TVA par défaut
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Taux de TVA appliqué si non spécifié</p>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={editingRuleset.default_vat_rate}
                        onChange={(e) => setEditingRuleset({ ...editingRuleset, default_vat_rate: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent text-lg font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">%</span>
                    </div>
                    <p className="mt-2 text-xs text-blue-600">Ex: 16 = TVA de 16% en RDC</p>
                  </div>
                </div>
              </div>

              {/* Section 3: Catégories de produits */}
              <div className="bg-purple-50 rounded-2xl p-6 border border-purple-200">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-purple-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <span className="text-2xl">🏷️</span>
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">🏷️ Catégories de produits</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Définissez quelles catégories de produits sont <strong>éligibles</strong> ou <strong>exclues</strong> de la détaxe.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-700">
                    <strong>📋 Comment ça marche ?</strong><br/>
                    Les catégories <span className="text-green-600 font-medium">cochées ✓</span> sont éligibles à la détaxe.<br/>
                    Les catégories <span className="text-red-600 font-medium">décochées ✗</span> sont exclues - les produits de ces catégories ne seront pas remboursés.
                  </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {[
                    { value: 'GENERAL', label: 'Marchandises générales', icon: '📦' },
                    { value: 'ELECTRONICS', label: 'Électronique', icon: '📱' },
                    { value: 'CLOTHING', label: 'Vêtements & Accessoires', icon: '👕' },
                    { value: 'JEWELRY', label: 'Bijoux & Montres', icon: '💎' },
                    { value: 'COSMETICS', label: 'Cosmétiques & Parfums', icon: '💄' },
                    { value: 'FOOD', label: 'Alimentation & Boissons', icon: '🍔' },
                    { value: 'TOBACCO', label: 'Produits du tabac', icon: '🚬' },
                    { value: 'ALCOHOL', label: 'Boissons alcoolisées', icon: '🍷' },
                    { value: 'SERVICES', label: 'Services', icon: '🛎️' },
                    { value: 'OTHER', label: 'Autres', icon: '📋' },
                  ].map(cat => {
                    const isExcluded = (editingRuleset.excluded_categories || []).includes(cat.value);
                    return (
                      <label 
                        key={cat.value}
                        className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                          isExcluded 
                            ? 'bg-red-50 border-red-300 hover:border-red-400' 
                            : 'bg-green-50 border-green-300 hover:border-green-400'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={!isExcluded}
                          onChange={(e) => {
                            const currentExcluded = editingRuleset.excluded_categories || [];
                            if (e.target.checked) {
                              // Remove from excluded (make eligible)
                              setEditingRuleset({
                                ...editingRuleset,
                                excluded_categories: currentExcluded.filter((c: string) => c !== cat.value)
                              });
                            } else {
                              // Add to excluded
                              setEditingRuleset({
                                ...editingRuleset,
                                excluded_categories: [...currentExcluded, cat.value]
                              });
                            }
                          }}
                          className={`w-5 h-5 rounded ${isExcluded ? 'text-red-500' : 'text-green-500'}`}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span>{cat.icon}</span>
                            <span className={`text-sm font-medium ${isExcluded ? 'text-red-700' : 'text-green-700'}`}>
                              {cat.label}
                            </span>
                          </div>
                          <p className={`text-xs mt-0.5 ${isExcluded ? 'text-red-500' : 'text-green-500'}`}>
                            {isExcluded ? '❌ Exclu de la détaxe' : '✅ Éligible à la détaxe'}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                <div className="mt-4 p-3 bg-purple-100 rounded-xl">
                  <p className="text-sm text-purple-800">
                    <strong>Résumé:</strong> {10 - (editingRuleset.excluded_categories?.length || 0)} catégorie(s) éligible(s), {editingRuleset.excluded_categories?.length || 0} catégorie(s) exclue(s)
                  </p>
                </div>
              </div>

              {/* Section 4: Gestion des risques */}
              <div className="bg-amber-50 rounded-2xl p-6 border border-amber-200">
                <div className="flex items-start gap-4 mb-6">
                  <div className="w-12 h-12 bg-amber-500 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShieldCheckIcon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">🛡️ Gestion des risques (Anti-fraude)</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      Ces paramètres permettent de <strong>détecter les transactions suspectes</strong> et de demander un contrôle physique à la douane.
                    </p>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 mb-4">
                  <p className="text-sm text-gray-700">
                    <strong>🔍 Comment fonctionne le score de risque ?</strong><br/>
                    Chaque bordereau reçoit un score de risque basé sur plusieurs facteurs (montant élevé, nombre d'articles, etc.).<br/>
                    Si le score dépasse le seuil, le bordereau est marqué "Contrôle requis" et la douane doit vérifier physiquement.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white rounded-xl p-4 border border-amber-200">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      ⚠️ Seuil de risque
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Score au-delà duquel un contrôle est requis (0-100)</p>
                    <input
                      type="number"
                      value={editingRuleset.risk_score_threshold}
                      onChange={(e) => setEditingRuleset({ ...editingRuleset, risk_score_threshold: parseInt(e.target.value) })}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg font-bold"
                    />
                    <p className="mt-2 text-xs text-amber-600">Ex: 70 = contrôle si score &gt; 70</p>
                  </div>
                  
                  <div className="bg-white rounded-xl p-4 border border-amber-200">
                    <label className="block text-sm font-bold text-gray-700 mb-1">
                      💎 Seuil haute valeur
                    </label>
                    <p className="text-xs text-gray-500 mb-3">Montant au-delà duquel un contrôle additionnel est requis</p>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.01"
                        value={editingRuleset.high_value_threshold}
                        onChange={(e) => setEditingRuleset({ ...editingRuleset, high_value_threshold: e.target.value })}
                        className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-transparent text-lg font-bold"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">CDF</span>
                    </div>
                    <p className="mt-2 text-xs text-amber-600">Ex: 500000 = contrôle si &gt; 500 000 CDF</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center sticky bottom-0 bg-gray-50">
              <p className="text-xs text-gray-500">
                💡 Les modifications s'appliquent aux nouveaux bordereaux uniquement
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-white transition-colors"
                >
                  Annuler
                </button>
                <button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                  className="px-8 py-2.5 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  {updateMutation.isPending ? '⏳ Enregistrement...' : '✅ Enregistrer les modifications'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>
    </FadeIn>
  );
}
