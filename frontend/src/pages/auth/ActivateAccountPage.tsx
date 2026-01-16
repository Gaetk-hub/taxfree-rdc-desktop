import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import { 
  EyeIcon, 
  EyeSlashIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  BuildingOfficeIcon
} from '@heroicons/react/24/outline';
import { authApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import { validatePassword, getErrorMessage } from '../../utils';
import type { TokenInfo } from '../../types';

interface ActivationForm {
  password: string;
  password_confirm: string;
}

export default function ActivateAccountPage() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { register, handleSubmit, watch } = useForm<ActivationForm>();
  
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<TokenInfo | null>(null);
  const [tokenError, setTokenError] = useState('');
  const [activationSuccess, setActivationSuccess] = useState(false);
  
  const password = watch('password', '');
  const passwordConfirm = watch('password_confirm', '');
  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === passwordConfirm && passwordConfirm.length > 0;

  // Validate token on mount
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setTokenError('Lien d\'activation invalide.');
        setIsLoading(false);
        return;
      }
      
      try {
        const response = await authApi.validateToken(token);
        setTokenInfo(response.data);
      } catch (err: unknown) {
        setTokenError(getErrorMessage(err));
      } finally {
        setIsLoading(false);
      }
    };
    
    validateToken();
  }, [token]);

  const onSubmit = async (data: ActivationForm) => {
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
      const response = await authApi.activateAccount(token!, {
        password: data.password,
        password_confirm: data.password_confirm
      });
      
      // Auto-login
      setAuth(response.data.access, response.data.refresh, response.data.user);
      setActivationSuccess(true);
      toast.success('Compte activé avec succès !');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        navigate('/merchant');
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Vérification du lien...</p>
        </div>
      </div>
    );
  }

  // Token error state
  if (tokenError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <ExclamationTriangleIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Lien invalide</h2>
          <p className="text-gray-600 mb-6">{tokenError}</p>
          <Link
            to="/login"
            className="inline-flex items-center justify-center w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
          >
            Retour à la connexion
          </Link>
        </div>
      </div>
    );
  }

  // Success state
  if (activationSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircleIcon className="w-10 h-10 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Compte activé !</h2>
          <p className="text-gray-600 mb-2">
            Bienvenue <strong>{tokenInfo?.first_name}</strong> !
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Redirection vers votre espace commerçant...
          </p>
          <div className="animate-pulse">
            <div className="h-2 bg-blue-200 rounded-full">
              <div className="h-2 bg-blue-600 rounded-full animate-[loading_2s_ease-in-out]" style={{ width: '100%' }}></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Activation form
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-3xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
              <BuildingOfficeIcon className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Activez votre compte</h2>
            <p className="text-gray-500 text-sm">
              Bienvenue <strong>{tokenInfo?.first_name} {tokenInfo?.last_name}</strong>
            </p>
            <p className="text-blue-600 font-semibold text-sm mt-1">
              {tokenInfo?.company_name}
            </p>
          </div>

          {/* Email identifiant */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
            <p className="text-xs text-blue-600 font-medium mb-1">Votre identifiant de connexion</p>
            <p className="text-sm font-semibold text-blue-900">{tokenInfo?.email}</p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Créez votre mot de passe
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', { required: true, minLength: 8 })}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 pr-12"
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
                className={`w-full px-4 py-3 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  passwordConfirm && !passwordsMatch ? 'border-red-300' : passwordsMatch ? 'border-green-300' : 'border-gray-200'
                }`}
                placeholder="••••••••"
              />
              {passwordConfirm && !passwordsMatch && (
                <p className="text-red-500 text-xs mt-1">Les mots de passe ne correspondent pas</p>
              )}
              {passwordsMatch && (
                <p className="text-green-600 text-xs mt-1">✓ Les mots de passe correspondent</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting || passwordValidation.strength < 3 || !passwordsMatch}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Activation...
                </span>
              ) : (
                'Activer mon compte'
              )}
            </button>
          </form>
        </div>

        <div className="text-center mt-4">
          <Link to="/login" className="text-gray-500 hover:text-blue-600 text-sm font-medium">
            Retour à la connexion
          </Link>
        </div>
      </div>
    </div>
  );
}
