import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  ArrowDownTrayIcon,
  GlobeAltIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  BoltIcon,
  DocumentTextIcon,
} from '@heroicons/react/24/outline';

interface MobileBlockerProps {
  children: React.ReactNode;
}

export default function MobileBlocker({ children }: MobileBlockerProps) {
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);

  useEffect(() => {
    const checkDevice = () => {
      // Check screen width (< 1024px is considered mobile/tablet)
      const isSmallScreen = window.innerWidth < 1024;
      
      // Also check user agent for mobile devices
      const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
        navigator.userAgent
      );
      
      setIsMobileOrTablet(isSmallScreen || isMobileUA);
    };

    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => window.removeEventListener('resize', checkDevice);
  }, []);

  if (isMobileOrTablet) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-md w-full relative z-10">
          {/* Main Card */}
          <div className="bg-white/10 backdrop-blur-xl rounded-3xl border border-white/20 overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="px-6 py-8 text-center relative">
              {/* Animated icon */}
              <div className="w-24 h-24 mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-400 to-indigo-500 rounded-2xl animate-pulse opacity-50" />
                <div className="relative w-full h-full bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-xl">
                  <ComputerDesktopIcon className="w-12 h-12 text-white" />
                </div>
              </div>
              
              <h1 className="text-2xl font-bold text-white mb-3">
                Application Desktop Requise
              </h1>
              <p className="text-blue-200 text-sm leading-relaxed">
                L'interface commerçant Tax Free RDC est optimisée pour les ordinateurs de bureau
              </p>
            </div>

            {/* Status Badge */}
            <div className="px-6">
              <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500/20 border border-amber-400/30 text-amber-300 rounded-xl text-sm font-medium">
                <DevicePhoneMobileIcon className="w-4 h-4" />
                <span>Appareil mobile détecté</span>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Primary CTA - Download App */}
              <Link
                to="/download"
                className="group w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ArrowDownTrayIcon className="w-7 h-7" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold text-lg">Télécharger l'application</p>
                  <p className="text-blue-100 text-sm">Windows, macOS, Linux</p>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
              </Link>

              {/* Secondary Option - Browser */}
              <div className="flex items-center gap-4 p-4 bg-white/5 rounded-2xl border border-white/10">
                <div className="w-14 h-14 bg-white/10 rounded-xl flex items-center justify-center">
                  <GlobeAltIcon className="w-7 h-7 text-blue-300" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-white">Utiliser le navigateur</p>
                  <p className="text-blue-200 text-sm">
                    Ouvrez <span className="font-medium text-blue-400">detaxerdc.vercel.app</span> sur votre PC
                  </p>
                </div>
              </div>
            </div>

            {/* Features */}
            <div className="px-6 pb-6">
              <div className="bg-white/5 rounded-2xl p-4 border border-white/10">
                <h3 className="font-semibold text-white mb-3 text-sm flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4 text-blue-400" />
                  Pourquoi un ordinateur ?
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: DocumentTextIcon, text: 'Gestion bordereaux' },
                    { icon: BoltIcon, text: 'Performance optimale' },
                    { icon: ShieldCheckIcon, text: 'Sécurité renforcée' },
                    { icon: CheckCircleIcon, text: 'Toutes fonctionnalités' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-blue-200">
                      <item.icon className="w-3.5 h-3.5 text-blue-400" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-white/5 border-t border-white/10 text-center">
              <p className="text-xs text-blue-300/70">
                © 2026 Tax Free RDC • Développé par{' '}
                <a href="https://netgoconsulting.tech" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  Netgo Consulting
                </a>
              </p>
            </div>
          </div>
          
          {/* Back to home link */}
          <div className="mt-6 text-center">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-blue-300 hover:text-white text-sm transition-colors"
            >
              <ArrowRightIcon className="w-4 h-4 rotate-180" />
              Retour à l'accueil
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
