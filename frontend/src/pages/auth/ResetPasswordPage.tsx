import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { 
  EyeIcon, 
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  KeyIcon
} from '@heroicons/react/24/outline';
import { passwordResetApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { validatePassword, getErrorMessage } from '../../utils';

interface ResetForm {
  password: string;
  password_confirm: string;
}

interface TokenInfo {
  valid: boolean;
  email: string;
  first_name: string;
  last_name: string;
}

export default function ResetPasswordPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { register, handleSubmit, watch } = useForm<ResetForm>();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [resetSuccess, setResetSuccess] = useState(false);
  
  const password = watch('password', '');
  const passwordConfirm = watch('password_confirm', '');
  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === passwordConfirm && passwordConfirm.length > 0;

  // Force reload on first access via full page refresh with cache busting
  useEffect(() => {
    const reloadKey = `reset-password-loaded-${token}`;
    const hasLoaded = sessionStorage.getItem(reloadKey);
    
    if (!hasLoaded && token) {
      sessionStorage.setItem(reloadKey, 'true');
      const url = new URL(window.location.href);
      url.searchParams.set('_t', Date.now().toString());
      window.location.replace(url.toString());
      return;
    }
  }, [token]);

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenError('Lien de réinitialisation invalide.');
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await passwordResetApi.validateToken(token);
        setTokenInfo(response.data);
      } catch (err: unknown) {
        setTokenError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    
    validateToken();
  }, [token]);

  const onSubmit = async (data: ResetForm) => {
    if (passwordValidation.strength < 3) {
      toast.error('Le mot de passe n\'est pas assez fort');
      return;
    }
    
    if (!passwordsMatch) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const response = await passwordResetApi.resetPassword(token!, {
        password: data.password,
        password_confirm: data.password_confirm
      });
      
      // Auto-login
      setAuth(response.data.access, response.data.refresh, response.data.user);
      setResetSuccess(true);
      toast.success('Mot de passe réinitialisé avec succès !');
      
      // Redirect after 2 seconds based on user role
      const userRole = response.data.user?.role;
      let dashboardUrl = '/admin/dashboard';
      switch (userRole) {
        case 'ADMIN':
        case 'AUDITOR':
          dashboardUrl = '/admin/dashboard';
          break;
        case 'MERCHANT':
          dashboardUrl = '/merchant/dashboard';
          break;
        case 'CUSTOMS_AGENT':
        case 'OPERATOR':
          dashboardUrl = '/customs/dashboard';
          break;
        case 'CLIENT':
          dashboardUrl = '/client/dashboard';
          break;
        default:
          dashboardUrl = '/admin/dashboard';
      }
      setTimeout(() => {
        navigate(dashboardUrl, { replace: true });
      }, 2000);
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Vérification du lien...</p>
        </div>
      </div>
    );
  }

  // Token error state
  if (tokenError || !tokenInfo) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-red-100 rounded-full mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Lien invalide</h2>
            <p className="text-gray-500 mb-6">{tokenError || 'Ce lien de réinitialisation est invalide ou a expiré.'}</p>
            <Link
              to="/login"
              className="inline-flex items-center justify-center w-full px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
            >
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Success state
  if (resetSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-xl p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
              <CheckCircleIcon className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">Mot de passe réinitialisé !</h2>
            <p className="text-gray-500 text-sm mb-6">
              Redirection vers votre espace...
            </p>
            <div className="animate-pulse">
              <div className="h-2 bg-green-200 rounded-full">
                <div className="h-2 bg-green-600 rounded-full animate-[loading_2s_ease-in-out]" style={{ width: '100%' }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Reset form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl mb-4 shadow-lg">
              <KeyIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Nouveau mot de passe</h2>
            <p className="text-gray-500 text-sm">
              Bonjour <strong>{tokenInfo?.first_name} {tokenInfo?.last_name}</strong>
            </p>
          </div>

          {/* Email identifiant */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-6">
            <p className="text-xs text-amber-600 font-medium mb-1">Votre identifiant de connexion</p>
            <p className="text-sm font-semibold text-amber-900">{tokenInfo?.email}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: true, minLength: 8 })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-amber-500 focus:border-amber-500 pr-12"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                </button>
              </div>
              
              {/* Password Strength */}
              {password && (
                <div className="mt-2">
                  <div className="flex gap-1 mb-1">
                    {[1, 2, 3, 4, 5].map((level) => (
                      <div
                        key={level}
                        className={`h-1 flex-1 rounded-full ${
                          passwordValidation.strength >= level
                            ? passwordValidation.strength <= 2 ? 'bg-red-500'
                            : passwordValidation.strength <= 3 ? 'bg-yellow-500'
                            : 'bg-green-500'
                            : 'bg-gray-200'
                        }`}
                      />
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-1 text-xs">
                    <span className={passwordValidation.checks.length ? 'text-green-600' : 'text-gray-400'}>
                      ✓ 8 caractères min
                    </span>
                    <span className={passwordValidation.checks.uppercase ? 'text-green-600' : 'text-gray-400'}>
                      ✓ Majuscule
                    </span>
                    <span className={passwordValidation.checks.number ? 'text-green-600' : 'text-gray-400'}>
                      ✓ Chiffre
                    </span>
                    <span className={passwordValidation.checks.special ? 'text-green-600' : 'text-gray-400'}>
                      ✓ Caractère spécial
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmez le mot de passe
              </label>
              <input
                type="password"
                {...register('password_confirm', { required: true })}
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-amber-500 ${
                  passwordConfirm && (passwordsMatch ? 'border-green-500' : 'border-red-300')
                } ${!passwordConfirm && 'border-gray-200'}`}
                placeholder="••••••••"
              />
              {passwordConfirm && (
                <p className={`text-xs mt-1 ${passwordsMatch ? 'text-green-600' : 'text-red-500'}`}>
                  {passwordsMatch ? '✓ Les mots de passe correspondent' : '✗ Les mots de passe ne correspondent pas'}
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !passwordsMatch || passwordValidation.strength < 3}
              className="w-full py-3 px-4 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-semibold rounded-xl hover:from-amber-600 hover:to-orange-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            >
              {isSubmitting ? 'Réinitialisation...' : 'Réinitialiser mon mot de passe'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-gray-500 hover:text-gray-700">
              Retour à la connexion
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
