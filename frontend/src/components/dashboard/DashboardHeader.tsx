import { ChevronDownIcon, ArrowsRightLeftIcon, ArrowDownTrayIcon, ArrowUpTrayIcon } from '@heroicons/react/24/outline';

interface DashboardHeaderProps {
  title: string;
  subtitle?: string;
  showDatePicker?: boolean;
  dateRange?: string;
  onDateChange?: () => void;
  showExportButtons?: boolean;
  onExport?: () => void;
  onImport?: () => void;
  children?: React.ReactNode;
}

export default function DashboardHeader({
  title,
  subtitle,
  showDatePicker = true,
  dateRange = 'Jan 1 - Déc 31, 2026',
  onDateChange,
  showExportButtons = true,
  onExport,
  onImport,
  children,
}: DashboardHeaderProps) {
  return (
    <div className="space-y-4">
      {/* Top row with actions */}
      {(showExportButtons || children) && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {children}
          </div>
          {showExportButtons && (
            <div className="flex items-center gap-3">
              <button 
                onClick={() => {}}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowsRightLeftIcon className="w-5 h-5 text-gray-500" />
              </button>
              <button 
                onClick={onExport}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowDownTrayIcon className="w-5 h-5 text-gray-500" />
              </button>
              <button 
                onClick={onImport}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowUpTrayIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Title and date picker */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        {showDatePicker && (
          <button 
            onClick={onDateChange}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors"
          >
            {dateRange}
            <ChevronDownIcon className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}
