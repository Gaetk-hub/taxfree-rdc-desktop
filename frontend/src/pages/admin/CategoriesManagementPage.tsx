import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rulesApi } from '../../services/api';
import toast from 'react-hot-toast';
import FadeIn from '../../components/ui/FadeIn';
import { usePermissions } from '../../hooks/usePermissions';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  XMarkIcon,
  CheckIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface Category {
  id: string;
  code: string;
  name: string;
  description: string;
  icon: string;
  default_vat_rate: string;
  is_eligible_by_default: boolean;
  is_active: boolean;
  display_order: number;
}

const EMOJI_OPTIONS = ['📦', '📱', '👕', '💎', '💄', '🍔', '🚬', '🍷', '🛎️', '📋', '🎮', '🏠', '🚗', '✈️', '🎁', '🛍️', '💊', '📚', '🎨', '⚽'];

export default function CategoriesManagementPage() {
  const queryClient = useQueryClient();
  const { hasPermission, isSuperAdmin } = usePermissions();
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  
  // Permission checks
  const canCreate = isSuperAdmin || hasPermission('CATEGORIES', 'CREATE');
  const canEdit = isSuperAdmin || hasPermission('CATEGORIES', 'EDIT');
  const canDelete = isSuperAdmin || hasPermission('CATEGORIES', 'DELETE');

  const [formData, setFormData] = useState({
    code: '',
    name: '',
    description: '',
    icon: '📦',
    default_vat_rate: '16.00',
    is_eligible_by_default: true,
    is_active: true,
    display_order: 0,
  });

  const { data: categoriesData, isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => rulesApi.listCategories(),
  });

  const categories: Category[] = categoriesData?.data?.results || categoriesData?.data || [];

  const createMutation = useMutation({
    mutationFn: (data: typeof formData) => rulesApi.createCategory(data),
    onSuccess: () => {
      toast.success('Catégorie créée avec succès');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      closeModal();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.code?.[0] || 'Erreur lors de la création');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: typeof formData }) => 
      rulesApi.updateCategory(id, data),
    onSuccess: () => {
      toast.success('Catégorie mise à jour');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      closeModal();
    },
    onError: () => {
      toast.error('Erreur lors de la mise à jour');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => rulesApi.deleteCategory(id),
    onSuccess: () => {
      toast.success('Catégorie supprimée');
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
    onError: () => {
      toast.error('Erreur lors de la suppression');
    },
  });

  const toggleEligibilityMutation = useMutation({
    mutationFn: (id: string) => rulesApi.toggleCategoryEligibility(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => rulesApi.toggleCategoryActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
    },
  });

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      icon: '📦',
      default_vat_rate: '16.00',
      is_eligible_by_default: true,
      is_active: true,
      display_order: categories.length + 1,
    });
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      code: category.code,
      name: category.name,
      description: category.description,
      icon: category.icon,
      default_vat_rate: category.default_vat_rate,
      is_eligible_by_default: category.is_eligible_by_default,
      is_active: category.is_active,
      display_order: category.display_order,
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingCategory) {
      updateMutation.mutate({ id: editingCategory.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (category: Category) => {
    if (confirm(`Êtes-vous sûr de vouloir supprimer la catégorie "${category.name}" ?`)) {
      deleteMutation.mutate(category.id);
    }
  };

  const eligibleCount = categories.filter(c => c.is_eligible_by_default && c.is_active).length;
  const excludedCount = categories.filter(c => !c.is_eligible_by_default && c.is_active).length;

  return (
    <FadeIn duration={400}>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏷️ Gestion des catégories</h1>
          <p className="text-gray-500 mt-1">Gérez les catégories de produits et leur éligibilité à la détaxe</p>
        </div>
        <button
          onClick={openCreateModal}
          disabled={!canCreate}
          title={!canCreate ? "Vous n'avez pas la permission de créer des catégories" : undefined}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-colors ${
            canCreate
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          <PlusIcon className="h-5 w-5" />
          Nouvelle catégorie
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200">
          <p className="text-sm text-gray-500">Total catégories</p>
          <p className="text-2xl font-bold text-gray-900">{categories.length}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-4 border border-green-200">
          <p className="text-sm text-green-600">Éligibles à la détaxe</p>
          <p className="text-2xl font-bold text-green-700">{eligibleCount}</p>
        </div>
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
          <p className="text-sm text-amber-600">Exclues de la détaxe</p>
          <p className="text-2xl font-bold text-amber-700">{excludedCount}</p>
        </div>
      </div>

      {/* Categories Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50">
          <h2 className="font-semibold text-gray-900">Liste des catégories</h2>
        </div>
        
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Chargement...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-6 py-3 text-left">Ordre</th>
                  <th className="px-6 py-3 text-left">Catégorie</th>
                  <th className="px-6 py-3 text-left">Code</th>
                  <th className="px-6 py-3 text-center">TVA</th>
                  <th className="px-6 py-3 text-center">Éligibilité</th>
                  <th className="px-6 py-3 text-center">Statut</th>
                  <th className="px-6 py-3 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {categories.map((category) => (
                  <tr key={category.id} className={`hover:bg-gray-50 ${!category.is_active ? 'opacity-50' : ''}`}>
                    <td className="px-6 py-4 text-gray-500">{category.display_order}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{category.icon}</span>
                        <div>
                          <p className="font-medium text-gray-900">{category.name}</p>
                          {category.description && (
                            <p className="text-xs text-gray-500">{category.description}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <code className="px-2 py-1 bg-gray-100 rounded text-sm">{category.code}</code>
                    </td>
                    <td className="px-6 py-4 text-center">{category.default_vat_rate}%</td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleEligibilityMutation.mutate(category.id)}
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          category.is_eligible_by_default
                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                            : 'bg-red-100 text-red-700 hover:bg-red-200'
                        }`}
                      >
                        {category.is_eligible_by_default ? (
                          <>
                            <CheckIcon className="h-4 w-4" />
                            Éligible
                          </>
                        ) : (
                          <>
                            <XCircleIcon className="h-4 w-4" />
                            Exclu
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleActiveMutation.mutate(category.id)}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                          category.is_active
                            ? 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                        }`}
                      >
                        {category.is_active ? 'Actif' : 'Inactif'}
                      </button>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(category)}
                          disabled={!canEdit}
                          title={!canEdit ? "Vous n'avez pas la permission de modifier" : "Modifier"}
                          className={`p-2 rounded-lg transition-colors ${
                            canEdit
                              ? 'text-blue-600 hover:bg-blue-50'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(category)}
                          disabled={!canDelete}
                          title={!canDelete ? "Vous n'avez pas la permission de supprimer" : "Supprimer"}
                          className={`p-2 rounded-lg transition-colors ${
                            canDelete
                              ? 'text-red-600 hover:bg-red-50'
                              : 'text-gray-300 cursor-not-allowed'
                          }`}
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header with gradient */}
            <div className="px-6 py-5 bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center text-2xl">
                  {formData.icon}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white">
                    {editingCategory ? 'Modifier la catégorie' : 'Nouvelle catégorie'}
                  </h2>
                  <p className="text-purple-200 text-sm">
                    {editingCategory ? `Code: ${formData.code}` : 'Créez une nouvelle catégorie de produits'}
                  </p>
                </div>
              </div>
              <button
                onClick={closeModal}
                className="p-2 hover:bg-white/20 rounded-xl transition-colors"
              >
                <XMarkIcon className="h-6 w-6 text-white" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              {/* Icon Selection - Improved */}
              <div className="bg-gray-50 rounded-xl p-4">
                <label className="block text-sm font-semibold text-gray-700 mb-3">
                  🎨 Choisir une icône
                </label>
                <div className="grid grid-cols-10 gap-2">
                  {EMOJI_OPTIONS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => setFormData({ ...formData, icon: emoji })}
                      className={`w-11 h-11 text-2xl rounded-xl border-2 transition-all flex items-center justify-center ${
                        formData.icon === emoji
                          ? 'border-purple-500 bg-purple-100 shadow-md scale-110'
                          : 'border-gray-200 bg-white hover:border-purple-300 hover:bg-purple-50'
                      }`}
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Name & Code - Side by side */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    📝 Nom de la catégorie *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent text-lg"
                    placeholder="Ex: Électronique"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">
                    🔑 Code unique *
                  </label>
                  <input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase().replace(/\s/g, '_') })}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent font-mono text-lg ${
                      editingCategory ? 'bg-gray-100 border-gray-200 text-gray-500' : 'border-gray-200'
                    }`}
                    placeholder="Ex: ELECTRONICS"
                    required
                    disabled={!!editingCategory}
                  />
                  {editingCategory && (
                    <p className="text-xs text-amber-600 mt-1">🔒 Le code ne peut pas être modifié</p>
                  )}
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  📄 Description <span className="text-gray-400 font-normal">(optionnelle)</span>
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Décrivez cette catégorie de produits..."
                  rows={2}
                />
              </div>

              {/* VAT Rate & Order - Improved */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <label className="block text-sm font-semibold text-blue-700 mb-2">
                    💰 Taux TVA par défaut
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      value={formData.default_vat_rate}
                      onChange={(e) => setFormData({ ...formData, default_vat_rate: e.target.value })}
                      className="w-full px-4 py-3 border border-blue-200 rounded-xl focus:ring-2 focus:ring-blue-500 text-xl font-bold text-center"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-blue-400 font-bold">%</span>
                  </div>
                </div>
                <div className="bg-purple-50 rounded-xl p-4 border border-purple-200">
                  <label className="block text-sm font-semibold text-purple-700 mb-2">
                    📊 Ordre d'affichage
                  </label>
                  <input
                    type="number"
                    value={formData.display_order}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 border border-purple-200 rounded-xl focus:ring-2 focus:ring-purple-500 text-xl font-bold text-center"
                  />
                </div>
              </div>

              {/* Eligibility & Status - Improved */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_eligible_by_default: !formData.is_eligible_by_default })}
                  className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${
                    formData.is_eligible_by_default 
                      ? 'border-green-400 bg-gradient-to-br from-green-50 to-emerald-50 shadow-md' 
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    formData.is_eligible_by_default ? 'bg-green-500' : 'bg-gray-300'
                  }`}>
                    {formData.is_eligible_by_default ? '✅' : '❌'}
                  </div>
                  <div>
                    <p className={`font-bold text-lg ${formData.is_eligible_by_default ? 'text-green-700' : 'text-gray-500'}`}>
                      {formData.is_eligible_by_default ? 'Éligible' : 'Non éligible'}
                    </p>
                    <p className={`text-sm ${formData.is_eligible_by_default ? 'text-green-600' : 'text-gray-400'}`}>
                      {formData.is_eligible_by_default ? 'Remboursement TVA possible' : 'Exclu de la détaxe'}
                    </p>
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, is_active: !formData.is_active })}
                  className={`flex items-center gap-4 p-5 rounded-xl border-2 transition-all text-left ${
                    formData.is_active 
                      ? 'border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-md' 
                      : 'border-gray-200 bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl ${
                    formData.is_active ? 'bg-blue-500' : 'bg-gray-300'
                  }`}>
                    {formData.is_active ? '👁️' : '🚫'}
                  </div>
                  <div>
                    <p className={`font-bold text-lg ${formData.is_active ? 'text-blue-700' : 'text-gray-500'}`}>
                      {formData.is_active ? 'Actif' : 'Inactif'}
                    </p>
                    <p className={`text-sm ${formData.is_active ? 'text-blue-600' : 'text-gray-400'}`}>
                      {formData.is_active ? 'Visible dans les formulaires' : 'Masqué des formulaires'}
                    </p>
                  </div>
                </button>
              </div>

              {/* Preview */}
              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-xl p-4 border border-gray-200">
                <p className="text-xs text-gray-500 uppercase font-semibold mb-2">Aperçu</p>
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{formData.icon}</span>
                  <div>
                    <p className="font-bold text-gray-900">{formData.name || 'Nom de la catégorie'}</p>
                    <p className="text-sm text-gray-500">
                      Code: <code className="bg-gray-200 px-1 rounded">{formData.code || 'CODE'}</code>
                      {' • '}TVA: {formData.default_vat_rate}%
                      {' • '}
                      <span className={formData.is_eligible_by_default ? 'text-green-600' : 'text-red-600'}>
                        {formData.is_eligible_by_default ? '✓ Éligible' : '✗ Exclu'}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions - Improved */}
              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-6 py-2.5 border border-gray-200 text-gray-700 rounded-xl font-medium hover:bg-gray-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-8 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-xl font-bold hover:from-purple-700 hover:to-indigo-700 disabled:opacity-50 shadow-lg transition-all"
                >
                  {createMutation.isPending || updateMutation.isPending
                    ? '⏳ Enregistrement...'
                    : editingCategory
                    ? '✅ Mettre à jour'
                    : '➕ Créer la catégorie'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      </div>
    </FadeIn>
  );
}
