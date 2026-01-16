import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { refundsApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import FadeIn from '../../components/ui/FadeIn';
import {
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarDaysIcon,
  QuestionMarkCircleIcon,
  PhoneIcon,
  EnvelopeIcon,
  ChevronDownIcon,
  MagnifyingGlassIcon,
  TicketIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
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
import { Line, Doughnut } from 'react-chartjs-2';
import { StatusBadge } from '../../components/dashboard';

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

interface RefundData {
  id: string;
  amount: string;
  status: string;
  created_at: string;
  paid_at?: string;
  form?: {
    form_number: string;
    merchant_name: string;
  };
}

export default function ClientDashboard() {
  const { user } = useAuthStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  const { data: refunds, isLoading } = useQuery({
    queryKey: ['client-refunds'],
    queryFn: () => refundsApi.list({ page_size: 20 }),
  });

  const refundsData: RefundData[] = refunds?.data?.results || [];
  
  // Calculate statistics
  const stats = {
    total: refundsData.length,
    paid: refundsData.filter((r) => r.status === 'PAID' || r.status === 'COMPLETED').length,
    pending: refundsData.filter((r) => r.status === 'PENDING' || r.status === 'PROCESSING').length,
    failed: refundsData.filter((r) => r.status === 'FAILED').length,
    totalAmount: refundsData
      .filter((r) => r.status === 'PAID' || r.status === 'COMPLETED')
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
    pendingAmount: refundsData
      .filter((r) => r.status === 'PENDING' || r.status === 'PROCESSING')
      .reduce((sum, r) => sum + (parseFloat(r.amount) || 0), 0),
  };

  const successRate = stats.total > 0 ? Math.round((stats.paid / stats.total) * 100) : 0;

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

  // Chart data - Refunds evolution
  const refundsEvolutionData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun'],
    datasets: [
      {
        label: 'Remboursements',
        data: [15000, 25000, 18000, 32000, 28000, 45000],
        borderColor: '#ec4899',
        backgroundColor: 'rgba(236, 72, 153, 0.1)',
        fill: true,
        tension: 0.4,
        pointRadius: 4,
        pointBackgroundColor: '#ec4899',
      },
    ],
  };

  // Status distribution
  const statusDistributionData = {
    labels: ['Payés', 'En attente', 'Échoués'],
    datasets: [
      {
        data: [stats.paid, stats.pending, stats.failed],
        backgroundColor: ['#10b981', '#f59e0b', '#ef4444'],
        borderWidth: 0,
        cutout: '70%',
      },
    ],
  };

  // Recent purchases (mock data for now)
  const recentPurchases = [
    { id: 1, merchant: 'Boutique Elegance', date: '2026-01-02', amount: 125000, status: 'VALIDATED' },
    { id: 2, merchant: 'Mode Paris', date: '2025-12-28', amount: 85000, status: 'REFUNDED' },
    { id: 3, merchant: 'Luxe Congo', date: '2025-12-20', amount: 210000, status: 'PENDING' },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-pink-600 mx-auto"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <FadeIn delay={0} duration={400}>
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-gray-900">Mon espace</h1>
        <div className="flex items-center gap-4">
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher un bordereau..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 pr-4 py-2 bg-gray-100 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 w-64"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 rounded-lg text-sm text-gray-700 hover:bg-gray-200 transition-colors">
            Ce mois
            <ChevronDownIcon className="w-4 h-4" />
          </button>
        </div>
        </div>
      </FadeIn>

      {/* Welcome Banner */}
      <FadeIn delay={100} duration={500}>
        <div className="relative overflow-hidden bg-gradient-to-r from-pink-600 via-rose-600 to-purple-600 rounded-2xl p-6 text-white">
        <div className="absolute inset-0 opacity-10">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <pattern id="client-grid" width="10" height="10" patternUnits="userSpaceOnUse">
                <path d="M 10 0 L 0 0 0 10" fill="none" stroke="white" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100" height="100" fill="url(#client-grid)" />
          </svg>
        </div>
        <div className="absolute -right-10 -top-10 w-40 h-40 bg-white/10 rounded-full blur-2xl" />
        
        <div className="relative flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 text-pink-200 text-sm mb-2">
              <CalendarDaysIcon className="w-4 h-4" />
              <span className="capitalize">{formattedDate}</span>
            </div>
            <h2 className="text-2xl font-bold mb-1">
              {getGreeting()}, {user?.first_name} 👋
            </h2>
            <p className="text-pink-200 text-sm">
              Voyageur Tax Free • Suivez vos remboursements
            </p>
          </div>
          <Link 
            to="/status"
            className="flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-lg hover:bg-white/30 transition-colors"
          >
            <MagnifyingGlassIcon className="w-5 h-5" />
            <span className="font-medium">Vérifier un bordereau</span>
          </Link>
        </div>
        </div>
      </FadeIn>

      {/* Main Stats Card */}
      <FadeIn delay={200} duration={500}>
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-sm text-gray-500 mb-1">Total remboursé</p>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-gray-900">{stats.totalAmount.toLocaleString('fr-FR')}</span>
              <span className="text-2xl text-gray-400">CDF</span>
              {stats.paid > 0 && (
                <span className="flex items-center gap-1 text-sm text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
                  <CheckCircleIcon className="w-3 h-3" />
                  {stats.paid} payé(s)
                </span>
              )}
            </div>
            {stats.pendingAmount > 0 && (
              <p className="text-sm text-amber-600 mt-1">
                + {stats.pendingAmount.toLocaleString('fr-FR')} CDF en attente
              </p>
            )}
          </div>
        </div>

        {/* KPI Cards Row */}
        <div className="grid grid-cols-4 gap-4 mb-6">
          {/* Total demandes */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Demandes</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-pink-600 flex items-center justify-center text-white font-bold">
                {stats.total}
              </div>
              <span className="text-xs text-gray-500">total</span>
            </div>
          </div>

          {/* Payés */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Payés</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white font-bold text-sm">
                {stats.paid}
              </div>
              <div className="flex items-center text-emerald-600 text-xs">
                <CheckCircleIcon className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* En attente */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">En attente</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-amber-500 flex items-center justify-center text-white font-bold text-sm">
                {stats.pending}
              </div>
              <div className="flex items-center text-amber-600 text-xs">
                <ClockIcon className="w-3 h-3" />
              </div>
            </div>
          </div>

          {/* Taux succès */}
          <div className="bg-gray-50 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-2">Taux de succès</p>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full border-4 border-pink-500 flex items-center justify-center">
                <span className="text-xs font-medium">{successRate}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex items-center gap-4 mb-2 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
            <span className="text-gray-600">Payés</span>
            <span className="text-xs text-gray-400">{stats.paid}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-amber-500"></div>
            <span className="text-gray-600">En attente</span>
            <span className="text-xs text-gray-400">{stats.pending}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-red-500"></div>
            <span className="text-gray-600">Échoués</span>
            <span className="text-xs text-gray-400">{stats.failed}</span>
          </div>
        </div>
        <div className="h-2 rounded-full overflow-hidden flex bg-gray-100">
          {stats.total > 0 && (
            <>
              <div className="bg-emerald-500 h-full" style={{ width: `${(stats.paid / stats.total) * 100}%` }}></div>
              <div className="bg-amber-500 h-full" style={{ width: `${(stats.pending / stats.total) * 100}%` }}></div>
              <div className="bg-red-500 h-full" style={{ width: `${(stats.failed / stats.total) * 100}%` }}></div>
            </>
          )}
        </div>
        </div>
      </FadeIn>

      {/* Middle Section - 3 columns */}
      <FadeIn delay={300} duration={500}>
        <div className="grid grid-cols-12 gap-6">
        {/* How it works */}
        <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Comment ça marche ?</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                <TicketIcon className="w-4 h-4 text-pink-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">1. Achetez</p>
                <p className="text-xs text-gray-500">Chez un commerçant agréé</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                <ShieldCheckIcon className="w-4 h-4 text-pink-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">2. Validez</p>
                <p className="text-xs text-gray-500">À la douane avant départ</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                <BanknotesIcon className="w-4 h-4 text-pink-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">3. Recevez</p>
                <p className="text-xs text-gray-500">Votre remboursement</p>
              </div>
            </div>
          </div>
        </div>

        {/* Donut Chart - Statuts */}
        <div className="col-span-3 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-900">Répartition</span>
          </div>
          <div className="h-32 flex items-center justify-center">
            <Doughnut 
              data={statusDistributionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
              }}
            />
          </div>
          <div className="text-center mt-2">
            <p className="text-xs text-gray-500">par statut</p>
          </div>
        </div>

        {/* Recent purchases */}
        <div className="col-span-6 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-900">Derniers achats</span>
            <Link to="/client/purchases" className="text-xs text-pink-600 hover:text-pink-700">
              Voir tout →
            </Link>
          </div>
          <div className="space-y-3">
            {recentPurchases.map((purchase) => (
              <div key={purchase.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-pink-100 flex items-center justify-center text-pink-600 text-xs font-medium">
                    {purchase.merchant.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{purchase.merchant}</p>
                    <p className="text-xs text-gray-500">{new Date(purchase.date).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium">{purchase.amount.toLocaleString('fr-FR')} CDF</span>
                  <StatusBadge status={purchase.status} size="sm" />
                </div>
              </div>
            ))}
          </div>
        </div>
        </div>
      </FadeIn>

      {/* Bottom Section - 2 columns */}
      <FadeIn delay={400} duration={500}>
        <div className="grid grid-cols-12 gap-6">
        {/* Refunds Evolution Chart */}
        <div className="col-span-5 bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm font-medium text-gray-900">Évolution remboursements</span>
          </div>
          <div className="h-48">
            <Line
              data={refundsEvolutionData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                  x: { 
                    grid: { display: false },
                    ticks: { font: { size: 10 }, color: '#9ca3af' }
                  },
                  y: { 
                    grid: { color: 'rgba(243, 244, 246, 1)' },
                    ticks: { font: { size: 10 }, color: '#9ca3af' }
                  },
                },
              }}
            />
          </div>
        </div>

        {/* Refunds list + Support */}
        <div className="col-span-7 space-y-6">
          {/* Refunds list */}
          <div className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-900">Mes remboursements</span>
              <Link to="/client/refunds" className="text-xs text-pink-600 hover:text-pink-700">
                Voir tout →
              </Link>
            </div>
            <div className="space-y-3">
              {refundsData.slice(0, 3).map((refund) => (
                <div key={refund.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      refund.status === 'PAID' || refund.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-600' :
                      refund.status === 'PENDING' || refund.status === 'PROCESSING' ? 'bg-amber-100 text-amber-600' :
                      'bg-gray-100 text-gray-600'
                    }`}>
                      <BanknotesIcon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">#{refund.id.slice(0, 8)}</p>
                      <p className="text-xs text-gray-500">{refund.form?.form_number || 'Bordereau'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">{parseFloat(refund.amount || '0').toLocaleString('fr-FR')} CDF</span>
                    <StatusBadge status={refund.status} size="sm" />
                  </div>
                </div>
              ))}
              {refundsData.length === 0 && (
                <div className="text-center py-6">
                  <BanknotesIcon className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">Aucun remboursement</p>
                </div>
              )}
            </div>
          </div>

          {/* Support card */}
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-2xl p-5 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-white/10 rounded-lg">
                  <QuestionMarkCircleIcon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-semibold">Besoin d'aide ?</h3>
                  <p className="text-gray-400 text-xs">Notre équipe est disponible</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <a 
                  href="tel:+243123456789" 
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <PhoneIcon className="w-4 h-4" />
                  +243 123 456 789
                </a>
                <a 
                  href="mailto:support@taxfree.cd" 
                  className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
                >
                  <EnvelopeIcon className="w-4 h-4" />
                  support@taxfree.cd
                </a>
              </div>
            </div>
          </div>
        </div>
        </div>
      </FadeIn>
    </div>
  );
}
