import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import toast from 'react-hot-toast';
import FadeIn from '../../../components/ui/FadeIn';
import {
  BuildingStorefrontIcon,
  PlusIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  MapPinIcon,
  PhoneIcon,
  BuildingOfficeIcon,
  XMarkIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { merchantManageApi, type Outlet } from '../../../services/api';
import { useAuthStore } from '../../../store/authStore';

export default function OutletsPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingOutlet, setEditingOutlet] = useState<Outlet | null>(null);
  const [selectedOutlet, setSelectedOutlet] = useState<Outlet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 5;

  const { data: outletsResponse, isLoading } = useQuery({
    queryKey: ['my-outlets'],
    queryFn: async () => {
      const response = await merchantManageApi.outlets.list();
      console.log('Outlets API response:', response.data);
      return response.data;
    },
  });
  
  // Handle both paginated (results array) and non-paginated (direct array) responses
  const allOutlets: Outlet[] = Array.isArray(outletsResponse) 
    ? outletsResponse 
    : ((outletsResponse as any)?.results || []);
  
  // Filter outlets based on search and status
  const filteredOutlets = allOutlets.filter((outlet) => {
    const matchesSearch = searchQuery === '' || 
      outlet.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      outlet.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      outlet.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      outlet.address_line1?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && outlet.is_active) ||
      (statusFilter === 'inactive' && !outlet.is_active);
    
    return matchesSearch && matchesStatus;
  });
  
  // Pagination
  const totalPages = Math.ceil(filteredOutlets.length / ITEMS_PER_PAGE);
  const paginatedOutlets = filteredOutlets.slice(
    (page - 1) * ITEMS_PER_PAGE,
    page * ITEMS_PER_PAGE
  );
  
  // Reset page when filters change
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setPage(1);
  };
  
  const handleStatusChange = (value: 'all' | 'active' | 'inactive') => {
    setStatusFilter(value);
    setPage(1);
  };

  const createMutation = useMutation({
    mutationFn: (data: Partial<Outlet>) => merchantManageApi.outlets.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-outlets'] });
      toast.success('Point de vente créé avec succès');
      setShowForm(false);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Outlet> }) => 
      merchantManageApi.outlets.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-outlets'] });
      toast.success('Point de vente mis à jour');
      setEditingOutlet(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erreur lors de la mise à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => merchantManageApi.outlets.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-outlets'] });
      toast.success('Point de vente désactivé');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || 'Erreur lors de la désactivation');
    },
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => merchantManageApi.outlets.activate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['my-outlets'] });
      toast.success('Point de vente réactivé');
    },
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <FadeIn duration={400}>
      <div>
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Points de vente</h1>
        <p className="text-gray-500 mt-1">Gérez vos différents points de vente et succursales</p>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="flex items-center gap-3 flex-wrap">
          {/* Search */}
          <div className="relative">
            <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher..."
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <FunnelIcon className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => handleStatusChange(e.target.value as 'all' | 'active' | 'inactive')}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Tous les statuts</option>
              <option value="active">Actifs</option>
              <option value="inactive">Inactifs</option>
            </select>
          </div>
          
          <span className="text-sm text-gray-500">
            {filteredOutlets.length} point(s) de vente
          </span>
        </div>
        
        <button
          onClick={() => { setShowForm(true); setEditingOutlet(null); }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <PlusIcon className="w-5 h-5" />
          Ajouter un point de vente
        </button>
      </div>

      {/* Form Modal */}
      {(showForm || editingOutlet) && (
        <OutletForm
          outlet={editingOutlet}
          onSubmit={(data) => {
            if (editingOutlet) {
              updateMutation.mutate({ id: editingOutlet.id, data });
            } else {
              createMutation.mutate(data);
            }
          }}
          onCancel={() => { setShowForm(false); setEditingOutlet(null); }}
          isLoading={createMutation.isPending || updateMutation.isPending}
        />
      )}

      {/* Outlets Table */}
      {paginatedOutlets.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Point de vente</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Code</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ville</th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-center text-xs font-semibold text-gray-600 uppercase tracking-wider">Statut</th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-600 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {paginatedOutlets.map((outlet: Outlet) => (
                <tr 
                  key={outlet.id} 
                  className={`hover:bg-blue-50/50 cursor-pointer transition-colors ${
                    selectedOutlet?.id === outlet.id ? 'bg-blue-50' : ''
                  } ${!outlet.is_active ? 'bg-gray-50 opacity-60' : ''}`}
                  onClick={() => setSelectedOutlet(selectedOutlet?.id === outlet.id ? null : outlet)}
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                        <BuildingStorefrontIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{outlet.name}</p>
                        <p className="text-xs text-gray-500">{outlet.address_line1}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2.5 py-1 bg-gray-100 text-gray-700 text-sm font-mono rounded-md">
                      {outlet.code}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">{outlet.city}</td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {outlet.phone || outlet.email || <span className="text-gray-400">-</span>}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`inline-flex px-2.5 py-1 text-xs font-medium rounded-full ${
                      outlet.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {outlet.is_active ? 'Actif' : 'Inactif'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setEditingOutlet(outlet)}
                        className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors"
                        title="Modifier"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      {outlet.is_active ? (
                        <button
                          onClick={() => deleteMutation.mutate(outlet.id)}
                          disabled={deleteMutation.isPending}
                          className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                          title="Désactiver"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => activateMutation.mutate(outlet.id)}
                          disabled={activateMutation.isPending}
                          className="p-2 text-green-600 hover:bg-green-100 rounded-lg transition-colors"
                          title="Réactiver"
                        >
                          <CheckCircleIcon className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-200 bg-gray-50">
              <p className="text-sm text-gray-600">
                Affichage de {(page - 1) * ITEMS_PER_PAGE + 1} à {Math.min(page * ITEMS_PER_PAGE, filteredOutlets.length)} sur {filteredOutlets.length}
              </p>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="w-4 h-4" />
                  Précédent
                </button>
                <span className="px-3 py-1.5 text-sm font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page === totalPages}
                  className="flex items-center gap-1 px-3 py-1.5 border border-gray-300 rounded-lg text-sm hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Suivant
                  <ChevronRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-xl">
          <BuildingStorefrontIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {allOutlets.length === 0 ? 'Aucun point de vente' : 'Aucun résultat'}
          </h3>
          <p className="text-gray-500 mb-4">
            {allOutlets.length === 0 
              ? 'Créez votre premier point de vente pour commencer'
              : 'Aucun point de vente ne correspond à vos critères de recherche'}
          </p>
          {allOutlets.length === 0 && (
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <PlusIcon className="w-5 h-5" />
              Ajouter un point de vente
            </button>
          )}
        </div>
      )}

      {/* Detail Panel */}
      {/* Modal de détails du point de vente */}
      {selectedOutlet && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
                  <BuildingStorefrontIcon className="w-7 h-7 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white">{selectedOutlet.name}</h3>
                  <p className="text-blue-100">Code: {selectedOutlet.code}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedOutlet(null)}
                className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
              >
                <XMarkIcon className="w-6 h-6 text-white" />
              </button>
            </div>
            
            {/* Content */}
            <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)]">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Adresse */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Adresse</p>
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <MapPinIcon className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{selectedOutlet.address_line1}</p>
                      {selectedOutlet.address_line2 && <p className="text-gray-600">{selectedOutlet.address_line2}</p>}
                      <p className="text-gray-600">{selectedOutlet.city}{selectedOutlet.province ? `, ${selectedOutlet.province}` : ''}</p>
                    </div>
                  </div>
                </div>
                
                {/* Téléphone */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Téléphone</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                      <PhoneIcon className="w-4 h-4 text-green-600" />
                    </div>
                    <p className="font-medium text-gray-900">{selectedOutlet.phone || <span className="text-gray-400">Non renseigné</span>}</p>
                  </div>
                </div>
                
                {/* Email */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Email</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                      <BuildingOfficeIcon className="w-4 h-4 text-purple-600" />
                    </div>
                    <p className="font-medium text-gray-900">{selectedOutlet.email || <span className="text-gray-400">Non renseigné</span>}</p>
                  </div>
                </div>
                
                {/* Statut */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Statut</p>
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                      selectedOutlet.is_active ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      <CheckCircleIcon className={`w-4 h-4 ${
                        selectedOutlet.is_active ? 'text-green-600' : 'text-red-600'
                      }`} />
                    </div>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      selectedOutlet.is_active 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-red-100 text-red-700'
                    }`}>
                      {selectedOutlet.is_active ? '✓ Actif' : '✗ Inactif'}
                    </span>
                  </div>
                </div>
                
                {/* Date de création */}
                <div className="bg-gray-50 rounded-xl p-4 md:col-span-2">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wider mb-2">Date de création</p>
                  <p className="font-medium text-gray-900">
                    {selectedOutlet.created_at 
                      ? new Date(selectedOutlet.created_at).toLocaleDateString('fr-FR', { 
                          weekday: 'long',
                          day: 'numeric', 
                          month: 'long', 
                          year: 'numeric' 
                        })
                      : '-'}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Actions */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3">
              <button
                onClick={() => setSelectedOutlet(null)}
                className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Fermer
              </button>
              <button
                onClick={() => { setEditingOutlet(selectedOutlet); setSelectedOutlet(null); }}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PencilIcon className="w-4 h-4" />
                Modifier
              </button>
              {selectedOutlet.is_active ? (
                <button
                  onClick={() => { deleteMutation.mutate(selectedOutlet.id); setSelectedOutlet(null); }}
                  disabled={deleteMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  <TrashIcon className="w-4 h-4" />
                  Désactiver
                </button>
              ) : (
                <button
                  onClick={() => { activateMutation.mutate(selectedOutlet.id); setSelectedOutlet(null); }}
                  disabled={activateMutation.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <CheckCircleIcon className="w-4 h-4" />
                  Réactiver
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      </div>
    </FadeIn>
  );
}

interface OutletFormProps {
  outlet: Outlet | null;
  onSubmit: (data: Partial<Outlet>) => void;
  onCancel: () => void;
  isLoading: boolean;
}

function OutletForm({ outlet, onSubmit, onCancel, isLoading }: OutletFormProps) {
  const { user } = useAuthStore();
  const [useCompanyEmail, setUseCompanyEmail] = useState(false);
  const [useCompanyPhone, setUseCompanyPhone] = useState(false);
  
  // Get merchant info from user
  const merchantEmail = user?.email || '';
  const merchantPhone = user?.phone || '';
  
  const { register, handleSubmit, setValue, formState: { errors } } = useForm({
    defaultValues: outlet || {
      name: '',
      code: '',
      address_line1: '',
      address_line2: '',
      city: '',
      province: '',
      phone: '',
      email: '',
    },
  });

  const handleUseCompanyEmail = (checked: boolean) => {
    setUseCompanyEmail(checked);
    if (checked && merchantEmail) {
      setValue('email', merchantEmail);
    } else if (!checked) {
      setValue('email', '');
    }
  };

  const handleUseCompanyPhone = (checked: boolean) => {
    setUseCompanyPhone(checked);
    if (checked && merchantPhone) {
      setValue('phone', merchantPhone);
    } else if (!checked) {
      setValue('phone', '');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <BuildingStorefrontIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {outlet ? 'Modifier le point de vente' : 'Nouveau point de vente'}
              </h3>
              <p className="text-blue-100 text-sm">Remplissez les informations de votre succursale</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <XMarkIcon className="w-5 h-5 text-white" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit(onSubmit)} className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Section: Informations générales */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <BuildingOfficeIcon className="w-4 h-4 text-blue-600" />
              Informations générales
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Nom du point de vente <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('name', { required: 'Nom requis' })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                  placeholder="Ex: Boutique Centre-Ville"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Code unique <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('code', { required: 'Code requis' })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white uppercase"
                  placeholder="Ex: BCV01"
                />
                {errors.code && <p className="text-red-500 text-xs mt-1">{errors.code.message}</p>}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Ville <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('city', { required: 'Ville requise' })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                  placeholder="Ex: Kinshasa"
                />
                {errors.city && <p className="text-red-500 text-xs mt-1">{errors.city.message}</p>}
              </div>
            </div>
          </div>

          {/* Section: Adresse */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <MapPinIcon className="w-4 h-4 text-blue-600" />
              Adresse
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Adresse principale <span className="text-red-500">*</span>
                </label>
                <input
                  {...register('address_line1', { required: 'Adresse requise' })}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                  placeholder="Ex: 123 Avenue de la Paix"
                />
                {errors.address_line1 && <p className="text-red-500 text-xs mt-1">{errors.address_line1.message}</p>}
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Complément d'adresse</label>
                <input
                  {...register('address_line2')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                  placeholder="Ex: Bâtiment A, 2ème étage"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Province</label>
                <input
                  {...register('province')}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-gray-50 focus:bg-white"
                  placeholder="Ex: Kinshasa"
                />
              </div>
            </div>
          </div>

          {/* Section: Contact */}
          <div className="mb-6">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <PhoneIcon className="w-4 h-4 text-blue-600" />
              Contact
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Téléphone */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                <input
                  {...register('phone')}
                  disabled={useCompanyPhone}
                  className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    useCompanyPhone ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 focus:bg-white'
                  }`}
                  placeholder="Ex: +243 XXX XXX XXX"
                />
                {merchantPhone && (
                  <label className="flex items-center gap-2 mt-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={useCompanyPhone}
                      onChange={(e) => handleUseCompanyPhone(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-500 group-hover:text-gray-700">
                      Utiliser le téléphone de l'entreprise ({merchantPhone})
                    </span>
                  </label>
                )}
              </div>
              
              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                <input
                  type="email"
                  {...register('email')}
                  disabled={useCompanyEmail}
                  className={`w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all ${
                    useCompanyEmail ? 'bg-blue-50 text-blue-700' : 'bg-gray-50 focus:bg-white'
                  }`}
                  placeholder="Ex: boutique@exemple.com"
                />
                {merchantEmail && (
                  <label className="flex items-center gap-2 mt-2 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={useCompanyEmail}
                      onChange={(e) => handleUseCompanyEmail(e.target.checked)}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs text-gray-500 group-hover:text-gray-700">
                      Utiliser l'email de l'entreprise ({merchantEmail})
                    </span>
                  </label>
                )}
              </div>
            </div>
          </div>
        </form>
        
        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 font-medium transition-colors"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={isLoading}
            onClick={handleSubmit(onSubmit)}
            className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 font-medium disabled:opacity-50 transition-all shadow-lg shadow-blue-500/25"
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Enregistrement...
              </span>
            ) : (
              outlet ? 'Mettre à jour' : 'Créer le point de vente'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
