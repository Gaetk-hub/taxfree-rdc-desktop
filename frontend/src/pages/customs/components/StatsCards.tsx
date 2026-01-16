import {
  ClipboardDocumentCheckIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  BanknotesIcon,
  ArrowTrendingUpIcon,
  CalendarDaysIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface StatsCardsProps {
  stats: {
    my_validations_today: number;
    my_validations_week: number;
    my_validations_month: number;
    my_validations_total: number;
    my_validated_today: number;
    my_refused_today: number;
    my_validated_count: number;
    my_refused_count: number;
    my_validation_rate: number;
    my_refunds_today: number;
    my_refunds_paid_today: number;
    my_refunds_total: number;
    my_refunds_paid_total: number;
    my_amount_validated_today: number;
    my_tva_validated_today: number;
    my_amount_validated_total: number;
    my_amount_refunded_today: number;
    my_amount_refunded_total: number;
    pending_forms_count: number;
  };
}

export default function StatsCards({ stats }: StatsCardsProps) {
  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR');
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview - Professional Card */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <ArrowTrendingUpIcon className="w-5 h-5 text-primary-600" />
            Ma Performance
          </h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Today */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-xl mb-3">
                <ClipboardDocumentCheckIcon className="w-6 h-6 text-blue-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.my_validations_today}</p>
              <p className="text-sm text-gray-500">Aujourd'hui</p>
            </div>
            {/* This Week */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-indigo-100 rounded-xl mb-3">
                <CalendarDaysIcon className="w-6 h-6 text-indigo-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.my_validations_week}</p>
              <p className="text-sm text-gray-500">Cette semaine</p>
            </div>
            {/* This Month */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 rounded-xl mb-3">
                <CalendarDaysIcon className="w-6 h-6 text-purple-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.my_validations_month}</p>
              <p className="text-sm text-gray-500">Ce mois</p>
            </div>
            {/* Total */}
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gray-100 rounded-xl mb-3">
                <ClipboardDocumentCheckIcon className="w-6 h-6 text-gray-600" />
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.my_validations_total}</p>
              <p className="text-sm text-gray-500">Total carrière</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Pending */}
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-amber-500 rounded-xl">
              <ClockIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium text-amber-600 bg-amber-100 px-2 py-1 rounded-full">À traiter</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.pending_forms_count}</p>
          <p className="text-sm text-gray-600 mt-1">En attente</p>
        </div>

        {/* Validated Total */}
        <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-emerald-500 rounded-xl">
              <CheckCircleIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium text-emerald-600 bg-emerald-100 px-2 py-1 rounded-full">{stats.my_validation_rate}%</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.my_validated_count}</p>
          <p className="text-sm text-gray-600 mt-1">Validés (total)</p>
        </div>

        {/* Refused Total */}
        <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-red-500 rounded-xl">
              <XCircleIcon className="w-5 h-5 text-white" />
            </div>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.my_refused_count}</p>
          <p className="text-sm text-gray-600 mt-1">Refusés (total)</p>
        </div>

        {/* Refunds Paid */}
        <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
          <div className="flex items-center justify-between mb-3">
            <div className="p-2.5 bg-blue-500 rounded-xl">
              <BanknotesIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-1 rounded-full">+{stats.my_refunds_paid_today} auj.</span>
          </div>
          <p className="text-3xl font-bold text-gray-900">{stats.my_refunds_paid_total}</p>
          <p className="text-sm text-gray-600 mt-1">Remboursés</p>
        </div>
      </div>

      {/* Financial Stats - Professional Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Amount Validated Today */}
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <BanknotesIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-emerald-100 text-sm">Montant validé</p>
                <p className="text-xs text-emerald-200">Aujourd'hui</p>
              </div>
            </div>
            <p className="text-4xl font-bold">{formatAmount(stats.my_amount_validated_today)}</p>
            <p className="text-emerald-100 text-sm mt-1">CDF</p>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm text-emerald-100">Total carrière: <span className="font-semibold text-white">{formatAmount(stats.my_amount_validated_total)} CDF</span></p>
            </div>
          </div>
        </div>

        {/* Amount Refunded Today */}
        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-6 text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16"></div>
          <div className="relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-white/20 rounded-xl backdrop-blur-sm">
                <CurrencyDollarIcon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-purple-100 text-sm">Montant remboursé</p>
                <p className="text-xs text-purple-200">Aujourd'hui</p>
              </div>
            </div>
            <p className="text-4xl font-bold">{formatAmount(stats.my_amount_refunded_today)}</p>
            <p className="text-purple-100 text-sm mt-1">CDF</p>
            <div className="mt-4 pt-4 border-t border-white/20">
              <p className="text-sm text-purple-100">Total carrière: <span className="font-semibold text-white">{formatAmount(stats.my_amount_refunded_total)} CDF</span></p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
