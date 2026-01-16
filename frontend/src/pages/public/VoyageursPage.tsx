import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  BanknotesIcon, ClockIcon, CheckCircleIcon, DocumentTextIcon, DevicePhoneMobileIcon,
  CreditCardIcon, BuildingLibraryIcon, QrCodeIcon, IdentificationIcon,
  PaperAirplaneIcon, ShoppingBagIcon, ReceiptPercentIcon
} from '@heroicons/react/24/outline';

function HeroSection() {
  const { t } = useTranslation();
  
  return (
    <section className="bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="inline-block px-4 py-1 bg-white/20 rounded-full text-sm font-medium mb-6">{t('travelers.forTravelers')}</span>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">{t('travelers.heroTitle')}</h1>
            <p className="text-xl text-blue-100 mb-8">{t('travelers.heroDescription')}</p>
            <div className="flex flex-wrap gap-4">
              <Link to="/status" className="px-8 py-4 bg-yellow-500 hover:bg-yellow-400 text-gray-900 font-semibold rounded-xl transition-all">{t('travelers.checkRefund')}</Link>
              <Link to="/comment-ca-marche" className="px-8 py-4 bg-white/10 hover:bg-white/20 text-white font-semibold rounded-xl border border-white/30">{t('travelers.howItWorks')}</Link>
            </div>
          </div>
          <div className="hidden lg:flex justify-center">
            <div className="relative">
              <div className="absolute -top-4 -left-4 w-72 h-72 bg-yellow-400/20 rounded-full blur-3xl"></div>
              <div className="relative bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20">
                <div className="text-center mb-6">
                  <ReceiptPercentIcon className="w-16 h-16 mx-auto text-yellow-400 mb-4" />
                  <h3 className="text-2xl font-bold">{t('travelers.quickSimulation')}</h3>
                </div>
                <div className="space-y-4">
                  <div className="flex justify-between py-3 border-b border-white/20"><span className="text-blue-200">{t('travelers.purchaseOf')}</span><span className="font-bold">500,000 CDF</span></div>
                  <div className="flex justify-between py-3 border-b border-white/20"><span className="text-blue-200">{t('travelers.recoverableVat')}</span><span className="font-bold">68,965 CDF</span></div>
                  <div className="flex justify-between py-3 border-b border-white/20"><span className="text-blue-200">{t('travelers.serviceFee')}</span><span className="font-bold">-10,345 CDF</span></div>
                  <div className="flex justify-between py-4 bg-green-500/20 rounded-xl px-4 -mx-4"><span className="font-bold">{t('travelers.youReceive')}</span><span className="text-2xl font-bold text-green-400">58,620 CDF</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function EligibilitySection() {
  const { t } = useTranslation();
  
  const criteria = [
    { icon: IdentificationIcon, title: t('travelers.eligibility.nonResident'), desc: t('travelers.eligibility.nonResidentDesc') },
    { icon: DocumentTextIcon, title: t('travelers.eligibility.validPassport'), desc: t('travelers.eligibility.validPassportDesc') },
    { icon: ShoppingBagIcon, title: t('travelers.eligibility.minPurchase'), desc: t('travelers.eligibility.minPurchaseDesc') },
    { icon: PaperAirplaneIcon, title: t('travelers.eligibility.exitIn3Months'), desc: t('travelers.eligibility.exitIn3MonthsDesc') },
  ];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">{t('travelers.eligibility.subtitle')}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('travelers.eligibility.title')}</h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">{t('travelers.eligibility.description')}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {criteria.map((item, i) => (
            <div key={i} className="text-center p-6 rounded-2xl bg-gray-50 hover:bg-blue-50 transition-colors">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><item.icon className="w-8 h-8 text-blue-600" /></div>
              <h3 className="font-bold text-gray-900 mb-2">{item.title}</h3>
              <p className="text-gray-600 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ProcessSection() {
  const { t } = useTranslation();
  
  const steps = [
    { num: '1', title: t('travelers.process.buy'), desc: t('travelers.process.buyDesc'), icon: ShoppingBagIcon },
    { num: '2', title: t('travelers.process.keep'), desc: t('travelers.process.keepDesc'), icon: DocumentTextIcon },
    { num: '3', title: t('travelers.process.validate'), desc: t('travelers.process.validateDesc'), icon: QrCodeIcon },
    { num: '4', title: t('travelers.process.receive'), desc: t('travelers.process.receiveDesc'), icon: BanknotesIcon },
  ];
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">{t('travelers.process.subtitle')}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('travelers.process.title')}</h2>
        </div>
        <div className="grid md:grid-cols-4 gap-8">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              {i < 3 && <div className="hidden md:block absolute top-8 left-1/2 w-full h-0.5 bg-blue-200"></div>}
              <div className="relative bg-white rounded-2xl p-6 shadow-lg hover:shadow-xl transition-shadow">
                <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl mb-4">{step.num}</div>
                <step.icon className="w-10 h-10 text-blue-600 mb-4" />
                <h3 className="text-xl font-bold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function PaymentMethodsSection() {
  const { t } = useTranslation();
  
  const methods = [
    { icon: DevicePhoneMobileIcon, name: t('travelers.payment.mobileMoney'), desc: t('travelers.payment.mobileMoneyDesc'), time: t('common.instant'), popular: true },
    { icon: CreditCardIcon, name: t('travelers.payment.creditCard'), desc: t('travelers.payment.creditCardDesc'), time: t('travelers.payment.time24_48h'), popular: false },
    { icon: BuildingLibraryIcon, name: t('travelers.payment.bankTransfer'), desc: t('travelers.payment.bankTransferDesc'), time: t('travelers.payment.time3_5days'), popular: false },
    { icon: BanknotesIcon, name: t('travelers.payment.cash'), desc: t('travelers.payment.cashDesc'), time: t('common.immediate'), popular: false },
  ];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm font-medium mb-4">{t('travelers.payment.subtitle')}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('travelers.payment.title')}</h2>
          <p className="text-xl text-gray-600">{t('travelers.payment.description')}</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {methods.map((method, i) => (
            <div key={i} className={`relative rounded-2xl p-6 border-2 transition-all hover:shadow-lg ${method.popular ? 'border-blue-500 bg-blue-50' : 'border-gray-200 bg-white'}`}>
              {method.popular && <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-blue-600 text-white text-xs font-medium rounded-full">{t('common.popular')}</span>}
              <method.icon className={`w-12 h-12 mb-4 ${method.popular ? 'text-blue-600' : 'text-gray-600'}`} />
              <h3 className="text-xl font-bold text-gray-900 mb-1">{method.name}</h3>
              <p className="text-gray-600 text-sm mb-4">{method.desc}</p>
              <div className="flex items-center text-sm"><ClockIcon className="w-4 h-4 mr-1 text-green-500" /><span className="text-green-600 font-medium">{method.time}</span></div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ExcludedProductsSection() {
  const { t } = useTranslation();
  
  const excluded = [t('travelers.products.services'), t('travelers.products.food'), t('travelers.products.tobacco'), t('travelers.products.alcohol')];
  const included = [t('travelers.products.clothing'), t('travelers.products.electronics'), t('travelers.products.jewelry'), t('travelers.products.cosmetics'), t('travelers.products.home'), t('travelers.products.souvenirs')];
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">{t('travelers.products.subtitle')}</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">{t('travelers.products.title')}</h2>
        </div>
        <div className="grid md:grid-cols-2 gap-8">
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-xl font-bold text-green-600 mb-6 flex items-center"><CheckCircleIcon className="w-6 h-6 mr-2" /> {t('travelers.products.eligible')}</h3>
            <ul className="space-y-3">{included.map((item, i) => <li key={i} className="flex items-center text-gray-700"><CheckCircleIcon className="w-5 h-5 text-green-500 mr-3 flex-shrink-0" />{item}</li>)}</ul>
          </div>
          <div className="bg-white rounded-2xl p-8 shadow-lg">
            <h3 className="text-xl font-bold text-red-600 mb-6 flex items-center"><span className="w-6 h-6 mr-2 flex items-center justify-center rounded-full bg-red-100 text-red-600 text-sm">✕</span> {t('travelers.products.excluded')}</h3>
            <ul className="space-y-3">{excluded.map((item, i) => <li key={i} className="flex items-center text-gray-700"><span className="w-5 h-5 flex items-center justify-center rounded-full bg-red-100 text-red-500 text-xs mr-3 flex-shrink-0">✕</span>{item}</li>)}</ul>
          </div>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  const { t } = useTranslation();
  
  return (
    <section className="py-20 bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">{t('travelers.cta.title')}</h2>
        <p className="text-xl text-blue-100 mb-8">{t('travelers.cta.description')}</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/status" className="px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-100 transition-all">{t('travelers.cta.checkRefund')}</Link>
          <Link to="/comment-ca-marche" className="px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20">{t('travelers.cta.learnMore')}</Link>
        </div>
      </div>
    </section>
  );
}

export default function VoyageursPage() {
  return (
    <>
      <HeroSection />
      <EligibilitySection />
      <ProcessSection />
      <PaymentMethodsSection />
      <ExcludedProductsSection />
      <CTASection />
    </>
  );
}
