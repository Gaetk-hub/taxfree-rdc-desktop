import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { useState, useEffect, useRef } from 'react';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import FadeIn from '../../components/ui/FadeIn';
import { 
  EyeIcon, 
  EyeSlashIcon, 
  ShieldCheckIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { authApi } from '../../services/api';
import { getErrorMessage, formatTimer } from '../../utils';

import type { LoginCredentials } from '../../types';

// Import images
import image1 from '../public/images/image1.jpg';
import image2 from '../public/images/image2.jpg';
import image3 from '../public/images/image3.jpg';
import image4 from '../public/images/image4.jpg';
import image5 from '../public/images/image5.jpg';
import image6 from '../public/images/image6.jpg';

export default function LoginPage() {
  const navigate = useNavigate();
  const { setAuth } = useAuthStore();
  const { register, handleSubmit, formState: { errors } } = useForm<LoginCredentials>();
  const [showPassword, setShowPassword] = useState(false);
  const [currentImage, setCurrentImage] = useState(0);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotEmailSent, setForgotEmailSent] = useState(false);
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState(false);
  const [forgotPasswordError, setForgotPasswordError] = useState('');
  
  // 2FA OTP states
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpId, setOtpId] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [otpEmail, setOtpEmail] = useState('');
  const [otpExpiresIn, setOtpExpiresIn] = useState(300);
  const [isLoading, setIsLoading] = useState(false);
  const [otpError, setOtpError] = useState('');
  const [remainingAttempts, setRemainingAttempts] = useState(3);
  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  
  const heroImages = [image1, image2, image3, image4, image5, image6];
  
  // Image carousel
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [heroImages.length]);
  
  // OTP countdown timer
  useEffect(() => {
    if (showOtpModal && otpExpiresIn > 0) {
      const timer = setInterval(() => {
        setOtpExpiresIn((prev) => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [showOtpModal, otpExpiresIn]);

  // Step 1: Submit credentials and get OTP
  const onSubmit = async (data: LoginCredentials) => {
    setIsLoading(true);
    setOtpError('');
    try {
      const response = await authApi.login(data);
      
      // OTP sent successfully
      setOtpId(response.data.otp_id);
      setOtpEmail(response.data.email);
      setOtpExpiresIn(response.data.expires_in || 300);
      setShowOtpModal(true);
      setOtpCode(['', '', '', '', '', '']);
      setRemainingAttempts(3);
      toast.success('Code de vérification envoyé !');
      
      // Focus first OTP input
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err: unknown) {
      // Check for 401 status code first
      const axiosError = err as { response?: { status?: number } };
      if (axiosError.response?.status === 401) {
        toast.error('Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.');
      } else {
        const errorMessage = getErrorMessage(err);
        // Provide clearer error messages for common login errors
        if (errorMessage.toLowerCase().includes('401') || errorMessage.toLowerCase().includes('unauthorized') || errorMessage.toLowerCase().includes('invalid')) {
          toast.error('Email ou mot de passe incorrect. Veuillez vérifier vos identifiants.');
        } else if (errorMessage.toLowerCase().includes('not found') || errorMessage.toLowerCase().includes('no active account')) {
          toast.error('Aucun compte trouvé avec cet email. Veuillez vérifier ou créer un compte.');
        } else if (errorMessage.toLowerCase().includes('inactive') || errorMessage.toLowerCase().includes('disabled')) {
          toast.error('Votre compte n\'est pas encore activé. Vérifiez votre email pour le lien d\'activation.');
        } else {
          toast.error(errorMessage || 'Erreur de connexion. Veuillez réessayer.');
        }
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  // Step 2: Verify OTP
  const verifyOtp = async () => {
    const code = otpCode.join('');
    if (code.length !== 6) {
      setOtpError('Veuillez entrer le code complet');
      return;
    }
    
    setIsLoading(true);
    setOtpError('');
    try {
      const response = await authApi.verifyOtp({ otp_id: otpId, code });
      
      // Login successful
      setAuth(response.data.access, response.data.refresh, response.data.user);
      toast.success('Connexion réussie !');
      
      // Small delay to ensure state is persisted before navigation
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Navigate directly to role-specific dashboard using React Router (no page reload)
      const role = response.data.user.role;
      const user = response.data.user;
      let dashboardUrl = '/admin/dashboard';
      
      switch (role) {
        case 'ADMIN':
        case 'AUDITOR':
          // Check if user has DASHBOARD permission (super admin always has access)
          const isSuperAdmin = user.is_super_admin === true;
          const hasDashboardPermission = user.permissions?.some(
            (p: { module: string; action: string }) => p.module === 'DASHBOARD' && p.action === 'VIEW'
          );
          
          if (isSuperAdmin || hasDashboardPermission) {
            dashboardUrl = '/admin/dashboard';
          } else {
            // Redirect to profile if no dashboard access
            dashboardUrl = '/admin/profile';
          }
          break;
        case 'MERCHANT':
          dashboardUrl = '/merchant/dashboard';
          break;
        case 'CUSTOMS_AGENT':
          dashboardUrl = '/customs/dashboard';
          break;
        case 'OPERATOR':
          dashboardUrl = '/operator/dashboard';
          break;
        case 'CLIENT':
          dashboardUrl = '/client/dashboard';
          break;
      }
      navigate(dashboardUrl, { replace: true });
    } catch (err: unknown) {
      const errorData = (err as { response?: { data?: { detail?: string; remaining_attempts?: number } } })?.response?.data;
      setOtpError(errorData?.detail || 'Code incorrect');
      if (errorData?.remaining_attempts !== undefined) {
        setRemainingAttempts(errorData.remaining_attempts);
      }
      // Clear OTP inputs on error
      setOtpCode(['', '', '', '', '', '']);
      otpInputRefs.current[0]?.focus();
    } finally {
      setIsLoading(false);
    }
  };
  
  // Resend OTP
  const resendOtp = async () => {
    setIsLoading(true);
    setOtpError('');
    try {
      const response = await authApi.resendOtp(otpEmail);
      
      setOtpId(response.data.otp_id);
      setOtpExpiresIn(response.data.expires_in || 300);
      setOtpCode(['', '', '', '', '', '']);
      setRemainingAttempts(3);
      toast.success('Nouveau code envoyé !');
      otpInputRefs.current[0]?.focus();
    } catch (err: unknown) {
      toast.error(getErrorMessage(err));
    } finally {
      setIsLoading(false);
    }
  };
  
  // Handle OTP input
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      const newOtp = [...otpCode];
      digits.forEach((digit, i) => {
        if (index + i < 6) {
          newOtp[index + i] = digit;
        }
      });
      setOtpCode(newOtp);
      const nextIndex = Math.min(index + digits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();
    } else {
      const newOtp = [...otpCode];
      newOtp[index] = value.replace(/\D/g, '');
      setOtpCode(newOtp);
      
      // Auto-focus next input
      if (value && index < 5) {
        otpInputRefs.current[index + 1]?.focus();
      }
    }
  };
  
  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
    if (e.key === 'Enter' && otpCode.join('').length === 6) {
      verifyOtp();
    }
  };
  

  return (
    <FadeIn duration={400}>
      <div className="h-screen flex overflow-hidden">
      {/* Left Side - Centered Card Design like FlexiFiat */}
      <div className="hidden lg:flex lg:w-1/2 items-center justify-center p-6 bg-gray-100">
        {/* Card Container */}
        <div className="relative w-[90%] h-[95%] bg-blue-600 rounded-[2.5rem] overflow-hidden shadow-2xl">
          {/* Background Image Carousel with Messages */}
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
          
          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-b from-blue-600/80 via-blue-600/30 to-blue-900/60" />
          
          {/* Content */}
          <div className="relative z-10 flex flex-col justify-between h-full p-8">
            {/* Top - Logo */}
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-full overflow-hidden mr-3 ring-2 ring-white/30">
                <img src="https://flagcdn.com/w80/cd.png" alt="DRC Flag" className="w-full h-full object-cover" />
              </div>
              <span className="text-xl font-bold text-white">Tax Free RDC</span>
            </div>
            
            {/* Middle - Rotating Title */}
            <div className="relative h-24">
              {[
                "Accès simplifié,\nPartout, à tout moment",
                "Gérez vos détaxes\nen toute simplicité",
                "Remboursement rapide\net sécurisé",
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
            
            {/* Bottom - Stats & Features */}
            <div className="space-y-4">
              {/* Stats Row */}
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
              
              {/* Features Pills */}
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
      
      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 lg:p-12 bg-white relative">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-full -translate-y-1/2 translate-x-1/2 opacity-50" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-blue-50 to-purple-50 rounded-full translate-y-1/2 -translate-x-1/2 opacity-50" />
        
        <div className="w-full max-w-md relative z-10">
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center mb-4">
            <div className="w-10 h-10 rounded-xl overflow-hidden border-2 border-blue-100 mr-2 shadow-md">
              <img src="https://flagcdn.com/w80/cd.png" alt="DRC Flag" className="w-full h-full object-cover" />
            </div>
            <div>
              <span className="text-lg font-bold text-gray-900">Tax Free</span>
              <span className="text-lg font-light text-blue-600 ml-1">RDC</span>
            </div>
          </div>
          
          {/* Form Card */}
          <div className="bg-white rounded-2xl lg:rounded-3xl shadow-xl lg:shadow-2xl shadow-gray-200/50 p-5 sm:p-6 lg:p-10 border border-gray-100">
            {/* Form Header */}
            <div className="text-center mb-4 lg:mb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 lg:w-16 lg:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl lg:rounded-2xl mb-3 lg:mb-4 shadow-lg shadow-blue-500/30">
                <ShieldCheckIcon className="w-6 h-6 lg:w-8 lg:h-8 text-white" />
              </div>
              <h2 className="text-xl lg:text-3xl font-bold text-gray-900 mb-1 lg:mb-2">Connexion</h2>
              <p className="text-gray-500 text-sm lg:text-base">Accédez à votre espace professionnel</p>
            </div>
            
            {/* Login Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-3 lg:space-y-5">
              <div>
                <label className="block text-xs lg:text-sm font-semibold text-gray-700 mb-1.5 lg:mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <input
                    type="email"
                    className="w-full px-3 lg:px-4 py-2.5 lg:py-3.5 text-sm lg:text-base border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                    placeholder="votre@email.com"
                    {...register('email', { required: 'Email requis' })}
                  />
                </div>
                {errors.email && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2" />
                    {errors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs lg:text-sm font-semibold text-gray-700 mb-1.5 lg:mb-2">
                  Mot de passe
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full px-3 lg:px-4 py-2.5 lg:py-3.5 text-sm lg:text-base border-2 border-gray-200 rounded-lg lg:rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white pr-12"
                    placeholder="••••••••"
                    {...register('password', { required: 'Mot de passe requis' })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-blue-600 transition-colors p-1"
                  >
                    {showPassword ? (
                      <EyeSlashIcon className="w-5 h-5" />
                    ) : (
                      <EyeIcon className="w-5 h-5" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-red-500 text-sm mt-2 flex items-center">
                    <span className="w-1.5 h-1.5 bg-red-500 rounded-full mr-2" />
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center cursor-pointer group">
                  <input type="checkbox" className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-blue-600 border-2 border-gray-300 rounded focus:ring-blue-500 focus:ring-offset-0" />
                  <span className="ml-1.5 lg:ml-2 text-xs lg:text-sm text-gray-600 group-hover:text-gray-900 transition-colors">Se souvenir de moi</span>
                </label>
                <button 
                  type="button"
                  onClick={() => setShowForgotPassword(true)}
                  className="text-xs lg:text-sm text-blue-600 hover:text-blue-700 font-semibold hover:underline"
                >
                  Mot de passe oublié ?
                </button>
              </div>


              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 lg:py-4 text-sm lg:text-base bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-600 text-white font-semibold rounded-lg lg:rounded-xl hover:from-blue-700 hover:via-blue-800 hover:to-indigo-700 transition-all duration-300 shadow-xl shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed transform hover:scale-[1.02] active:scale-[0.98]"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Connexion en cours...
                  </span>
                ) : (
                  <span className="flex items-center justify-center">
                    Se connecter
                    <svg className="w-5 h-5 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </span>
                )}
              </button>
            </form>
          </div>
          
          {/* Create Account Link */}
          <div className="mt-4 lg:mt-6 text-center">
            <p className="text-gray-500 text-xs lg:text-sm mb-2">Pas encore de compte ?</p>
            <Link 
              to="/register" 
              className="inline-flex items-center justify-center px-4 lg:px-6 py-2 lg:py-3 text-sm lg:text-base border-2 border-blue-600 text-blue-600 font-semibold rounded-lg lg:rounded-xl hover:bg-blue-50 transition-all"
            >
              Créer un compte
            </Link>
          </div>
          
        </div>
      </div>
      
      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => {
              setShowForgotPassword(false);
              setForgotEmailSent(false);
              setForgotEmail('');
              setForgotPasswordError('');
            }}
          />
          
          {/* Modal */}
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            {/* Close Button */}
            <button
              onClick={() => {
                setShowForgotPassword(false);
                setForgotEmailSent(false);
                setForgotEmail('');
                setForgotPasswordError('');
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            {!forgotEmailSent ? (
              <>
                {/* Header */}
                <div className="text-center mb-6">
                  <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl mb-4 shadow-lg">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Mot de passe oublié ?</h3>
                  <p className="text-gray-500 text-sm">
                    Entrez votre adresse email et nous vous enverrons un lien pour réinitialiser votre mot de passe.
                  </p>
                </div>
                
                {/* Form */}
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  if (!forgotEmail) return;
                  
                  setForgotPasswordLoading(true);
                  setForgotPasswordError('');
                  
                  try {
                    await authApi.forgotPassword(forgotEmail);
                    setForgotEmailSent(true);
                  } catch (err: unknown) {
                    const axiosError = err as { response?: { status?: number; data?: { detail?: string } } };
                    if (axiosError.response?.status === 404) {
                      setForgotPasswordError('Cette adresse email n\'est associée à aucun compte. Veuillez contacter un administrateur.');
                    } else if (axiosError.response?.data?.detail) {
                      setForgotPasswordError(axiosError.response.data.detail);
                    } else {
                      setForgotPasswordError('Une erreur est survenue. Veuillez réessayer.');
                    }
                  } finally {
                    setForgotPasswordLoading(false);
                  }
                }}>
                  <div className="mb-4">
                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                      Adresse email
                    </label>
                    <input
                      type="email"
                      value={forgotEmail}
                      onChange={(e) => {
                        setForgotEmail(e.target.value);
                        setForgotPasswordError('');
                      }}
                      className={`w-full px-4 py-3.5 border-2 rounded-xl focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white ${
                        forgotPasswordError ? 'border-red-300' : 'border-gray-200'
                      }`}
                      placeholder="votre@email.com"
                      required
                      disabled={forgotPasswordLoading}
                    />
                  </div>
                  
                  {/* Error message */}
                  {forgotPasswordError && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-sm">
                      {forgotPasswordError}
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    disabled={forgotPasswordLoading}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {forgotPasswordLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Envoi en cours...
                      </>
                    ) : (
                      'Envoyer le lien'
                    )}
                  </button>
                </form>
                
                {/* Back to login */}
                <button
                  onClick={() => setShowForgotPassword(false)}
                  className="w-full mt-4 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors"
                >
                  ← Retour à la connexion
                </button>
              </>
            ) : (
              <>
                {/* Success State */}
                <div className="text-center py-4">
                  <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full mb-6 shadow-lg">
                    <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">Email envoyé !</h3>
                  <p className="text-gray-500 mb-6">
                    Un lien de réinitialisation a été envoyé à<br />
                    <span className="font-semibold text-gray-700">{forgotEmail}</span>
                  </p>
                  <p className="text-sm text-gray-400 mb-6">
                    Vérifiez votre boîte de réception et vos spams.
                  </p>
                  
                  <button
                    onClick={() => {
                      setShowForgotPassword(false);
                      setForgotEmailSent(false);
                      setForgotEmail('');
                    }}
                    className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-blue-500/30"
                  >
                    Retour à la connexion
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      
      {/* OTP Verification Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowOtpModal(false)}
          />
          
          <div className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-md">
            <button
              onClick={() => setShowOtpModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl mb-4 shadow-lg">
                <EnvelopeIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-2">Vérification</h3>
              <p className="text-gray-500 text-sm">
                Un code de vérification a été envoyé à<br />
                <span className="font-semibold text-gray-700">{otpEmail}</span>
              </p>
            </div>
            
            {/* OTP Input */}
            <div className="flex justify-center gap-2 mb-4">
              {otpCode.map((digit, index) => (
                <input
                  key={index}
                  ref={(el) => (otpInputRefs.current[index] = el)}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleOtpChange(index, e.target.value)}
                  onKeyDown={(e) => handleOtpKeyDown(index, e)}
                  className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all"
                />
              ))}
            </div>
            
            {/* Error message */}
            {otpError && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-xl text-sm text-center mb-4">
                {otpError}
                {remainingAttempts > 0 && remainingAttempts < 3 && (
                  <span className="block text-xs mt-1">
                    {remainingAttempts} tentative(s) restante(s)
                  </span>
                )}
              </div>
            )}
            
            {/* Timer */}
            <div className="text-center mb-4">
              {otpExpiresIn > 0 ? (
                <p className="text-sm text-gray-500">
                  Code expire dans <span className="font-semibold text-blue-600">{formatTimer(otpExpiresIn)}</span>
                </p>
              ) : (
                <p className="text-sm text-red-500 font-semibold">Code expiré</p>
              )}
            </div>
            
            {/* Verify Button */}
            <button
              onClick={verifyOtp}
              disabled={isLoading || otpCode.join('').length !== 6}
              className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-blue-700 hover:to-indigo-700 transition-all duration-300 shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Vérification...
                </span>
              ) : (
                'Vérifier le code'
              )}
            </button>
            
            {/* Resend */}
            <div className="mt-4 text-center">
              <button
                onClick={resendOtp}
                disabled={isLoading}
                className="text-blue-600 hover:text-blue-700 text-sm font-semibold hover:underline disabled:opacity-50"
              >
                Renvoyer le code
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </FadeIn>
  );
}
