import { Link } from 'react-router-dom';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  PhoneIcon, EnvelopeIcon, MapPinIcon, ClockIcon,
  ChatBubbleLeftRightIcon, BuildingOfficeIcon, QuestionMarkCircleIcon
} from '@heroicons/react/24/outline';

function HeroSection() {
  const { t } = useTranslation();
  
  return (
    <section className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-block px-4 py-1 bg-white/20 rounded-full text-sm font-medium mb-6">{t('contact.pageTitle')}</span>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">{t('contact.heroTitle')}</h1>
        <p className="text-xl text-blue-100 max-w-2xl mx-auto">{t('contact.heroDescription')}</p>
      </div>
    </section>
  );
}

function ContactInfoSection() {
  const { t } = useTranslation();
  
  const contacts = [
    { icon: PhoneIcon, title: t('contact.phone'), info: '+243 81 234 5678', sub: t('contact.monFri'), action: 'tel:+243812345678', actionText: t('contact.call') },
    { icon: EnvelopeIcon, title: t('contact.email'), info: 'contact@taxfree.cd', sub: t('contact.responseIn24h'), action: 'mailto:contact@taxfree.cd', actionText: t('contact.sendEmail') },
    { icon: ChatBubbleLeftRightIcon, title: t('contact.whatsapp'), info: '+243 81 234 5678', sub: t('contact.available247'), action: 'https://wa.me/243812345678', actionText: t('contact.chat') },
    { icon: MapPinIcon, title: t('contact.address'), info: 'Avenue du Commerce, 123', sub: 'Kinshasa, Gombe', action: '#map', actionText: t('contact.viewOnMap') },
  ];
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {contacts.map((c, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-6 text-center hover:shadow-lg transition-shadow">
              <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mx-auto mb-4"><c.icon className="w-7 h-7 text-blue-600" /></div>
              <h3 className="font-bold text-gray-900 mb-1">{c.title}</h3>
              <p className="text-gray-900 font-medium">{c.info}</p>
              <p className="text-gray-500 text-sm mb-4">{c.sub}</p>
              <a href={c.action} className="text-blue-600 font-medium hover:text-blue-700 text-sm">{c.actionText} →</a>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function ContactFormSection() {
  const { t } = useTranslation();
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-12">
          <div>
            <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">{t('contact.form.subtitle')}</span>
            <h2 className="text-3xl font-bold text-gray-900 mb-4">{t('contact.form.title')}</h2>
            <p className="text-gray-600 mb-8">{t('contact.form.description')}</p>
            <div className="space-y-6">
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center flex-shrink-0"><ClockIcon className="w-5 h-5 text-green-600" /></div>
                <div><h4 className="font-semibold text-gray-900">{t('contact.form.fastResponse')}</h4><p className="text-gray-600 text-sm">{t('contact.form.fastResponseDesc')}</p></div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0"><QuestionMarkCircleIcon className="w-5 h-5 text-blue-600" /></div>
                <div><h4 className="font-semibold text-gray-900">{t('contact.form.multilingualSupport')}</h4><p className="text-gray-600 text-sm">{t('contact.form.multilingualSupportDesc')}</p></div>
              </div>
              <div className="flex items-start space-x-4">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0"><BuildingOfficeIcon className="w-5 h-5 text-purple-600" /></div>
                <div><h4 className="font-semibold text-gray-900">{t('contact.form.officesInDRC')}</h4><p className="text-gray-600 text-sm">{t('contact.form.officesInDRCDesc')}</p></div>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-2xl shadow-xl p-8">
            {submitted ? (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{t('contact.form.messageSent')}</h3>
                <p className="text-gray-600 mb-6">{t('contact.form.messageSentDesc')}</p>
                <button onClick={() => setSubmitted(false)} className="text-blue-600 font-medium">{t('contact.form.sendAnother')}</button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.form.name')}</label>
                    <input type="text" required value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={t('contact.form.namePlaceholder')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.form.email')}</label>
                    <input type="email" required value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={t('contact.form.emailPlaceholder')} />
                  </div>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.form.phone')}</label>
                    <input type="tel" value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500" placeholder={t('contact.form.phonePlaceholder')} />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.form.subject')}</label>
                    <select required value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                      <option value="">{t('contact.form.selectSubject')}</option>
                      <option value="remboursement">{t('contact.form.subjectRefund')}</option>
                      <option value="partenariat">{t('contact.form.subjectPartnership')}</option>
                      <option value="technique">{t('contact.form.subjectTechnical')}</option>
                      <option value="autre">{t('contact.form.subjectOther')}</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('contact.form.message')}</label>
                  <textarea required rows={5} value={formData.message} onChange={(e) => setFormData({...formData, message: e.target.value})} className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" placeholder={t('contact.form.messagePlaceholder')} />
                </div>
                <button type="submit" className="w-full py-4 bg-blue-600 text-white font-semibold rounded-xl hover:bg-blue-700 transition-colors">{t('contact.form.submit')}</button>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function OfficesSection() {
  const { t } = useTranslation();
  
  const offices = [
    { city: 'Kinshasa', address: 'Avenue du Commerce, 123, Gombe', phone: '+243 81 234 5678', email: 'kinshasa@taxfree.cd' },
    { city: 'Lubumbashi', address: 'Avenue Lumumba, 45, Centre-ville', phone: '+243 81 234 5679', email: 'lubumbashi@taxfree.cd' },
    { city: 'Goma', address: 'Boulevard du Lac, 12', phone: '+243 81 234 5680', email: 'goma@taxfree.cd' },
  ];
  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">{t('contact.offices.subtitle')}</span>
          <h2 className="text-3xl font-bold text-gray-900">{t('contact.offices.title')}</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {offices.map((office, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-6">
              <h3 className="text-xl font-bold text-gray-900 mb-4">{office.city}</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start"><MapPinIcon className="w-5 h-5 text-gray-400 mr-3 flex-shrink-0 mt-0.5" /><span className="text-gray-600">{office.address}</span></div>
                <div className="flex items-center"><PhoneIcon className="w-5 h-5 text-gray-400 mr-3" /><a href={`tel:${office.phone}`} className="text-blue-600 hover:text-blue-700">{office.phone}</a></div>
                <div className="flex items-center"><EnvelopeIcon className="w-5 h-5 text-gray-400 mr-3" /><a href={`mailto:${office.email}`} className="text-blue-600 hover:text-blue-700">{office.email}</a></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQQuickSection() {
  const { t } = useTranslation();
  
  const faqs = [
    { q: t('contact.quickFaq.q1'), a: t('contact.quickFaq.a1') },
    { q: t('contact.quickFaq.q2'), a: t('contact.quickFaq.a2') },
    { q: t('contact.quickFaq.q3'), a: t('contact.quickFaq.a3') },
  ];
  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8"><h2 className="text-2xl font-bold text-gray-900">{t('contact.quickFaq.title')}</h2></div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-semibold text-gray-900 mb-2">{faq.q}</h3>
              <p className="text-gray-600 text-sm">{faq.a}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8"><Link to="/comment-ca-marche" className="text-blue-600 font-medium hover:text-blue-700">{t('contact.quickFaq.viewAllFaq')} →</Link></div>
      </div>
    </section>
  );
}

export default function ContactPage() {
  return (
    <>
      <HeroSection />
      <ContactInfoSection />
      <ContactFormSection />
      <OfficesSection />
      <FAQQuickSection />
    </>
  );
}
