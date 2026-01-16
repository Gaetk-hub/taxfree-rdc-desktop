import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  CheckCircleIcon, BuildingStorefrontIcon, UserGroupIcon,
  PhoneIcon, ShieldCheckIcon, GlobeAltIcon, DeviceTabletIcon,
  ArrowTrendingUpIcon, StarIcon
} from '@heroicons/react/24/outline';

function HeroSection() {
  const { t } = useTranslation();
  
  return (
    <section className="bg-gradient-to-br from-indigo-600 via-blue-600 to-blue-700 text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-4 py-1 bg-white/20 rounded-full text-sm font-medium mb-6">{t('merchants.forMerchants')}</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">{t('merchants.heroTitle')}</h1>
            <p className="text-xl text-blue-100 mb-8">{t('merchants.heroDescription')}</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/contact" className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded-xl transition-all">{t('merchants.becomePartner')}</Link>
              <Link to="/login" className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/30">{t('merchants.merchantPortal')}</Link>
            </div>
          </div>
          <div className="hidden lg:block">
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
              <h3 className="text-2xl font-bold mb-6 text-center">{t('merchants.ourResults')}</h3>
              <div className="grid grid-cols-2 gap-6">
                {[{ val: '500+', label: t('merchants.partnerMerchants') }, { val: '+30%', label: t('merchants.averageBasket') }, { val: '50K+', label: t('merchants.formsProcessed') }, { val: '98%', label: t('merchants.satisfaction') }].map((s, i) => (
                  <div key={i} className="text-center p-4 bg-white/5 rounded-xl">
                    <div className="text-3xl font-bold text-yellow-400">{s.val}</div>
                    <div className="text-blue-200 text-sm">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BenefitsSection() {
  const { t } = useTranslation();
  
  const benefits = [
    { icon: ArrowTrendingUpIcon, title: t('merchants.benefits.increaseSales'), desc: t('merchants.benefits.increaseSalesDesc') },
    { icon: UserGroupIcon, title: t('merchants.benefits.attractCustomers'), desc: t('merchants.benefits.attractCustomersDesc') },
    { icon: GlobeAltIcon, title: t('merchants.benefits.internationalVisibility'), desc: t('merchants.benefits.internationalVisibilityDesc') },
    { icon: ShieldCheckIcon, title: t('merchants.benefits.compliance'), desc: t('merchants.benefits.complianceDesc') },
    { icon: DeviceTabletIcon, title: t('merchants.benefits.simpleInterface'), desc: t('merchants.benefits.simpleInterfaceDesc') },
    { icon: PhoneIcon, title: t('merchants.benefits.dedicatedSupport'), desc: t('merchants.benefits.dedicatedSupportDesc') },
  ];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">{t('merchants.benefits.subtitle')}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('merchants.benefits.title')}</h2>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {benefits.map((b, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-4"><b.icon className="w-7 h-7 text-blue-600" /></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{b.title}</h3>
              <p className="text-gray-600">{b.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function HowItWorksSection() {
  const { t } = useTranslation();
  
  const steps = [
    { num: '1', title: t('merchants.howToJoin.step1'), desc: t('merchants.howToJoin.step1Desc') },
    { num: '2', title: t('merchants.howToJoin.step2'), desc: t('merchants.howToJoin.step2Desc') },
    { num: '3', title: t('merchants.howToJoin.step3'), desc: t('merchants.howToJoin.step3Desc') },
    { num: '4', title: t('merchants.howToJoin.step4'), desc: t('merchants.howToJoin.step4Desc') },
  ];
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">{t('merchants.howToJoin.subtitle')}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('merchants.howToJoin.title')}</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="text-center">
              <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mx-auto mb-4">{step.num}</div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-gray-600">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingSection() {
  const { t } = useTranslation();
  
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium mb-4">{t('merchants.pricing.subtitle')}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('merchants.pricing.title')}</h2>
        </div>
        <div className="max-w-3xl mx-auto">
          <div className="bg-gradient-to-br from-blue-600 to-indigo-600 rounded-3xl p-8 md:p-12 text-white">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-4">{t('merchants.pricing.partnerOffer')}</h3>
                <ul className="space-y-3">
                  {[t('merchants.pricing.freeRegistration'), t('merchants.pricing.trainingIncluded'), t('merchants.pricing.support247'), t('merchants.pricing.marketingMaterial'), t('merchants.pricing.dashboard'), t('merchants.pricing.monthlyReports')].map((f, i) => (
                    <li key={i} className="flex items-center"><CheckCircleIcon className="w-5 h-5 text-green-400 mr-2" />{f}</li>
                  ))}
                </ul>
              </div>
              <div className="text-center bg-white/10 rounded-2xl p-6">
                <div className="text-sm text-blue-200 mb-2">{t('merchants.pricing.commissionPerForm')}</div>
                <div className="text-5xl font-bold mb-2">0%</div>
                <div className="text-blue-200 text-sm mb-4">{t('merchants.pricing.forMerchant')}</div>
                <p className="text-sm text-blue-200">{t('merchants.pricing.feeExplanation')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TestimonialsSection() {
  const { t } = useTranslation();
  
  const testimonials = [
    { name: 'Boutique Luxe Kinshasa', person: 'Jean-Pierre M.', text: 'Depuis que nous sommes partenaires Tax Free, nos ventes aux touristes ont augmenté de 40%.', rating: 5 },
    { name: 'Galerie Art Africain', person: 'Marie K.', text: 'L\'interface est très simple. Mes employés ont appris à créer des bordereaux en 10 minutes.', rating: 5 },
    { name: 'Tech Store Lubumbashi', person: 'Patrick N.', text: 'Le support est excellent. Ils répondent toujours rapidement à nos questions.', rating: 5 },
  ];
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">{t('merchants.testimonials.subtitle')}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('merchants.testimonials.title')}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {testimonials.map((item, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-lg">
              <div className="flex mb-4">{[...Array(item.rating)].map((_, j) => <StarIcon key={j} className="w-5 h-5 text-yellow-400 fill-yellow-400" />)}</div>
              <p className="text-gray-700 mb-4">"{item.text}"</p>
              <div className="border-t pt-4">
                <div className="font-bold text-gray-900">{item.name}</div>
                <div className="text-gray-500 text-sm">{item.person}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { t } = useTranslation();
  
  return (
    <section className="py-20 bg-gradient-to-r from-indigo-600 to-blue-600 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('merchants.cta.title')}</h2>
        <p className="text-xl text-blue-100 mb-8">{t('merchants.cta.description')}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/contact" className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-100">
            <BuildingStorefrontIcon className="w-5 h-5 inline mr-2" />{t('merchants.cta.becomePartner')}
          </Link>
          <a href="tel:+243812345678" className="px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20">
            <PhoneIcon className="w-5 h-5 inline mr-2" />+243 81 234 5678
          </a>
        </div>
      </div>
    </section>
  );
}

export default function CommercantPage() {
  return (
    <>
      <HeroSection />
      <BenefitsSection />
      <HowItWorksSection />
      <PricingSection />
      <TestimonialsSection />
      <CTASection />
    </>
  );
}
