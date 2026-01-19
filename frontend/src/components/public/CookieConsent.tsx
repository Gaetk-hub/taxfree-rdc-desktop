import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { XMarkIcon, Cog6ToothIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

interface CookiePreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
}

const COOKIE_CONSENT_KEY = 'taxfree_cookie_consent';

export function getCookieConsent(): CookiePreferences | null {
  const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return null;
    }
  }
  return null;
}

export function hasAnalyticsConsent(): boolean {
  const consent = getCookieConsent();
  return consent?.analytics ?? false;
}

export default function CookieConsent() {
  const { t } = useTranslation();
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    necessary: true,
    analytics: false,
    marketing: false,
  });

  useEffect(() => {
    const consent = getCookieConsent();
    if (!consent) {
      // Show banner after a short delay
      const timer = setTimeout(() => setIsVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const saveConsent = (prefs: CookiePreferences) => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify(prefs));
    setIsVisible(false);
    
    // Apply consent - disable/enable analytics based on preference
    if (prefs.analytics) {
      // Enable analytics (e.g., Google Analytics)
      console.log('Analytics enabled');
    } else {
      // Disable analytics
      console.log('Analytics disabled');
    }
  };

  const acceptAll = () => {
    const allAccepted = { necessary: true, analytics: true, marketing: true };
    setPreferences(allAccepted);
    saveConsent(allAccepted);
  };

  const acceptNecessary = () => {
    const necessaryOnly = { necessary: true, analytics: false, marketing: false };
    setPreferences(necessaryOnly);
    saveConsent(necessaryOnly);
  };

  const savePreferences = () => {
    saveConsent(preferences);
    setShowPreferences(false);
  };

  if (!isVisible) return null;

  return (
    <>
      {/* Main Banner */}
      <div className={`fixed bottom-0 left-0 right-0 z-50 transition-transform duration-500 ${
        showPreferences ? 'translate-y-full' : 'translate-y-0'
      }`}>
        <div className="bg-white border-t border-gray-200 shadow-2xl shadow-gray-900/20">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ShieldCheckIcon className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {t('cookies.title', 'Nous utilisons des cookies')}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {t('cookies.description', 'Nous utilisons des cookies pour améliorer votre expérience sur notre site. Vous pouvez personnaliser vos préférences ou accepter tous les cookies.')}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 lg:flex-shrink-0">
                <button
                  onClick={() => setShowPreferences(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                  {t('cookies.customize', 'Personnaliser')}
                </button>
                <button
                  onClick={acceptNecessary}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                >
                  {t('cookies.rejectOptional', 'Refuser optionnels')}
                </button>
                <button
                  onClick={acceptAll}
                  className="px-6 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
                >
                  {t('cookies.acceptAll', 'Tout accepter')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">
                  {t('cookies.preferencesTitle', 'Préférences de cookies')}
                </h2>
                <button
                  onClick={() => setShowPreferences(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <XMarkIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-4">
              {/* Necessary Cookies */}
              <div className="p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {t('cookies.necessary', 'Cookies nécessaires')}
                  </h3>
                  <span className="px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                    {t('cookies.alwaysActive', 'Toujours actifs')}
                  </span>
                </div>
                <p className="text-sm text-gray-600">
                  {t('cookies.necessaryDesc', 'Ces cookies sont essentiels au fonctionnement du site et ne peuvent pas être désactivés.')}
                </p>
              </div>

              {/* Analytics Cookies */}
              <div className="p-4 border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {t('cookies.analytics', 'Cookies analytiques')}
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.analytics}
                      onChange={(e) => setPreferences({ ...preferences, analytics: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  {t('cookies.analyticsDesc', 'Ces cookies nous aident à comprendre comment les visiteurs utilisent notre site.')}
                </p>
              </div>

              {/* Marketing Cookies */}
              <div className="p-4 border border-gray-200 rounded-xl">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900">
                    {t('cookies.marketing', 'Cookies marketing')}
                  </h3>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={preferences.marketing}
                      onChange={(e) => setPreferences({ ...preferences, marketing: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
                <p className="text-sm text-gray-600">
                  {t('cookies.marketingDesc', 'Ces cookies sont utilisés pour vous proposer des publicités pertinentes.')}
                </p>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 flex gap-3">
              <button
                onClick={() => setShowPreferences(false)}
                className="flex-1 px-4 py-3 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                {t('common.cancel', 'Annuler')}
              </button>
              <button
                onClick={savePreferences}
                className="flex-1 px-4 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
              >
                {t('cookies.savePreferences', 'Enregistrer mes préférences')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
