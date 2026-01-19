import { Link, Outlet, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  BanknotesIcon, PhoneIcon, EnvelopeIcon, MapPinIcon, 
  GlobeAltIcon, ChevronDownIcon, Bars3Icon, XMarkIcon,
  UserCircleIcon, MagnifyingGlassIcon, ArrowRightIcon,
  SparklesIcon
} from '@heroicons/react/24/outline';
import ScrollToTop from '../components/public/ScrollToTop';
import CookieConsent from '../components/public/CookieConsent';
import ChatBot from '../components/public/ChatBot';

// Top bar with contact info and language selector
function TopBar({ scrolled }: { scrolled: boolean }) {
  const { i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  
  const languages = [
    { code: 'fr', label: 'Français', flag: '🇫🇷' },
    { code: 'en', label: 'English', flag: '🇬🇧' },
    { code: 'zh', label: '中文', flag: '🇨🇳' }
  ];
  
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];
  
  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setLangOpen(false);
  };
  
  return (
    <div className={`hidden lg:block transition-all duration-500 ${
      scrolled ? 'h-0 opacity-0 overflow-hidden' : 'h-9 opacity-100'
    }`}>
      <div className="bg-gradient-to-r from-slate-900 via-blue-900 to-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-9 text-xs">
            {/* Left - Contact */}
            <div className="flex items-center divide-x divide-white/20">
              <a href="tel:+243812345678" className="flex items-center text-blue-100 hover:text-white transition-colors pr-4 group">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center mr-2 group-hover:bg-white/20 transition-colors">
                  <PhoneIcon className="w-3 h-3" />
                </div>
                <span className="font-medium">+243 81 234 5678</span>
              </a>
              <a href="mailto:contact@taxfree.cd" className="flex items-center text-blue-100 hover:text-white transition-colors px-4 group">
                <div className="w-5 h-5 rounded-full bg-white/10 flex items-center justify-center mr-2 group-hover:bg-white/20 transition-colors">
                  <EnvelopeIcon className="w-3 h-3" />
                </div>
                <span className="font-medium">contact@taxfree.cd</span>
              </a>
            </div>
            
            {/* Right - Language */}
            <div className="flex items-center space-x-3">
              <div className="relative">
                <button 
                  onClick={() => setLangOpen(!langOpen)}
                  className="flex items-center space-x-1.5 text-blue-100 hover:text-white transition-colors px-2 py-1 rounded-md hover:bg-white/10"
                >
                  <GlobeAltIcon className="w-4 h-4" />
                  <span className="font-medium">{currentLang.flag} {currentLang.code.toUpperCase()}</span>
                  <ChevronDownIcon className={`w-3 h-3 transition-transform ${langOpen ? 'rotate-180' : ''}`} />
                </button>
                {langOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl py-2 z-50 min-w-[140px] border border-gray-100 animate-fadeIn">
                      {languages.map((l) => (
                        <button 
                          key={l.code} 
                          onClick={() => changeLanguage(l.code)}
                          className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                            i18n.language === l.code ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700'
                          }`}
                        >
                          <span className="mr-2">{l.flag}</span>
                          {l.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Mobile Language Selector Component
function MobileLanguageSelector() {
  const { i18n } = useTranslation();
  const [langOpen, setLangOpen] = useState(false);
  
  const languages = [
    { code: 'fr', label: 'FR', flag: '🇫🇷' },
    { code: 'en', label: 'EN', flag: '🇬🇧' },
    { code: 'zh', label: '中文', flag: '🇨🇳' }
  ];
  
  const currentLang = languages.find(l => l.code === i18n.language) || languages[0];
  
  const changeLanguage = (code: string) => {
    i18n.changeLanguage(code);
    setLangOpen(false);
  };
  
  return (
    <div className="relative">
      <button 
        onClick={() => setLangOpen(!langOpen)}
        className="flex items-center gap-1 p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors"
        aria-label="Changer de langue"
      >
        <GlobeAltIcon className="w-5 h-5" />
        <span className="text-xs font-medium">{currentLang.flag}</span>
      </button>
      
      {langOpen && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setLangOpen(false)} />
          <div className="absolute right-0 top-full mt-2 bg-white rounded-xl shadow-2xl py-2 z-50 min-w-[120px] border border-gray-100">
            {languages.map((l) => (
              <button 
                key={l.code} 
                onClick={() => changeLanguage(l.code)}
                className={`flex items-center w-full px-4 py-2 text-sm hover:bg-gray-50 transition-colors ${
                  i18n.language === l.code ? 'text-blue-600 bg-blue-50 font-medium' : 'text-gray-700'
                }`}
              >
                <span className="mr-2">{l.flag}</span>
                {l.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Main Navigation
function Navigation() {
  const { t } = useTranslation();
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const location = useLocation();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setMobileMenuOpen(false);
    setActiveDropdown(null);
  }, [location]);

  useEffect(() => {
    const handleClickOutside = () => setActiveDropdown(null);
    if (activeDropdown) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [activeDropdown]);

  const navLinks = [
    { to: '/', label: t('nav.home') },
    { 
      to: '/voyageurs', 
      label: t('nav.travelers'),
      icon: UserCircleIcon,
      dropdown: [
        { to: '/voyageurs', label: t('nav.completeGuide'), desc: t('nav.stepByStep'), icon: '📖' },
        { to: '/comment-ca-marche', label: t('nav.howItWorks'), desc: t('nav.stepByStep'), icon: '🔄' },
        { to: '/status', label: t('nav.trackRefund'), desc: t('nav.checkStatus'), icon: '🔍' },
      ]
    },
    { 
      to: '/commercants', 
      label: t('nav.merchants'),
      icon: BanknotesIcon,
      dropdown: [
        { to: '/commercants', label: t('nav.becomePartner'), desc: t('nav.joinNetwork'), icon: '🤝' },
        { to: '/login', label: t('nav.merchantPortal'), desc: t('nav.accessAccount'), icon: '🔐' },
      ]
    },
    { to: '/comment-ca-marche', label: t('nav.howItWorks') },
    { to: '/contact', label: t('nav.contact') },
  ];

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="fixed top-0 left-0 right-0 z-[100]">
      {/* Top Bar - hides on scroll */}
      <TopBar scrolled={scrolled} />
      
      {/* Main Nav - Always white background */}
      <nav className="bg-white shadow-lg shadow-gray-900/5 border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-[72px]">
            {/* Logo */}
            <Link to="/" className="flex items-center group flex-shrink-0">
              <div className="relative w-11 h-11 lg:w-12 lg:h-12 rounded-full flex items-center justify-center mr-3 transition-all duration-300 overflow-hidden border-2 border-gray-200 shadow-sm">
                <img 
                  src="https://flagcdn.com/w80/cd.png" 
                  alt="DRC Flag"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center">
                  <span className="text-xl lg:text-2xl font-bold tracking-tight text-gray-900">
                    Tax Free
                  </span>
                  <span className="text-xl lg:text-2xl font-light ml-1.5 text-blue-600">
                    RDC
                  </span>
                </div>
                <div className="flex items-center">
                  <SparklesIcon className="w-3 h-3 mr-1 text-blue-500/70" />
                  <span className="text-[10px] font-semibold tracking-widest uppercase text-gray-400">
                    Détaxe officielle
                  </span>
                </div>
              </div>
            </Link>
            
            {/* Desktop Navigation */}
            <div className="hidden lg:flex items-center">
              {navLinks.map((link) => (
                <div key={link.to} className="relative">
                  {link.dropdown ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveDropdown(activeDropdown === link.to ? null : link.to);
                      }}
                      className={`flex items-center px-4 py-2.5 rounded-xl font-medium transition-all duration-200 mx-0.5 ${
                        isActive(link.to) || activeDropdown === link.to
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {link.label}
                      <ChevronDownIcon className={`w-4 h-4 ml-1.5 transition-transform duration-200 ${activeDropdown === link.to ? 'rotate-180' : ''}`} />
                    </button>
                  ) : (
                    <Link
                      to={link.to}
                      className={`relative px-4 py-2.5 rounded-xl font-medium transition-all duration-200 mx-0.5 block ${
                        isActive(link.to)
                          ? 'text-blue-600 bg-blue-50'
                          : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      {link.label}
                      {isActive(link.to) && (
                        <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-blue-600" />
                      )}
                    </Link>
                  )}
                  
                  {/* Enhanced Dropdown Menu */}
                  {link.dropdown && (
                    <div className={`absolute left-1/2 -translate-x-1/2 top-full pt-3 transition-all duration-200 ${
                      activeDropdown === link.to ? 'opacity-100 visible translate-y-0' : 'opacity-0 invisible -translate-y-2 pointer-events-none'
                    }`}>
                      {/* Arrow */}
                      <div className="absolute top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-white rotate-45 border-l border-t border-gray-100 rounded-tl-sm" />
                      <div className="relative bg-white rounded-2xl shadow-2xl shadow-gray-900/10 border border-gray-100 py-2 min-w-[300px] overflow-hidden">
                        {link.dropdown.map((item, idx) => (
                          <Link
                            key={item.to}
                            to={item.to}
                            className={`flex items-center px-4 py-3 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 transition-all group ${
                              idx !== link.dropdown!.length - 1 ? 'border-b border-gray-50' : ''
                            }`}
                          >
                            <div className="w-10 h-10 rounded-xl bg-gray-100 group-hover:bg-white group-hover:shadow-md flex items-center justify-center mr-3 transition-all text-lg">
                              {item.icon}
                            </div>
                            <div className="flex-1">
                              <div className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{item.label}</div>
                              <div className="text-sm text-gray-500">{item.desc}</div>
                            </div>
                            <ArrowRightIcon className="w-4 h-4 text-gray-300 group-hover:text-blue-500 group-hover:translate-x-1 transition-all" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Desktop Actions */}
            <div className="hidden lg:flex items-center space-x-2">
              <Link 
                to="/status" 
                className="flex items-center px-4 py-2.5 rounded-xl font-medium transition-all duration-200 group text-gray-600 hover:text-blue-600 hover:bg-blue-50"
              >
                <MagnifyingGlassIcon className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                {t('common.follow')}
              </Link>
              <div className="w-px h-6 bg-gray-200 mx-1" />
              <Link 
                to="/login" 
                className="relative flex items-center px-6 py-2.5 rounded-xl font-semibold transition-all duration-300 overflow-hidden group bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:shadow-xl hover:shadow-blue-600/30"
              >
                <span className="relative z-10 flex items-center">
                  <UserCircleIcon className="w-5 h-5 mr-2" />
                  {t('common.login')}
                </span>
                {/* Hover shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
              </Link>
            </div>

            {/* Mobile Actions - Language + Menu */}
            <div className="lg:hidden flex items-center gap-2">
              {/* Mobile Language Selector */}
              <MobileLanguageSelector />
              
              {/* Mobile menu button */}
              <button 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="p-2 rounded-lg transition-colors text-gray-700 hover:bg-gray-100"
                aria-label="Menu"
              >
                {mobileMenuOpen ? (
                  <XMarkIcon className="w-6 h-6" />
                ) : (
                  <Bars3Icon className="w-6 h-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile menu */}
        <div className={`lg:hidden transition-all duration-300 ease-in-out ${
          mobileMenuOpen ? 'max-h-[calc(100vh-4rem)] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
        }`}>
          <div className="bg-white border-t shadow-xl">
            <div className="max-w-7xl mx-auto px-4 py-4 space-y-1">
              {navLinks.map((link) => (
                <div key={link.to}>
                  {link.dropdown ? (
                    <>
                      <button
                        onClick={() => setActiveDropdown(activeDropdown === link.to ? null : link.to)}
                        className={`w-full flex items-center justify-between px-4 py-3 rounded-xl font-medium transition-colors ${
                          isActive(link.to) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {link.label}
                        <ChevronDownIcon className={`w-5 h-5 transition-transform ${activeDropdown === link.to ? 'rotate-180' : ''}`} />
                      </button>
                      <div className={`overflow-hidden transition-all duration-200 ${
                        activeDropdown === link.to ? 'max-h-96' : 'max-h-0'
                      }`}>
                        <div className="pl-4 py-2 space-y-1">
                          {link.dropdown.map((item) => (
                            <Link
                              key={item.to}
                              to={item.to}
                              className="block px-4 py-2.5 rounded-lg text-gray-600 hover:bg-gray-50 hover:text-blue-600"
                            >
                              <div className="font-medium">{item.label}</div>
                              <div className="text-sm text-gray-400">{item.desc}</div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    </>
                  ) : (
                    <Link
                      to={link.to}
                      className={`block px-4 py-3 rounded-xl font-medium transition-colors ${
                        isActive(link.to) ? 'bg-blue-50 text-blue-600' : 'text-gray-700 hover:bg-gray-50'
                      }`}
                    >
                      {link.label}
                    </Link>
                  )}
                </div>
              ))}
              
              {/* Mobile CTA buttons */}
              <div className="pt-4 mt-4 border-t border-gray-100 space-y-3">
                <Link 
                  to="/status" 
                  className="flex items-center justify-center px-4 py-3 rounded-xl font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                >
                  <MagnifyingGlassIcon className="w-5 h-5 mr-2" />
                  {t('nav.trackRefund')}
                </Link>
                <Link 
                  to="/login" 
                  className="flex items-center justify-center px-4 py-3 rounded-xl font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 transition-colors"
                >
                  <UserCircleIcon className="w-5 h-5 mr-2" />
                  {t('common.login')}
                </Link>
              </div>
              
              {/* Mobile contact info */}
              <div className="pt-4 mt-4 border-t border-gray-100">
                <div className="flex items-center justify-center space-x-6 text-sm text-gray-500">
                  <a href="tel:+243812345678" className="flex items-center hover:text-blue-600">
                    <PhoneIcon className="w-4 h-4 mr-1" />
                    {t('common.phone')}
                  </a>
                  <a href="mailto:contact@taxfree.cd" className="flex items-center hover:text-blue-600">
                    <EnvelopeIcon className="w-4 h-4 mr-1" />
                    {t('common.email')}
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}

// Shared Footer for all public pages
function Footer() {
  const { t } = useTranslation();
  
  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center mr-3">
                <BanknotesIcon className="w-7 h-7 text-white" />
              </div>
              <span className="text-xl font-bold text-white">Tax Free RDC</span>
            </div>
            <p className="text-gray-400 text-sm">
              {t('footer.description')}
            </p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">{t('footer.quickLinks')}</h4>
            <div className="space-y-2 text-sm">
              <Link to="/status" className="block hover:text-white transition-colors">{t('nav.checkStatus')}</Link>
              <Link to="/login" className="block hover:text-white transition-colors">{t('nav.merchantPortal')}</Link>
              <Link to="/comment-ca-marche" className="block hover:text-white transition-colors">{t('nav.howItWorks')}</Link>
              <Link to="/contact" className="block hover:text-white transition-colors">{t('nav.contact')}</Link>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">{t('footer.legal')}</h4>
            <div className="space-y-2 text-sm">
              <a href="#" className="block hover:text-white transition-colors">{t('footer.terms')}</a>
              <a href="#" className="block hover:text-white transition-colors">{t('footer.privacy')}</a>
              <a href="#" className="block hover:text-white transition-colors">{t('footer.legal')}</a>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-4">{t('nav.contact')}</h4>
            <div className="space-y-3 text-sm">
              <div className="flex items-center">
                <PhoneIcon className="w-5 h-5 mr-2 text-blue-400" />
                +243 81 234 5678
              </div>
              <div className="flex items-center">
                <EnvelopeIcon className="w-5 h-5 mr-2 text-blue-400" />
                contact@taxfree.cd
              </div>
              <div className="flex items-center">
                <MapPinIcon className="w-5 h-5 mr-2 text-blue-400" />
                Kinshasa, RDC
              </div>
            </div>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-12 pt-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-gray-500">
              © {new Date().getFullYear()} Tax Free RDC. {t('footer.copyright')}
            </p>
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>{t('footer.developedBy', 'Développé par')}</span>
              <a 
                href="https://netgoconsulting.tech" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 font-medium transition-colors"
              >
                Netgo Consulting
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

// Main Public Layout Component
export default function PublicLayout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Navigation />
      {/* Add padding-top to account for fixed header */}
      {/* pt-16 on mobile (nav only), pt-[108px] on lg (topbar 36px + nav 72px) */}
      <main className="pt-16 lg:pt-[108px]">
        <Outlet />
      </main>
      <Footer />
      
      {/* Floating Components */}
      <ScrollToTop />
      <ChatBot />
      <CookieConsent />
    </div>
  );
}
