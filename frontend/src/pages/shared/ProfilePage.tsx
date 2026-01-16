import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { useAuthStore } from '../../store/authStore';
import { userApi } from '../../services/api';
import {
  UserCircleIcon,
  CameraIcon,
  KeyIcon,
  EnvelopeIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  EyeSlashIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

// Role display names
const ROLE_DISPLAY: Record<string, string> = {
  ADMIN: 'Super Administrateur',
  AUDITOR: 'Auditeur',
  MERCHANT: 'Administrateur Commerçant',
  MERCHANT_EMPLOYEE: 'Employé Commerçant',
  CUSTOMS_AGENT: 'Agent Douanier',
  OPERATOR: 'Opérateur',
  CLIENT: 'Client',
};

export default function ProfilePage() {
  const { user, setUser, logout } = useAuthStore();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Password change state
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);

  // Update profile photo mutation
  const updatePhotoMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('profile_photo', file);
      return userApi.updateProfilePhoto(formData);
    },
    onSuccess: (response) => {
      toast.success('Photo de profil mise à jour');
      // Update user in store
      if (response.data && user) {
        setUser({ ...user, profile_photo: response.data.profile_photo });
      }
      queryClient.invalidateQueries({ queryKey: ['user'] });
      setPreviewUrl(null);
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour de la photo');
      setPreviewUrl(null);
    },
  });

  // Change password mutation
  const changePasswordMutation = useMutation({
    mutationFn: (data: { current_password: string; new_password: string }) =>
      userApi.changePassword(data),
    onSuccess: () => {
      toast.success('Mot de passe modifié avec succès. Vous allez être déconnecté.');
      // Reset form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordForm(false);
      // Logout after 2 seconds for security
      setTimeout(() => {
        logout();
      }, 2000);
    },
    onError: (error: any) => {
      const message = error.response?.data?.detail || error.response?.data?.current_password?.[0] || 'Erreur lors du changement de mot de passe';
      toast.error(message);
    },
  });

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Veuillez sélectionner une image');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('La taille de l\'image ne doit pas dépasser 5 Mo');
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);

    // Upload
    setUploadingPhoto(true);
    updatePhotoMutation.mutate(file, {
      onSettled: () => setUploadingPhoto(false),
    });
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Veuillez remplir tous les champs');
      return;
    }

    if (newPassword.length < 8) {
      toast.error('Le nouveau mot de passe doit contenir au moins 8 caractères');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    changePasswordMutation.mutate({
      current_password: currentPassword,
      new_password: newPassword,
    });
  };

  const getInitials = () => {
    return `${user?.first_name?.[0] || ''}${user?.last_name?.[0] || ''}`.toUpperCase();
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mon Profil</h1>
        <p className="text-gray-500 mt-1">Gérez vos informations personnelles et votre sécurité</p>
      </div>

      {/* Profile Card */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {/* Cover gradient */}
        <div className="h-32 bg-gradient-to-r from-primary-500 to-primary-700"></div>
        
        {/* Profile info */}
        <div className="px-6 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 pt-4">
            {/* Avatar with upload */}
            <div className="relative">
              <div className="w-32 h-32 rounded-full border-4 border-white bg-white shadow-lg overflow-hidden">
                {(previewUrl || user?.profile_photo) && !imageError ? (
                  <img
                    src={previewUrl || user?.profile_photo}
                    alt="Profile"
                    className="w-full h-full object-cover"
                    onError={() => setImageError(true)}
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-white text-3xl font-bold">
                    {getInitials()}
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <ArrowPathIcon className="w-8 h-8 text-white animate-spin" />
                  </div>
                )}
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingPhoto}
                className="absolute bottom-0 right-0 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <CameraIcon className="w-5 h-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handlePhotoSelect}
                className="hidden"
              />
            </div>

            {/* Name and role */}
            <div className="flex-1 sm:pb-2 mt-4 sm:mt-0">
              <h2 className="text-2xl font-bold text-gray-900">
                {user?.first_name} {user?.last_name}
              </h2>
              <div className="flex items-center gap-2 mt-1">
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 text-sm font-medium rounded-full">
                  <ShieldCheckIcon className="w-4 h-4" />
                  {ROLE_DISPLAY[user?.role || ''] || user?.role}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Personal Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <UserCircleIcon className="w-5 h-5 text-primary-600" />
            Informations personnelles
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Prénom</label>
              <p className="text-gray-900 font-medium">{user?.first_name || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Nom</label>
              <p className="text-gray-900 font-medium">{user?.last_name || '-'}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500 flex items-center gap-1">
                <EnvelopeIcon className="w-4 h-4" />
                Email
              </label>
              <p className="text-gray-900 font-medium">{user?.email || '-'}</p>
            </div>
            {user?.phone && (
              <div>
                <label className="text-sm text-gray-500">Téléphone</label>
                <p className="text-gray-900 font-medium">{user.phone}</p>
              </div>
            )}
          </div>
        </div>

        {/* Account Information */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ShieldCheckIcon className="w-5 h-5 text-primary-600" />
            Compte
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-500">Rôle</label>
              <p className="text-gray-900 font-medium">{ROLE_DISPLAY[user?.role || ''] || user?.role}</p>
            </div>
            <div>
              <label className="text-sm text-gray-500">Statut</label>
              <p className="flex items-center gap-1">
                <CheckCircleIcon className="w-4 h-4 text-emerald-500" />
                <span className="text-emerald-600 font-medium">Actif</span>
              </p>
            </div>
            {user?.merchant_name && (
              <div>
                <label className="text-sm text-gray-500">Commerçant</label>
                <p className="text-gray-900 font-medium">{user.merchant_name}</p>
              </div>
            )}
            {user?.outlet_name && (
              <div>
                <label className="text-sm text-gray-500">Point de vente</label>
                <p className="text-gray-900 font-medium">{user.outlet_name}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Security Section */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <KeyIcon className="w-5 h-5 text-primary-600" />
            Sécurité
          </h3>
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="px-4 py-2 text-sm font-medium text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
            >
              Modifier le mot de passe
            </button>
          )}
        </div>

        {showPasswordForm ? (
          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg flex gap-3">
              <ExclamationTriangleIcon className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-amber-800">
                <p className="font-medium">Attention</p>
                <p>Après modification du mot de passe, vous serez automatiquement déconnecté pour des raisons de sécurité.</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Mot de passe actuel
              </label>
              <div className="relative">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Entrez votre mot de passe actuel"
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
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Minimum 8 caractères"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
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
                  className="w-full px-4 py-2.5 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Répétez le nouveau mot de passe"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              {confirmPassword && newPassword !== confirmPassword && (
                <p className="text-sm text-red-500 mt-1">Les mots de passe ne correspondent pas</p>
              )}
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
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors"
              >
                Annuler
              </button>
              <button
                type="submit"
                disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || newPassword !== confirmPassword}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {changePasswordMutation.isPending && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                Modifier le mot de passe
              </button>
            </div>
          </form>
        ) : (
          <div className="flex items-center gap-3 text-gray-600">
            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
              <KeyIcon className="w-5 h-5 text-gray-500" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Mot de passe</p>
              <p className="text-sm text-gray-500">••••••••••••</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
