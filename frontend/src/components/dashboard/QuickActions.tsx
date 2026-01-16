import { Link } from 'react-router-dom';
import {
  UserPlusIcon,
  CogIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  BuildingStorefrontIcon,
  UsersIcon,
} from '@heroicons/react/24/outline';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  href: string;
  color: string;
  bgColor: string;
}

interface QuickActionsProps {
  actions?: QuickAction[];
  title?: string;
}

const defaultActions: QuickAction[] = [
  {
    id: 'add-user',
    title: 'Nouvel utilisateur',
    description: 'Créer un compte',
    icon: UserPlusIcon,
    href: '/admin/users',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100 hover:bg-blue-200',
  },
  {
    id: 'merchants',
    title: 'Commerçants',
    description: 'Gérer les partenaires',
    icon: BuildingStorefrontIcon,
    href: '/admin/merchants',
    color: 'text-emerald-600',
    bgColor: 'bg-emerald-100 hover:bg-emerald-200',
  },
  {
    id: 'users',
    title: 'Utilisateurs',
    description: 'Gestion des accès',
    icon: UsersIcon,
    href: '/admin/users',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100 hover:bg-purple-200',
  },
  {
    id: 'rules',
    title: 'Règles TVA',
    description: 'Configurer les taux',
    icon: CogIcon,
    href: '/admin/rules',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100 hover:bg-amber-200',
  },
  {
    id: 'reports',
    title: 'Rapports',
    description: 'Statistiques détaillées',
    icon: ChartBarIcon,
    href: '/admin/reports',
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100 hover:bg-indigo-200',
  },
  {
    id: 'audit',
    title: 'Journal audit',
    description: 'Historique système',
    icon: ShieldCheckIcon,
    href: '/admin/audit',
    color: 'text-rose-600',
    bgColor: 'bg-rose-100 hover:bg-rose-200',
  },
];

export default function QuickActions({
  actions = defaultActions,
  title = 'Actions rapides',
}: QuickActionsProps) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Link
              key={action.id}
              to={action.href}
              className={`group flex flex-col items-center p-4 rounded-xl ${action.bgColor} transition-all duration-200 hover:scale-105`}
            >
              <div className={`p-3 rounded-full bg-white shadow-sm mb-2`}>
                <Icon className={`w-5 h-5 ${action.color}`} />
              </div>
              <span className="text-sm font-medium text-gray-900 text-center">
                {action.title}
              </span>
              <span className="text-xs text-gray-500 text-center mt-0.5">
                {action.description}
              </span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
