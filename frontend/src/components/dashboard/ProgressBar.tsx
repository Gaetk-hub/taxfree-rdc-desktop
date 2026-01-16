interface ProgressSegment {
  label: string;
  value: number;
  percentage: number;
  color: string;
}

interface ProgressBarProps {
  segments: ProgressSegment[];
  showLegend?: boolean;
  showDetails?: boolean;
  onDetailsClick?: () => void;
  currency?: string;
}

export default function ProgressBar({
  segments,
  showLegend = true,
  showDetails = true,
  onDetailsClick,
  currency = 'CDF',
}: ProgressBarProps) {
  const formatValue = (value: number) => {
    return value.toLocaleString('fr-FR');
  };

  return (
    <div>
      {showLegend && (
        <div className="flex items-center gap-4 mb-2 text-sm flex-wrap">
          {segments.map((segment) => (
            <div key={segment.label} className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${segment.color}`}></div>
              <span className="text-gray-600">{formatValue(segment.value)} {currency}</span>
              <span className="text-xs text-gray-400">{segment.percentage.toFixed(2)}%</span>
            </div>
          ))}
          {showDetails && (
            <button 
              onClick={onDetailsClick}
              className="ml-auto px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition-colors"
            >
              Détails
            </button>
          )}
        </div>
      )}
      <div className="h-2 rounded-full overflow-hidden flex">
        {segments.map((segment) => (
          <div
            key={segment.label}
            className={`${segment.color} h-full transition-all duration-300`}
            style={{ width: `${segment.percentage}%` }}
          ></div>
        ))}
      </div>
    </div>
  );
}
