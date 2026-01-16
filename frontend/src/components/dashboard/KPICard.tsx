import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/outline';

interface KPICardProps {
  label: string;
  value: string | number;
  subValue?: string;
  icon?: React.ReactNode;
  trend?: {
    value: number;
    isPositive: boolean;
  };
  variant?: 'default' | 'circle' | 'badge';
  color?: 'blue' | 'green' | 'amber' | 'red' | 'purple' | 'gray';
}

const colorClasses = {
  blue: 'bg-blue-600 text-white',
  green: 'bg-emerald-500 text-white',
  amber: 'bg-amber-500 text-white',
  red: 'bg-red-500 text-white',
  purple: 'bg-purple-500 text-white',
  gray: 'bg-gray-100 text-gray-700',
};

export default function KPICard({
  label,
  value,
  subValue,
  icon,
  trend,
  variant = 'default',
  color = 'blue',
}: KPICardProps) {
  return (
    <div className="bg-gray-50 rounded-xl p-4">
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      
      {variant === 'circle' ? (
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-full ${colorClasses[color]} flex items-center justify-center font-bold text-sm`}>
            {value}
          </div>
          {trend && (
            <div className={`flex items-center text-xs ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend.isPositive ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
              {trend.value}%
            </div>
          )}
          {subValue && <span className="text-xs text-gray-500">{subValue}</span>}
        </div>
      ) : variant === 'badge' ? (
        <div className="flex items-center gap-2">
          <div className={`w-10 h-10 rounded-full border-4 border-${color}-500 flex items-center justify-center`}>
            <span className="text-xs font-medium">{value}</span>
          </div>
          {trend && (
            <div className={`flex items-center text-xs ${trend.isPositive ? 'text-emerald-500' : 'text-red-500'}`}>
              {trend.isPositive ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
              {trend.value}%
            </div>
          )}
        </div>
      ) : (
        <>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {icon && (
            <div className="flex items-center gap-2 mt-2">
              {icon}
            </div>
          )}
          {subValue && <p className="text-xs text-gray-600 mt-2">{subValue}</p>}
          {trend && (
            <div className={`flex items-center gap-1 mt-2 text-xs ${trend.isPositive ? 'text-emerald-600' : 'text-red-600'}`}>
              {trend.isPositive ? <ArrowUpIcon className="w-3 h-3" /> : <ArrowDownIcon className="w-3 h-3" />}
              {trend.value}%
            </div>
          )}
        </>
      )}
    </div>
  );
}
