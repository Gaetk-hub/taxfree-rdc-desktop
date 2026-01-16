import { Link } from 'react-router-dom';
import { 
  CheckCircleIcon, BuildingStorefrontIcon, DocumentTextIcon,
  QrCodeIcon, ShieldCheckIcon, DevicePhoneMobileIcon, CreditCardIcon,
  ClockIcon, MapPinIcon, ArrowRightIcon, PlayCircleIcon
} from '@heroicons/react/24/outline';

function HeroSection() {
  return (
    <section className="bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-700 text-white py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <span className="inline-block px-4 py-1 bg-white/20 rounded-full text-sm font-medium mb-6">Guide complet</span>
        <h1 className="text-4xl md:text-5xl font-bold mb-6">Comment fonctionne la détaxe ?</h1>
        <p className="text-xl text-blue-100 max-w-3xl mx-auto mb-8">Découvrez étape par étape comment récupérer la TVA sur vos achats en République Démocratique du Congo.</p>
        <a href="#etapes" className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-semibold rounded-xl hover:bg-gray-100 transition-all">
          <PlayCircleIcon className="w-6 h-6 mr-2" />Voir le processus
        </a>
      </div>
    </section>
  );
}

function StepsSection() {
  const steps = [
    { num: '01', title: 'Faites vos achats', icon: BuildingStorefrontIcon, color: 'from-blue-500 to-blue-600',
      details: ['Repérez le logo "Tax Free" dans les boutiques partenaires', 'Effectuez vos achats (minimum 50,000 CDF par transaction)', 'Au moment du paiement, informez le vendeur que vous souhaitez un bordereau Tax Free', 'Présentez votre passeport étranger valide'],
      tip: 'Astuce : Demandez le bordereau au moment du paiement, pas après !' },
    { num: '02', title: 'Recevez votre bordereau', icon: DocumentTextIcon, color: 'from-indigo-500 to-indigo-600',
      details: ['Le commerçant génère un bordereau électronique avec QR code unique', 'Vérifiez que vos informations personnelles sont correctes', 'Conservez le bordereau (papier ou digital) avec votre facture', 'Vous recevez également une copie par email ou SMS'],
      tip: 'Astuce : Gardez les articles dans leur emballage d\'origine jusqu\'à la validation.' },
    { num: '03', title: 'Validation à la douane', icon: ShieldCheckIcon, color: 'from-purple-500 to-purple-600',
      details: ['Rendez-vous au bureau Tax Free avant le contrôle des passeports', 'Présentez votre bordereau (QR code), passeport et les articles achetés', 'L\'agent scanne le QR code et vérifie les marchandises', 'Validation instantanée en moins de 2 minutes'],
      tip: 'Important : La validation doit être faite AVANT de quitter le territoire !' },
    { num: '04', title: 'Choisissez votre remboursement', icon: CreditCardIcon, color: 'from-green-500 to-green-600',
      details: ['Mobile Money : M-Pesa, Airtel Money, Orange Money (instantané)', 'Carte bancaire : Visa, Mastercard (24-48h)', 'Virement bancaire international (3-5 jours)', 'Espèces au guichet Tax Free (immédiat)'],
      tip: 'Recommandé : Le Mobile Money est le plus rapide et le plus pratique !' },
  ];
  return (
    <section id="etapes" className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-4">Étapes</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Le processus en détail</h2>
        </div>
        <div className="space-y-12">
          {steps.map((step, i) => (
            <div key={i} className={`flex flex-col lg:flex-row gap-8 items-start ${i % 2 === 1 ? 'lg:flex-row-reverse' : ''}`}>
              <div className="lg:w-1/3">
                <div className={`bg-gradient-to-br ${step.color} rounded-3xl p-8 text-white`}>
                  <div className="text-6xl font-bold opacity-30 mb-4">{step.num}</div>
                  <step.icon className="w-16 h-16 mb-4" />
                  <h3 className="text-2xl font-bold">{step.title}</h3>
                </div>
              </div>
              <div className="lg:w-2/3 bg-gray-50 rounded-3xl p-8">
                <ul className="space-y-4 mb-6">
                  {step.details.map((detail, j) => (
                    <li key={j} className="flex items-start"><CheckCircleIcon className="w-6 h-6 text-green-500 mr-3 flex-shrink-0 mt-0.5" /><span className="text-gray-700">{detail}</span></li>
                  ))}
                </ul>
                <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded-r-lg"><p className="text-yellow-800 font-medium">{step.tip}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function TimelineSection() {
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-green-100 text-green-700 rounded-full text-sm font-medium mb-4">Délais</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Combien de temps ça prend ?</h2>
        </div>
        <div className="bg-white rounded-3xl shadow-xl p-8 md:p-12">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { time: '5 min', label: 'Création du bordereau', icon: DocumentTextIcon },
              { time: '2 min', label: 'Validation douanière', icon: QrCodeIcon },
              { time: 'Instantané', label: 'Mobile Money', icon: DevicePhoneMobileIcon },
              { time: '24-48h', label: 'Carte bancaire', icon: CreditCardIcon },
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mx-auto mb-4"><item.icon className="w-8 h-8 text-blue-600" /></div>
                <div className="text-2xl font-bold text-blue-600 mb-1">{item.time}</div>
                <div className="text-gray-600">{item.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-12 pt-8 border-t">
            <div className="flex items-center justify-center space-x-2 text-gray-600">
              <ClockIcon className="w-5 h-5" />
              <span>Validité du bordereau : <strong className="text-gray-900">3 mois</strong> à partir de la date d'achat</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function LocationsSection() {
  const locations = [
    { name: 'Aéroport International de Ndjili', city: 'Kinshasa', type: 'Aéroport', hours: '24h/24, 7j/7', address: 'Terminal International, Zone de départ' },
    { name: 'Aéroport de Lubumbashi', city: 'Lubumbashi', type: 'Aéroport', hours: '6h - 22h', address: 'Terminal Principal' },
    { name: 'Poste Frontalier de Kasumbalesa', city: 'Kasumbalesa', type: 'Frontière', hours: '6h - 18h', address: 'Bureau des douanes' },
    { name: 'Port de Matadi', city: 'Matadi', type: 'Port', hours: '7h - 19h', address: 'Terminal passagers' },
  ];
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <span className="inline-block px-4 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium mb-4">Lieux</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">Où faire valider votre bordereau ?</h2>
          <p className="text-xl text-gray-600">Nos bureaux Tax Free aux points de sortie du territoire</p>
        </div>
        <div className="grid md:grid-cols-2 gap-6">
          {locations.map((loc, i) => (
            <div key={i} className="bg-gray-50 rounded-2xl p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mr-4 flex-shrink-0"><MapPinIcon className="w-6 h-6 text-blue-600" /></div>
                <div className="flex-1">
                  <div className="flex items-center mb-2">
                    <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full mr-2">{loc.type}</span>
                    <span className="text-xs text-gray-500">{loc.city}</span>
                  </div>
                  <h3 className="text-lg font-bold text-gray-900 mb-1">{loc.name}</h3>
                  <p className="text-gray-600 text-sm mb-2">{loc.address}</p>
                  <div className="flex items-center text-sm text-green-600"><ClockIcon className="w-4 h-4 mr-1" />{loc.hours}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function FAQSection() {
  const faqs = [
    { q: 'Dois-je payer quelque chose au commerçant ?', a: 'Non, le bordereau Tax Free est gratuit. Les frais de service (15% de la TVA) sont déduits de votre remboursement.' },
    { q: 'Que faire si j\'oublie de valider à la douane ?', a: 'Sans validation douanière, le remboursement n\'est pas possible. Assurez-vous de passer au bureau Tax Free avant le contrôle des passeports.' },
    { q: 'Puis-je utiliser les articles avant la validation ?', a: 'Oui, mais vous devez pouvoir les présenter à la douane. Gardez les emballages et étiquettes si possible.' },
    { q: 'Comment suivre mon remboursement ?', a: 'Utilisez notre page "Suivre mon remboursement" avec votre numéro de bordereau ou de passeport.' },
  ];
  return (
    <section className="py-20 bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <span className="inline-block px-4 py-1 bg-orange-100 text-orange-700 rounded-full text-sm font-medium mb-4">FAQ</span>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">Questions fréquentes</h2>
        </div>
        <div className="space-y-4">
          {faqs.map((faq, i) => (
            <div key={i} className="bg-white rounded-2xl p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 mb-2">{faq.q}</h3>
              <p className="text-gray-600">{faq.a}</p>
            </div>
          ))}
        </div>
        <div className="text-center mt-8">
          <Link to="/contact" className="text-blue-600 font-medium hover:text-blue-700 flex items-center justify-center">
            Plus de questions ? Contactez-nous <ArrowRightIcon className="w-4 h-4 ml-2" />
          </Link>
        </div>
      </div>
    </section>
  );
}

function CTASection() {
  return (
    <section className="py-20 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <h2 className="text-3xl md:text-4xl font-bold mb-6">Prêt à commencer ?</h2>
        <p className="text-xl text-purple-100 mb-8">Vérifiez le statut de votre remboursement ou trouvez une boutique partenaire.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/status" className="px-8 py-4 bg-white text-purple-600 font-semibold rounded-xl hover:bg-gray-100">Vérifier mon remboursement</Link>
          <Link to="/voyageurs" className="px-8 py-4 bg-white/10 text-white font-semibold rounded-xl border border-white/30 hover:bg-white/20">Guide voyageurs</Link>
        </div>
      </div>
    </section>
  );
}

export default function CommentCaMarchePage() {
  return (
    <>
      <HeroSection />
      <StepsSection />
      <TimelineSection />
      <LocationsSection />
      <FAQSection />
      <CTASection />
    </>
  );
}
