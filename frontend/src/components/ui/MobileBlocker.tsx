import { useState, useEffect } from 'react';
import {
  ComputerDesktopIcon,
  DevicePhoneMobileIcon,
  ArrowDownTrayIcon,
  GlobeAltIcon,
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full">
          {/* Card */}
          <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
            {/* Header with gradient */}
            <div className="bg-gradient-to-r from-primary-500 to-primary-700 px-6 py-8 text-center">
              <div className="w-20 h-20 mx-auto mb-4 bg-white/20 rounded-2xl flex items-center justify-center">
                <ComputerDesktopIcon className="w-10 h-10 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">
                Application Bureau Requise
              </h1>
              <p className="text-primary-100 text-sm">
                Tax Free RDC n'est pas disponible sur mobile ou tablette
              </p>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Message */}
              <div className="text-center">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-amber-50 text-amber-700 rounded-xl text-sm font-medium mb-4">
                  <DevicePhoneMobileIcon className="w-4 h-4" />
                  Appareil non supporté
                </div>
                <p className="text-gray-600 text-sm">
                  Pour une expérience optimale et sécurisée, veuillez utiliser 
                  l'application sur un ordinateur de bureau ou un ordinateur portable.
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3">
                {/* Option 1: Download Desktop App */}
                <button
                  onClick={() => {
                    // TODO: Link to desktop app download
                    alert('Le téléchargement de l\'application bureau sera bientôt disponible.');
                  }}
                  className="w-full flex items-center gap-4 p-4 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all group"
                >
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center group-hover:bg-white/30 transition-colors">
                    <ArrowDownTrayIcon className="w-6 h-6" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-semibold">Télécharger l'application</p>
                    <p className="text-primary-100 text-sm">Windows, macOS, Linux</p>
                  </div>
                </button>

                {/* Option 2: Use Browser on Desktop */}
                <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                  <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center">
                    <GlobeAltIcon className="w-6 h-6 text-gray-500" />
                  </div>
                  <div className="text-left flex-1">
                    <p className="font-medium text-gray-900">Utiliser le navigateur</p>
                    <p className="text-gray-500 text-sm">
                      Ouvrez <span className="font-medium text-primary-600">taxfree-rdc.com</span> sur votre ordinateur
                    </p>
                  </div>
                </div>
              </div>

              {/* Features reminder */}
              <div className="bg-blue-50 rounded-xl p-4">
                <h3 className="font-medium text-blue-900 mb-2 text-sm">
                  Pourquoi un ordinateur ?
                </h3>
                <ul className="text-blue-700 text-xs space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    Gestion complète des bordereaux et remboursements
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    Impression et scan de documents
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    Sécurité renforcée pour les transactions
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-blue-400 mt-0.5">•</span>
                    Interface optimisée pour la productivité
                  </li>
                </ul>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 text-center">
              <p className="text-xs text-gray-500">
                © 2026 Tax Free RDC. Tous droits réservés.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
