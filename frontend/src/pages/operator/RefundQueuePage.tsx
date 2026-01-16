import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { refundsApi, taxfreeApi } from '../../services/api';
import toast from 'react-hot-toast';
import { BanknotesIcon, ArrowPathIcon, CheckCircleIcon } from '@heroicons/react/24/outline';

const REFUND_METHODS = [
  { value: 'CARD', label: 'Carte bancaire' },
  { value: 'BANK_TRANSFER', label: 'Virement bancaire' },
  { value: 'MOBILE_MONEY', label: 'Mobile Money' },
  { value: 'CASH', label: 'Espèces' },
];

export default function RefundQueuePage() {
  const queryClient = useQueryClient();
  const [selectedForm, setSelectedForm] = useState<any>(null);
  const [refundMethod, setRefundMethod] = useState('MOBILE_MONEY');
  const [paymentDetails, setPaymentDetails] = useState<any>({});

  const { data: validatedForms, isLoading: loadingForms } = useQuery({
    queryKey: ['validated-forms'],
    queryFn: () => taxfreeApi.listForms({ status: 'VALIDATED' }),
  });

  const { data: pendingRefunds, isLoading: loadingRefunds } = useQuery({
    queryKey: ['pending-refunds'],
    queryFn: () => refundsApi.list({ status: 'PENDING' }),
  });

  const initiateMutation = useMutation({
    mutationFn: (data: { formId: string; method: string; payment_details: any }) =>
      refundsApi.initiate(data.formId, {
        method: data.method,
        payment_details: data.payment_details,
      }),
    onSuccess: () => {
      toast.success('Remboursement initié');
      queryClient.invalidateQueries({ queryKey: ['validated-forms'] });
      queryClient.invalidateQueries({ queryKey: ['pending-refunds'] });
      setSelectedForm(null);
      setPaymentDetails({});
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || 'Erreur');
    },
  });

  const retryMutation = useMutation({
    mutationFn: (refundId: string) => refundsApi.retry(refundId),
    onSuccess: () => {
      toast.success('Remboursement relancé');
      queryClient.invalidateQueries({ queryKey: ['pending-refunds'] });
    },
  });

  const collectCashMutation = useMutation({
    mutationFn: (refundId: string) => refundsApi.collectCash(refundId),
    onSuccess: () => {
      toast.success('Remboursement en espèces confirmé');
      queryClient.invalidateQueries({ queryKey: ['pending-refunds'] });
    },
  });

  const handleInitiate = () => {
    if (!selectedForm) return;
    initiateMutation.mutate({
      formId: selectedForm.id,
      method: refundMethod,
      payment_details: paymentDetails,
    });
  };

  const forms = validatedForms?.data?.results || [];
  const refunds = pendingRefunds?.data?.results || [];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">File des remboursements</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Forms awaiting refund */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">
            Bordereaux validés en attente ({forms.length})
          </h2>

          {loadingForms ? (
            <p className="text-gray-500">Chargement...</p>
          ) : forms.length === 0 ? (
            <p className="text-gray-500">Aucun bordereau en attente</p>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {forms.map((form: any) => (
                <div
                  key={form.id}
                  onClick={() => setSelectedForm(form)}
                  className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                    selectedForm?.id === form.id
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-mono font-medium">{form.form_number}</p>
                      <p className="text-sm text-gray-600">{form.traveler?.full_name}</p>
                    </div>
                    <p className="font-semibold text-green-600">
                      {form.refund_amount} {form.currency}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Initiate refund form */}
        <div className="card">
          <h2 className="text-lg font-semibold mb-4">Initier un remboursement</h2>

          {selectedForm ? (
            <div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="font-mono">{selectedForm.form_number}</p>
                <p className="text-sm text-gray-600">{selectedForm.traveler?.full_name}</p>
                <p className="text-lg font-bold text-green-600 mt-2">
                  {selectedForm.refund_amount} {selectedForm.currency}
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="label">Méthode de remboursement</label>
                  <select
                    className="input"
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                  >
                    {REFUND_METHODS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                </div>

                {refundMethod === 'MOBILE_MONEY' && (
                  <>
                    <div>
                      <label className="label">Numéro de téléphone</label>
                      <input
                        type="text"
                        className="input"
                        placeholder="+243..."
                        value={paymentDetails.phone_number || ''}
                        onChange={(e) =>
                          setPaymentDetails({ ...paymentDetails, phone_number: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Opérateur</label>
                      <select
                        className="input"
                        value={paymentDetails.provider || ''}
                        onChange={(e) =>
                          setPaymentDetails({ ...paymentDetails, provider: e.target.value })
                        }
                      >
                        <option value="">Sélectionner...</option>
                        <option value="MPESA">M-Pesa</option>
                        <option value="ORANGE">Orange Money</option>
                        <option value="AIRTEL">Airtel Money</option>
                      </select>
                    </div>
                  </>
                )}

                {refundMethod === 'BANK_TRANSFER' && (
                  <>
                    <div>
                      <label className="label">Numéro de compte</label>
                      <input
                        type="text"
                        className="input"
                        value={paymentDetails.account_number || ''}
                        onChange={(e) =>
                          setPaymentDetails({ ...paymentDetails, account_number: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="label">Code banque</label>
                      <input
                        type="text"
                        className="input"
                        value={paymentDetails.bank_code || ''}
                        onChange={(e) =>
                          setPaymentDetails({ ...paymentDetails, bank_code: e.target.value })
                        }
                      />
                    </div>
                  </>
                )}

                <button
                  onClick={handleInitiate}
                  disabled={initiateMutation.isPending}
                  className="btn btn-primary w-full"
                >
                  <BanknotesIcon className="h-5 w-5 mr-2" />
                  {initiateMutation.isPending ? 'Traitement...' : 'Initier le remboursement'}
                </button>
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">
              Sélectionnez un bordereau pour initier le remboursement
            </p>
          )}
        </div>
      </div>

      {/* Pending refunds */}
      <div className="card mt-6">
        <h2 className="text-lg font-semibold mb-4">Remboursements en cours ({refunds.length})</h2>

        {loadingRefunds ? (
          <p className="text-gray-500">Chargement...</p>
        ) : refunds.length === 0 ? (
          <p className="text-gray-500">Aucun remboursement en cours</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Bordereau</th>
                  <th className="text-left py-2">Montant</th>
                  <th className="text-left py-2">Méthode</th>
                  <th className="text-left py-2">Statut</th>
                  <th className="text-left py-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund: any) => (
                  <tr key={refund.id} className="border-b">
                    <td className="py-2 font-mono">{refund.form?.form_number}</td>
                    <td className="py-2">{refund.net_amount} {refund.currency}</td>
                    <td className="py-2">{refund.method}</td>
                    <td className="py-2">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          refund.status === 'PAID'
                            ? 'bg-green-100 text-green-800'
                            : refund.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {refund.status}
                      </span>
                    </td>
                    <td className="py-2">
                      {refund.status === 'FAILED' && (
                        <button
                          onClick={() => retryMutation.mutate(refund.id)}
                          className="btn btn-secondary text-xs py-1"
                        >
                          <ArrowPathIcon className="h-4 w-4 mr-1" />
                          Réessayer
                        </button>
                      )}
                      {refund.method === 'CASH' && refund.status === 'INITIATED' && (
                        <button
                          onClick={() => collectCashMutation.mutate(refund.id)}
                          className="btn btn-success text-xs py-1"
                        >
                          <CheckCircleIcon className="h-4 w-4 mr-1" />
                          Confirmer
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
