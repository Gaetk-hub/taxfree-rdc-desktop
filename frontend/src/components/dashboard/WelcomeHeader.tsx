import { CalendarDaysIcon, BellIcon } from '@heroicons/react/24/outline';

interface WelcomeHeaderProps {
  userName: string;
  userRole: string;
  notificationCount?: number;
  onNotificationClick?: () => void;
}

const roleLabels: Record<string, string> = {
  ADMIN: 'Super Administrateur',
  MERCHANT: 'Commerçant',
  CUSTOMS_AGENT: 'Agent Douanier',
  OPERATOR: 'Opérateur',
  AUDITOR: 'Auditeur',
  CLIENT: 'Client',
};

const roleDescriptions: Record<string, string> = {
  ADMIN: 'Gestion complète du système Tax Free RDC',
  MERCHANT: 'Gestion de vos ventes détaxées',
  CUSTOMS_AGENT: 'Validation des bordereaux Tax Free',
  OPERATOR: 'Traitement des remboursements',
  AUDITOR: 'Consultation des rapports et audits',
  CLIENT: 'Suivi de vos remboursements',
};

export default function WelcomeHeader({
  userName,
  userRole,
  notificationCount = 0,
  onNotificationClick,
}: WelcomeHeaderProps) {
  const today = new Date();
  const formattedDate = today.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const getGreeting = () => {
    const hour = today.getHours();
    if (hour < 12) return 'Bonjour';
    if (hour < 18) return 'Bon après-midi';
    return 'Bonsoir';
  };

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 md:p-8 text-white mb-8">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <defs>
            <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
              <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
            </pattern>
          </defs>
          <rect width="100" height="100" fill="url(#grid)" />
        </svg>
      </div>
      
      {/* Decorative circles */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
      <div className="absolute -left-10 -bottom-10 w-32 h-32 bg-white/10 rounded-full blur-2xl" />
      
      <div className="relative flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-blue-200 text-sm mb-2">
            <CalendarDaysIcon className="w-4 h-4" />
            <span className="capitalize">{formattedDate}</span>
          </div>
          
          <h1 className="text-2xl md:text-3xl font-bold mb-1">
            {getGreeting()}, {userName} 👋
          </h1>
          
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm">
              {roleLabels[userRole] || userRole}
            </span>
            <span className="text-blue-200 text-sm">
              {roleDescriptions[userRole]}
            </span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {onNotificationClick && (
            <button
              onClick={onNotificationClick}
              className="relative p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-colors"
            >
              <BellIcon className="w-6 h-6" />
              {notificationCount > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-500 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? '9+' : notificationCount}
                </span>
              )}
            </button>
          )}
          
          <div className="hidden md:block text-right">
            <p className="text-sm text-blue-200">Dernière connexion</p>
            <p className="text-sm font-medium">Aujourd'hui à {today.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
