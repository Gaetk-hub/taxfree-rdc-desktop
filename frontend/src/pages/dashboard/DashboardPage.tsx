import { useAuthStore } from '../../store/authStore';
import {
  DocumentTextIcon,
  CheckCircleIcon,
  BanknotesIcon,
} from '@heroicons/react/24/outline';
import AdminDashboard from './AdminDashboard';

export default function DashboardPage() {
  const { user } = useAuthStore();

  // Admin and Auditor get the full professional dashboard
  if (user?.role === 'ADMIN' || user?.role === 'AUDITOR') {
    return <AdminDashboard />;
  }

  // Other roles get their specific dashboards
  return (
    <div>

      {user?.role === 'MERCHANT' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a href="/merchant/sales/new" className="card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <DocumentTextIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Nouvelle vente</h3>
                <p className="text-sm text-gray-600">Créer un bordereau Tax Free</p>
              </div>
            </div>
          </a>
          <a href="/merchant/forms" className="card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircleIcon className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Mes bordereaux</h3>
                <p className="text-sm text-gray-600">Consulter l'historique</p>
              </div>
            </div>
          </a>
        </div>
      )}

      {user?.role === 'CUSTOMS_AGENT' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a href="/customs/scan" className="card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary-100 rounded-lg">
                <DocumentTextIcon className="h-8 w-8 text-primary-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Scanner un QR</h3>
                <p className="text-sm text-gray-600">Valider un bordereau Tax Free</p>
              </div>
            </div>
          </a>
          <a href="/customs/offline" className="card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <CheckCircleIcon className="h-8 w-8 text-yellow-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Mode hors-ligne</h3>
                <p className="text-sm text-gray-600">Synchroniser les validations</p>
              </div>
            </div>
          </a>
        </div>
      )}

      {user?.role === 'OPERATOR' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <a href="/operator/refunds" className="card hover:shadow-md transition-shadow">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <BanknotesIcon className="h-8 w-8 text-green-600" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">File des remboursements</h3>
                <p className="text-sm text-gray-600">Traiter les paiements en attente</p>
              </div>
            </div>
          </a>
        </div>
      )}
    </div>
  );
}
