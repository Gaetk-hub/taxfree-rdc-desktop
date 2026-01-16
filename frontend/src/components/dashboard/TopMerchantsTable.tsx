import { 
  ArrowTrendingUpIcon, 
  ArrowTrendingDownIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';

interface Merchant {
  id: string;
  name: string;
  trade_name?: string;
  city: string;
  total_sales: number;
  total_vat: number;
  forms_count: number;
  trend: number;
}

interface TopMerchantsTableProps {
  merchants: Merchant[];
  title?: string;
  maxItems?: number;
  onViewAll?: () => void;
}

export default function TopMerchantsTable({
  merchants,
  title = 'Top Commerçants',
  maxItems = 5,
  onViewAll,
}: TopMerchantsTableProps) {
  const displayedMerchants = merchants.slice(0, maxItems);

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="p-6 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <BuildingStorefrontIcon className="w-5 h-5 text-indigo-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          </div>
          {onViewAll && (
            <button
              onClick={onViewAll}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Voir tout
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Commerçant
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Ventes
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                TVA
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Bordereaux
              </th>
              <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Tendance
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {displayedMerchants.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  Aucune donnée disponible
                </td>
              </tr>
            ) : (
              displayedMerchants.map((merchant, index) => (
                <tr key={merchant.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{merchant.name}</p>
                        <p className="text-sm text-gray-500">{merchant.city}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-semibold text-gray-900">
                      {merchant.total_sales.toLocaleString('fr-FR')} CDF
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="text-gray-600">
                      {merchant.total_vat.toLocaleString('fr-FR')} CDF
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {merchant.forms_count}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={`inline-flex items-center gap-1 text-sm font-medium ${
                      merchant.trend >= 0 ? 'text-emerald-600' : 'text-rose-600'
                    }`}>
                      {merchant.trend >= 0 ? (
                        <ArrowTrendingUpIcon className="w-4 h-4" />
                      ) : (
                        <ArrowTrendingDownIcon className="w-4 h-4" />
                      )}
                      {Math.abs(merchant.trend)}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
