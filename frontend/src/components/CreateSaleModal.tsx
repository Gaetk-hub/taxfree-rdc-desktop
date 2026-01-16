import { useState, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller, useWatch } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { salesApi, taxfreeApi, merchantManageApi, rulesApi } from '../services/api';
import { useAuthStore } from '../store/authStore';
import toast from 'react-hot-toast';
import {
  PlusIcon,
  TrashIcon,
  ShoppingBagIcon,
  UserIcon,
  DocumentCheckIcon,
  BuildingStorefrontIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  PrinterIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import CountrySelect from './CountrySelect';
import { isEligibleForTaxFree, getCountryName, NON_ELIGIBLE_COUNTRIES } from '../data/countries';

interface CreateSaleModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (form: any) => void;
}

interface SaleFormData {
  outlet_id: string;
  invoice_number: string;
  invoice_date: string;
  items: {
    product_name: string;
    barcode: string;
    product_category: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
  }[];
  traveler: {
    passport_number: string;
    passport_country: string;
    passport_issue_date: string;
    passport_expiry_date: string;
    first_name: string;
    last_name: string;
    date_of_birth: string;
    nationality: string;
    residence_country: string;
    email: string;
    phone: string;
  };
  send_email: boolean;
}

// Fallback categories if API fails
const DEFAULT_CATEGORIES = [
  { value: 'GENERAL', label: 'Marchandises générales', icon: '📦' },
  { value: 'ELECTRONICS', label: 'Électronique', icon: '📱' },
  { value: 'CLOTHING', label: 'Vêtements & Accessoires', icon: '👕' },
  { value: 'JEWELRY', label: 'Bijoux & Montres', icon: '💎' },
  { value: 'COSMETICS', label: 'Cosmétiques & Parfums', icon: '💄' },
  { value: 'FOOD', label: 'Alimentation', icon: '🍔' },
  { value: 'OTHER', label: 'Autres', icon: '📋' },
];

const VAT_RATE = 16;

export default function CreateSaleModal({ isOpen, onClose, onSuccess }: CreateSaleModalProps) {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [eligibilityWarning, setEligibilityWarning] = useState<string | null>(null);
  const [createdForm, setCreatedForm] = useState<any>(null);

  const isEmployee = user?.role === 'MERCHANT_EMPLOYEE';
  const userOutletId = user?.outlet_id;

  const { register, control, handleSubmit, watch, setValue, reset } = useForm<SaleFormData>({
    defaultValues: {
      outlet_id: userOutletId || '',
      invoice_date: new Date().toISOString().split('T')[0],
      invoice_number: '',
      items: [{ product_name: '', barcode: '', product_category: 'GENERAL', quantity: 1, unit_price: 0, vat_rate: VAT_RATE }],
      traveler: {
        passport_number: '',
        passport_country: '',
        passport_issue_date: '',
        passport_expiry_date: '',
        first_name: '',
        last_name: '',
        date_of_birth: '',
        nationality: '',
        residence_country: '',
        email: '',
        phone: '',
      },
      send_email: false,
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  const { data: outletsData } = useQuery({
    queryKey: ['my-outlets'],
    queryFn: async () => {
      const response = await merchantManageApi.outlets.list();
      return response.data;
    },
    enabled: !isEmployee && isOpen,
  });

  const { data: activeRulesetData } = useQuery({
    queryKey: ['active-ruleset'],
    queryFn: () => rulesApi.getActiveRuleset(),
    enabled: isOpen,
  });

  // Fetch dynamic categories
  const { data: categoriesData } = useQuery({
    queryKey: ['active-categories'],
    queryFn: () => rulesApi.getActiveCategories(),
    enabled: isOpen,
  });

  const activeRuleset = activeRulesetData?.data;
  
  // Build categories list from API or use defaults
  const CATEGORIES = useMemo(() => {
    // API might return data directly or in a results array
    const apiCategories = categoriesData?.data?.results || categoriesData?.data;
    console.log('Categories API response:', categoriesData?.data);
    console.log('Parsed categories:', apiCategories);
    
    if (apiCategories && Array.isArray(apiCategories) && apiCategories.length > 0) {
      console.log('Using dynamic categories from API:', apiCategories.length);
      return apiCategories.map((cat: any) => ({
        value: cat.code,
        label: cat.name,
        icon: cat.icon,
        isEligible: cat.is_eligible_by_default,
      }));
    }
    console.log('Using default categories (API failed or empty)');
    return DEFAULT_CATEGORIES.map(cat => ({ ...cat, isEligible: !['FOOD', 'TOBACCO', 'SERVICES'].includes(cat.value) }));
  }, [categoriesData]);

  const outlets = Array.isArray(outletsData) 
    ? outletsData 
    : ((outletsData as any)?.results || []);

  useEffect(() => {
    if (isEmployee && userOutletId) {
      setValue('outlet_id', userOutletId);
    }
  }, [isEmployee, userOutletId, setValue]);

  const residenceCountry = watch('traveler.residence_country');
  useEffect(() => {
    if (residenceCountry && !isEligibleForTaxFree(residenceCountry)) {
      setEligibilityWarning(`Les résidents de ${getCountryName(residenceCountry)} ne sont pas éligibles à la détaxe.`);
    } else {
      setEligibilityWarning(null);
    }
  }, [residenceCountry]);

  // Use useWatch for better reactivity when items change
  const items = useWatch({ control, name: 'items' }) || [];
  
  // Get excluded categories from dynamic categories or ruleset
  const excludedCategories: string[] = useMemo(() => {
    // First try to get from dynamic categories
    const notEligible = CATEGORIES.filter((c: any) => !c.isEligible).map((c: any) => c.value);
    if (notEligible.length > 0) return notEligible;
    // Fallback to ruleset
    return activeRuleset?.excluded_categories || ['SERVICES', 'FOOD', 'TOBACCO'];
  }, [CATEGORIES, activeRuleset]);
  
  // Calculate totals with eligibility breakdown
  const itemsBreakdown = useMemo(() => {
    const eligible: { item: any; lineTotal: number; vat: number; category: string }[] = [];
    const excluded: { item: any; lineTotal: number; vat: number; category: string; reason: string }[] = [];
    
    items.forEach((item) => {
      const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
      const vat = lineTotal * (item.vat_rate || VAT_RATE) / 100;
      const categoryLabel = CATEGORIES.find((c: any) => c.value === item.product_category)?.label || item.product_category;
      
      if (excludedCategories.includes(item.product_category)) {
        excluded.push({ 
          item, 
          lineTotal, 
          vat, 
          category: categoryLabel,
          reason: `Catégorie "${categoryLabel}" non éligible à la détaxe`
        });
      } else {
        eligible.push({ item, lineTotal, vat, category: categoryLabel });
      }
    });
    
    return { eligible, excluded };
  }, [items, excludedCategories, CATEGORIES]);
  
  const totalHT = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
  const totalVAT = items.reduce((sum, item) => {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
    return sum + (lineTotal * (item.vat_rate || VAT_RATE) / 100);
  }, 0);
  const totalTTC = totalHT + totalVAT;
  
  // Eligible amounts only
  const eligibleHT = itemsBreakdown.eligible.reduce((sum, e) => sum + e.lineTotal, 0);
  const eligibleVAT = itemsBreakdown.eligible.reduce((sum, e) => sum + e.vat, 0);
  const excludedVAT = itemsBreakdown.excluded.reduce((sum, e) => sum + e.vat, 0);

  // Calculate fees based on active ruleset (using eligible VAT only)
  const feeCalculation = useMemo(() => {
    if (!activeRuleset) {
      return { operatorFee: 0, refundAmount: eligibleVAT, feePercentage: 15, minFee: 5000 };
    }
    const feePercentage = parseFloat(activeRuleset.operator_fee_percentage) || 15;
    const fixedFee = parseFloat(activeRuleset.operator_fee_fixed) || 0;
    const minFee = parseFloat(activeRuleset.min_operator_fee) || 0;
    
    let operatorFee = (eligibleVAT * feePercentage / 100) + fixedFee;
    if (operatorFee < minFee && eligibleVAT > 0) operatorFee = minFee;
    if (eligibleVAT === 0) operatorFee = 0;
    
    const refundAmount = Math.max(0, eligibleVAT - operatorFee);
    
    return { operatorFee, refundAmount, feePercentage, minFee, fixedFee };
  }, [activeRuleset, eligibleVAT]);

  // Watch traveler data for validation
  const travelerData = watch('traveler');
  
  // Validate eligibility rules from active ruleset
  const eligibilityValidation = useMemo(() => {
    const errors: string[] = [];
    
    if (!activeRuleset) {
      return { isValid: true, errors: [] };
    }
    
    // 1. Check minimum purchase amount
    const minPurchaseAmount = parseFloat(activeRuleset.min_purchase_amount) || 50000;
    if (eligibleHT < minPurchaseAmount) {
      errors.push(`Le montant éligible (${eligibleHT.toLocaleString('fr-FR')} CDF) est inférieur au minimum requis de ${minPurchaseAmount.toLocaleString('fr-FR')} CDF`);
    }
    
    // 2. Check minimum age
    const minAge = activeRuleset.min_age || 16;
    if (travelerData?.date_of_birth) {
      const birthDate = new Date(travelerData.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      if (age < minAge) {
        errors.push(`Le voyageur doit avoir au moins ${minAge} ans (âge actuel: ${age} ans)`);
      }
    }
    
    // 3. Check residence country eligibility
    const excludedCountries: string[] = activeRuleset.excluded_residence_countries || [];
    if (travelerData?.residence_country && excludedCountries.includes(travelerData.residence_country)) {
      errors.push(`Les résidents de ${getCountryName(travelerData.residence_country)} ne sont pas éligibles à la détaxe`);
    }
    
    // 4. Check if there are eligible items
    if (itemsBreakdown.eligible.length === 0 && items.length > 0) {
      errors.push('Aucun article n\'est éligible à la détaxe (toutes les catégories sont exclues)');
    }
    
    return { isValid: errors.length === 0, errors };
  }, [activeRuleset, eligibleHT, travelerData, itemsBreakdown, items, getCountryName]);

  // Check if refund amount is zero (fees exceed VAT)
  const refundValidation = useMemo(() => {
    if (feeCalculation.refundAmount <= 0 && eligibleVAT > 0) {
      return {
        isValid: false,
        message: `Le remboursement net est de 0 CDF car les frais de service (${feeCalculation.operatorFee.toLocaleString('fr-FR')} CDF) dépassent la TVA récupérable (${eligibleVAT.toLocaleString('fr-FR')} CDF). Le bordereau ne peut pas être créé.`
      };
    }
    return { isValid: true, message: '' };
  }, [feeCalculation, eligibleVAT]);

  const createMutation = useMutation({
    mutationFn: async (data: SaleFormData) => {
      // Ensure items are properly formatted for the backend
      const formattedItems = data.items.map(item => ({
        product_name: item.product_name,
        barcode: item.barcode || '',
        product_category: item.product_category,
        quantity: Number(item.quantity) || 1,
        unit_price: Number(item.unit_price) || 0,
        vat_rate: Number(item.vat_rate) || 16,
      }));
      
      console.log('=== MODAL V2 === Sending items:', JSON.stringify(formattedItems));
      
      const invoiceRes = await salesApi.createInvoice({
        outlet: data.outlet_id,
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date,
        currency: 'CDF',
        items: formattedItems,
      });

      console.log('=== MODAL V2 === Invoice created:', invoiceRes.data);
      
      if (!invoiceRes.data.id) {
        throw new Error('Invoice ID is missing from response');
      }
      
      const formPayload = {
        invoice_id: invoiceRes.data.id,
        traveler: data.traveler,
      };
      console.log('=== MODAL V2 === Creating form with payload:', JSON.stringify(formPayload));
      
      const formRes = await taxfreeApi.createForm(formPayload);

      if (data.send_email && data.traveler.email) {
        try {
          await taxfreeApi.sendEmail(formRes.data.id);
        } catch (e) {
          console.error('Failed to send email:', e);
        }
      }

      return formRes.data;
    },
    onSuccess: (data) => {
      toast.success('Bordereau créé avec succès !');
      setCreatedForm(data);
      setStep(4);
      queryClient.invalidateQueries({ queryKey: ['forms'] });
      queryClient.invalidateQueries({ queryKey: ['my-users'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      onSuccess?.(data);
    },
    onError: (error: any) => {
      console.error('Create form error:', error.response?.data);
      const errorData = error.response?.data;
      let errorMessage = 'Erreur lors de la création du bordereau';
      
      if (errorData?.detail) {
        // Handle "Not eligible" errors from TaxFreeService
        if (errorData.detail.includes('Not eligible:')) {
          const reason = errorData.detail.replace('Not eligible:', '').trim();
          if (reason.includes('Amount below minimum')) {
            errorMessage = 'Montant insuffisant pour la détaxe. Le minimum est de 50 000 CDF.';
          } else if (reason.includes('minimum age')) {
            errorMessage = 'Le voyageur n\'a pas l\'âge minimum requis (16 ans).';
          } else if (reason.includes('Residence country')) {
            errorMessage = 'Le pays de résidence n\'est pas éligible à la détaxe.';
          } else {
            errorMessage = `Non éligible: ${reason}`;
          }
        } else {
          errorMessage = errorData.detail;
        }
      } else if (errorData?.invoice_number) {
        errorMessage = Array.isArray(errorData.invoice_number) 
          ? errorData.invoice_number[0] 
          : errorData.invoice_number;
      } else if (errorData?.traveler) {
        const travelerErrors = Object.entries(errorData.traveler)
          .map(([key, val]) => `${key}: ${Array.isArray(val) ? val[0] : val}`)
          .join(', ');
        errorMessage = `Erreur voyageur: ${travelerErrors}`;
      } else if (errorData?.non_field_errors) {
        errorMessage = Array.isArray(errorData.non_field_errors) 
          ? errorData.non_field_errors[0] 
          : errorData.non_field_errors;
      } else if (typeof errorData === 'object' && errorData !== null) {
        const firstError = Object.entries(errorData)[0];
        if (firstError) {
          const [key, val] = firstError;
          errorMessage = `${key}: ${Array.isArray(val) ? val[0] : val}`;
        }
      }
      toast.error(errorMessage);
    },
  });

  const onSubmit = (data: SaleFormData) => {
    if (eligibilityWarning) {
      toast.error('Le client n\'est pas éligible à la détaxe');
      return;
    }
    createMutation.mutate(data);
  };

  const handleClose = () => {
    setStep(1);
    setCreatedForm(null);
    setEligibilityWarning(null);
    reset();
    onClose();
  };

  const nextStep = () => {
    // Validate step 1 before proceeding
    if (step === 1) {
      const outletId = watch('outlet_id');
      const invoiceNumber = watch('invoice_number');
      const items = watch('items');
      
      if (!outletId) {
        toast.error('Veuillez sélectionner un point de vente');
        return;
      }
      if (!invoiceNumber) {
        toast.error('Veuillez entrer un numéro de facture');
        return;
      }
      if (!items || items.length === 0 || !items[0].product_name) {
        toast.error('Veuillez ajouter au moins un article');
        return;
      }
    }
    
    // Validate step 2 before proceeding
    if (step === 2) {
      const traveler = watch('traveler');
      if (!traveler.passport_number || !traveler.first_name || !traveler.last_name) {
        toast.error('Veuillez remplir les informations du voyageur');
        return;
      }
    }
    
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const selectedOutlet = outlets.find((o: any) => o.id === watch('outlet_id'));

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-xl font-bold text-white">Nouvelle vente Tax Free</h2>
            <p className="text-blue-100 text-sm">Créez un bordereau de détaxe pour un touriste</p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors"
          >
            <XMarkIcon className="w-6 h-6 text-white" />
          </button>
        </div>

        {/* Steps indicator */}
        {step < 4 && (
          <div className="flex items-center justify-center py-4 border-b border-gray-100 flex-shrink-0">
            {[
              { num: 1, label: 'Facture', icon: ShoppingBagIcon },
              { num: 2, label: 'Voyageur', icon: UserIcon },
              { num: 3, label: 'Confirmation', icon: DocumentCheckIcon },
            ].map((s, idx) => (
              <div key={s.num} className="flex items-center">
                <div 
                  className={`flex flex-col items-center ${step >= s.num ? 'text-blue-600' : 'text-gray-400'}`}
                  onClick={() => step > s.num && setStep(s.num)}
                  style={{ cursor: step > s.num ? 'pointer' : 'default' }}
                >
                  <div className={`
                    w-10 h-10 rounded-full flex items-center justify-center transition-all text-sm
                    ${step === s.num ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : ''}
                    ${step > s.num ? 'bg-green-500 text-white' : ''}
                    ${step < s.num ? 'bg-gray-100 text-gray-400' : ''}
                  `}>
                    {step > s.num ? (
                      <CheckCircleIcon className="w-5 h-5" />
                    ) : (
                      <s.icon className="w-5 h-5" />
                    )}
                  </div>
                  <span className="text-xs mt-1 font-medium">{s.label}</span>
                </div>
                {idx < 2 && (
                  <div className={`w-16 h-0.5 mx-2 rounded ${step > s.num ? 'bg-green-500' : 'bg-gray-200'}`} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Step 1: Invoice */}
            {step === 1 && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Point de vente <span className="text-red-500">*</span>
                    </label>
                    {isEmployee ? (
                      <div className="flex items-center gap-2 px-4 py-2.5 bg-blue-50 border border-blue-200 rounded-xl">
                        <BuildingStorefrontIcon className="w-5 h-5 text-blue-600" />
                        <span className="text-blue-700 font-medium">{user?.outlet_name || 'Votre point de vente'}</span>
                        <input type="hidden" {...register('outlet_id')} />
                      </div>
                    ) : (
                      <select 
                        {...register('outlet_id', { required: 'Point de vente requis' })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">Sélectionner...</option>
                        {outlets.filter((o: any) => o.is_active).map((outlet: any) => (
                          <option key={outlet.id} value={outlet.id}>{outlet.name}</option>
                        ))}
                      </select>
                    )}
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      N° de facture <span className="text-red-500">*</span>
                    </label>
                    <input 
                      {...register('invoice_number', { required: 'Numéro requis' })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      placeholder="FAC-2026-001"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Date <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="date" 
                      {...register('invoice_date', { required: 'Date requise' })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Articles */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Articles</h3>
                  <div className="bg-gray-50 rounded-xl p-4 space-y-2">
                    <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase px-2">
                      <div className="col-span-3">Désignation</div>
                      <div className="col-span-2">Code-barres</div>
                      <div className="col-span-2">Catégorie</div>
                      <div className="col-span-1 text-center">Qté</div>
                      <div className="col-span-1 text-right">Prix</div>
                      <div className="col-span-1 text-center">TVA</div>
                      <div className="col-span-1 text-right">Total</div>
                      <div className="col-span-1"></div>
                    </div>
                    
                    {fields.map((field, index) => {
                      const qty = watch(`items.${index}.quantity`) || 0;
                      const price = watch(`items.${index}.unit_price`) || 0;
                      const category = watch(`items.${index}.product_category`) || 'GENERAL';
                      const lineTotal = qty * price;
                      const isExcluded = excludedCategories.includes(category);
                      
                      return (
                        <div key={field.id} className={`grid grid-cols-12 gap-2 items-center p-2 rounded-lg border ${isExcluded ? 'bg-amber-50 border-amber-200' : 'bg-white border-gray-100'}`}>
                          <div className="col-span-3">
                            <input
                              {...register(`items.${index}.product_name`, { required: true })}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Nom du produit"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              {...register(`items.${index}.barcode`)}
                              className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 font-mono"
                              placeholder="EAN/UPC"
                            />
                          </div>
                          <div className="col-span-2">
                            <select 
                              {...register(`items.${index}.product_category`)}
                              className={`w-full px-2 py-2 text-sm border rounded-lg ${
                                isExcluded 
                                  ? 'border-amber-400 bg-amber-50 text-amber-700' 
                                  : 'border-gray-200'
                              }`}
                            >
                              {CATEGORIES.map((cat: any) => (
                                <option key={cat.value} value={cat.value}>
                                  {cat.icon || ''} {cat.label} {excludedCategories.includes(cat.value) ? '⚠️' : '✓'}
                                </option>
                              ))}
                            </select>
                            {isExcluded && (
                              <p className="text-xs text-amber-600 mt-1">⚠️ Non éligible</p>
                            )}
                          </div>
                          <div className="col-span-1">
                            <input
                              type="number"
                              min="1"
                              {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                              className="w-full px-2 py-2 text-sm text-center border border-gray-200 rounded-lg"
                            />
                          </div>
                          <div className="col-span-2">
                            <input
                              type="number"
                              min="0"
                              {...register(`items.${index}.unit_price`, { valueAsNumber: true, min: 0 })}
                              className="w-full px-2 py-2 text-sm text-right border border-gray-200 rounded-lg"
                            />
                          </div>
                          <div className="col-span-1">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              {...register(`items.${index}.vat_rate`, { valueAsNumber: true })}
                              className="w-full px-2 py-2 text-sm text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            />
                          </div>
                          <div className="col-span-1 text-right text-sm font-medium">
                            {lineTotal.toLocaleString('fr-FR')}
                          </div>
                          <div className="col-span-1 text-center">
                            {fields.length > 1 && (
                              <button type="button" onClick={() => remove(index)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                    
                    <button
                      type="button"
                      onClick={() => append({ product_name: '', barcode: '', product_category: 'GENERAL', quantity: 1, unit_price: 0, vat_rate: VAT_RATE })}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
                    >
                      <PlusIcon className="w-4 h-4" />
                      Ajouter un article
                    </button>
                  </div>
                </div>

                {/* Totals */}
                <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4">
                  <div className="flex justify-end">
                    <div className="w-56 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Total HT:</span>
                        <span className="font-medium">{totalHT.toLocaleString('fr-FR')} CDF</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">TVA:</span>
                        <span className="font-medium">{totalVAT.toLocaleString('fr-FR')} CDF</span>
                      </div>
                      <div className="flex justify-between text-base font-bold pt-2 border-t border-gray-200">
                        <span>Total TTC:</span>
                        <span className="text-blue-600">{totalTTC.toLocaleString('fr-FR')} CDF</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Traveler */}
            {step === 2 && (
              <div className="p-6 space-y-6">
                {eligibilityWarning && (
                  <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-red-800">Non éligible à la détaxe</p>
                      <p className="text-sm text-red-600">{eligibilityWarning}</p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Passeport</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">N° de passeport <span className="text-red-500">*</span></label>
                      <input 
                        {...register('traveler.passport_number', { required: 'Requis' })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 uppercase"
                        placeholder="AB1234567"
                      />
                    </div>
                    <Controller
                      name="traveler.passport_country"
                      control={control}
                      rules={{ required: 'Requis' }}
                      render={({ field }) => (
                        <CountrySelect
                          value={field.value}
                          onChange={field.onChange}
                          label="Pays du passeport"
                          required
                          excludeCountries={NON_ELIGIBLE_COUNTRIES}
                        />
                      )}
                    />
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Date d'émission</label>
                      <input 
                        type="date"
                        {...register('traveler.passport_issue_date')}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Date d'expiration <span className="text-red-500">*</span></label>
                      <input 
                        type="date"
                        {...register('traveler.passport_expiry_date', { required: 'Requis' })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Identité</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Prénom <span className="text-red-500">*</span></label>
                      <input 
                        {...register('traveler.first_name', { required: 'Requis' })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Nom <span className="text-red-500">*</span></label>
                      <input 
                        {...register('traveler.last_name', { required: 'Requis' })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Date de naissance <span className="text-red-500">*</span></label>
                      <input 
                        type="date"
                        {...register('traveler.date_of_birth', { required: 'Requis' })}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <Controller
                      name="traveler.nationality"
                      control={control}
                      rules={{ required: 'Requis' }}
                      render={({ field }) => (
                        <CountrySelect value={field.value} onChange={field.onChange} label="Nationalité" required />
                      )}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Résidence</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Controller
                      name="traveler.residence_country"
                      control={control}
                      rules={{ required: 'Requis' }}
                      render={({ field }) => (
                        <CountrySelect value={field.value} onChange={field.onChange} label="Pays de résidence" required />
                      )}
                    />
                  </div>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact (optionnel)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                      <input 
                        type="email"
                        {...register('traveler.email')}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                      <input 
                        {...register('traveler.phone')}
                        className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Confirmation */}
            {step === 3 && (
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Facture */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <ShoppingBagIcon className="w-4 h-4 text-blue-600" />
                      Facture
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Point de vente:</span>
                        <span className="font-medium">{selectedOutlet?.name || user?.outlet_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">N° Facture:</span>
                        <span className="font-medium">{watch('invoice_number')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date:</span>
                        <span className="font-medium">{new Date(watch('invoice_date')).toLocaleDateString('fr-FR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Articles:</span>
                        <span className="font-medium">{items.length}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 mt-2">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Total HT:</span>
                          <span className="font-medium">{totalHT.toLocaleString('fr-FR')} CDF</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">TVA (16%):</span>
                          <span className="font-medium">{totalVAT.toLocaleString('fr-FR')} CDF</span>
                        </div>
                        <div className="flex justify-between font-bold mt-1">
                          <span>Total TTC:</span>
                          <span className="text-blue-600">{totalTTC.toLocaleString('fr-FR')} CDF</span>
                        </div>
                      </div>
                      
                      {/* Excluded items warning */}
                      {itemsBreakdown.excluded.length > 0 && (
                        <div className="pt-2 border-t border-gray-200 mt-2 bg-amber-50 -mx-4 px-4 py-3">
                          <p className="text-xs text-amber-700 uppercase font-semibold mb-2">⚠️ Articles non éligibles</p>
                          <div className="space-y-1">
                            {itemsBreakdown.excluded.map((e, i) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-amber-700">
                                  {e.item.product_name} ({e.category})
                                </span>
                                <span className="font-medium text-amber-600 line-through">
                                  {e.lineTotal.toLocaleString('fr-FR')} CDF
                                </span>
                              </div>
                            ))}
                          </div>
                          <p className="text-xs text-amber-600 mt-2 italic">
                            Ces articles sont exclus car leur catégorie n'est pas éligible à la détaxe
                          </p>
                        </div>
                      )}
                      
                      {/* Eligible items */}
                      {itemsBreakdown.eligible.length > 0 && (
                        <div className="pt-2 border-t border-gray-200 mt-2 bg-blue-50 -mx-4 px-4 py-3">
                          <p className="text-xs text-blue-700 uppercase font-semibold mb-2">✅ Articles éligibles à la détaxe</p>
                          <div className="space-y-1">
                            {itemsBreakdown.eligible.map((e, i) => (
                              <div key={i} className="flex justify-between text-sm">
                                <span className="text-blue-700">
                                  {e.item.product_name} ({e.category})
                                </span>
                                <span className="font-medium text-blue-600">
                                  {e.lineTotal.toLocaleString('fr-FR')} CDF
                                </span>
                              </div>
                            ))}
                          </div>
                          <div className="flex justify-between font-semibold text-blue-800 mt-2 pt-2 border-t border-blue-200">
                            <span>Montant éligible:</span>
                            <span>{eligibleHT.toLocaleString('fr-FR')} CDF</span>
                          </div>
                        </div>
                      )}
                      
                      {/* Refund calculation */}
                      <div className="pt-2 border-t border-gray-200 mt-2 bg-green-50 -mx-4 px-4 py-3 rounded-b-xl">
                        <p className="text-xs text-green-700 uppercase font-semibold mb-2">💰 Calcul du remboursement</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">TVA récupérable (sur {eligibleHT.toLocaleString('fr-FR')} CDF):</span>
                          <span className="font-medium">{eligibleVAT.toLocaleString('fr-FR')} CDF</span>
                        </div>
                        {excludedVAT > 0 && (
                          <div className="flex justify-between text-sm text-amber-600">
                            <span>TVA non récupérable (catégories exclues):</span>
                            <span className="font-medium">{excludedVAT.toLocaleString('fr-FR')} CDF</span>
                          </div>
                        )}
                        
                        <div className="flex justify-between font-bold text-green-700 mt-2 pt-2 border-t border-green-200">
                          <span>💰 Remboursement net:</span>
                          <span className="text-lg">{feeCalculation.refundAmount.toLocaleString('fr-FR')} CDF</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Voyageur */}
                  <div className="bg-gray-50 rounded-xl p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                      <UserIcon className="w-4 h-4 text-blue-600" />
                      Voyageur
                    </h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nom complet:</span>
                        <span className="font-medium">{watch('traveler.first_name')} {watch('traveler.last_name')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Date de naissance:</span>
                        <span className="font-medium">{watch('traveler.date_of_birth') ? new Date(watch('traveler.date_of_birth')).toLocaleDateString('fr-FR') : '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Nationalité:</span>
                        <span className="font-medium">{getCountryName(watch('traveler.nationality'))}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Pays de résidence:</span>
                        <span className="font-medium">{getCountryName(watch('traveler.residence_country'))}</span>
                      </div>
                      <div className="pt-2 border-t border-gray-200 mt-2">
                        <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Passeport</p>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Numéro:</span>
                          <span className="font-medium font-mono">{watch('traveler.passport_number')}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Pays:</span>
                          <span className="font-medium">{getCountryName(watch('traveler.passport_country'))}</span>
                        </div>
                        {watch('traveler.passport_issue_date') && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Émis le:</span>
                            <span className="font-medium">{new Date(watch('traveler.passport_issue_date')).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                        {watch('traveler.passport_expiry_date') && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Expire le:</span>
                            <span className="font-medium">{new Date(watch('traveler.passport_expiry_date')).toLocaleDateString('fr-FR')}</span>
                          </div>
                        )}
                      </div>
                      {(watch('traveler.email') || watch('traveler.phone')) && (
                        <div className="pt-2 border-t border-gray-200 mt-2">
                          <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Contact</p>
                          {watch('traveler.email') && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Email:</span>
                              <span className="font-medium">{watch('traveler.email')}</span>
                            </div>
                          )}
                          {watch('traveler.phone') && (
                            <div className="flex justify-between">
                              <span className="text-gray-500">Téléphone:</span>
                              <span className="font-medium">{watch('traveler.phone')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {watch('traveler.email') && (
                  <div className="bg-blue-50 rounded-xl p-4">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        {...register('send_email')}
                        className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <div>
                        <span className="font-medium text-gray-900">Envoyer le bordereau par email</span>
                        <p className="text-sm text-gray-500">Le client recevra une copie à {watch('traveler.email')}</p>
                      </div>
                    </label>
                  </div>
                )}

                {/* Eligibility validation errors */}
                {!eligibilityValidation.isValid && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-800 mb-2">Conditions d'éligibilité non respectées</p>
                        <ul className="space-y-1">
                          {eligibilityValidation.errors.map((error, index) => (
                            <li key={index} className="text-sm text-red-600 flex items-start gap-2">
                              <span className="text-red-400">•</span>
                              {error}
                            </li>
                          ))}
                        </ul>
                        <p className="text-xs text-red-500 mt-3 italic">
                          Le bordereau ne peut pas être créé tant que ces conditions ne sont pas respectées.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Refund validation error (fees exceed VAT) */}
                {eligibilityValidation.isValid && !refundValidation.isValid && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <ExclamationTriangleIcon className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-orange-800 mb-2">Remboursement impossible</p>
                        <p className="text-sm text-orange-600">{refundValidation.message}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 4: Success */}
            {step === 4 && createdForm && (
              <div className="p-8 text-center">
                {/* Success Animation */}
                <div className="relative mb-6">
                  <div className="w-20 h-20 bg-gradient-to-br from-green-400 to-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-lg shadow-green-200">
                    <CheckCircleIcon className="w-12 h-12 text-white" />
                  </div>
                  <div className="absolute inset-0 w-20 h-20 mx-auto bg-green-400 rounded-full animate-ping opacity-20"></div>
                </div>
                
                <h3 className="text-2xl font-bold text-gray-900 mb-2">Bordereau créé avec succès !</h3>
                <p className="text-sm text-gray-500 mb-4">Votre bordereau de détaxe est prêt</p>
                
                {/* Form Number Badge */}
                <div className="inline-block bg-gradient-to-r from-blue-600 to-indigo-600 text-white px-6 py-3 rounded-2xl mb-6 shadow-lg shadow-blue-200">
                  <p className="text-xs uppercase tracking-wider opacity-80 mb-1">N° du bordereau</p>
                  <p className="text-2xl font-bold font-mono tracking-wide">{createdForm.form_number}</p>
                </div>
                
                {/* Financial Summary Cards - Simplified for merchant */}
                <div className="grid grid-cols-2 gap-4 mb-8 max-w-md mx-auto">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                    <p className="text-gray-400 text-xs uppercase tracking-wide mb-1">Total TTC</p>
                    <p className="font-bold text-gray-800 text-lg">{totalTTC.toLocaleString('fr-FR')}</p>
                    <p className="text-xs text-gray-400">CDF</p>
                  </div>
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border-2 border-green-200">
                    <p className="text-green-500 text-xs uppercase tracking-wide mb-1 font-medium">Remboursement net</p>
                    <p className="font-bold text-green-600 text-xl">{feeCalculation.refundAmount.toLocaleString('fr-FR')}</p>
                    <p className="text-xs text-green-500">CDF</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center mb-4">
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await taxfreeApi.viewPdf(createdForm.id);
                        const blob = new Blob([response.data], { type: 'application/pdf' });
                        const url = window.URL.createObjectURL(blob);
                        window.open(url, '_blank');
                      } catch (error) {
                        console.error('Error loading PDF:', error);
                        toast.error('Erreur lors du chargement du PDF');
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all"
                  >
                    <DocumentCheckIcon className="w-5 h-5" />
                    Voir le bordereau PDF
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        const response = await taxfreeApi.downloadPdf(createdForm.id);
                        const blob = new Blob([response.data], { type: 'application/pdf' });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement('a');
                        link.href = url;
                        link.download = `bordereau_${createdForm.form_number}.pdf`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        toast.success('PDF téléchargé');
                      } catch (error) {
                        console.error('Error downloading PDF:', error);
                        toast.error('Erreur lors du téléchargement');
                      }
                    }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-white border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all"
                  >
                    <PrinterIcon className="w-5 h-5" />
                    Télécharger PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => { setStep(1); setCreatedForm(null); reset(); }}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-500 text-white rounded-xl hover:from-emerald-600 hover:to-green-600 shadow-lg shadow-green-200 transition-all"
                  >
                    <PlusIcon className="w-5 h-5" />
                    Nouvelle vente
                  </button>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Footer */}
        {step < 4 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between flex-shrink-0">
            {step > 1 ? (
              <button 
                type="button" 
                onClick={prevStep}
                className="flex items-center gap-2 px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Précédent
              </button>
            ) : (
              <button 
                type="button" 
                onClick={handleClose}
                className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100"
              >
                Annuler
              </button>
            )}
            
            {step < 3 ? (
              <button 
                type="button" 
                onClick={nextStep}
                disabled={step === 1 && totalTTC === 0}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50"
              >
                Suivant
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            ) : (
              <button 
                type="button"
                onClick={handleSubmit(onSubmit)}
                disabled={createMutation.isPending || !!eligibilityWarning || !eligibilityValidation.isValid || !refundValidation.isValid}
                className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Création...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Créer le bordereau
                  </>
                )}
              </button>
            )}
          </div>
        )}

        {step === 4 && (
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-center flex-shrink-0">
            <button 
              type="button" 
              onClick={handleClose}
              className="px-6 py-2.5 bg-gray-600 text-white rounded-xl hover:bg-gray-700"
            >
              Fermer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
