import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rulesApi } from '../../services/api';
import toast from 'react-hot-toast';
import FadeIn from '../../components/ui/FadeIn';
import { usePermissions } from '../../hooks/usePermissions';
import {
  PlusIcon,
  PencilIcon,
  XMarkIcon,
  CheckIcon,
  XCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
} from '@heroicons/react/24/outline';

interface Currency {
  id: string;
  code: string;
  name: string;
  symbol: string;
  exchange_rate: string;
  is_base_currency: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface RateHistory {
  id: string;
  old_rate: string;
  new_rate: string;
  changed_by_name: string;
  reason: string;
  changed_at: string;
}

export default function CurrenciesManagementPage() {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [showModal, setShowModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [editingCurrency, setEditingCurrency] = useState<Currency | null>(null);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency | null>(null);
  const [historyData, setHistoryData] = useState<RateHistory[]>([]);

  // Permission checks - Devises uses CATEGORIES module
  const canCreate = isSuperAdmin || hasPermission('CATEGORIES', 'CREATE');
  const canEdit = isSuperAdmin || hasPermission('CATEGORIES', 'EDIT');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    symbol: '',
    exchange_rate: '1.000000',
    is_base_currency: false,
    is_active: true,
    reason: '',
  });

  const { data: currenciesData, isLoading } = useQuery({
    queryKey: ['currencies'],
    queryFn: () => rulesApi.listCurrencies(),
  });

  const currencies: Currency[] = currenciesData?.data?.results || currenciesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => rulesApi.createCurrency(data),
    onSuccess: () => {
      toast.success('Devise créée avec succès');
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.code?.[0] || error.response?.data?.detail || 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) => 
      rulesApi.updateCurrency(id, data),
    onSuccess: () => {
      toast.success('Devise mise à jour');
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
      closeModal();
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => rulesApi.toggleCurrencyActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['currencies'] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || 'Erreur');
    },
  });

  const openCreateModal = () => {
    setEditingCurrency(null);
    setFormData({
      code: '',
      name: '',
      symbol: '',
      exchange_rate: '1.000000',
      is_base_currency: currencies.length === 0,
      is_active: true,
      reason: '',
    });
    setShowModal(true);
  };

  const openEditModal = (currency: Currency) => {
    setEditingCurrency(currency);
    setFormData({
      code: currency.code,
      name: currency.name,
      symbol: currency.symbol,
      exchange_rate: currency.exchange_rate,
      is_base_currency: currency.is_base_currency,
      is_active: currency.is_active,
      reason: '',
    });
    setShowModal(true);
  };

  const openHistoryModal = async (currency: Currency) => {
    setSelectedCurrency(currency);
    try {
      const response = await rulesApi.getCurrencyHistory(currency.id);
      setHistoryData(response.data.history || []);
      setShowHistoryModal(true);
    } catch {
      toast.error('Erreur lors du chargement de l\'historique');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCurrency(null);
  };

  const closeHistoryModal = () => {
    setShowHistoryModal(false);
    setSelectedCurrency(null);
    setHistoryData([]);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCurrency) {
      updateMutation.mutate({ id: editingCurrency.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <FadeIn>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestion des Devises</h1>
            <p className="text-gray-600 mt-1">
              Configurez les devises disponibles pour les remboursements
            </p>
          </div>
          <button
            onClick={openCreateModal}
            disabled={!canCreate}
            title={!canCreate ? "Vous n'avez pas la permission de créer des devises" : undefined}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              canCreate
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-200 text-gray-400 cursor-not-allowed'
            }`}
          >
            <PlusIcon className="h-5 w-5" />
            Ajouter une devise
          </button>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CurrencyDollarIcon className="h-6 w-6 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-medium text-blue-900">Configuration des taux de change</h3>
              <p className="text-sm text-blue-700 mt-1">
                Le taux de change indique combien d'unités de la devise étrangère correspondent à 1 CDF.
                Par exemple, si 1 USD = 2800 CDF, le taux sera 0.000357 (1/2800).
                <br />
                <strong>Formule :</strong> Montant en devise = Montant CDF × Taux de change
              </p>
            </div>
          </div>
        </div>

        {/* Currencies Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Devise
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Symbole
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Taux de change
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Équivalent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currencies.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <CurrencyDollarIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p className="text-lg font-medium">Aucune devise configurée</p>
                    <p className="text-sm mt-1">Commencez par ajouter la devise de base (CDF)</p>
                  </td>
                </tr>
              ) : (
                currencies.map((currency) => (
                  <tr key={currency.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold">
                          {currency.code.substring(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900 flex items-center gap-2">
                            {currency.code}
                            {currency.is_base_currency && (
                              <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">
                                Base
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">{currency.name}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-lg font-medium">{currency.symbol}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-mono text-sm">
                        {currency.is_base_currency ? '1.000000' : currency.exchange_rate}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                      {currency.is_base_currency ? (
                        <span className="text-gray-400">-</span>
                      ) : (
                        <span>
                          1 {currency.code} = {Math.round(1 / parseFloat(currency.exchange_rate)).toLocaleString()} CDF
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {currency.is_active ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700">
                          <CheckIcon className="h-3 w-3" />
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                          <XCircleIcon className="h-3 w-3" />
                          Inactive
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openHistoryModal(currency)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Historique des taux"
                        >
                          <ClockIcon className="h-5 w-5" />
                        </button>
                        <button
                          onClick={() => openEditModal(currency)}
                          disabled={!canEdit}
                          title={!canEdit ? "Vous n'avez pas la permission de modifier" : "Modifier"}
                          className={`p-2 rounded-lg transition-colors ${
                            canEdit
                              ? 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <PencilIcon className="h-5 w-5" />
                        </button>
                        {!currency.is_base_currency && (
                          <button
                            onClick={() => toggleActiveMutation.mutate(currency.id)}
                            className={`p-2 rounded-lg transition-colors ${
                              currency.is_active
                                ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
                                : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                            }`}
                            title={currency.is_active ? 'Désactiver' : 'Activer'}
                          >
                            {currency.is_active ? (
                              <XCircleIcon className="h-5 w-5" />
                            ) : (
                              <CheckIcon className="h-5 w-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Create/Edit Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md mx-4">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">
                  {editingCurrency ? 'Modifier la devise' : 'Nouvelle devise'}
                </h2>
                <button onClick={closeModal} className="p-2 hover:bg-gray-100 rounded-lg">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Code (3 lettres)
                    </label>
                    <input
                      type="text"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      maxLength={3}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 uppercase"
                      placeholder="USD"
                      required
                      disabled={!!editingCurrency}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Symbole
                    </label>
                    <input
                      type="text"
                      value={formData.symbol}
                      onChange={(e) => setFormData({ ...formData, symbol: e.target.value })}
                      maxLength={10}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="$"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Nom de la devise
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Dollar américain"
                    required
                  />
                </div>

                {!formData.is_base_currency && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Taux de change (1 CDF = X {formData.code || 'devise'})
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      min="0.000001"
                      value={formData.exchange_rate}
                      onChange={(e) => setFormData({ ...formData, exchange_rate: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono"
                      required
                    />
                    {formData.exchange_rate && parseFloat(formData.exchange_rate) > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        Équivalent : 1 {formData.code || 'devise'} = {Math.round(1 / parseFloat(formData.exchange_rate)).toLocaleString()} CDF
                      </p>
                    )}
                  </div>
                )}

                {editingCurrency && !editingCurrency.is_base_currency && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Motif du changement de taux (optionnel)
                    </label>
                    <input
                      type="text"
                      value={formData.reason}
                      onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Mise à jour du taux de marché"
                    />
                  </div>
                )}

                {!editingCurrency && currencies.length === 0 && (
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="is_base_currency"
                      checked={formData.is_base_currency}
                      onChange={(e) => setFormData({ ...formData, is_base_currency: e.target.checked })}
                      className="h-4 w-4 text-blue-600 rounded"
                    />
                    <label htmlFor="is_base_currency" className="text-sm text-gray-700">
                      Devise de base (CDF)
                    </label>
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 text-blue-600 rounded"
                    disabled={editingCurrency?.is_base_currency}
                  />
                  <label htmlFor="is_active" className="text-sm text-gray-700">
                    Devise active (disponible pour les remboursements)
                  </label>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    disabled={createMutation.isPending || updateMutation.isPending}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createMutation.isPending || updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* History Modal */}
        {showHistoryModal && selectedCurrency && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
              <div className="flex items-center justify-between p-4 border-b">
                <h2 className="text-lg font-semibold">
                  Historique des taux - {selectedCurrency.code}
                </h2>
                <button onClick={closeHistoryModal} className="p-2 hover:bg-gray-100 rounded-lg">
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4">
                {historyData.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <ClockIcon className="h-12 w-12 mx-auto text-gray-300 mb-4" />
                    <p>Aucun historique de modification</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {historyData.map((entry) => (
                      <div key={entry.id} className="bg-gray-50 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-sm text-red-600 line-through">
                              {entry.old_rate}
                            </span>
                            <span className="text-gray-400">→</span>
                            <span className="font-mono text-sm text-green-600 font-medium">
                              {entry.new_rate}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {formatDate(entry.changed_at)}
                          </span>
                        </div>
                        <div className="mt-1 text-sm text-gray-600">
                          Par : {entry.changed_by_name || 'Système'}
                        </div>
                        {entry.reason && (
                          <div className="mt-1 text-sm text-gray-500 italic">
                            "{entry.reason}"
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="p-4 border-t">
                <button
                  onClick={closeHistoryModal}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Fermer
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </FadeIn>
  );
}
