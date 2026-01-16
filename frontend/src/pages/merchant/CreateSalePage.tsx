import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useMutation, useQuery } from '@tanstack/react-query';
import { salesApi, taxfreeApi, merchantManageApi } from '../../services/api';
import { useAuthStore } from '../../store/authStore';
import FadeIn from '../../components/ui/FadeIn';
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
} from '@heroicons/react/24/outline';
import CountrySelect from '../../components/CountrySelect';
import { isEligibleForTaxFree, getCountryName, NON_ELIGIBLE_COUNTRIES } from '../../data/countries';

interface SaleFormData {
  outlet_id: string;
  invoice_number: string;
  invoice_date: string;
  items: {
    product_name: string;
    product_category: string;
    quantity: number;
    unit_price: number;
    vat_rate: number;
  }[];
  traveler: {
    passport_number: string;
    passport_country: string;
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

const CATEGORIES = [
  { value: 'GENERAL', label: 'Marchandises générales' },
  { value: 'ELECTRONICS', label: 'Électronique' },
  { value: 'CLOTHING', label: 'Vêtements & Accessoires' },
  { value: 'JEWELRY', label: 'Bijoux & Montres' },
  { value: 'COSMETICS', label: 'Cosmétiques & Parfums' },
  { value: 'FOOD', label: 'Alimentation' },
  { value: 'OTHER', label: 'Autres' },
];

const VAT_RATE = 16; // Taux TVA RDC

export default function CreateSalePage() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [step, setStep] = useState(1);
  const [eligibilityWarning, setEligibilityWarning] = useState<string | null>(null);
  const [createdForm, setCreatedForm] = useState<any>(null);

  const isEmployee = user?.role === 'MERCHANT_EMPLOYEE';
  const userOutletId = user?.outlet_id;

  const { register, control, handleSubmit, watch, setValue, formState: { errors } } = useForm<SaleFormData>({
    defaultValues: {
      outlet_id: userOutletId || '',
      invoice_date: new Date().toISOString().split('T')[0],
      invoice_number: '',
      items: [{ product_name: '', product_category: 'GENERAL', quantity: 1, unit_price: 0, vat_rate: VAT_RATE }],
      traveler: {
        passport_number: '',
        passport_country: '',
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

  // Fetch outlets for merchant admin
  const { data: outletsData } = useQuery({
    queryKey: ['my-outlets'],
    queryFn: async () => {
      const response = await merchantManageApi.outlets.list();
      return response.data;
    },
    enabled: !isEmployee,
  });

  const outlets = Array.isArray(outletsData) 
    ? outletsData 
    : ((outletsData as any)?.results || []);

  // Set outlet for employee
  useEffect(() => {
    if (isEmployee && userOutletId) {
      setValue('outlet_id', userOutletId);
    }
  }, [isEmployee, userOutletId, setValue]);

  // Watch for residence country changes
  const residenceCountry = watch('traveler.residence_country');
  useEffect(() => {
    if (residenceCountry && !isEligibleForTaxFree(residenceCountry)) {
      setEligibilityWarning(`Les résidents de ${getCountryName(residenceCountry)} ne sont pas éligibles à la détaxe.`);
    } else {
      setEligibilityWarning(null);
    }
  }, [residenceCountry]);

  // Calculate totals
  const items = watch('items');
  const totalHT = items.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)), 0);
  const totalVAT = items.reduce((sum, item) => {
    const lineTotal = (item.quantity || 0) * (item.unit_price || 0);
    return sum + (lineTotal * (item.vat_rate || VAT_RATE) / 100);
  }, 0);
  const totalTTC = totalHT + totalVAT;

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: SaleFormData) => {
      // Create invoice first
      const invoiceRes = await salesApi.createInvoice({
        outlet: data.outlet_id,
        invoice_number: data.invoice_number,
        invoice_date: data.invoice_date,
        currency: 'CDF',
        items: data.items,
      });

      // Then create tax free form
      const formRes = await taxfreeApi.createForm({
        invoice_id: invoiceRes.data.id,
        traveler: data.traveler,
      });

      // Send email if requested
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
      setStep(4); // Success step
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || 'Erreur lors de la création du bordereau');
    },
  });

  const onSubmit = (data: SaleFormData) => {
    if (eligibilityWarning) {
      toast.error('Le client n\'est pas éligible à la détaxe');
      return;
    }
    createMutation.mutate(data);
  };

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  const selectedOutlet = outlets.find((o: any) => o.id === watch('outlet_id'));

  return (
    <FadeIn duration={400}>
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Nouvelle vente Tax Free</h1>
        <p className="text-gray-500 mt-1">Créez un bordereau de détaxe pour un touriste</p>
      </div>

      {/* Steps indicator */}
      <div className="flex items-center justify-center mb-8">
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
                w-12 h-12 rounded-full flex items-center justify-center transition-all
                ${step === s.num ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : ''}
                ${step > s.num ? 'bg-green-500 text-white' : ''}
                ${step < s.num ? 'bg-gray-100 text-gray-400' : ''}
              `}>
                {step > s.num ? (
                  <CheckCircleIcon className="w-6 h-6" />
                ) : (
                  <s.icon className="w-6 h-6" />
                )}
              </div>
              <span className="text-xs mt-2 font-medium">{s.label}</span>
            </div>
            {idx < 2 && (
              <div className={`w-24 h-1 mx-2 rounded ${step > s.num ? 'bg-green-500' : 'bg-gray-200'}`} />
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit(onSubmit)}>
        {/* Step 1: Invoice details */}
        {step === 1 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <ShoppingBagIcon className="w-5 h-5" />
                Détails de la facture
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Outlet & Invoice info */}
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
                  {errors.outlet_id && <p className="text-red-500 text-xs mt-1">{errors.outlet_id.message}</p>}
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
                  {errors.invoice_number && <p className="text-red-500 text-xs mt-1">{errors.invoice_number.message}</p>}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Date de facture <span className="text-red-500">*</span>
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
                <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                  {/* Header */}
                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-500 uppercase px-2">
                    <div className="col-span-4">Désignation</div>
                    <div className="col-span-2">Catégorie</div>
                    <div className="col-span-1 text-center">Qté</div>
                    <div className="col-span-2 text-right">Prix unit.</div>
                    <div className="col-span-1 text-center">TVA %</div>
                    <div className="col-span-1 text-right">Total</div>
                    <div className="col-span-1"></div>
                  </div>
                  
                  {fields.map((field, index) => {
                    const qty = watch(`items.${index}.quantity`) || 0;
                    const price = watch(`items.${index}.unit_price`) || 0;
                    const lineTotal = qty * price;
                    
                    return (
                      <div key={field.id} className="grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border border-gray-100">
                        <div className="col-span-4">
                          <input
                            {...register(`items.${index}.product_name`, { required: true })}
                            className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Nom du produit"
                          />
                        </div>
                        <div className="col-span-2">
                          <select 
                            {...register(`items.${index}.product_category`)}
                            className="w-full px-2 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          >
                            {CATEGORIES.map(cat => (
                              <option key={cat.value} value={cat.value}>{cat.label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="col-span-1">
                          <input
                            type="number"
                            min="1"
                            {...register(`items.${index}.quantity`, { valueAsNumber: true, min: 1 })}
                            className="w-full px-2 py-2 text-sm text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div className="col-span-2">
                          <input
                            type="number"
                            min="0"
                            {...register(`items.${index}.unit_price`, { valueAsNumber: true, min: 0 })}
                            className="w-full px-2 py-2 text-sm text-right border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="0"
                          />
                        </div>
                        <div className="col-span-1">
                          <input
                            type="number"
                            {...register(`items.${index}.vat_rate`, { valueAsNumber: true })}
                            className="w-full px-2 py-2 text-sm text-center border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 bg-gray-50"
                            readOnly
                          />
                        </div>
                        <div className="col-span-1 text-right text-sm font-medium text-gray-900">
                          {lineTotal.toLocaleString('fr-FR')}
                        </div>
                        <div className="col-span-1 text-center">
                          {fields.length > 1 && (
                            <button 
                              type="button" 
                              onClick={() => remove(index)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  
                  <button
                    type="button"
                    onClick={() => append({ product_name: '', product_category: 'GENERAL', quantity: 1, unit_price: 0, vat_rate: VAT_RATE })}
                    className="flex items-center gap-2 px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                  >
                    <PlusIcon className="w-4 h-4" />
                    Ajouter un article
                  </button>
                </div>
              </div>

              {/* Totals */}
              <div className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4">
                <div className="flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Total HT:</span>
                      <span className="font-medium">{totalHT.toLocaleString('fr-FR')} CDF</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">TVA ({VAT_RATE}%):</span>
                      <span className="font-medium">{totalVAT.toLocaleString('fr-FR')} CDF</span>
                    </div>
                    <div className="flex justify-between text-lg font-bold pt-2 border-t border-gray-200">
                      <span>Total TTC:</span>
                      <span className="text-blue-600">{totalTTC.toLocaleString('fr-FR')} CDF</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end">
              <button 
                type="button" 
                onClick={nextStep}
                disabled={totalTTC === 0}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Suivant
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Traveler info */}
        {step === 2 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <UserIcon className="w-5 h-5" />
                Informations du voyageur
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Eligibility warning */}
              {eligibilityWarning && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
                  <ExclamationTriangleIcon className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-red-800">Non éligible à la détaxe</p>
                    <p className="text-sm text-red-600">{eligibilityWarning}</p>
                  </div>
                </div>
              )}

              {/* Passport info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Informations du passeport</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      N° de passeport <span className="text-red-500">*</span>
                    </label>
                    <input 
                      {...register('traveler.passport_number', { required: 'Numéro de passeport requis' })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 uppercase"
                      placeholder="AB1234567"
                    />
                    {errors.traveler?.passport_number && (
                      <p className="text-red-500 text-xs mt-1">{errors.traveler.passport_number.message}</p>
                    )}
                  </div>
                  
                  <Controller
                    name="traveler.passport_country"
                    control={control}
                    rules={{ required: 'Pays du passeport requis' }}
                    render={({ field }) => (
                      <CountrySelect
                        value={field.value}
                        onChange={field.onChange}
                        label="Pays du passeport"
                        required
                        error={errors.traveler?.passport_country?.message}
                        excludeCountries={NON_ELIGIBLE_COUNTRIES}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Personal info */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Identité</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Prénom <span className="text-red-500">*</span>
                    </label>
                    <input 
                      {...register('traveler.first_name', { required: 'Prénom requis' })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      placeholder="Jean"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Nom <span className="text-red-500">*</span>
                    </label>
                    <input 
                      {...register('traveler.last_name', { required: 'Nom requis' })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      placeholder="Dupont"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">
                      Date de naissance <span className="text-red-500">*</span>
                    </label>
                    <input 
                      type="date"
                      {...register('traveler.date_of_birth', { required: 'Date de naissance requise' })}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  
                  <Controller
                    name="traveler.nationality"
                    control={control}
                    rules={{ required: 'Nationalité requise' }}
                    render={({ field }) => (
                      <CountrySelect
                        value={field.value}
                        onChange={field.onChange}
                        label="Nationalité"
                        required
                        error={errors.traveler?.nationality?.message}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Residence */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Résidence</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Controller
                    name="traveler.residence_country"
                    control={control}
                    rules={{ required: 'Pays de résidence requis' }}
                    render={({ field }) => (
                      <CountrySelect
                        value={field.value}
                        onChange={field.onChange}
                        label="Pays de résidence"
                        required
                        error={errors.traveler?.residence_country?.message}
                      />
                    )}
                  />
                </div>
              </div>

              {/* Contact */}
              <div>
                <h3 className="text-sm font-semibold text-gray-900 mb-3">Contact (optionnel)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
                    <input 
                      type="email"
                      {...register('traveler.email')}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      placeholder="jean.dupont@email.com"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1.5">Téléphone</label>
                    <input 
                      {...register('traveler.phone')}
                      className="w-full px-4 py-2.5 border border-gray-200 rounded-xl bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500"
                      placeholder="+33 6 12 34 56 78"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
              <button 
                type="button" 
                onClick={prevStep}
                className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Précédent
              </button>
              <button 
                type="button" 
                onClick={nextStep}
                disabled={!!eligibilityWarning}
                className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Suivant
                <ArrowRightIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                <DocumentCheckIcon className="w-5 h-5" />
                Récapitulatif & Confirmation
              </h2>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Summary cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Invoice summary */}
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
                      <span className="font-medium">{watch('invoice_date')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Articles:</span>
                      <span className="font-medium">{items.length}</span>
                    </div>
                    <div className="pt-2 border-t border-gray-200 mt-2">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Total TTC:</span>
                        <span className="text-blue-600">{totalTTC.toLocaleString('fr-FR')} CDF</span>
                      </div>
                      <div className="flex justify-between text-green-600 font-medium">
                        <span>TVA remboursable:</span>
                        <span>{totalVAT.toLocaleString('fr-FR')} CDF</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Traveler summary */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <UserIcon className="w-4 h-4 text-blue-600" />
                    Voyageur
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nom:</span>
                      <span className="font-medium">{watch('traveler.first_name')} {watch('traveler.last_name')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Passeport:</span>
                      <span className="font-medium font-mono">{watch('traveler.passport_number')}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Pays passeport:</span>
                      <span className="font-medium">{getCountryName(watch('traveler.passport_country'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Nationalité:</span>
                      <span className="font-medium">{getCountryName(watch('traveler.nationality'))}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-500">Résidence:</span>
                      <span className="font-medium">{getCountryName(watch('traveler.residence_country'))}</span>
                    </div>
                    {watch('traveler.email') && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Email:</span>
                        <span className="font-medium">{watch('traveler.email')}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Email option */}
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
                      <p className="text-sm text-gray-500">Le client recevra une copie du bordereau à {watch('traveler.email')}</p>
                    </div>
                  </label>
                </div>
              )}

              {/* Legal notice */}
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                <p className="text-sm text-amber-800">
                  <strong>Important:</strong> En créant ce bordereau, vous certifiez que les informations fournies sont exactes 
                  et que le client est bien un touriste étranger éligible à la détaxe selon la réglementation en vigueur.
                </p>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-between">
              <button 
                type="button" 
                onClick={prevStep}
                className="flex items-center gap-2 px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <ArrowLeftIcon className="w-4 h-4" />
                Précédent
              </button>
              <button 
                type="submit"
                disabled={createMutation.isPending}
                className="flex items-center gap-2 px-8 py-2.5 bg-gradient-to-r from-green-600 to-emerald-600 text-white rounded-xl hover:from-green-700 hover:to-emerald-700 disabled:opacity-50 transition-all shadow-lg shadow-green-500/25"
              >
                {createMutation.isPending ? (
                  <>
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Création en cours...
                  </>
                ) : (
                  <>
                    <CheckCircleIcon className="w-5 h-5" />
                    Créer le bordereau
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Success */}
        {step === 4 && createdForm && (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-6 py-8 text-center">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircleIcon className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white">Bordereau créé avec succès !</h2>
              <p className="text-green-100 mt-2">Le bordereau de détaxe a été généré</p>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Form number */}
              <div className="text-center">
                <p className="text-sm text-gray-500 mb-1">Numéro du bordereau</p>
                <p className="text-3xl font-bold font-mono text-blue-600 tracking-wider">
                  {createdForm.form_number}
                </p>
              </div>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4 text-center">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-gray-500">Montant total</p>
                    <p className="text-lg font-bold">{totalTTC.toLocaleString('fr-FR')} CDF</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">TVA remboursable</p>
                    <p className="text-lg font-bold text-green-600">{totalVAT.toLocaleString('fr-FR')} CDF</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Statut</p>
                    <span className="inline-flex px-3 py-1 text-sm font-medium bg-blue-100 text-blue-700 rounded-full">
                      Créé
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  type="button"
                  onClick={() => navigate(`/merchant/forms/${createdForm.id}`)}
                  className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  <DocumentCheckIcon className="w-5 h-5" />
                  Voir le bordereau
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <PrinterIcon className="w-5 h-5" />
                  Imprimer
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStep(1);
                    setCreatedForm(null);
                  }}
                  className="flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <PlusIcon className="w-5 h-5" />
                  Nouvelle vente
                </button>
              </div>
            </div>
          </div>
        )}
      </form>
      </div>
    </FadeIn>
  );
}
