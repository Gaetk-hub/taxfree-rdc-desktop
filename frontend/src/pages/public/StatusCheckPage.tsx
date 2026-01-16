import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { taxfreeApi } from '../../services/api';
import toast from 'react-hot-toast';

interface StatusForm {
  form_number?: string;
  passport_number?: string;
}

interface FormStatus {
  form_number: string;
  status: string;
  status_display: string;
  refund_amount: string;
  currency: string;
  created_at: string;
  validated_at: string | null;
}

const statusColors: Record<string, string> = {
  CREATED: 'bg-gray-100 text-gray-800',
  ISSUED: 'bg-blue-100 text-blue-800',
  VALIDATION_PENDING: 'bg-yellow-100 text-yellow-800',
  VALIDATED: 'bg-green-100 text-green-800',
  REFUSED: 'bg-red-100 text-red-800',
  EXPIRED: 'bg-gray-100 text-gray-800',
  CANCELLED: 'bg-gray-100 text-gray-800',
};

export default function StatusCheckPage() {
  const [forms, setForms] = useState<FormStatus[]>([]);
  const [loading, setLoading] = useState(false);
  const { register, handleSubmit } = useForm<StatusForm>();

  const onSubmit = async (data: StatusForm) => {
    if (!data.form_number && !data.passport_number) {
      toast.error('Veuillez saisir un numéro de bordereau ou de passeport');
      return;
    }

    setLoading(true);
    try {
      const response = await taxfreeApi.checkStatus(data as Record<string, unknown>);
      setForms(response.data.forms);
      if (response.data.forms.length === 0) {
        toast.error('Aucun bordereau trouvé');
      }
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Erreur lors de la recherche');
      setForms([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tax Free RDC</h1>
          <p className="text-gray-600 mt-2">Vérifiez le statut de votre remboursement</p>
        </div>

        <div className="card mb-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="label">Numéro de bordereau</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: 202401ABCD1234"
                {...register('form_number')}
              />
            </div>

            <div className="text-center text-gray-500">ou</div>

            <div>
              <label className="label">Numéro de passeport</label>
              <input
                type="text"
                className="input"
                placeholder="Ex: FR123456789"
                {...register('passport_number')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary w-full"
            >
              {loading ? 'Recherche...' : 'Vérifier le statut'}
            </button>
          </form>
        </div>

        {forms.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-900">Résultats</h2>
            {forms.map((form) => (
              <div key={form.form_number} className="card">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-sm text-gray-500">Numéro de bordereau</p>
                    <p className="font-mono font-medium">{form.form_number}</p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusColors[form.status]}`}>
                    {form.status_display}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Montant remboursable</p>
                    <p className="font-semibold">{form.refund_amount} {form.currency}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Date de création</p>
                    <p>{new Date(form.created_at).toLocaleDateString('fr-FR')}</p>
                  </div>
                  {form.validated_at && (
                    <div>
                      <p className="text-gray-500">Date de validation</p>
                      <p>{new Date(form.validated_at).toLocaleDateString('fr-FR')}</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-8 text-center">
          <a href="/login" className="text-primary-600 hover:text-primary-700">
            Accès professionnel →
          </a>
        </div>
      </div>
    </div>
  );
}
