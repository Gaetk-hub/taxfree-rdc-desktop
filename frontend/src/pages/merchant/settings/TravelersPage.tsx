import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { merchantManageApi } from '../../../services/api';
import FadeIn from '../../../components/ui/FadeIn';
import {
  MagnifyingGlassIcon,
  UserGroupIcon,
  EyeIcon,
  XMarkIcon,
  DocumentTextIcon,
  CalendarDaysIcon,
  BanknotesIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

interface Traveler {
  id: string;
  first_name: string;
  last_name: string;
  passport_last4: string;
  nationality: string;
  nationality_name: string;
  flag: string;
  email: string;
  phone: string;
  total_forms: number;
  total_amount: number;
  total_refund: number;
  first_visit: string;
  last_visit: string;
  status_breakdown: {
    validated: number;
    pending: number;
    refunded: number;
    cancelled: number;
    refused: number;
  };
}

interface TravelerDetail {
  traveler: {
    id: string;
    first_name: string;
    last_name: string;
    passport_last4: string;
    passport_country: string;
    nationality: string;
    email: string;
    phone: string;
    date_of_birth: string;
    residence_country: string;
  };
  forms: {
    id: string;
    form_number: string;
    status: string;
    total_amount: number;
    refund_amount: number;
    outlet_name: string;
    created_at: string;
    validated_at: string | null;
    issued_at: string | null;
  }[];
  total_forms: number;
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  CREATED: { label: 'Créé', color: 'text-gray-600', bg: 'bg-gray-100' },
  ISSUED: { label: 'Émis', color: 'text-amber-600', bg: 'bg-amber-100' },
  PENDING: { label: 'En attente', color: 'text-amber-600', bg: 'bg-amber-100' },
  VALIDATED: { label: 'Validé', color: 'text-emerald-600', bg: 'bg-emerald-100' },
  REFUSED: { label: 'Refusé', color: 'text-red-600', bg: 'bg-red-100' },
  REFUNDED: { label: 'Remboursé', color: 'text-purple-600', bg: 'bg-purple-100' },
  CANCELLED: { label: 'Annulé', color: 'text-gray-600', bg: 'bg-gray-100' },
};

const ITEMS_PER_PAGE = 5;

export default function TravelersPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTraveler, setSelectedTraveler] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: travelersData, isLoading } = useQuery({
    queryKey: ['merchant-travelers'],
    queryFn: () => merchantManageApi.travelers.list(),
  });

  const { data: travelerDetailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['merchant-traveler-detail', selectedTraveler],
    queryFn: () => merchantManageApi.travelers.get(selectedTraveler!),
    enabled: !!selectedTraveler,
  });

  const travelers: Traveler[] = travelersData?.data?.travelers || [];
  const travelerDetail: TravelerDetail | null = travelerDetailData?.data || null;

  const filteredTravelers = travelers.filter((t) => {
    const query = searchQuery.toLowerCase();
    return (
      t.first_name.toLowerCase().includes(query) ||
      t.last_name.toLowerCase().includes(query) ||
      t.passport_last4.includes(query) ||
      t.nationality_name.toLowerCase().includes(query)
    );
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredTravelers.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedTravelers = filteredTravelers.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when search changes
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    return new Date(dateStr).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const formatAmount = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' CDF';
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Voyageurs</h1>
          <p className="text-sm text-gray-500 mt-1">
            Historique des voyageurs ayant effectué des achats
          </p>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full">
          <UserGroupIcon className="w-4 h-4" />
          <span className="text-sm font-medium">{travelers.length} voyageurs</span>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par nom, passeport, nationalité..."
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
        />
      </div>

      {/* Travelers List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
          </div>
        ) : filteredTravelers.length === 0 ? (
          <div className="text-center py-12">
            <UserGroupIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucun voyageur trouvé</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Voyageur
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Nationalité
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Bordereaux
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    Total achats
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                    TVA
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Dernière visite
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedTravelers.map((traveler) => (
                  <tr key={traveler.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white font-medium">
                          {traveler.first_name[0]}{traveler.last_name[0]}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            {traveler.first_name} {traveler.last_name}
                          </p>
                          <p className="text-xs text-gray-500">***{traveler.passport_last4}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">{traveler.flag}</span>
                        <span className="text-sm text-gray-700">{traveler.nationality_name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-medium text-gray-900">{traveler.total_forms}</span>
                        <div className="flex items-center gap-0.5 ml-2">
                          {traveler.status_breakdown.validated > 0 && (
                            <span className="w-2 h-2 rounded-full bg-emerald-500" title={`${traveler.status_breakdown.validated} validés`}></span>
                          )}
                          {traveler.status_breakdown.pending > 0 && (
                            <span className="w-2 h-2 rounded-full bg-amber-500" title={`${traveler.status_breakdown.pending} en attente`}></span>
                          )}
                          {traveler.status_breakdown.refunded > 0 && (
                            <span className="w-2 h-2 rounded-full bg-purple-500" title={`${traveler.status_breakdown.refunded} remboursés`}></span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-medium text-gray-900">
                        {formatAmount(traveler.total_amount)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-emerald-600 font-medium">
                        {formatAmount(traveler.total_refund)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm text-gray-600">
                        {formatDate(traveler.last_visit)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => setSelectedTraveler(traveler.id)}
                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
                        title="Voir l'historique"
                      >
                        <EyeIcon className="w-5 h-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!isLoading && filteredTravelers.length > ITEMS_PER_PAGE && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
            <div className="text-sm text-gray-500">
              Affichage {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredTravelers.length)} sur {filteredTravelers.length} voyageurs
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-8 h-8 text-sm font-medium rounded-lg transition-colors ${
                      currentPage === page
                        ? 'bg-emerald-600 text-white'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {page}
                  </button>
                ))}
              </div>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Traveler Detail Modal */}
      {selectedTraveler && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-100">
              <div className="flex items-center gap-4">
                {travelerDetail && (
                  <>
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center text-white text-xl font-medium">
                      {travelerDetail.traveler.first_name[0]}{travelerDetail.traveler.last_name[0]}
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {travelerDetail.traveler.first_name} {travelerDetail.traveler.last_name}
                      </h2>
                      <p className="text-sm text-gray-500">
                        Passeport: ***{travelerDetail.traveler.passport_last4}
                      </p>
                    </div>
                  </>
                )}
              </div>
              <button
                onClick={() => setSelectedTraveler(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <XMarkIcon className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
              {isLoadingDetail ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
                </div>
              ) : travelerDetail ? (
                <div className="space-y-6">
                  {/* Traveler Info */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Email</p>
                      <p className="text-sm font-medium text-gray-900">
                        {travelerDetail.traveler.email || '-'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Téléphone</p>
                      <p className="text-sm font-medium text-gray-900">
                        {travelerDetail.traveler.phone || '-'}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Nationalité</p>
                      <p className="text-sm font-medium text-gray-900">
                        {travelerDetail.traveler.nationality}
                      </p>
                    </div>
                    <div className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">Total bordereaux</p>
                      <p className="text-sm font-medium text-gray-900">
                        {travelerDetail.total_forms}
                      </p>
                    </div>
                  </div>

                  {/* Forms History */}
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
                      <DocumentTextIcon className="w-5 h-5 text-gray-400" />
                      Historique des bordereaux
                    </h3>
                    <div className="space-y-3">
                      {travelerDetail.forms.map((form) => (
                        <div
                          key={form.id}
                          className="bg-white border border-gray-200 rounded-xl p-4 hover:border-emerald-200 transition-colors"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div>
                                <p className="font-medium text-gray-900">{form.form_number}</p>
                                <p className="text-xs text-gray-500">{form.outlet_name}</p>
                              </div>
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[form.status]?.bg} ${statusConfig[form.status]?.color}`}>
                                {statusConfig[form.status]?.label || form.status}
                              </span>
                            </div>
                            <div className="text-right">
                              <p className="font-medium text-gray-900">{formatAmount(form.total_amount)}</p>
                              <p className="text-xs text-emerald-600">TVA: {formatAmount(form.refund_amount)}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                            <div className="flex items-center gap-1">
                              <CalendarDaysIcon className="w-4 h-4" />
                              Créé le {formatDate(form.created_at)}
                            </div>
                            {form.validated_at && (
                              <div className="flex items-center gap-1 text-emerald-600">
                                <CheckCircleIcon className="w-4 h-4" />
                                Validé le {formatDate(form.validated_at)}
                              </div>
                            )}
                            {form.issued_at && (
                              <div className="flex items-center gap-1 text-blue-600">
                                <BanknotesIcon className="w-4 h-4" />
                                Émis le {formatDate(form.issued_at)}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      )}
      </div>
    </FadeIn>
  );
}
