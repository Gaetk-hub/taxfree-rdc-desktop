import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { userApi } from '../../services/api';
import FadeIn from '../../components/ui/FadeIn';
import {
  Cog6ToothIcon,
  BellIcon,
  ShieldCheckIcon,
  KeyIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  SunIcon,
  MoonIcon,
} from '@heroicons/react/24/outline';

export default function CustomsSettingsPage() {
  
  // Active tab
  const [activeTab, setActiveTab] = useState<'notifications' | 'security' | 'preferences'>('notifications');
  
  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Notification preferences
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [notifyNewValidation, setNotifyNewValidation] = useState(true);
  const [notifyRefundComplete, setNotifyRefundComplete] = useState(true);
  const [notifyTicketUpdate, setNotifyTicketUpdate] = useState(true);
  
  // Preferences
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [language, setLanguage] = useState('fr');
  const [autoLogout, setAutoLogout] = useState(30);

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      userApi.changePassword(data),
    onSuccess: () => {
      toast.success('Mot de passe modifié avec succès');
      setShowPasswordForm(false);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur lors du changement de mot de passe');
    },
  });

  const handleChangePassword = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    if (newPassword.length < 8) {
      toast.error('Le mot de passe doit contenir au moins 8 caractères');
      return;
    }
    
    changePasswordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  const handleSaveNotifications = () => {
    toast.success('Préférences de notifications enregistrées');
  };

  const handleSavePreferences = () => {
    toast.success('Préférences enregistrées');
  };

  const tabs = [
    { id: 'notifications', label: 'Notifications', icon: BellIcon },
    { id: 'security', label: 'Sécurité', icon: ShieldCheckIcon },
    { id: 'preferences', label: 'Préférences', icon: Cog6ToothIcon },
  ];

  return (
    <FadeIn>
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Cog6ToothIcon className="w-7 h-7 text-primary-600" />
            Paramètres
          </h1>
          <p className="text-gray-500 mt-1">Gérez vos préférences et paramètres de sécurité</p>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-primary-600 text-primary-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Canaux de notification</h3>
                  <div className="space-y-4">
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <BellIcon className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Notifications par email</p>
                          <p className="text-sm text-gray-500">Recevez les alertes importantes par email</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={emailNotifications}
                        onChange={(e) => setEmailNotifications(e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                          <DevicePhoneMobileIcon className="w-5 h-5 text-green-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Notifications push</p>
                          <p className="text-sm text-gray-500">Recevez des notifications en temps réel</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={pushNotifications}
                        onChange={(e) => setPushNotifications(e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                          <ComputerDesktopIcon className="w-5 h-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">Sons de notification</p>
                          <p className="text-sm text-gray-500">Jouer un son lors des nouvelles notifications</p>
                        </div>
                      </div>
                      <input
                        type="checkbox"
                        checked={soundEnabled}
                        onChange={(e) => setSoundEnabled(e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </label>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Types de notifications</h3>
                  <div className="space-y-3">
                    <label className="flex items-center justify-between py-3">
                      <div>
                        <p className="font-medium text-gray-900">Nouvelles validations</p>
                        <p className="text-sm text-gray-500">Quand un nouveau bordereau est prêt à valider</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifyNewValidation}
                        onChange={(e) => setNotifyNewValidation(e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between py-3 border-t border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Remboursements terminés</p>
                        <p className="text-sm text-gray-500">Quand un remboursement est confirmé</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifyRefundComplete}
                        onChange={(e) => setNotifyRefundComplete(e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </label>
                    
                    <label className="flex items-center justify-between py-3 border-t border-gray-100">
                      <div>
                        <p className="font-medium text-gray-900">Mises à jour des tickets</p>
                        <p className="text-sm text-gray-500">Quand un ticket de support est mis à jour</p>
                      </div>
                      <input
                        type="checkbox"
                        checked={notifyTicketUpdate}
                        onChange={(e) => setNotifyTicketUpdate(e.target.checked)}
                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <button
                    onClick={handleSaveNotifications}
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    Enregistrer les préférences
                  </button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                {/* Password Section */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-amber-100 rounded-xl flex items-center justify-center">
                        <KeyIcon className="w-6 h-6 text-amber-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Mot de passe</h3>
                        <p className="text-sm text-gray-500">Dernière modification il y a 30 jours</p>
                      </div>
                    </div>
                    {!showPasswordForm && (
                      <button
                        onClick={() => setShowPasswordForm(true)}
                        className="px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                      >
                        Modifier
                      </button>
                    )}
                  </div>

                  {showPasswordForm && (
                    <form onSubmit={handleChangePassword} className="mt-6 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Mot de passe actuel
                        </label>
                        <div className="relative">
                          <input
                            type={showCurrentPassword ? 'text' : 'password'}
                            value={currentPassword}
                            onChange={(e) => setCurrentPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showCurrentPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Nouveau mot de passe
                        </label>
                        <div className="relative">
                          <input
                            type={showNewPassword ? 'text' : 'password'}
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10"
                            required
                            minLength={8}
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showNewPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">Minimum 8 caractères</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Confirmer le nouveau mot de passe
                        </label>
                        <div className="relative">
                          <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 pr-10"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                          >
                            {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>

                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setShowPasswordForm(false);
                            setCurrentPassword('');
                            setNewPassword('');
                            setConfirmPassword('');
                          }}
                          className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                        >
                          Annuler
                        </button>
                        <button
                          type="submit"
                          disabled={changePasswordMutation.isPending}
                          className="px-4 py-2 text-sm font-medium bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50"
                        >
                          {changePasswordMutation.isPending ? 'Modification...' : 'Modifier le mot de passe'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Two-Factor Authentication */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                        <ShieldCheckIcon className="w-6 h-6 text-green-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-gray-900">Authentification à deux facteurs</h3>
                        <p className="text-sm text-gray-500">Ajoutez une couche de sécurité supplémentaire</p>
                      </div>
                    </div>
                    <span className="px-3 py-1 text-xs font-medium bg-gray-200 text-gray-600 rounded-full">
                      Bientôt disponible
                    </span>
                  </div>
                </div>

                {/* Active Sessions */}
                <div className="bg-gray-50 rounded-xl p-6">
                  <h3 className="font-semibold text-gray-900 mb-4">Sessions actives</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                      <div className="flex items-center gap-3">
                        <ComputerDesktopIcon className="w-8 h-8 text-gray-400" />
                        <div>
                          <p className="font-medium text-gray-900">Session actuelle</p>
                          <p className="text-xs text-gray-500">Navigateur web • Kinshasa, RDC</p>
                        </div>
                      </div>
                      <span className="flex items-center gap-1 text-xs text-green-600">
                        <CheckCircleIcon className="w-4 h-4" />
                        Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Preferences Tab */}
            {activeTab === 'preferences' && (
              <div className="space-y-6">
                {/* Theme */}
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Apparence</h3>
                  <div className="grid grid-cols-3 gap-4">
                    <button
                      onClick={() => setTheme('light')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        theme === 'light' ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <SunIcon className="w-8 h-8 mx-auto mb-2 text-amber-500" />
                      <p className="text-sm font-medium text-gray-900">Clair</p>
                    </button>
                    <button
                      onClick={() => setTheme('dark')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        theme === 'dark' ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <MoonIcon className="w-8 h-8 mx-auto mb-2 text-indigo-500" />
                      <p className="text-sm font-medium text-gray-900">Sombre</p>
                    </button>
                    <button
                      onClick={() => setTheme('system')}
                      className={`p-4 rounded-xl border-2 transition-all ${
                        theme === 'system' ? 'border-primary-600 bg-primary-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <ComputerDesktopIcon className="w-8 h-8 mx-auto mb-2 text-gray-500" />
                      <p className="text-sm font-medium text-gray-900">Système</p>
                    </button>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Le thème sombre sera bientôt disponible</p>
                </div>

                {/* Language */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Langue</h3>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="fr">Français</option>
                    <option value="en">English</option>
                  </select>
                </div>

                {/* Auto Logout */}
                <div className="border-t border-gray-200 pt-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Déconnexion automatique</h3>
                  <p className="text-sm text-gray-500 mb-3">
                    Se déconnecter automatiquement après une période d'inactivité
                  </p>
                  <select
                    value={autoLogout}
                    onChange={(e) => setAutoLogout(Number(e.target.value))}
                    className="w-full max-w-xs px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value={15}>15 minutes</option>
                    <option value={30}>30 minutes</option>
                    <option value={60}>1 heure</option>
                    <option value={120}>2 heures</option>
                    <option value={0}>Jamais</option>
                  </select>
                </div>

                <div className="flex justify-end pt-4 border-t border-gray-200">
                  <button
                    onClick={handleSavePreferences}
                    className="px-6 py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors"
                  >
                    Enregistrer les préférences
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </FadeIn>
  );
}
