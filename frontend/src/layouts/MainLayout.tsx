import { useState } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { Sidebar, Navbar } from '../components/layout';
import MobileBlocker from '../components/ui/MobileBlocker';

export default function MainLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <MobileBlocker>
    <div className="min-h-screen bg-white">
      {/* Couche 1 - Sidebar (fond blanc, fixe à gauche) */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onLogout={handleLogout}
      />

      {/* Zone principale à droite de la sidebar */}
      <div className="lg:ml-64 min-h-screen flex flex-col">
        {/* Navbar autonome et fixe en haut */}
        <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
          <Navbar
            onMenuClick={() => setSidebarOpen(true)}
            onLogout={handleLogout}
          />
        </div>

        {/* Couche 2 - Main (fond blanc avec padding pour créer l'espace) */}
        <main className="flex-1 bg-white p-4 lg:p-6">
          {/* Conteneur avec bordure aux couleurs du drapeau RDC */}
          <div className="min-h-[calc(100vh-8rem)] rounded-2xl shadow-lg p-1 relative overflow-hidden"
               style={{
                 background: 'linear-gradient(135deg, #007FFF 0%, #007FFF 33%, #F7D618 33%, #F7D618 50%, #CE1126 50%, #CE1126 100%)'
               }}>
            {/* Conteneur intérieur avec fond clair */}
            <div className="h-full min-h-[calc(100vh-8.5rem)] bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50 rounded-xl">
              {/* Page content */}
              <div className="p-4 md:p-6 lg:p-8">
                <div className="max-w-7xl mx-auto">
                  <Outlet />
                </div>
              </div>
            </div>
          </div>
        </main>

        {/* Footer */}
        <footer className="py-4 px-6 border-t border-gray-100 bg-white">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-gray-500">
            <p>© 2026 Tax Free RDC. Tous droits réservés.</p>
            <div className="flex items-center gap-4">
              <a href="/help" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">Aide</a>
              <a href="/privacy" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">Confidentialité</a>
              <a href="/terms" target="_blank" rel="noopener noreferrer" className="hover:text-gray-700 transition-colors">Conditions</a>
            </div>
          </div>
        </footer>
      </div>
    </div>
    </MobileBlocker>
  );
}
