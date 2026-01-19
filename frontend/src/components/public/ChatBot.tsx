import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ChatBubbleLeftRightIcon, 
  XMarkIcon, 
  PaperAirplaneIcon,
  SparklesIcon,
  UserIcon,
  PhoneIcon
} from '@heroicons/react/24/outline';

interface Message {
  id: string;
  type: 'user' | 'bot';
  text: string;
  timestamp: Date;
}

// Knowledge base for the chatbot
const knowledgeBase = {
  fr: {
    greetings: ['bonjour', 'salut', 'hello', 'hi', 'bonsoir'],
    greetingResponse: 'Bonjour ! Je suis l\'assistant virtuel de Tax Free RDC. Comment puis-je vous aider aujourd\'hui ?',
    
    keywords: {
      'détaxe|tax free|remboursement tva': 'La détaxe permet aux voyageurs non-résidents de récupérer la TVA (16%) sur leurs achats effectués en RDC. Le processus est simple : achetez chez un commerçant partenaire, obtenez un bordereau de détaxe, et récupérez votre remboursement à l\'aéroport ou au point de sortie.',
      
      'comment ça marche|fonctionnement|processus': 'Voici comment fonctionne Tax Free RDC :\n1. Faites vos achats chez un commerçant partenaire\n2. Demandez un bordereau de détaxe\n3. Présentez vos achats et le bordereau à la douane\n4. Recevez votre remboursement (espèces, Mobile Money ou virement)',
      
      'montant minimum|minimum achat': 'Le montant minimum d\'achat pour bénéficier de la détaxe est de 50 000 CDF (environ 20 USD).',
      
      'taux|pourcentage|combien': 'Le taux de TVA en RDC est de 16%. Après déduction des frais de service (15% du montant de TVA), vous récupérez environ 13,8% du montant de vos achats.',
      
      'délai|temps|durée': 'Le remboursement peut être effectué immédiatement à l\'aéroport ou dans les 24-48h par Mobile Money ou virement bancaire.',
      
      'documents|papiers|requis': 'Documents requis :\n- Passeport valide\n- Bordereau de détaxe original\n- Factures d\'achat\n- Articles achetés (pour vérification douanière)',
      
      'commerçant|partenaire|magasin': 'Pour devenir commerçant partenaire Tax Free RDC, inscrivez-vous sur notre plateforme. L\'inscription est gratuite et vous bénéficiez d\'une formation complète et de supports marketing.',
      
      'application|app|mobile': 'Notre application mobile Tax Free RDC sera bientôt disponible sur le Play Store. Elle permettra aux commerçants de créer des bordereaux et aux voyageurs de suivre leurs remboursements.',
      
      'contact|téléphone|email': 'Vous pouvez nous contacter :\n📞 +243 81 234 5678\n📧 contact@taxfree.cd\n📍 Kinshasa, RDC',
      
      'aéroport|ndjili|lubumbashi': 'Points de remboursement :\n- Aéroport de N\'Djili (Kinshasa) - 24h/24\n- Aéroport de Lubumbashi - 6h-22h\n- Poste frontière de Kasumbalesa - 6h-18h\n- Port de Matadi - 7h-19h',
      
      'éligible|qui peut|conditions': 'Pour être éligible à la détaxe, vous devez :\n- Être non-résident de la RDC\n- Avoir un passeport étranger valide\n- Quitter le pays dans les 90 jours suivant l\'achat\n- Avoir des achats d\'un montant minimum de 50 000 CDF',
      
      'statut|suivi|bordereau': 'Pour suivre le statut de votre bordereau de détaxe, rendez-vous sur notre page "Suivre mon remboursement" et entrez votre numéro de bordereau.',
    },
    
    defaultResponse: 'Je ne suis pas sûr de comprendre votre question. Voici ce que je peux vous aider avec :\n- Comment fonctionne la détaxe\n- Montants et taux de remboursement\n- Documents requis\n- Points de remboursement\n- Devenir commerçant partenaire\n\nOu souhaitez-vous parler à un conseiller ?',
    
    escalateResponse: 'Je vais vous mettre en contact avec un conseiller. Vous pouvez nous joindre au +243 81 234 5678 ou par email à contact@taxfree.cd. Un conseiller vous répondra dans les plus brefs délais.',
  },
  en: {
    greetings: ['hello', 'hi', 'hey', 'good morning', 'good afternoon'],
    greetingResponse: 'Hello! I\'m the Tax Free RDC virtual assistant. How can I help you today?',
    
    keywords: {
      'tax free|refund|vat': 'Tax Free allows non-resident travelers to recover VAT (16%) on purchases made in DRC. The process is simple: buy from a partner merchant, get a tax-free form, and collect your refund at the airport or exit point.',
      
      'how it works|process|steps': 'Here\'s how Tax Free RDC works:\n1. Shop at a partner merchant\n2. Request a tax-free form\n3. Present your purchases and form at customs\n4. Receive your refund (cash, Mobile Money or transfer)',
      
      'minimum|amount': 'The minimum purchase amount to qualify for tax-free is 50,000 CDF (about 20 USD).',
      
      'rate|percentage|how much': 'The VAT rate in DRC is 16%. After service fee deduction (15% of VAT amount), you recover about 13.8% of your purchase amount.',
      
      'contact|phone|email': 'You can contact us:\n📞 +243 81 234 5678\n📧 contact@taxfree.cd\n📍 Kinshasa, DRC',
    },
    
    defaultResponse: 'I\'m not sure I understand your question. Here\'s what I can help you with:\n- How tax-free works\n- Refund amounts and rates\n- Required documents\n- Refund points\n- Becoming a partner merchant\n\nWould you like to speak with an advisor?',
    
    escalateResponse: 'I\'ll connect you with an advisor. You can reach us at +243 81 234 5678 or by email at contact@taxfree.cd. An advisor will respond as soon as possible.',
  }
};

export default function ChatBot() {
  const { t, i18n } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Send welcome message
      const lang = i18n.language.startsWith('en') ? 'en' : 'fr';
      const kb = knowledgeBase[lang] || knowledgeBase.fr;
      
      setTimeout(() => {
        setMessages([{
          id: '1',
          type: 'bot',
          text: kb.greetingResponse,
          timestamp: new Date()
        }]);
      }, 500);
    }
    
    if (isOpen) {
      inputRef.current?.focus();
    }
  }, [isOpen, i18n.language]);

  const findResponse = (input: string): string => {
    const lang = i18n.language.startsWith('en') ? 'en' : 'fr';
    const kb = knowledgeBase[lang] || knowledgeBase.fr;
    const lowerInput = input.toLowerCase();

    // Check for greetings
    if (kb.greetings.some(g => lowerInput.includes(g))) {
      return kb.greetingResponse;
    }

    // Check for escalation request
    if (lowerInput.includes('conseiller') || lowerInput.includes('humain') || 
        lowerInput.includes('advisor') || lowerInput.includes('human') ||
        lowerInput.includes('parler à quelqu')) {
      return kb.escalateResponse;
    }

    // Search in keywords
    for (const [keywords, response] of Object.entries(kb.keywords)) {
      const keywordList = keywords.split('|');
      if (keywordList.some(kw => lowerInput.includes(kw))) {
        return response;
      }
    }

    return kb.defaultResponse;
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      text: inputValue.trim(),
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsTyping(true);

    // Simulate typing delay
    setTimeout(() => {
      const response = findResponse(userMessage.text);
      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'bot',
        text: response,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, botMessage]);
      setIsTyping(false);
    }, 1000 + Math.random() * 500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Chat Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
          isOpen 
            ? 'bg-gray-600 hover:bg-gray-700' 
            : 'bg-gradient-to-br from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 hover:scale-110'
        }`}
        aria-label={isOpen ? 'Fermer le chat' : 'Ouvrir le chat'}
      >
        {isOpen ? (
          <XMarkIcon className="w-6 h-6 text-white" />
        ) : (
          <>
            <ChatBubbleLeftRightIcon className="w-6 h-6 text-white" />
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white animate-pulse" />
          </>
        )}
      </button>

      {/* Chat Window */}
      <div className={`fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden transition-all duration-300 ${
        isOpen ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-4 scale-95 pointer-events-none'
      }`}>
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <SparklesIcon className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-white">
                {t('chat.title', 'Assistant Tax Free')}
              </h3>
              <p className="text-xs text-blue-100">
                {t('chat.subtitle', 'Réponse instantanée')}
              </p>
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="h-80 overflow-y-auto p-4 space-y-4 bg-gray-50">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`flex items-end gap-2 max-w-[85%] ${msg.type === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                  msg.type === 'user' 
                    ? 'bg-blue-600' 
                    : 'bg-gradient-to-br from-blue-500 to-indigo-500'
                }`}>
                  {msg.type === 'user' ? (
                    <UserIcon className="w-4 h-4 text-white" />
                  ) : (
                    <SparklesIcon className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line ${
                  msg.type === 'user'
                    ? 'bg-blue-600 text-white rounded-br-md'
                    : 'bg-white text-gray-800 shadow-sm border border-gray-100 rounded-bl-md'
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-end gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                  <SparklesIcon className="w-4 h-4 text-white" />
                </div>
                <div className="px-4 py-3 bg-white rounded-2xl rounded-bl-md shadow-sm border border-gray-100">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Quick Actions */}
        <div className="px-4 py-2 border-t border-gray-100 bg-white">
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {[
              { label: t('chat.howItWorks', 'Comment ça marche ?'), query: 'comment ça marche' },
              { label: t('chat.refundAmount', 'Montant remboursé ?'), query: 'combien je récupère' },
              { label: t('chat.documents', 'Documents requis'), query: 'documents requis' },
            ].map((action, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputValue(action.query);
                  setTimeout(() => handleSend(), 100);
                }}
                className="flex-shrink-0 px-3 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-100 bg-white">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('chat.placeholder', 'Posez votre question...')}
              className="flex-1 px-4 py-2.5 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white border border-transparent focus:border-blue-200 transition-all"
            />
            <button
              onClick={handleSend}
              disabled={!inputValue.trim()}
              className="w-10 h-10 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 rounded-xl flex items-center justify-center transition-colors"
            >
              <PaperAirplaneIcon className="w-5 h-5 text-white" />
            </button>
          </div>
          <div className="mt-2 text-center">
            <a 
              href="tel:+243812345678" 
              className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-blue-600 transition-colors"
            >
              <PhoneIcon className="w-3 h-3" />
              {t('chat.callAdvisor', 'Ou appelez un conseiller')}
            </a>
          </div>
        </div>
      </div>
    </>
  );
}
