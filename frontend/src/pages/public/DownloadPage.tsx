import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import FadeIn from '../../components/ui/FadeIn';
import {
  ComputerDesktopIcon,
  ArrowDownTrayIcon,
  CheckCircleIcon,
  ShieldCheckIcon,
  BoltIcon,
  CloudArrowDownIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';

// Platform detection
const getPlatform = (): 'windows' | 'macos' | 'linux' | 'unknown' => {
  const userAgent = navigator.userAgent.toLowerCase();
  if (userAgent.includes('win')) return 'windows';
  if (userAgent.includes('mac')) return 'macos';
  if (userAgent.includes('linux')) return 'linux';
  return 'unknown';
};

// GitHub Release base URL - using latest version
const GITHUB_RELEASE_URL = 'https://github.com/Gaetk-hub/taxfree-rdc-desktop/releases/latest/download';

// Platform info with direct download links
const platforms = {
  windows: {
    name: 'Windows',
    icon: '🪟',
    description: 'Windows 10/11 (64-bit)',
    fileName: 'Tax.Free.RDC_x64-setup.exe',
    size: '~4 MB',
    downloadUrl: `${GITHUB_RELEASE_URL}/Tax.Free.RDC_1.0.4_x64-setup.exe`,
  },
  macos: {
    name: 'macOS',
    icon: '🍎',
    description: 'macOS 10.15+ (Intel & Apple Silicon)',
    fileName: 'Tax.Free.RDC_aarch64.dmg',
    size: '~5 MB',
    downloadUrl: `${GITHUB_RELEASE_URL}/Tax.Free.RDC_1.0.4_aarch64.dmg`,
  },
  linux: {
    name: 'Linux',
    icon: '🐧',
    description: 'Ubuntu, Debian, Fedora (64-bit)',
    fileName: 'Tax.Free.RDC_amd64.AppImage',
    size: '~80 MB',
    downloadUrl: `${GITHUB_RELEASE_URL}/Tax.Free.RDC_1.0.4_amd64.AppImage`,
  },
};

const features = [
  {
    icon: BoltIcon,
    title: 'Performance optimale',
    description: 'Application native ultra-rapide, sans les limitations du navigateur',
  },
  {
    icon: ShieldCheckIcon,
    title: 'Sécurité renforcée',
    description: 'Vos données sont protégées avec un chiffrement de bout en bout',
  },
  {
    icon: CloudArrowDownIcon,
    title: 'Synchronisation automatique',
    description: 'Vos données se mettent à jour automatiquement en arrière-plan',
  },
];

export default function DownloadPage() {
  useTranslation(); // For future translations
  const [selectedPlatform, setSelectedPlatform] = useState<'windows' | 'macos' | 'linux'>(
    getPlatform() === 'unknown' ? 'windows' : getPlatform() as 'windows' | 'macos' | 'linux'
  );

  const currentPlatform = platforms[selectedPlatform];

  // Downloads are now available on GitHub Releases
  const downloadsAvailable = true;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Header */}
      <div className="bg-blue-600 text-white py-4 px-6">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 text-blue-100 hover:text-white transition-colors">
            <ArrowLeftIcon className="w-5 h-5" />
            <span>Retour à l'accueil</span>
          </Link>
          <Link to="/login" className="px-4 py-2 bg-white text-blue-600 rounded-lg font-medium hover:bg-blue-50 transition-colors">
            Connexion
          </Link>
        </div>
      </div>

      <FadeIn duration={400}>
        <div className="max-w-6xl mx-auto px-6 py-16">
          {/* Hero Section */}
          <div className="text-center mb-16">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-600 rounded-2xl mb-6 shadow-lg">
              <ComputerDesktopIcon className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
              Télécharger Tax Free RDC
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Installez l'application desktop pour une expérience optimale, sans avoir besoin d'ouvrir votre navigateur.
            </p>
          </div>

          {/* Platform Selector */}
          <div className="bg-white rounded-2xl shadow-xl p-8 mb-12">
            <h2 className="text-lg font-semibold text-gray-900 mb-6 text-center">
              Choisissez votre système d'exploitation
            </h2>
            
            <div className="grid grid-cols-3 gap-4 mb-8">
              {(Object.keys(platforms) as Array<keyof typeof platforms>).map((platform) => (
                <button
                  key={platform}
                  onClick={() => setSelectedPlatform(platform)}
                  className={`p-6 rounded-xl border-2 transition-all ${
                    selectedPlatform === platform
                      ? 'border-blue-600 bg-blue-50'
                      : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="text-4xl mb-3">{platforms[platform].icon}</div>
                  <div className="font-semibold text-gray-900">{platforms[platform].name}</div>
                  <div className="text-sm text-gray-500 mt-1">{platforms[platform].description}</div>
                </button>
              ))}
            </div>

            {/* Download Button */}
            <div className="text-center">
              {downloadsAvailable ? (
                <a
                  href={currentPlatform.downloadUrl}
                  download
                  className="inline-flex items-center gap-3 px-8 py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-all transform hover:scale-105 shadow-lg"
                >
                  <ArrowDownTrayIcon className="w-6 h-6" />
                  <div className="text-left">
                    <div>Télécharger pour {currentPlatform.name}</div>
                    <div className="text-sm text-blue-200">{currentPlatform.fileName} • {currentPlatform.size}</div>
                  </div>
                </a>
              ) : (
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-3 px-8 py-4 bg-gray-400 text-white font-semibold rounded-xl cursor-not-allowed">
                    <ArrowDownTrayIcon className="w-6 h-6" />
                    <div className="text-left">
                      <div>Télécharger pour {currentPlatform.name}</div>
                      <div className="text-sm text-gray-200">{currentPlatform.fileName} • {currentPlatform.size}</div>
                    </div>
                  </div>
                  <p className="text-amber-600 bg-amber-50 rounded-lg px-4 py-2 inline-block">
                    ⏳ Disponible prochainement - La première version est en cours de préparation
                  </p>
                  <p className="text-sm text-gray-500">
                    En attendant, vous pouvez utiliser la{' '}
                    <Link to="/login" className="text-blue-600 hover:underline">version web</Link>
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Features */}
          <div className="mb-16">
            <h2 className="text-2xl font-bold text-gray-900 text-center mb-8">
              Pourquoi utiliser l'application desktop ?
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {features.map((feature, index) => (
                <div key={index} className="bg-white rounded-xl p-6 shadow-lg">
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900 mb-2">{feature.title}</h3>
                  <p className="text-gray-600 text-sm">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Requirements */}
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">Configuration requise</h2>
            <div className="grid md:grid-cols-3 gap-8">
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🪟</span> Windows
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    Windows 10 ou 11 (64-bit)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    4 GB de RAM minimum
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    100 MB d'espace disque
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🍎</span> macOS
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    macOS 10.15 (Catalina) ou plus
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    Intel ou Apple Silicon (M1/M2/M3)
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    100 MB d'espace disque
                  </li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <span className="text-2xl">🐧</span> Linux
                </h3>
                <ul className="space-y-2 text-sm text-gray-600">
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    Ubuntu 20.04+, Debian 10+, Fedora 33+
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    4 GB de RAM minimum
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircleIcon className="w-4 h-4 text-green-500" />
                    100 MB d'espace disque
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </FadeIn>
    </div>
  );
}
