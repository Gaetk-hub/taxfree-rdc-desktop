import { useState } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { EllipsisHorizontalIcon } from '@heroicons/react/24/outline';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface ChartCardProps {
  title: string;
  subtitle?: string;
  type: 'line' | 'bar' | 'doughnut';
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      borderColor?: string;
      backgroundColor?: string | string[];
      fill?: boolean;
      tension?: number;
      borderWidth?: number;
    }[];
  };
  height?: number;
  showLegend?: boolean;
  periodOptions?: string[];
  onPeriodChange?: (period: string) => void;
}

export default function ChartCard({
  title,
  subtitle,
  type,
  data,
  height = 300,
  showLegend = true,
  periodOptions = ['7 jours', '30 jours', '90 jours'],
  onPeriodChange,
}: ChartCardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState(periodOptions[1]);
  const [showMenu, setShowMenu] = useState(false);

  const handlePeriodChange = (period: string) => {
    setSelectedPeriod(period);
    setShowMenu(false);
    onPeriodChange?.(period);
  };

  const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: showLegend,
        position: 'bottom' as const,
        labels: {
          usePointStyle: true,
          padding: 20,
          font: {
            size: 12,
            family: "'Inter', sans-serif",
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleFont: {
          size: 13,
          family: "'Inter', sans-serif",
        },
        bodyFont: {
          size: 12,
          family: "'Inter', sans-serif",
        },
        padding: 12,
        cornerRadius: 8,
        displayColors: true,
      },
    },
    scales: type !== 'doughnut' ? {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          font: {
            size: 11,
            family: "'Inter', sans-serif",
          },
          color: '#9ca3af',
        },
      },
      y: {
        grid: {
          color: 'rgba(243, 244, 246, 1)',
        },
        ticks: {
          font: {
            size: 11,
            family: "'Inter', sans-serif",
          },
          color: '#9ca3af',
        },
      },
    } : undefined,
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return <Line data={data} options={commonOptions} />;
      case 'bar':
        return <Bar data={data} options={commonOptions} />;
      case 'doughnut':
        return (
          <Doughnut
            data={data}
            options={{
              ...commonOptions,
              cutout: '70%',
              plugins: {
                ...commonOptions.plugins,
                legend: {
                  ...commonOptions.plugins.legend,
                  position: 'right' as const,
                },
              },
            }}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {subtitle && (
            <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
          )}
        </div>
        
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
          >
            {selectedPeriod}
            <EllipsisHorizontalIcon className="w-4 h-4" />
          </button>
          
          {showMenu && (
            <div className="absolute right-0 mt-2 w-32 bg-white rounded-lg shadow-lg border border-gray-100 py-1 z-10">
              {periodOptions.map((period) => (
                <button
                  key={period}
                  onClick={() => handlePeriodChange(period)}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-50 transition-colors ${
                    selectedPeriod === period ? 'text-blue-600 font-medium' : 'text-gray-700'
                  }`}
                >
                  {period}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
      
      <div style={{ height }}>
        {renderChart()}
      </div>
    </div>
  );
}
