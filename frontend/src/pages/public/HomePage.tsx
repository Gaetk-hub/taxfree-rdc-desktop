import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import FadeIn from '../../components/ui/FadeIn';
import { 
  ShieldCheckIcon, BanknotesIcon, ClockIcon, MapPinIcon, CheckCircleIcon,
  ArrowRightIcon, BuildingStorefrontIcon, UserGroupIcon, DocumentTextIcon,
  GlobeAltIcon, ChevronDownIcon, DevicePhoneMobileIcon, 
  StarIcon, ChevronLeftIcon, ChevronRightIcon
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
      <div className="flex flex-col lg:flex-row min-h-[calc(95vh-108px)]">
        {/* Left Content - Blue background */}
        <div className="relative z-10 w-full lg:w-1/2 flex items-center px-6 sm:px-12 lg:px-16 xl:px-24 py-16 lg:py-24">
          <div className="max-w-lg">
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.1] mb-6 text-white">
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
            <p className="text-base sm:text-lg text-blue-100 mb-10 leading-relaxed">
              {t('hero.description')}
            </p>
            
            {/* CTA Buttons - GlobalBlue style */}
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
          </div>
        </div>
        
        {/* Right Image Carousel - Curved left edge like GlobalBlue */}
        <div className="relative w-full lg:w-[55%] lg:absolute lg:right-0 lg:top-0 lg:h-full bg-blue-600">
          {/* SVG for clip path definition */}
          <svg className="absolute" width="0" height="0">
            <defs>
              <clipPath id="curvedEdge" clipPathUnits="objectBoundingBox">
                <path d="M 0.15 0 C 0 0.3, 0 0.7, 0.15 1 L 1 1 L 1 0 Z" />
              </clipPath>
            </defs>
          </svg>
          
          <div 
            className="h-[300px] sm:h-[400px] lg:h-full w-full overflow-hidden"
            style={{ clipPath: 'url(#curvedEdge)' }}
          >
            {heroImages.map((img, index) => (
              <img 
                key={index}
                src={img} 
                alt={`Hero ${index + 1}`}
                className={`absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-1000 ${
                  index === currentImage ? 'opacity-100' : 'opacity-0'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
      
      {/* Decorative curves at bottom */}
      <div className="absolute bottom-0 left-0 right-0 z-20">
        <svg viewBox="0 0 1440 60" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full">
          <path d="M0 60V40C240 60 480 20 720 20C960 20 1200 60 1440 40V60H0Z" fill="rgba(255,255,255,0.1)" />
          <path d="M0 60V45C240 60 480 30 720 30C960 30 1200 60 1440 45V60H0Z" fill="rgba(255,255,255,0.15)" />
          <path d="M0 60V50C240 60 480 40 720 40C960 40 1200 60 1440 50V60H0Z" fill="white" />
        </svg>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const { t } = useTranslation();
  
  const steps = [
    { icon: BuildingStorefrontIcon, title: t('howItWorks.step1.title'), desc: t('howItWorks.step1.description'), color: 'from-blue-500 to-blue-600' },
    { icon: DocumentTextIcon, title: t('howItWorks.step2.title'), desc: t('howItWorks.step2.description'), color: 'from-indigo-500 to-indigo-600' },
    { icon: ShieldCheckIcon, title: t('howItWorks.step3.title'), desc: t('howItWorks.step3.description'), color: 'from-purple-500 to-purple-600' },
    { icon: BanknotesIcon, title: t('howItWorks.step4.title'), desc: t('howItWorks.step4.description'), color: 'from-green-500 to-green-600' },
  ];
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">{t('howItWorks.subtitle')}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('howItWorks.title')}</h2>
          <p className="text-xl text-gray-600">{t('howItWorks.description')}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-8 hover:shadow-xl transition-all transform hover:-translate-y-2">
              <div className={`w-16 h-16 bg-gradient-to-br ${step.color} rounded-2xl flex items-center justify-center mb-6 shadow-lg`}>
                <step.icon className="w-8 h-8 text-white" />
              </div>
              <div className="text-sm font-bold text-gray-400 mb-2">ÉTAPE 0{i + 1}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const { t } = useTranslation();
  
  const benefits = [
    { icon: BanknotesIcon, title: t('benefits.save16'), desc: t('benefits.save16Desc') },
    { icon: ClockIcon, title: t('benefits.expressRefund'), desc: t('benefits.expressRefundDesc') },
    { icon: DevicePhoneMobileIcon, title: t('benefits.digital'), desc: t('benefits.digitalDesc') },
    { icon: GlobeAltIcon, title: t('benefits.multiCurrency'), desc: t('benefits.multiCurrencyDesc') },
    { icon: ShieldCheckIcon, title: t('benefits.secure'), desc: t('benefits.secureDesc') },
    { icon: MapPinIcon, title: t('benefits.everywhere'), desc: t('benefits.everywhereDesc') },
  ];
  return (
    <section className="py-24 bg-gradient-to-br from-gray-50 to-blue-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">{t('benefits.subtitle')}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">{t('benefits.title')}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {benefits.map((b, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-all">
              <div className="flex items-start space-x-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                  <b.icon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{b.title}</h3>
                  <p className="text-gray-600 text-sm">{b.desc}</p>
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
  return (
    <section className="py-24 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div>
            <span className="inline-block px-4 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium mb-4">{t('calculator.subtitle')}</span>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">{t('calculator.title')}</h2>
            <p className="text-xl text-gray-600 mb-8">{t('calculator.description')}</p>
            <div className="space-y-4">
              {[t('calculator.vatRate'), t('calculator.serviceFee'), t('calculator.minimum')].map((text, i) => (
                <div key={i} className="flex items-center space-x-4 text-gray-600">
                  <CheckCircleIcon className="w-6 h-6 text-green-500" /><span>{text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
                <BanknotesIcon className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900">{t('calculator.simulator')}</h3>
            </div>
            <div className="mb-8">
              <label className="block text-sm font-medium text-gray-700 mb-2">{t('calculator.amount')}</label>
              <input type="range" min="50000" max="5000000" step="10000" value={amount} onChange={(e) => setAmount(Number(e.target.value))} className="w-full h-2 bg-gray-200 rounded-lg cursor-pointer accent-blue-600" />
              <div className="text-center text-2xl font-bold text-gray-900 mt-2">{amount.toLocaleString()} CDF</div>
            </div>
            <div className="space-y-4 mb-6">
              <div className="flex justify-between py-3 border-b"><span className="text-gray-600">{t('calculator.vat')}</span><span className="font-semibold">{Math.round(vat).toLocaleString()} CDF</span></div>
              <div className="flex justify-between py-3 border-b"><span className="text-gray-600">{t('calculator.fee')}</span><span className="text-red-500">-{Math.round(fee).toLocaleString()} CDF</span></div>
            </div>
            <div className="bg-green-50 rounded-2xl p-6 border border-green-100">
              <div className="flex justify-between items-center">
                <span className="font-bold text-green-800">{t('calculator.refund')}</span>
                <span className="text-3xl font-bold text-green-600">{Math.round(refund).toLocaleString()} CDF</span>
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
