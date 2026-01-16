import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: React.ComponentType<{ className?: string }>;
  color: 'blue' | 'green' | 'red' | 'purple' | 'yellow' | 'indigo' | 'pink' | 'cyan';
  trend?: {
    value: number;
    isPositive: boolean;
  };
  subtitle?: string;
  format?: 'number' | 'currency' | 'percentage';
  currency?: string;
}

const colorSchemes = {
  blue: {
    bg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    light: 'bg-blue-50',
    text: 'text-blue-600',
    icon: 'text-white',
    shadow: 'shadow-blue-500/25',
  },
  green: {
    bg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    light: 'bg-emerald-50',
    text: 'text-emerald-600',
    icon: 'text-white',
    shadow: 'shadow-emerald-500/25',
  },
  red: {
    bg: 'bg-gradient-to-br from-rose-500 to-rose-600',
    light: 'bg-rose-50',
    text: 'text-rose-600',
    icon: 'text-white',
    shadow: 'shadow-rose-500/25',
  },
  purple: {
    bg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    light: 'bg-purple-50',
    text: 'text-purple-600',
    icon: 'text-white',
    shadow: 'shadow-purple-500/25',
  },
  yellow: {
    bg: 'bg-gradient-to-br from-amber-500 to-amber-600',
    light: 'bg-amber-50',
    text: 'text-amber-600',
    icon: 'text-white',
    shadow: 'shadow-amber-500/25',
  },
  indigo: {
    bg: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
    light: 'bg-indigo-50',
    text: 'text-indigo-600',
    icon: 'text-white',
    shadow: 'shadow-indigo-500/25',
  },
  pink: {
    bg: 'bg-gradient-to-br from-pink-500 to-pink-600',
    light: 'bg-pink-50',
    text: 'text-pink-600',
    icon: 'text-white',
    shadow: 'shadow-pink-500/25',
  },
  cyan: {
    bg: 'bg-gradient-to-br from-cyan-500 to-cyan-600',
    light: 'bg-cyan-50',
    text: 'text-cyan-600',
    icon: 'text-white',
    shadow: 'shadow-cyan-500/25',
  },
};

export default function StatsCard({
  title,
  value,
  icon: Icon,
  color,
  trend,
  subtitle,
  format = 'number',
  currency = 'CDF',
}: StatsCardProps) {
  const scheme = colorSchemes[color];

  const formatValue = (val: number | string) => {
    if (typeof val === 'string') return val;
    switch (format) {
      case 'currency':
        return `${val.toLocaleString('fr-FR')} ${currency}`;
      case 'percentage':
        return `${val.toFixed(1)}%`;
      default:
        return val.toLocaleString('fr-FR');
    }
  };

  return (
    <div className="relative bg-white rounded-2xl p-6 shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 overflow-hidden group">
      {/* Background decoration */}
      <div className={`absolute -right-4 -top-4 w-24 h-24 ${scheme.bg} rounded-full opacity-10 group-hover:scale-150 transition-transform duration-500`} />
      
      <div className="relative flex items-start justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
          <p className="text-3xl font-bold text-gray-900 mb-1">
            {formatValue(value)}
          </p>
          
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              <span className={`flex items-center text-sm font-medium ${trend.isPositive ? 'text-emerald-600' : 'text-rose-600'}`}>
                {trend.isPositive ? (
                  <ArrowUpIcon className="w-4 h-4 mr-0.5" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4 mr-0.5" />
                )}
                {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-gray-400">vs mois dernier</span>
            </div>
          )}
          
          {subtitle && (
            <p className="text-xs text-gray-400 mt-2">{subtitle}</p>
          )}
        </div>
        
        <div className={`p-3 rounded-xl ${scheme.bg} shadow-lg ${scheme.shadow}`}>
          <Icon className={`h-6 w-6 ${scheme.icon}`} />
        </div>
      </div>
    </div>
  );
}
