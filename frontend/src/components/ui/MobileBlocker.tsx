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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-indigo-50 flex items-center justify-center p-4 relative overflow-hidden">
        {/* Background decorations */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-200/40 rounded-full blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-indigo-200/40 rounded-full blur-3xl" />
        </div>
        
        <div className="max-w-md w-full relative z-10">
          {/* Main Card */}
          <div className="bg-white rounded-3xl border border-gray-200 overflow-hidden shadow-xl">
            {/* Header */}
            <div className="px-6 py-8 text-center relative bg-gradient-to-br from-blue-500 to-indigo-600">
              {/* Icon */}
              <div className="w-20 h-20 mx-auto mb-5 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                <ComputerDesktopIcon className="w-10 h-10 text-white" />
              </div>
              
              <h1 className="text-2xl font-bold text-white mb-2">
                Application Desktop Requise
              </h1>
              <p className="text-blue-100 text-sm leading-relaxed">
                L'interface commerçant Tax Free RDC est optimisée pour les ordinateurs de bureau
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-4">
              {/* Status Badge */}
              <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-sm font-medium">
                <DevicePhoneMobileIcon className="w-4 h-4" />
                <span>Appareil mobile détecté</span>
              </div>

              {/* Primary CTA - Download App */}
              <Link
                to="/download"
                className="group w-full flex items-center gap-4 p-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-2xl hover:from-blue-600 hover:to-indigo-700 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                  <ArrowDownTrayIcon className="w-6 h-6" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-bold">Télécharger l'application</p>
                  <p className="text-blue-100 text-sm">Windows, macOS, Linux</p>
                </div>
                <ArrowRightIcon className="w-5 h-5 text-white/70 group-hover:translate-x-1 transition-transform" />
              </Link>

              {/* Secondary Option - Browser */}
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-200">
                <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                  <GlobeAltIcon className="w-6 h-6 text-gray-500" />
                </div>
                <div className="text-left flex-1">
                  <p className="font-semibold text-gray-900">Utiliser le navigateur</p>
                  <p className="text-gray-500 text-sm">
                    Ouvrez <span className="font-medium text-blue-600">detaxerdc.vercel.app</span> sur votre PC
                  </p>
                </div>
              </div>

              {/* Features */}
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <h3 className="font-semibold text-blue-900 mb-3 text-sm flex items-center gap-2">
                  <ShieldCheckIcon className="w-4 h-4 text-blue-600" />
                  Pourquoi un ordinateur ?
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { icon: DocumentTextIcon, text: 'Gestion bordereaux' },
                    { icon: BoltIcon, text: 'Performance optimale' },
                    { icon: ShieldCheckIcon, text: 'Sécurité renforcée' },
                    { icon: CheckCircleIcon, text: 'Toutes fonctionnalités' },
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs text-blue-700">
                      <item.icon className="w-3.5 h-3.5 text-blue-500" />
                      <span>{item.text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">
                © 2026 Tax Free RDC • Développé par{' '}
                <a href="https://netgoconsulting.tech" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  Netgo Consulting
                </a>
              </p>
            </div>
          </div>
          
          {/* Back to home link */}
          <div className="mt-6 text-center">
            <Link 
              to="/" 
              className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 text-sm transition-colors"
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
