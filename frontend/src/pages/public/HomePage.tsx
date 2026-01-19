import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FadeIn from '../../components/ui/FadeIn';
import { 
  ShieldCheckIcon, BanknotesIcon, ClockIcon, MapPinIcon, CheckCircleIcon,
  ArrowRightIcon, BuildingStorefrontIcon, UserGroupIcon, DocumentTextIcon,
  GlobeAltIcon, ChevronDownIcon, DevicePhoneMobileIcon, ComputerDesktopIcon,
  StarIcon, ChevronLeftIcon, ChevronRightIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid } from '@heroicons/react/24/solid';

// Import hero images
import image1 from './images/image1.jpg';
import image2 from './images/image2.jpg';
import image3 from './images/image3.jpg';
import image4 from './images/image4.jpg';
import image5 from './images/image5.jpg';
import image6 from './images/image6.jpg';

function HeroSection() {
  const { t } = useTranslation();
  const [currentImage, setCurrentImage] = useState(0);
  const [currentTitle, setCurrentTitle] = useState(0);
  const [showMobileAppModal, setShowMobileAppModal] = useState(false);
  
  const heroImages = [
    image1, 
    image2, 
    image3, 
    image4, 
    image5, 
    image6,
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?ixlib=rb-4.0.3&auto=format&fit=crop&w=1400&q=80'
  ];
  
  const rotatingTitles = t('hero.rotatingTitles', { returnObjects: true }) as string[];
  
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImage((prev) => (prev + 1) % heroImages.length);
    }, 5000);
    
    return () => clearInterval(interval);
  }, [heroImages.length]);
  
  useEffect(() => {
    const titleInterval = setInterval(() => {
      setCurrentTitle((prev) => (prev + 1) % rotatingTitles.length);
    }, 5000);
    
    return () => clearInterval(titleInterval);
  }, [rotatingTitles.length]);
  
  return (
    <section className="relative bg-blue-600 overflow-hidden">
      {/* MOBILE VERSION - Image background with overlay */}
      <div className="lg:hidden relative min-h-[100vh]">
        {/* Background Image Carousel */}
        <div className="absolute inset-0">
          {heroImages.map((img, index) => (
            <img 
              key={index}
              src={img} 
              alt={`Hero ${index + 1}`}
              loading={index === 0 ? 'eager' : 'lazy'}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
                index === currentImage ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          {/* Gradient overlay - lighter at top to show image clearly */}
          <div className="absolute inset-0 bg-gradient-to-t from-blue-900 via-blue-800/60 to-transparent" />
        </div>
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-end min-h-[100vh] px-6 pb-12 pt-24">
          {/* Image indicators */}
          <div className="absolute top-20 left-6 right-6 flex justify-center gap-2">
            {heroImages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentImage(index)}
                className={`h-1 rounded-full transition-all duration-300 ${
                  index === currentImage ? 'w-8 bg-white' : 'w-2 bg-white/40'
                }`}
              />
            ))}
          </div>
          
          <div className="space-y-6">
            <h1 className="text-3xl sm:text-4xl font-bold leading-tight text-white">
              <span className="block h-[1.2em] overflow-hidden relative">
                {rotatingTitles.map((title, index) => (
                  <span
                    key={index}
                    className={`absolute inset-0 transition-all duration-700 ${
                      index === currentTitle 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 -translate-y-full'
                    }`}
                  >
                    {title}
                  </span>
                ))}
              </span>
              {t('hero.title2')}
            </h1>
            
            <p className="text-base text-white/80 leading-relaxed mb-8">
              {t('hero.description')}
            </p>
            
            {/* CTA Buttons - Professional style */}
            <div className="space-y-4">
              {/* Primary CTA */}
              <Link 
                to="/voyageurs" 
                className="group relative flex items-center justify-center gap-3 px-8 py-4 bg-white text-blue-600 font-bold rounded-full hover:shadow-2xl hover:shadow-white/25 transition-all duration-300 overflow-hidden"
              >
                <span className="relative z-10">{t('hero.cta1')}</span>
                <ArrowRightIcon className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
                <div className="absolute inset-0 bg-gradient-to-r from-white via-blue-50 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
              
              {/* Secondary CTA */}
              <Link 
                to="/comment-ca-marche" 
                className="group flex items-center justify-center gap-3 px-8 py-4 text-white font-semibold rounded-full border-2 border-white/40 hover:border-white hover:bg-white/10 transition-all duration-300"
              >
                <span>{t('hero.cta2')}</span>
                <ArrowRightIcon className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            
            {/* App Download Section */}
            <div className="mt-6 pt-6 border-t border-white/10">
              <div className="flex items-center gap-3">
                {/* App Store Style Buttons - Compact */}
                <button 
                  onClick={() => setShowMobileAppModal(true)}
                  className="group flex-1 flex items-center gap-2 px-3 py-2 bg-black/30 hover:bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="w-8 h-8 rounded-md bg-gradient-to-br from-gray-700 to-gray-900 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="block text-[8px] text-white/50 uppercase tracking-wide">{t('hero.comingSoon', 'Bientôt')}</span>
                    <span className="block text-xs font-semibold text-white">App Store</span>
                  </div>
                </button>
                
                <button 
                  onClick={() => setShowMobileAppModal(true)}
                  className="group flex-1 flex items-center gap-2 px-3 py-2 bg-black/30 hover:bg-black/40 backdrop-blur-sm rounded-lg border border-white/10 hover:border-white/20 transition-all"
                >
                  <div className="w-8 h-8 rounded-md bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center">
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M3.609 1.814L13.792 12 3.61 22.186a.996.996 0 01-.61-.92V2.734a1 1 0 01.609-.92zm10.89 10.893l2.302 2.302-10.937 6.333 8.635-8.635zm3.199-3.198l2.807 1.626a1 1 0 010 1.73l-2.808 1.626L15.206 12l2.492-2.491zM5.864 2.658L16.8 8.99l-2.302 2.302-8.634-8.634z"/>
                    </svg>
                  </div>
                  <div className="text-left">
                    <span className="block text-[8px] text-white/50 uppercase tracking-wide">{t('hero.comingSoon', 'Bientôt')}</span>
                    <span className="block text-xs font-semibold text-white">Google Play</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* DESKTOP VERSION - Side by side layout */}
      <div className="hidden lg:block relative min-h-[calc(95vh-108px)]">
        {/* Left Content - Blue background */}
        <div className="relative z-10 w-1/2 flex items-center px-16 xl:px-24 py-24">
          <div className="max-w-lg">
            <h1 className="text-[3.5rem] font-bold leading-[1.1] mb-6 text-white">
              <span className="block h-[1.2em] overflow-hidden relative">
                {rotatingTitles.map((title, index) => (
                  <span
                    key={index}
                    className={`absolute inset-0 transition-all duration-700 ${
                      index === currentTitle 
                        ? 'opacity-100 translate-y-0' 
                        : 'opacity-0 -translate-y-full'
                    }`}
                  >
                    {title}
                  </span>
                ))}
              </span>
              {t('hero.title2')}
            </h1>
            <p className="text-lg text-blue-100 mb-10 leading-relaxed">
              {t('hero.description')}
            </p>
            
            {/* CTA Buttons */}
            <div className="flex flex-wrap gap-4">
              <Link 
                to="/voyageurs" 
                className="group inline-flex items-center px-6 py-3 bg-white text-blue-600 font-medium rounded-full hover:bg-blue-50 transition-all duration-300"
              >
                {t('hero.cta1')}
                <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                to="/comment-ca-marche" 
                className="group inline-flex items-center px-6 py-3 bg-transparent border-2 border-white text-white font-medium rounded-full hover:bg-white hover:text-blue-600 transition-all duration-300"
              >
                {t('hero.cta2')}
                <ArrowRightIcon className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
              </Link>
            </div>
            
            {/* Download App Button - Desktop */}
            <div className="mt-8 pt-6 border-t border-white/10">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-400 to-indigo-500 flex items-center justify-center">
                    <ComputerDesktopIcon className="w-4 h-4 text-white" />
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{t('hero.downloadApp', 'Application desktop')}</p>
                    <p className="text-blue-200 text-xs">{t('hero.forMerchants', 'Pour les commerçants')}</p>
                  </div>
                </div>
                <Link 
                  to="/download" 
                  className="group w-full flex items-center justify-between px-5 py-3.5 bg-white/10 hover:bg-white/20 backdrop-blur-sm text-white font-medium rounded-2xl transition-all duration-300 border border-white/20 hover:border-white/40"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-400 to-purple-500 flex items-center justify-center shadow-lg">
                      <ComputerDesktopIcon className="w-5 h-5 text-white" />
                    </div>
                    <div className="text-left">
                      <span className="block text-sm font-semibold">{t('hero.downloadBtn', 'Télécharger pour PC')}</span>
                      <span className="block text-xs text-blue-200">Windows & macOS</span>
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-white/20 transition-colors">
                    <ArrowRightIcon className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </Link>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Image Carousel - Desktop only with curved left edge */}
        <div className="absolute w-[55%] right-0 top-0 h-full bg-blue-600">
          {/* SVG for clip path definition */}
          <svg className="absolute" width="0" height="0">
            <defs>
              <clipPath id="curvedEdgeDesktop" clipPathUnits="objectBoundingBox">
                <path d="M 0.12 0 C 0 0.25, 0 0.75, 0.12 1 L 1 1 L 1 0 Z" />
              </clipPath>
            </defs>
          </svg>
          
          <div 
            className="h-full w-full overflow-hidden"
            style={{ clipPath: 'url(#curvedEdgeDesktop)' }}
          >
            {heroImages.map((img, index) => (
              <img 
                key={index}
                src={img} 
                alt={`Hero ${index + 1}`}
                loading={index === 0 ? 'eager' : 'lazy'}
                decoding="async"
                className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
                  index === currentImage ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Decorative curves at bottom - Desktop only */}
      <div className="hidden lg:block absolute bottom-0 left-0 right-0 z-20">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 60V40C240 60 480 20 720 20C960 20 1200 60 1440 40V60H0Z" fill="rgba(255,255,255,0.1)" />
          <path d="M0 60V45C240 60 480 30 720 30C960 30 1200 60 1440 45V60H0Z" fill="rgba(255,255,255,0.15)" />
          <path d="M0 60V50C240 60 480 40 720 40C960 40 1200 60 1440 50V60H0Z" fill="white" />
        </svg>
      </div>
      
      {/* Mobile App Modal */}
      {showMobileAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-center">
            <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <ExclamationTriangleIcon className="w-8 h-8 text-amber-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">
              {t('hero.mobileAppTitle', 'Application mobile')}
            </h3>
            <p className="text-gray-600 mb-6">
              {t('hero.mobileAppMessage', 'L\'application mobile Tax Free RDC sera bientôt disponible sur le Play Store et l\'App Store. Restez connecté !')}
            </p>
            <button
              onClick={() => setShowMobileAppModal(false)}
              className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors"
            >
              {t('common.understood', 'Compris')}
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

function HowItWorksSection() {
  const { t } = useTranslation();
  
  const steps = [
    { icon: BuildingStorefrontIcon, title: t('howItWorks.step1.title'), desc: t('howItWorks.step1.description'), color: 'from-blue-500 to-blue-600', bgColor: 'bg-blue-50' },
    { icon: DocumentTextIcon, title: t('howItWorks.step2.title'), desc: t('howItWorks.step2.description'), color: 'from-indigo-500 to-indigo-600', bgColor: 'bg-indigo-50' },
    { icon: ShieldCheckIcon, title: t('howItWorks.step3.title'), desc: t('howItWorks.step3.description'), color: 'from-purple-500 to-purple-600', bgColor: 'bg-purple-50' },
    { icon: BanknotesIcon, title: t('howItWorks.step4.title'), desc: t('howItWorks.step4.description'), color: 'from-green-500 to-green-600', bgColor: 'bg-green-50' },
  ];
  
  return (
    <section className="py-20 md:py-28 bg-gradient-to-b from-white to-gray-50 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16 md:mb-20">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-full text-sm font-semibold mb-6 animate-pulse">
            <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
            {t('howItWorks.subtitle')}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            {t('howItWorks.title')}
          </h2>
          <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
            {t('howItWorks.description')}
          </p>
        </div>
        
        {/* Steps - Mobile: Vertical timeline, Desktop: Horizontal cards */}
        <div className="relative">
          {/* Connection line - Desktop */}
          <div className="hidden lg:block absolute top-24 left-[10%] right-[10%] h-1 bg-gradient-to-r from-blue-200 via-purple-200 to-green-200 rounded-full" />
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {steps.map((step, i) => (
              <div 
                key={i} 
                className="group relative"
                style={{ animationDelay: `${i * 150}ms` }}
              >
                {/* Card */}
                <div className={`relative ${step.bgColor} rounded-3xl p-6 md:p-8 transition-all duration-500 hover:shadow-2xl hover:-translate-y-3 border border-white/50`}>
                  {/* Step number badge */}
                  <div className="absolute -top-3 -right-3 w-10 h-10 bg-white rounded-full shadow-lg flex items-center justify-center">
                    <span className="text-sm font-bold text-gray-900">0{i + 1}</span>
                  </div>
                  
                  {/* Icon */}
                  <div className={`w-16 h-16 md:w-20 md:h-20 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-6 shadow-xl group-hover:scale-110 transition-transform duration-300`}>
                    <step.icon className="w-8 h-8 md:w-10 md:h-10 text-white" />
                  </div>
                  
                  {/* Content */}
                  <h3 className="text-xl md:text-2xl font-bold text-gray-900 mb-3 group-hover:text-blue-600 transition-colors">
                    {step.title}
                  </h3>
                  <p className="text-gray-600 leading-relaxed">
                    {step.desc}
                  </p>
                  
                  {/* Arrow indicator - Desktop only */}
                  {i < steps.length - 1 && (
                    <div className="hidden lg:flex absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white rounded-full shadow-md items-center justify-center z-10">
                      <ArrowRightIcon className="w-4 h-4 text-gray-400" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const { t } = useTranslation();
  
  const benefits = [
    { icon: BanknotesIcon, title: t('benefits.save16'), desc: t('benefits.save16Desc'), color: 'from-green-400 to-emerald-500', accent: 'text-green-600' },
    { icon: ClockIcon, title: t('benefits.expressRefund'), desc: t('benefits.expressRefundDesc'), color: 'from-blue-400 to-blue-600', accent: 'text-blue-600' },
    { icon: DevicePhoneMobileIcon, title: t('benefits.digital'), desc: t('benefits.digitalDesc'), color: 'from-purple-400 to-purple-600', accent: 'text-purple-600' },
    { icon: GlobeAltIcon, title: t('benefits.multiCurrency'), desc: t('benefits.multiCurrencyDesc'), color: 'from-orange-400 to-orange-600', accent: 'text-orange-600' },
    { icon: ShieldCheckIcon, title: t('benefits.secure'), desc: t('benefits.secureDesc'), color: 'from-indigo-400 to-indigo-600', accent: 'text-indigo-600' },
    { icon: MapPinIcon, title: t('benefits.everywhere'), desc: t('benefits.everywhereDesc'), color: 'from-pink-400 to-pink-600', accent: 'text-pink-600' },
  ];
  
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
      </div>
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <div className="text-center mb-16">
          <span className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 backdrop-blur-sm text-green-400 rounded-full text-sm font-semibold mb-6 border border-white/10">
            <CheckCircleIcon className="w-4 h-4" />
            {t('benefits.subtitle')}
          </span>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6">
            {t('benefits.title')}
          </h2>
          <p className="text-lg text-blue-200 max-w-2xl mx-auto">
            {t('benefits.description', 'Découvrez tous les avantages de Tax Free RDC')}
          </p>
        </div>
        
        {/* Benefits Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <div 
              key={i} 
              className="group relative bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10 hover:border-white/30 hover:bg-white/10 transition-all duration-500 hover:-translate-y-2"
            >
              {/* Glow effect on hover */}
              <div className={`absolute inset-0 bg-gradient-to-br ${b.color} opacity-0 group-hover:opacity-10 rounded-2xl transition-opacity duration-500`} />
              
              <div className="relative flex items-start gap-4">
                {/* Icon */}
                <div className={`w-14 h-14 bg-gradient-to-br ${b.color} rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300 flex-shrink-0`}>
                  <b.icon className="w-7 h-7 text-white" />
                </div>
                
                {/* Content */}
                <div>
                  <h3 className="font-bold text-white text-lg mb-2 group-hover:text-blue-300 transition-colors">
                    {b.title}
                  </h3>
                  <p className="text-blue-200/80 text-sm leading-relaxed">
                    {b.desc}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CalculatorSection() {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(500000);
  const vat = amount * 0.16 / 1.16;
  const fee = vat * 0.15;
  const refund = vat - fee;
  const percentage = ((refund / amount) * 100).toFixed(1);
  
  return (
    <section className="py-20 md:py-28 bg-gradient-to-br from-gray-50 via-white to-green-50 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-green-100 rounded-full blur-3xl opacity-50 -translate-y-1/2 translate-x-1/2" />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Content */}
          <div>
            <span className="inline-flex items-center gap-2 px-4 py-2 bg-yellow-100 text-yellow-700 rounded-full text-sm font-semibold mb-6">
              <BanknotesIcon className="w-4 h-4" />
              {t('calculator.subtitle')}
            </span>
            <h2 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {t('calculator.title')}
            </h2>
            <p className="text-lg text-gray-600 mb-8 leading-relaxed">
              {t('calculator.description')}
            </p>
            
            {/* Features list */}
            <div className="space-y-4">
              {[
                { text: t('calculator.vatRate'), icon: '📊' },
                { text: t('calculator.serviceFee'), icon: '💳' },
                { text: t('calculator.minimum'), icon: '✨' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-4 p-4 bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                  <span className="text-2xl">{item.icon}</span>
                  <span className="text-gray-700 font-medium">{item.text}</span>
                </div>
              ))}
            </div>
          </div>
          
          {/* Calculator Card */}
          <div className="relative">
            {/* Floating badge */}
            <div className="absolute -top-4 -right-4 bg-gradient-to-r from-green-500 to-emerald-500 text-white px-4 py-2 rounded-full text-sm font-bold shadow-lg z-10">
              ~{percentage}% récupéré
            </div>
            
            <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-8 border border-gray-100 relative overflow-hidden">
              {/* Header */}
              <div className="text-center mb-8">
                <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-xl">
                  <BanknotesIcon className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-gray-900">{t('calculator.simulator')}</h3>
                <p className="text-gray-500 text-sm mt-1">Glissez pour calculer</p>
              </div>
              
              {/* Slider */}
              <div className="mb-8">
                <label className="block text-sm font-medium text-gray-700 mb-3">{t('calculator.amount')}</label>
                <div className="relative">
                  <input 
                    type="range" 
                    min="50000" 
                    max="5000000" 
                    step="10000" 
                    value={amount} 
                    onChange={(e) => setAmount(Number(e.target.value))} 
                    className="w-full h-3 bg-gradient-to-r from-blue-200 to-green-200 rounded-full cursor-pointer appearance-none [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-6 [&::-webkit-slider-thumb]:h-6 [&::-webkit-slider-thumb]:bg-blue-600 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:shadow-lg [&::-webkit-slider-thumb]:cursor-pointer" 
                  />
                </div>
                <div className="text-center mt-4">
                  <span className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
                    {amount.toLocaleString()}
                  </span>
                  <span className="text-xl text-gray-500 ml-2">CDF</span>
                </div>
              </div>
              
              {/* Breakdown */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center py-3 px-4 bg-gray-50 rounded-xl">
                  <span className="text-gray-600">{t('calculator.vat')}</span>
                  <span className="font-bold text-gray-900">{Math.round(vat).toLocaleString()} CDF</span>
                </div>
                <div className="flex justify-between items-center py-3 px-4 bg-red-50 rounded-xl">
                  <span className="text-gray-600">{t('calculator.fee')}</span>
                  <span className="font-bold text-red-500">-{Math.round(fee).toLocaleString()} CDF</span>
                </div>
              </div>
              
              {/* Result */}
              <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-2xl p-6 text-white">
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-green-100 text-sm">{t('calculator.refund')}</span>
                    <div className="text-3xl md:text-4xl font-bold mt-1">
                      {Math.round(refund).toLocaleString()} CDF
                    </div>
                  </div>
                  <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center">
                    <CheckCircleIcon className="w-10 h-10 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LocationsSection() {
  const { t } = useTranslation();
  
  const locations = [
    { name: t('locations.ndjili'), city: t('locations.kinshasa'), type: t('locations.airport'), hours: '24h/24' },
    { name: t('locations.lubumbashi'), city: 'Lubumbashi', type: t('locations.airport'), hours: '6h-22h' },
    { name: t('locations.kasumbalesa'), city: t('locations.kasumbalesaCity'), type: t('locations.border'), hours: '6h-18h' },
    { name: t('locations.matadi'), city: t('locations.matadiCity'), type: t('locations.port'), hours: '7h-19h' },
  ];
  return (
    <section className="py-24 bg-gradient-to-br from-blue-900 to-indigo-900 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-white/10 rounded-full text-sm font-medium mb-4">{t('locations.subtitle')}</span>
          <h2 className="text-3xl md:text-4xl font-bold mb-4">{t('locations.title')}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {locations.map((l, i) => (
            <div key={i} className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20 hover:bg-white/20 transition-all">
              <div className="flex items-center mb-4">
                <MapPinIcon className="w-6 h-6 text-yellow-400 mr-2" />
                <span className="text-sm font-medium text-yellow-400 bg-yellow-400/20 px-3 py-1 rounded-full">{l.type}</span>
              </div>
              <h3 className="font-bold text-lg mb-2">{l.name}</h3>
              <p className="text-blue-200 text-sm mb-1">{l.city}</p>
              <div className="flex items-center text-sm text-blue-200"><ClockIcon className="w-4 h-4 mr-2" />{l.hours}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const { t } = useTranslation();
  const [idx, setIdx] = useState(0);
  const testimonials = [
    { name: 'Marie Dubois', country: 'France', text: 'Service impeccable ! Remboursement en 24h.', amount: '125,000 CDF' },
    { name: 'John Smith', country: 'USA', text: 'Smooth process. Highly recommended!', amount: '340,000 CDF' },
    { name: 'Chen Wei', country: 'Chine', text: 'Mobile Money instant. Excellent!', amount: '520,000 CDF' },
  ];
  return (
    <section className="py-24 bg-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">{t('testimonials.subtitle')}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('testimonials.title')}</h2>
        </div>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-3xl p-8 md:p-12">
          <div className="flex mb-6">{[...Array(5)].map((_, i) => <StarSolid key={i} className="w-6 h-6 text-yellow-400" />)}</div>
          <blockquote className="text-xl text-gray-700 mb-8">"{testimonials[idx].text}"</blockquote>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-bold mr-4">{testimonials[idx].name.split(' ').map(n => n[0]).join('')}</div>
              <div><div className="font-bold text-gray-900">{testimonials[idx].name}</div><div className="text-gray-500">{testimonials[idx].country}</div></div>
            </div>
            <div className="text-right"><div className="text-sm text-gray-500">{t('testimonials.refunded')}</div><div className="text-xl font-bold text-green-600">{testimonials[idx].amount}</div></div>
          </div>
        </div>
        <div className="flex justify-center mt-8 space-x-4">
          <button onClick={() => setIdx((idx - 1 + testimonials.length) % testimonials.length)} className="p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow"><ChevronLeftIcon className="w-6 h-6 text-gray-600" /></button>
          <div className="flex items-center space-x-2">{testimonials.map((_, i) => <button key={i} onClick={() => setIdx(i)} className={`h-3 rounded-full transition-all ${i === idx ? 'bg-blue-600 w-8' : 'bg-gray-300 w-3'}`} />)}</div>
          <button onClick={() => setIdx((idx + 1) % testimonials.length)} className="p-3 bg-white rounded-full shadow-lg hover:shadow-xl transition-shadow"><ChevronRightIcon className="w-6 h-6 text-gray-600" /></button>
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(0);
  const faqs = [
    { q: t('faq.q1'), a: t('faq.a1') },
    { q: t('faq.q2'), a: t('faq.a2') },
    { q: t('faq.q3'), a: t('faq.a3') },
    { q: t('faq.q4'), a: t('faq.a4') },
    { q: t('faq.q5'), a: t('faq.a5') },
    { q: t('faq.q6'), a: t('faq.a6') },
  ];
  return (
    <section className="py-24 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-4">{t('faq.subtitle')}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('faq.title')}</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full px-6 py-5 flex items-center justify-between text-left">
                <span className="font-semibold text-gray-900">{faq.q}</span>
                <ChevronDownIcon className={`w-5 h-5 text-gray-500 transition-transform ${open === i ? 'rotate-180' : ''}`} />
              </button>
              {open === i && <div className="px-6 pb-5"><p className="text-gray-600">{faq.a}</p></div>}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function MerchantCTASection() {
  const { t } = useTranslation();
  
  return (
    <section className="py-24 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-4 py-1 bg-white/20 rounded-full text-sm font-medium mb-6">{t('merchantCta.subtitle')}</span>
            <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('merchantCta.title')}</h2>
            <p className="text-xl text-blue-100 mb-8">{t('merchantCta.description')}</p>
            <div className="grid sm:grid-cols-2 gap-4 mb-8">
              {[t('merchantCta.freeRegistration'), t('merchantCta.trainingIncluded'), t('merchantCta.support247'), t('merchantCta.marketingMaterial')].map((text, i) => (
                <div key={i} className="flex items-center space-x-3"><CheckCircleIcon className="w-6 h-6 text-green-400" /><span>{text}</span></div>
              ))}
            </div>
            <Link to="/commercants" className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-100 transition-all transform hover:scale-105 shadow-lg">
              <BuildingStorefrontIcon className="w-5 h-5 mr-2" />{t('merchantCta.cta')}
            </Link>
          </div>
          <div className="hidden lg:block">
            <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20">
              {[{ icon: UserGroupIcon, val: '500+', label: t('merchantCta.merchants') }, { icon: DocumentTextIcon, val: '50K+', label: t('merchantCta.forms') }, { icon: BanknotesIcon, val: '$2M+', label: t('merchantCta.refunded') }, { icon: StarIcon, val: '98%', label: t('merchantCta.satisfaction') }].map((s, i) => (
                <div key={i} className="flex items-center mb-6 last:mb-0">
                  <div className="w-16 h-16 bg-yellow-400/20 rounded-2xl flex items-center justify-center mr-4"><s.icon className="w-8 h-8 text-yellow-400" /></div>
                  <div><div className="text-3xl font-bold">{s.val}</div><div className="text-blue-200">{s.label}</div></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default function HomePage() {
  return (
    <FadeIn duration={400}>
      <>
        <HeroSection />
        <HowItWorksSection />
        <BenefitsSection />
        <CalculatorSection />
        <LocationsSection />
        <TestimonialsSection />
        <FAQSection />
        <MerchantCTASection />
      </>
    </FadeIn>
  );
}
