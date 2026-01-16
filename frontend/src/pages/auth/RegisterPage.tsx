import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import FadeIn from '../../components/ui/FadeIn';
import { 
  EyeIcon, 
  EyeSlashIcon,
  UserIcon,
  BuildingOfficeIcon,
  CheckCircleIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  UserPlusIcon
} from '@heroicons/react/24/outline';
import { registrationApi } from '../../services/api';
import { validatePassword, getErrorMessage } from '../../utils';
import { RDC_PROVINCES, BUSINESS_SECTORS } from '../../constants';
import type { ClientRegistrationData, MerchantRegistrationData } from '../../types';

// Import images
import image1 from '../public/images/image1.jpg';
import image2 from '../public/images/image2.jpg';
import image3 from '../public/images/image3.jpg';
import image4 from '../public/images/image4.jpg';
import image5 from '../public/images/image5.jpg';
import image6 from '../public/images/image6.jpg';

// Types
type AccountType = 'client' | 'enterprise' | null;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [accountType, setAccountType] = useState<AccountType>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [enterpriseStep, setEnterpriseStep] = useState(1);
  const [currentImage, setCurrentImage] = useState(0);
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [isHuman, setIsHuman] = useState(false);
  
  const heroImages = [image1, image2, image3, image4, image5, image6];
  const passwordValidation = validatePassword(password);
  const passwordsMatch = password === passwordConfirm && passwordConfirm.length > 0;
  
  // Image carousel effect
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);
  
  const clientForm = useForm<ClientRegistrationData>();
  const enterpriseForm = useForm<MerchantRegistrationData>();

  const handleClientSubmit = async (data: ClientRegistrationData) => {
    setIsLoading(true);
    try {
      await registrationApi.registerClient(data);
      toast.success('Compte créé avec succès !');
      navigate('/login');
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleEnterpriseSubmit = async (data: MerchantRegistrationData) => {
    setIsLoading(true);
    try {
      await registrationApi.registerMerchant(data);
      setRegistrationSuccess(true);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  // Left side component (same as login page)
  const LeftSide = () => (
    <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-6 bg-gray-100">
      <div className="relative w-[90%] h-[95%] bg-blue-600 rounded-[2.5rem] overflow-hidden shadow-2xl">
        {heroImages.map((img, index) => (
          <img
            key={index}
            src={img}
            alt=""
            className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
              index === currentImage ? 'opacity-100' : 'opacity-0'
            }`}
          />
        ))}
        
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/80 via-blue-600/30 to-blue-900/60" />
        
        <div className="relative z-10 flex flex-col justify-between h-full p-8">
          <div className="flex items-center">
            <div className="w-10 h-10 rounded-full overflow-hidden mr-3 ring-2 ring-white/30">
              <img src="https://flagcdn.com/w80/cd.png" alt="DRC Flag" className="w-full h-full object-cover" />
            </div>
            <span className="text-xl font-bold text-white">Tax Free RDC</span>
          </div>
          
          <div className="relative h-24">
            {[
              "Créez votre compte\nen quelques minutes",
              "Rejoignez notre\nréseau de partenaires",
              "Gérez vos détaxes\nen toute simplicité",
              "Votre partenaire\nde confiance",
              "Service disponible\n24h/24, 7j/7",
              "Plus de 500\npartenaires"
            ].map((message, index) => (
              <h1 
                key={index}
                className={`absolute inset-0 text-3xl xl:text-4xl font-bold text-white leading-tight whitespace-pre-line transition-all duration-700 ${
                  index === currentImage ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                }`}
              >
                {message}
              </h1>
            ))}
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between backdrop-blur-md bg-white/10 rounded-2xl p-4 border border-white/20">
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-white">500+</div>
                <div className="text-xs text-white/70">Partenaires</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-white">50K+</div>
                <div className="text-xs text-white/70">Transactions</div>
              </div>
              <div className="w-px h-10 bg-white/20" />
              <div className="text-center flex-1">
                <div className="text-2xl font-bold text-white">98%</div>
                <div className="text-xs text-white/70">Satisfaction</div>
              </div>
            </div>
            
            <div className="flex flex-wrap gap-2">
              <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                🔒 Sécurisé
              </span>
              <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                ⚡ Rapide
              </span>
              <span className="px-3 py-1.5 bg-white/20 backdrop-blur-sm rounded-full text-xs text-white font-medium">
                🌍 100% Digital
              </span>
              <span className="px-3 py-1.5 bg-green-500/30 backdrop-blur-sm rounded-full text-xs text-white font-medium flex items-center">
                <span className="w-1.5 h-1.5 bg-green-400 rounded-full mr-1.5 animate-pulse" />
                En ligne
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Success screen for enterprise registration
  if (registrationSuccess) {
    return (
      <FadeIn duration={400}>
        <div className="h-screen flex overflow-hidden">
          <LeftSide />
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-white relative">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-50 to-purple-50 rounded-full translate-y-1/2 -translate-x-1/2 opacity-50" />
          
          <div className="w-full max-w-md relative z-10">
            <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 p-8 lg:p-10 border border-gray-100 text-center">
              <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircleIcon className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Demande soumise !</h2>
              <p className="text-gray-600 mb-6">
                Votre demande d'inscription a été soumise avec succès. 
                Notre équipe va examiner votre dossier et vous recevrez une notification par email.
              </p>
              <p className="text-sm text-gray-500 mb-8">
                Délai de traitement : 2 à 5 jours ouvrables.
              </p>
              <Link
                to="/login"
                className="inline-flex items-center justify-center w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all"
              >
                Retour à la connexion
              </Link>
            </div>
          </div>
        </div>
        </div>
      </FadeIn>
    );
  }

  // Account type selection
  if (!accountType) {
    return (
      <FadeIn duration={400}>
        <div className="h-screen flex overflow-hidden">
          <LeftSide />
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-white relative overflow-y-auto">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-50 to-purple-50 rounded-full translate-y-1/2 -translate-x-1/2 opacity-50" />
          
          <div className="w-full max-w-md relative z-10">
            {/* Mobile Logo */}
            <div className="lg:hidden flex items-center justify-center mb-6">
              <div className="w-12 h-12 rounded-full overflow-hidden mr-3">
                <img src="https://flagcdn.com/w80/cd.png" alt="DRC Flag" className="w-full h-full object-cover" />
              </div>
              <span className="text-2xl font-bold text-gray-900">Tax Free <span className="text-blue-600">RDC</span></span>
            </div>
            
            <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 p-8 border border-gray-100">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg shadow-blue-500/30">
                  <UserPlusIcon className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Créer un compte</h2>
                <p className="text-gray-500 text-sm">Choisissez le type de compte</p>
              </div>

              <div className="space-y-4">
                {/* Compte Client - Désactivé, bientôt disponible */}
                <div
                  className="w-full p-4 border-2 border-gray-200 rounded-xl bg-gray-50 text-left opacity-60 cursor-not-allowed relative"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-gray-400 to-gray-500 rounded-xl flex items-center justify-center mr-4">
                      <UserIcon className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-500">Compte Client</h3>
                      <p className="text-sm text-gray-400">Suivez vos remboursements</p>
                    </div>
                    <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                      Bientôt disponible
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setAccountType('enterprise')}
                  className="w-full p-4 border-2 border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
                >
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mr-4 group-hover:scale-110 transition-transform">
                      <BuildingOfficeIcon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">Compte Entreprise</h3>
                      <p className="text-sm text-gray-500">Proposez la détaxe à vos clients</p>
                    </div>
                  </div>
                </button>
              </div>

              <div className="mt-6 text-center">
                <Link to="/login" className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                  Déjà un compte ? Se connecter
                </Link>
              </div>
            </div>
          </div>
        </div>
        </div>
      </FadeIn>
    );
  }

  // Client Registration Form
  if (accountType === 'client') {
    return (
      <FadeIn duration={400}>
        <div className="h-screen flex overflow-hidden">
          <LeftSide />
        <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-white relative overflow-y-auto">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-50 to-purple-50 rounded-full translate-y-1/2 -translate-x-1/2 opacity-50" />
          
          <div className="w-full max-w-md relative z-10">
            <div className="bg-white rounded-3xl shadow-2xl shadow-gray-200/50 p-8 border border-gray-100">
              <div className="text-center mb-6">
                <div className="inline-flex items-center justify-center w-14 h-14 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl mb-4 shadow-lg">
                  <UserIcon className="w-7 h-7 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Compte Client</h2>
                <p className="text-gray-500 text-sm">Créez votre compte rapidement</p>
              </div>

              <form onSubmit={clientForm.handleSubmit(handleClientSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                    <input
                      type="text"
                      {...clientForm.register('first_name', { required: true })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Jean"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                    <input
                      type="text"
                      {...clientForm.register('last_name', { required: true })}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="Dupont"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    {...clientForm.register('email', { required: true })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="votre@email.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="tel"
                    {...clientForm.register('phone', { required: true })}
                    className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    placeholder="+243 XXX XXX XXX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mot de passe</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      {...clientForm.register('password', { required: true, minLength: 8 })}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-3 py-2.5 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm pr-10"
                      placeholder="••••••••"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                    >
                      {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
                    </button>
                  </div>
                  
                  {/* Password Strength Indicator */}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confirmer</label>
                  <input
                    type="password"
                    {...clientForm.register('password_confirm', { required: true })}
                    onChange={(e) => setPasswordConfirm(e.target.value)}
                    className={`w-full px-3 py-2.5 border-2 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm ${
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

                {/* Human Verification */}
                <div className="bg-gray-50 rounded-xl p-3">
                  <label className="flex items-center cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={isHuman}
                      onChange={(e) => setIsHuman(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500 mr-3" 
                    />
                    <span className="text-sm text-gray-700">Je confirme que je ne suis pas un robot</span>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !isHuman || passwordValidation.strength < 3 || !passwordsMatch}
                  className="w-full py-3 bg-gradient-to-r from-blue-600 to-cyan-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-cyan-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Création...' : 'Créer mon compte'}
                </button>
              </form>

              <button
                onClick={() => setAccountType(null)}
                className="w-full mt-4 py-2 text-gray-500 hover:text-gray-900 text-sm font-medium flex items-center justify-center"
              >
                <ArrowLeftIcon className="w-4 h-4 mr-2" />
                Changer le type de compte
              </button>
            </div>

            <div className="text-center mt-4">
              <Link to="/login" className="text-gray-500 hover:text-blue-600 text-sm font-medium">
                Déjà un compte ? Se connecter
              </Link>
            </div>
          </div>
        </div>
        </div>
      </FadeIn>
    );
  }

  // Enterprise Registration Form (Multi-step)
  return (
    <FadeIn duration={400}>
      <div className="h-screen flex overflow-hidden">
        <LeftSide />
      <div className="w-full lg:w-1/2 flex items-center justify-center p-4 lg:p-8 bg-white relative overflow-y-auto">
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-50 to-purple-50 rounded-full translate-y-1/2 -translate-x-1/2 opacity-50" />
        
        <div className="w-full max-w-md relative z-10 py-2 lg:py-4">
          {/* Header */}
          <div className="text-center mb-3 lg:mb-4">
            <div className="inline-flex items-center justify-center w-10 h-10 lg:w-14 lg:h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl lg:rounded-2xl mb-2 lg:mb-3 shadow-lg">
              <BuildingOfficeIcon className="w-5 h-5 lg:w-7 lg:h-7 text-white" />
            </div>
            <h2 className="text-lg lg:text-xl font-bold text-gray-900">Inscription Commerçant</h2>
            <p className="text-gray-500 text-xs lg:text-sm">Créez votre compte entreprise</p>
          </div>
          
          {/* Progress Steps */}
          <div className="flex items-center justify-center mb-4 lg:mb-6">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex items-center">
                <div className={`w-6 h-6 lg:w-8 lg:h-8 rounded-full flex items-center justify-center text-xs lg:text-sm font-semibold ${
                  enterpriseStep >= step 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-500'
                }`}>
                  {step}
                </div>
                {step < 3 && (
                  <div className={`w-6 lg:w-8 h-0.5 lg:h-1 ${enterpriseStep > step ? 'bg-blue-600' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl lg:rounded-3xl shadow-xl lg:shadow-2xl shadow-gray-200/50 p-4 lg:p-6 border border-gray-100">
            <form onSubmit={enterpriseForm.handleSubmit(handleEnterpriseSubmit)}>
              {/* Step 1: Contact Info */}
              {enterpriseStep === 1 && (
                <div className="space-y-3 lg:space-y-4">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-2 lg:mb-4">Informations de contact</h3>
                  
                  <div className="grid grid-cols-2 gap-2 lg:gap-3">
                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Prénom *</label>
                      <input
                        type="text"
                        {...enterpriseForm.register('first_name', { required: true })}
                        className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Nom *</label>
                      <input
                        type="text"
                        {...enterpriseForm.register('last_name', { required: true })}
                        className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Email *</label>
                    <input
                      type="email"
                      {...enterpriseForm.register('email', { required: true })}
                      className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Téléphone *</label>
                    <input
                      type="tel"
                      {...enterpriseForm.register('phone', { required: true })}
                      className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      placeholder="+243 XXX XXX XXX"
                    />
                  </div>

                  {/* Info box about password */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg lg:rounded-xl p-2.5 lg:p-3">
                    <p className="text-xs lg:text-sm text-blue-700">
                      <strong>Note :</strong> Vous définirez votre mot de passe après approbation de votre demande, via le lien d'activation envoyé par email.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 2: Company Info */}
              {enterpriseStep === 2 && (
                <div className="space-y-3 lg:space-y-4">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-2 lg:mb-4">Informations entreprise</h3>
                  
                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Nom entreprise *</label>
                    <input
                      type="text"
                      {...enterpriseForm.register('company_name', { required: true })}
                      className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Nom commercial</label>
                    <input
                      type="text"
                      {...enterpriseForm.register('trade_name')}
                      className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 lg:gap-3">
                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">N° RCCM *</label>
                      <input
                        type="text"
                        {...enterpriseForm.register('registration_number', { required: true })}
                        className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">N° NIF *</label>
                      <input
                        type="text"
                        {...enterpriseForm.register('tax_id', { required: true })}
                        className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">N° Id. Nat.</label>
                    <input
                      type="text"
                      {...enterpriseForm.register('national_id')}
                      className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Secteur *</label>
                    <select
                      {...enterpriseForm.register('business_sector', { required: true })}
                      className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    >
                      <option value="">Sélectionnez...</option>
                      {BUSINESS_SECTORS.map(sector => (
                        <option key={sector} value={sector}>{sector}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      {...enterpriseForm.register('business_description')}
                      rows={2}
                      className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Address & Contact */}
              {enterpriseStep === 3 && (
                <div className="space-y-3 lg:space-y-4">
                  <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-2 lg:mb-4">Adresse et contact</h3>
                  
                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Adresse *</label>
                    <input
                      type="text"
                      {...enterpriseForm.register('address', { required: true })}
                      className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 lg:gap-3">
                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Province *</label>
                      <select
                        {...enterpriseForm.register('province', { required: true })}
                        className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      >
                        <option value="">Sélectionnez...</option>
                        {RDC_PROVINCES.map(province => (
                          <option key={province} value={province}>{province}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Ville *</label>
                      <input
                        type="text"
                        {...enterpriseForm.register('city', { required: true })}
                        className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Commune</label>
                    <input
                      type="text"
                      {...enterpriseForm.register('commune')}
                      className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2 lg:gap-3">
                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Tél. entreprise *</label>
                      <input
                        type="tel"
                        {...enterpriseForm.register('company_phone', { required: true })}
                        className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs lg:text-sm font-medium text-gray-700 mb-1">Email entreprise *</label>
                      <input
                        type="email"
                        {...enterpriseForm.register('company_email', { required: true })}
                        className="w-full px-2.5 lg:px-3 py-2 lg:py-2.5 border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg lg:rounded-xl p-2.5 lg:p-3 mt-3 lg:mt-4 space-y-2 lg:space-y-3">
                    <label className="flex items-start cursor-pointer">
                      <input type="checkbox" required className="mt-1 mr-2" />
                      <span className="text-xs text-gray-600">
                        Je certifie que les informations sont exactes et j'accepte les conditions d'utilisation.
                      </span>
                    </label>
                    <label className="flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={isHuman}
                        onChange={(e) => setIsHuman(e.target.checked)}
                        className="w-4 h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500 mr-2" 
                      />
                      <span className="text-xs text-gray-700">Je confirme que je ne suis pas un robot</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-6">
                <button
                  type="button"
                  onClick={() => {
                    if (enterpriseStep === 1) {
                      setAccountType(null);
                    } else {
                      setEnterpriseStep(enterpriseStep - 1);
                    }
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-900 font-medium flex items-center text-sm"
                >
                  <ArrowLeftIcon className="w-4 h-4 mr-1" />
                  Retour
                </button>

                {enterpriseStep < 3 ? (
                  <button
                    type="button"
                    onClick={() => setEnterpriseStep(enterpriseStep + 1)}
                    className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 flex items-center text-sm"
                  >
                    Suivant
                    <ArrowRightIcon className="w-4 h-4 ml-1" />
                  </button>
                ) : (
                  <button
                    type="submit"
                    disabled={isLoading || !isHuman}
                    className="px-5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    {isLoading ? 'Envoi...' : 'Soumettre'}
                  </button>
                )}
              </div>
            </form>
          </div>

          <div className="text-center mt-4">
            <Link to="/login" className="text-gray-500 hover:text-blue-600 text-sm font-medium">
              Déjà un compte ? Se connecter
            </Link>
          </div>
        </div>
      </div>
      </div>
    </FadeIn>
  );
}
