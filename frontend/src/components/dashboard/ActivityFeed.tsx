import { 
  CheckCircleIcon, 
  XCircleIcon, 
  ClockIcon,
  UserPlusIcon,
  DocumentTextIcon,
  BanknotesIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';

interface Activity {
  id: string;
  type: 'form_created' | 'form_validated' | 'form_refused' | 'refund_paid' | 'merchant_registered' | 'merchant_approved' | 'user_login';
  title: string;
  description: string;
  timestamp: string;
  user?: string;
  metadata?: Record<string, string>;
}

interface ActivityFeedProps {
  activities: Activity[];
  title?: string;
  maxItems?: number;
  showViewAll?: boolean;
  onViewAll?: () => void;
}

const activityConfig = {
  form_created: {
    icon: DocumentTextIcon,
    color: 'bg-blue-100 text-blue-600',
    dotColor: 'bg-blue-500',
  },
  form_validated: {
    icon: CheckCircleIcon,
    color: 'bg-emerald-100 text-emerald-600',
    dotColor: 'bg-emerald-500',
  },
  form_refused: {
    icon: XCircleIcon,
    color: 'bg-rose-100 text-rose-600',
    dotColor: 'bg-rose-500',
  },
  refund_paid: {
    icon: BanknotesIcon,
    color: 'bg-purple-100 text-purple-600',
    dotColor: 'bg-purple-500',
  },
  merchant_registered: {
    icon: UserPlusIcon,
    color: 'bg-amber-100 text-amber-600',
    dotColor: 'bg-amber-500',
  },
  merchant_approved: {
    icon: ShieldCheckIcon,
    color: 'bg-green-100 text-green-600',
    dotColor: 'bg-green-500',
  },
  user_login: {
    icon: ClockIcon,
    color: 'bg-gray-100 text-gray-600',
    dotColor: 'bg-gray-500',
  },
};

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "À l'instant";
  if (diffInSeconds < 3600) return `Il y a ${Math.floor(diffInSeconds / 60)} min`;
  if (diffInSeconds < 86400) return `Il y a ${Math.floor(diffInSeconds / 3600)}h`;
  if (diffInSeconds < 604800) return `Il y a ${Math.floor(diffInSeconds / 86400)}j`;
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}

export default function ActivityFeed({
  activities,
  title = 'Activité récente',
  maxItems = 5,
  showViewAll = true,
  onViewAll,
}: ActivityFeedProps) {
  const displayedActivities = activities.slice(0, maxItems);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
        {showViewAll && onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            Voir tout
          </button>
        )}
      </div>

      <div className="space-y-1">
        {displayedActivities.length === 0 ? (
          <div className="text-center py-8">
            <ClockIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm">Aucune activité récente</p>
          </div>
        ) : (
          displayedActivities.map((activity, index) => {
            const config = activityConfig[activity.type];
            const Icon = config.icon;
            const isLast = index === displayedActivities.length - 1;

            return (
              <div key={activity.id} className="relative flex gap-4 pb-4">
                {/* Timeline line */}
                {!isLast && (
                  <div className="absolute left-5 top-10 bottom-0 w-px bg-gray-200" />
                )}
                
                {/* Icon */}
                <div className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full ${config.color} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                
                {/* Content */}
                <div className="flex-1 min-w-0 pt-1">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {activity.title}
                      </p>
                      <p className="text-sm text-gray-500 mt-0.5">
                        {activity.description}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {formatTimeAgo(activity.timestamp)}
                    </span>
                  </div>
                  
                  {activity.user && (
                    <p className="text-xs text-gray-400 mt-1">
                      par {activity.user}
                    </p>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
