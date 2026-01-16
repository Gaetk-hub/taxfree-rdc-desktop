import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import {
  ShieldCheckIcon,
  EyeIcon,
  EyeSlashIcon,
  CheckCircleIcon,
  XCircleIcon,
  MapPinIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface InvitationInfo {
  email: string;
  first_name: string;
  last_name: string;
  matricule: string;
  point_of_exit_name: string | null;
  expires_at: string;
}

export default function ActivateAgentPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [invitationInfo, setInvitationInfo] = useState<InvitationInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [activating, setActivating] = useState(false);
  const [activated, setActivated] = useState(false);

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: {
      password: '',
      password_confirm: '',
    },
  });

  const password = watch('password');

  useEffect(() => {
    const fetchInvitation = async () => {
      try {
        const response = await api.get(`/customs/activate/${token}/`);
        setInvitationInfo(response.data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Invitation invalide ou expirée');
      } finally {
        setLoading(false);
      }
    };

    if (token) {
      fetchInvitation();
    }
  }, [token]);

  const onSubmit = async (data: { password: string; password_confirm: string }) => {
    setActivating(true);
    try {
      await api.post(`/customs/activate/${token}/`, data);
      setActivated(true);
      toast.success('Compte activé avec succès !');
    } catch (err: any) {
      toast.error(err.response?.data?.detail || 'Erreur lors de l\'activation');
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <XCircleIcon className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Invitation invalide</h1>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retour à la connexion
          </button>
        </div>
      </div>
    );
  }

  if (activated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircleIcon className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Compte activé !</h1>
          <p className="text-gray-600 mb-6">
            Votre compte agent douanier a été activé avec succès. Vous pouvez maintenant vous connecter.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Se connecter
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShieldCheckIcon className="w-8 h-8 text-blue-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Activation du compte</h1>
          <p className="text-gray-600 mt-2">Agent Douanier - Tax Free RDC</p>
        </div>

        {/* Invitation Info */}
        {invitationInfo && (
          <div className="bg-gray-50 rounded-xl p-4 mb-6">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 uppercase">Agent</p>
                <p className="font-medium text-gray-900">
                  {invitationInfo.first_name} {invitationInfo.last_name}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Email</p>
                <p className="text-gray-700">{invitationInfo.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 uppercase">Matricule</p>
                <p className="font-mono text-gray-700">{invitationInfo.matricule}</p>
              </div>
              {invitationInfo.point_of_exit_name && (
                <div>
                  <p className="text-xs text-gray-500 uppercase">Frontière assignée</p>
                  <div className="flex items-center gap-2">
                    <MapPinIcon className="w-4 h-4 text-blue-500" />
                    <p className="text-gray-700">{invitationInfo.point_of_exit_name}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Password Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Mot de passe
            </label>
            <div className="relative">
              <input
                {...register('password', {
                  required: 'Mot de passe requis',
                  minLength: { value: 8, message: 'Minimum 8 caractères' },
                })}
                type={showPassword ? 'text' : 'password'}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 pr-12"
                placeholder="Minimum 8 caractères"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Confirmer le mot de passe
            </label>
            <div className="relative">
              <input
                {...register('password_confirm', {
                  required: 'Confirmation requise',
                  validate: (value) => value === password || 'Les mots de passe ne correspondent pas',
                })}
                type={showConfirmPassword ? 'text' : 'password'}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 pr-12"
                placeholder="Répétez le mot de passe"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
              </button>
            </div>
            {errors.password_confirm && (
              <p className="text-red-500 text-xs mt-1">{errors.password_confirm.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={activating}
            className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {activating ? 'Activation en cours...' : 'Activer mon compte'}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500 mt-6">
          Déjà un compte ?{' '}
          <button
            onClick={() => navigate('/login')}
            className="text-blue-600 hover:underline"
          >
            Se connecter
          </button>
        </p>
      </div>
    </div>
  );
}
