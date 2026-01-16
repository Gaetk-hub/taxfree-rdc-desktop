import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import FadeIn from '../../components/ui/FadeIn';
import {
  Cog6ToothIcon,
  BuildingOffice2Icon,
  GlobeAltIcon,
  BellIcon,
  ShieldCheckIcon,
  EnvelopeIcon,
  ServerIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { settingsApi } from '../../services/api';

interface SystemSettings {
  general: {
    company_name: string;
    company_address: string;
    company_phone: string;
    company_email: string;
    default_currency: string;
    default_language: string;
    timezone: string;
  };
  notifications: {
    email_notifications_enabled: boolean;
    sms_notifications_enabled: boolean;
    notify_on_form_created: boolean;
    notify_on_validation: boolean;
    notify_on_refund: boolean;
    notify_admins_on_high_risk: boolean;
  };
  security: {
    session_timeout_minutes: number;
    max_login_attempts: number;
    require_2fa_for_admins: boolean;
    password_expiry_days: number;
    ip_whitelist_enabled: boolean;
    ip_whitelist: string[];
  };
  maintenance: {
    maintenance_mode: boolean;
    maintenance_message: string;
    allowed_ips_during_maintenance: string[];
  };
}

const DEFAULT_SETTINGS: SystemSettings = {
  general: {
    company_name: 'Tax Free RDC',
    company_address: 'Kinshasa, République Démocratique du Congo',
    company_phone: '+243 XXX XXX XXX',
    company_email: 'contact@taxfree.cd',
    default_currency: 'CDF',
    default_language: 'fr',
    timezone: 'Africa/Kinshasa',
  },
  notifications: {
    email_notifications_enabled: true,
    sms_notifications_enabled: false,
    notify_on_form_created: true,
    notify_on_validation: true,
    notify_on_refund: true,
    notify_admins_on_high_risk: true,
  },
  security: {
    session_timeout_minutes: 60,
    max_login_attempts: 5,
    require_2fa_for_admins: true,
    password_expiry_days: 90,
    ip_whitelist_enabled: false,
    ip_whitelist: [],
  },
  maintenance: {
    maintenance_mode: false,
    maintenance_message: 'Le système est en maintenance. Veuillez réessayer plus tard.',
    allowed_ips_during_maintenance: [],
  },
};

type TabId = 'general' | 'notifications' | 'security' | 'maintenance';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<TabId>('general');
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [hasChanges, setHasChanges] = useState(false);

  // Fetch settings
  const { isLoading, refetch } = useQuery({
    queryKey: ['system-settings'],
    queryFn: async () => {
      try {
        const response = await settingsApi.getSettings();
        if (response.data) {
          setSettings({ ...DEFAULT_SETTINGS, ...response.data });
        }
        return response.data;
      } catch {
        // Use defaults if API not available
        return DEFAULT_SETTINGS;
      }
    },
  });

  // Save settings mutation
  const saveMutation = useMutation({
    mutationFn: (data: SystemSettings) => settingsApi.updateSettings(data as unknown as Record<string, unknown>),
    onSuccess: () => {
      toast.success('Paramètres enregistrés avec succès');
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ['system-settings'] });
    },
    onError: () => {
      toast.error('Erreur lors de l\'enregistrement des paramètres');
    },
  });

  const handleChange = <K extends keyof SystemSettings>(
    section: K,
    field: keyof SystemSettings[K],
    value: any
  ) => {
    setSettings(prev => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
    setHasChanges(true);
  };

  const handleSave = () => {
    saveMutation.mutate(settings);
  };

  const handleReset = () => {
    refetch();
    setHasChanges(false);
    toast.success('Paramètres réinitialisés');
  };

  const tabs = [
    { id: 'general' as TabId, label: 'Général', icon: BuildingOffice2Icon },
    { id: 'notifications' as TabId, label: 'Notifications', icon: BellIcon },
    { id: 'security' as TabId, label: 'Sécurité', icon: ShieldCheckIcon },
    { id: 'maintenance' as TabId, label: 'Maintenance', icon: ServerIcon },
  ];

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Cog6ToothIcon className="w-7 h-7 text-primary-600" />
            Paramètres Système
          </h1>
          <p className="text-gray-500 mt-1">Configuration globale de la plateforme Tax Free RDC</p>
        </div>
        <div className="flex items-center gap-3">
          {hasChanges && (
            <span className="text-sm text-amber-600 flex items-center gap-1">
              <ExclamationTriangleIcon className="w-4 h-4" />
              Modifications non enregistrées
            </span>
          )}
          <button
            onClick={handleReset}
            disabled={!hasChanges}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            <ArrowPathIcon className="w-5 h-5" />
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saveMutation.isPending ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <CheckCircleIcon className="w-5 h-5" />
            )}
            Enregistrer
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-primary-600 text-primary-600 bg-primary-50/50'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon className="w-5 h-5" />
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : (
          <div className="p-6">
            {/* General Settings */}
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <InformationCircleIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Informations générales</p>
                    <p className="mt-1">Ces paramètres définissent l'identité de votre plateforme Tax Free.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <BuildingOffice2Icon className="w-4 h-4 inline mr-1" />
                      Nom de l'entreprise
                    </label>
                    <input
                      type="text"
                      value={settings.general.company_name}
                      onChange={(e) => handleChange('general', 'company_name', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <EnvelopeIcon className="w-4 h-4 inline mr-1" />
                      Email de contact
                    </label>
                    <input
                      type="email"
                      value={settings.general.company_email}
                      onChange={(e) => handleChange('general', 'company_email', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Téléphone
                    </label>
                    <input
                      type="text"
                      value={settings.general.company_phone}
                      onChange={(e) => handleChange('general', 'company_phone', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <GlobeAltIcon className="w-4 h-4 inline mr-1" />
                      Fuseau horaire
                    </label>
                    <select
                      value={settings.general.timezone}
                      onChange={(e) => handleChange('general', 'timezone', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="Africa/Kinshasa">Africa/Kinshasa (UTC+1)</option>
                      <option value="Africa/Lubumbashi">Africa/Lubumbashi (UTC+2)</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Adresse
                    </label>
                    <textarea
                      value={settings.general.company_address}
                      onChange={(e) => handleChange('general', 'company_address', e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <CurrencyDollarIcon className="w-4 h-4 inline mr-1" />
                      Devise par défaut
                    </label>
                    <select
                      value={settings.general.default_currency}
                      onChange={(e) => handleChange('general', 'default_currency', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="CDF">CDF - Franc Congolais</option>
                      <option value="USD">USD - Dollar Américain</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Langue par défaut
                    </label>
                    <select
                      value={settings.general.default_language}
                      onChange={(e) => handleChange('general', 'default_language', e.target.value)}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="fr">Français</option>
                      <option value="en">English</option>
                    </select>
                  </div>
                </div>
              </div>
            )}

            {/* Notifications Settings */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <BellIcon className="w-5 h-5 text-blue-600 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-medium">Configuration des notifications</p>
                    <p className="mt-1">Définissez quand et comment les utilisateurs reçoivent des notifications.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <h3 className="font-semibold text-gray-900">Canaux de notification</h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center gap-3">
                        <EnvelopeIcon className="w-5 h-5 text-gray-500" />
                        <div>
                          <p className="font-medium text-gray-900">Notifications par email</p>
                          <p className="text-sm text-gray-500">Envoyer des emails pour les événements importants</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.email_notifications_enabled}
                        onChange={(e) => handleChange('notifications', 'email_notifications_enabled', e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        <div>
                          <p className="font-medium text-gray-900">Notifications SMS</p>
                          <p className="text-sm text-gray-500">Envoyer des SMS (nécessite une configuration supplémentaire)</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.notifications.sms_notifications_enabled}
                        onChange={(e) => handleChange('notifications', 'sms_notifications_enabled', e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </label>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900">Événements déclencheurs</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={settings.notifications.notify_on_form_created}
                        onChange={(e) => handleChange('notifications', 'notify_on_form_created', e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Création de bordereau</p>
                        <p className="text-xs text-gray-500">Notifier le voyageur</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={settings.notifications.notify_on_validation}
                        onChange={(e) => handleChange('notifications', 'notify_on_validation', e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Validation douanière</p>
                        <p className="text-xs text-gray-500">Notifier le voyageur et le commerçant</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={settings.notifications.notify_on_refund}
                        onChange={(e) => handleChange('notifications', 'notify_on_refund', e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Remboursement effectué</p>
                        <p className="text-xs text-gray-500">Notifier le voyageur</p>
                      </div>
                    </label>

                    <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <input
                        type="checkbox"
                        checked={settings.notifications.notify_admins_on_high_risk}
                        onChange={(e) => handleChange('notifications', 'notify_admins_on_high_risk', e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                      <div>
                        <p className="font-medium text-gray-900">Alerte haut risque</p>
                        <p className="text-xs text-gray-500">Notifier les administrateurs</p>
                      </div>
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Security Settings */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
                  <ShieldCheckIcon className="w-5 h-5 text-red-600 mt-0.5" />
                  <div className="text-sm text-red-800">
                    <p className="font-medium">🔒 Paramètres de sécurité</p>
                    <p className="mt-1">Ces paramètres affectent la sécurité de tous les utilisateurs. Modifiez avec précaution.</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <ClockIcon className="w-4 h-4 inline mr-1" />
                      Délai d'expiration de session (minutes)
                    </label>
                    <input
                      type="number"
                      value={settings.security.session_timeout_minutes}
                      onChange={(e) => handleChange('security', 'session_timeout_minutes', parseInt(e.target.value))}
                      min={15}
                      max={480}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Déconnexion automatique après inactivité</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Tentatives de connexion max
                    </label>
                    <input
                      type="number"
                      value={settings.security.max_login_attempts}
                      onChange={(e) => handleChange('security', 'max_login_attempts', parseInt(e.target.value))}
                      min={3}
                      max={10}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">Blocage temporaire après échecs</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Expiration mot de passe (jours)
                    </label>
                    <input
                      type="number"
                      value={settings.security.password_expiry_days}
                      onChange={(e) => handleChange('security', 'password_expiry_days', parseInt(e.target.value))}
                      min={0}
                      max={365}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                    <p className="text-xs text-gray-500 mt-1">0 = pas d'expiration</p>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-200">
                  <h3 className="font-semibold text-gray-900">Options de sécurité</h3>
                  
                  <div className="space-y-3">
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Authentification 2FA obligatoire pour les admins</p>
                        <p className="text-sm text-gray-500">Les administrateurs doivent utiliser la double authentification</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.security.require_2fa_for_admins}
                        onChange={(e) => handleChange('security', 'require_2fa_for_admins', e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </label>

                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Liste blanche d'IP</p>
                        <p className="text-sm text-gray-500">Restreindre l'accès admin à certaines adresses IP</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={settings.security.ip_whitelist_enabled}
                        onChange={(e) => handleChange('security', 'ip_whitelist_enabled', e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </label>
                  </div>
                </div>
              </div>
            )}

            {/* Maintenance Settings */}
            {activeTab === 'maintenance' && (
              <div className="space-y-6">
                <div className="flex items-start gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
                  <ServerIcon className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div className="text-sm text-orange-800">
                    <p className="font-medium">🛠️ Mode maintenance</p>
                    <p className="mt-1">Activez le mode maintenance pour effectuer des opérations sur le système. Les utilisateurs verront un message d'indisponibilité.</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                    <div>
                      <p className="font-medium text-gray-900">Activer le mode maintenance</p>
                      <p className="text-sm text-gray-500">Le site sera inaccessible pour les utilisateurs normaux</p>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings.maintenance.maintenance_mode}
                      onChange={(e) => handleChange('maintenance', 'maintenance_mode', e.target.checked)}
                      className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                    />
                  </label>

                  {settings.maintenance.maintenance_mode && (
                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                      <p className="text-red-800 font-medium flex items-center gap-2">
                        <ExclamationTriangleIcon className="w-5 h-5" />
                        Mode maintenance ACTIF
                      </p>
                      <p className="text-sm text-red-700 mt-1">Le site est actuellement en maintenance.</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message de maintenance
                    </label>
                    <textarea
                      value={settings.maintenance.maintenance_message}
                      onChange={(e) => handleChange('maintenance', 'maintenance_message', e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                      placeholder="Message affiché aux utilisateurs pendant la maintenance..."
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      IPs autorisées pendant la maintenance
                    </label>
                    <textarea
                      value={settings.maintenance.allowed_ips_during_maintenance.join('\n')}
                      onChange={(e) => handleChange('maintenance', 'allowed_ips_during_maintenance', e.target.value.split('\n').filter(ip => ip.trim()))}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 font-mono text-sm"
                      placeholder="Une adresse IP par ligne..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Ces adresses IP pourront accéder au site même en mode maintenance</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </FadeIn>
  );
}
