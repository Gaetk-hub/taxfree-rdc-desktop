import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import FadeIn from '../../components/ui/FadeIn';
import { usePermissions } from '../../hooks/usePermissions';
import {
  MapPinIcon,
  PlusIcon,
  PencilIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  PhoneIcon,
  EnvelopeIcon,
  UserGroupIcon,
  CheckCircleIcon,
  XCircleIcon,
  GlobeAltIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';

interface Border {
  id: string;
  code: string;
  name: string;
  type: string;
  type_display: string;
  address: string;
  city: string;
  province: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  phone: string;
  email: string;
  manager_name: string;
  operating_hours: string;
  is_24h: boolean;
  daily_capacity: number;
  is_active: boolean;
  agents_count: number;
  validations_today: number;
  created_at: string;
}

const borderTypes = [
  { value: 'AIRPORT', label: 'Aéroport' },
  { value: 'LAND_BORDER', label: 'Frontière terrestre' },
  { value: 'PORT', label: 'Port maritime/fluvial' },
  { value: 'RAIL', label: 'Gare ferroviaire' },
];

const ITEMS_PER_PAGE = 5;

export default function BordersPage() {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [showForm, setShowForm] = useState(false);
  const [editingBorder, setEditingBorder] = useState<Border | null>(null);
  const [selectedBorder, setSelectedBorder] = useState<Border | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');

  // Permission checks
  const canCreate = isSuperAdmin || hasPermission('BORDERS', 'CREATE');
  const canEdit = isSuperAdmin || hasPermission('BORDERS', 'EDIT');
  const [currentPage, setCurrentPage] = useState(1);

  const { data: bordersData, isLoading } = useQuery({
    queryKey: ['admin-borders'],
    queryFn: async () => {
      const response = await api.get('/customs/points-of-exit/');
      return response.data;
    },
  });

  const borders: Border[] = bordersData?.results || bordersData || [];

  const filteredBorders = borders.filter((border) => {
    const matchesSearch = searchQuery === '' ||
      border.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      border.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      border.city.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesType = typeFilter === 'all' || border.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  // Pagination logic
  const totalPages = Math.ceil(filteredBorders.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedBorders = filteredBorders.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  // Reset to page 1 when filters change
  const handleSearch = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleTypeFilter = (value: string) => {
    setTypeFilter(value);
    setCurrentPage(1);
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Border>) => api.post('/customs/points-of-exit/', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-borders'] });
      toast.success('Frontière créée avec succès');
      setShowForm(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Border> }) =>
      api.patch(`/customs/points-of-exit/${id}/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-borders'] });
      toast.success('Frontière mise à jour');
      setEditingBorder(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erreur lors de la mise à jour');
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, is_active }: { id: string; is_active: boolean }) =>
      api.patch(`/customs/points-of-exit/${id}/`, { is_active }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-borders'] });
      toast.success('Statut mis à jour');
      setSelectedBorder(null);
    },
  });

  const handleSubmit = (data: Partial<Border>) => {
    if (editingBorder) {
      updateMutation.mutate({ id: editingBorder.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'AIRPORT': return '✈️';
      case 'LAND_BORDER': return '🚗';
      case 'PORT': return '🚢';
      case 'RAIL': return '🚂';
      default: return '📍';
    }
  };

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Frontières</h1>
          <p className="text-sm text-gray-500 mt-1">
            Gérez les points de sortie (aéroports, frontières terrestres, ports)
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          disabled={!canCreate}
          title={!canCreate ? "Vous n'avez pas la permission de créer des frontières" : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
            canCreate
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <PlusIcon className="w-5 h-5" />
          Ajouter une frontière
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, code, ville..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => handleTypeFilter(e.target.value)}
          className="px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">Tous les types</option>
          {borderTypes.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Total frontières</p>
          <p className="text-2xl font-semibold text-gray-900">{borders.length}</p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Actives</p>
          <p className="text-2xl font-semibold text-green-600">
            {borders.filter(b => b.is_active).length}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Agents déployés</p>
          <p className="text-2xl font-semibold text-blue-600">
            {borders.reduce((sum, b) => sum + (b.agents_count || 0), 0)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-4 border border-gray-100">
          <p className="text-sm text-gray-500">Validations aujourd'hui</p>
          <p className="text-2xl font-semibold text-purple-600">
            {borders.reduce((sum, b) => sum + (b.validations_today || 0), 0)}
          </p>
        </div>
      </div>

      {/* Borders List */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : filteredBorders.length === 0 ? (
          <div className="text-center py-12">
            <MapPinIcon className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500">Aucune frontière trouvée</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Frontière</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Localisation</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Agents</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Validations</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Statut</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {paginatedBorders.map((border) => (
                  <tr key={border.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center text-xl">
                          {getTypeIcon(border.type)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{border.name}</p>
                          <p className="text-xs text-gray-500">Code: {border.code}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-700">{border.type_display || border.type}</span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-900">{border.city}</p>
                      <p className="text-xs text-gray-500">{border.province}</p>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-50 text-blue-700 rounded-full text-sm">
                        <UserGroupIcon className="w-4 h-4" />
                        {border.agents_count || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="text-sm font-medium text-gray-900">
                        {border.validations_today || 0}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        border.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-red-100 text-red-700'
                      }`}>
                        {border.is_active ? 'Actif' : 'Inactif'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setSelectedBorder(border)}
                          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"
                          title="Voir détails"
                        >
                          <GlobeAltIcon className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setEditingBorder(border)}
                          disabled={!canEdit}
                          title={!canEdit ? "Vous n'avez pas la permission de modifier" : "Modifier"}
                          className={`p-2 rounded-lg ${
                            canEdit
                              ? 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <PencilIcon className="w-5 h-5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Affichage {startIndex + 1} - {Math.min(startIndex + ITEMS_PER_PAGE, filteredBorders.length)} sur {filteredBorders.length}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Précédent
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-8 h-8 text-sm rounded-lg ${
                    currentPage === page
                      ? 'bg-blue-600 text-white'
                      : 'border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {page}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Suivant
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create/Edit Form Modal */}
      {(showForm || editingBorder) && (
        <BorderForm
          border={editingBorder}
          onSubmit={handleSubmit}
          onCancel={() => { setShowForm(false); setEditingBorder(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Detail Modal */}
      {selectedBorder && (
        <BorderDetailModal
          border={selectedBorder}
          onClose={() => setSelectedBorder(null)}
          onToggleActive={(is_active) => toggleActiveMutation.mutate({ id: selectedBorder.id, is_active })}
          onEdit={() => { setEditingBorder(selectedBorder); setSelectedBorder(null); }}
        />
      )}
      </div>
    </FadeIn>
  );
}

interface BorderFormProps {
  border: Border | null;
  onSubmit: (data: Partial<Border>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function BorderForm({ border, onSubmit, onCancel, isLoading }: BorderFormProps) {
  const { register, handleSubmit, watch, setValue, formState: { errors } } = useForm({
    defaultValues: border || {
      code: '',
      name: '',
      type: 'LAND_BORDER',
      address: '',
      city: '',
      province: '',
      phone: '',
      email: '',
      manager_name: '',
      operating_hours: '',
      is_24h: false,
      daily_capacity: 0,
    },
  });

  // Watch is_24h to auto-fill operating_hours
  const is24h = watch('is_24h');
  
  const handleIs24hChange = (checked: boolean) => {
    setValue('is_24h', checked);
    if (checked) {
      setValue('operating_hours', '24h/24 - 7j/7');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <MapPinIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {border ? 'Modifier la frontière' : 'Nouvelle frontière'}
              </h3>
              <p className="text-blue-100 text-sm">Remplissez les informations</p>
            </div>
          </div>
          <button onClick={onCancel} className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          <div className="space-y-6">
            {/* Identification */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Identification</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code *</label>
                  <input
                    {...register('code', { required: 'Code requis' })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: FZAA"
                  />
                  {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                  <select
                    {...register('type', { required: 'Type requis' })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  >
                    {borderTypes.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nom *</label>
                  <input
                    {...register('name', { required: 'Nom requis' })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="Ex: Aéroport International de N'djili"
                  />
                  {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
                </div>
              </div>
            </div>

            {/* Location */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Localisation</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                  <input
                    {...register('address')}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ville *</label>
                  <input
                    {...register('city', { required: 'Ville requise' })}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                  {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Province</label>
                  <input
                    {...register('province')}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Contact */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Contact</h4>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                  <input
                    {...register('phone')}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                  <input
                    {...register('manager_name')}
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Operations */}
            <div>
              <h4 className="text-sm font-semibold text-gray-900 mb-3">Opérations</h4>
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl cursor-pointer hover:bg-blue-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={is24h}
                      onChange={(e) => handleIs24hChange(e.target.checked)}
                      className="w-5 h-5 text-blue-600 rounded"
                    />
                    <div>
                      <span className="text-sm font-medium text-gray-900">Ouvert 24h/24</span>
                      <p className="text-xs text-gray-500">Cochez si la frontière est ouverte en permanence</p>
                    </div>
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Heures d'ouverture</label>
                  <input
                    {...register('operating_hours')}
                    disabled={is24h}
                    className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 ${
                      is24h ? 'bg-gray-100 text-gray-500' : ''
                    }`}
                    placeholder={is24h ? '24h/24 - 7j/7' : 'Ex: 06h00 - 22h00'}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Capacité journalière</label>
                  <input
                    {...register('daily_capacity', { valueAsNumber: true })}
                    type="number"
                    className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500"
                    placeholder="Nombre de voyageurs/jour"
                  />
                  <p className="text-xs text-gray-500 mt-1">Optionnel - pour les statistiques</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t border-gray-100 flex justify-end gap-3">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Enregistrement...' : border ? 'Mettre à jour' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface BorderDetailModalProps {
  border: Border;
  onClose: () => void;
  onToggleActive: (is_active: boolean) => void;
  onEdit: () => void;
}

function BorderDetailModal({ border, onClose, onToggleActive, onEdit }: BorderDetailModalProps) {
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'AIRPORT': return '✈️';
      case 'LAND_BORDER': return '🚗';
      case 'PORT': return '🚢';
      case 'RAIL': return '🚂';
      default: return '📍';
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center text-3xl">
              {getTypeIcon(border.type)}
            </div>
            <div>
              <h3 className="text-xl font-semibold text-white">{border.name}</h3>
              <p className="text-blue-100">Code: {border.code}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center">
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Type</p>
              <p className="font-medium text-gray-900">{border.type_display || border.type}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Statut</p>
              <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${
                border.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
              }`}>
                {border.is_active ? '✓ Actif' : '✗ Inactif'}
              </span>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Localisation</p>
              <div className="flex items-start gap-2">
                <MapPinIcon className="w-4 h-4 text-blue-500 mt-0.5" />
                <div>
                  {border.address && <p className="text-gray-900">{border.address}</p>}
                  <p className="text-gray-700">{border.city}{border.province ? `, ${border.province}` : ''}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Contact</p>
              <div className="space-y-1">
                {border.phone && (
                  <div className="flex items-center gap-2">
                    <PhoneIcon className="w-4 h-4 text-green-500" />
                    <span className="text-gray-900">{border.phone}</span>
                  </div>
                )}
                {border.email && (
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="w-4 h-4 text-blue-500" />
                    <span className="text-gray-900">{border.email}</span>
                  </div>
                )}
                {border.manager_name && (
                  <p className="text-sm text-gray-600">Responsable: {border.manager_name}</p>
                )}
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Agents déployés</p>
              <div className="flex items-center gap-2">
                <UserGroupIcon className="w-5 h-5 text-blue-500" />
                <span className="text-2xl font-semibold text-gray-900">{border.agents_count || 0}</span>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs font-medium text-gray-500 uppercase mb-2">Validations aujourd'hui</p>
              <span className="text-2xl font-semibold text-purple-600">{border.validations_today || 0}</span>
            </div>
            {border.operating_hours && (
              <div className="bg-gray-50 rounded-xl p-4 col-span-2">
                <p className="text-xs font-medium text-gray-500 uppercase mb-2">Heures d'ouverture</p>
                <p className="text-gray-900">
                  {border.is_24h ? '24h/24' : border.operating_hours}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
            Fermer
          </button>
          <button onClick={onEdit} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            <PencilIcon className="w-4 h-4" />
            Modifier
          </button>
          {border.is_active ? (
            <button
              onClick={() => onToggleActive(false)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
            >
              <XCircleIcon className="w-4 h-4" />
              Désactiver
            </button>
          ) : (
            <button
              onClick={() => onToggleActive(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              <CheckCircleIcon className="w-4 h-4" />
              Activer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
