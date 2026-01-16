import { ArrowRightOnRectangleIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import api from '../services/api';

export default function MaintenancePage() {
  const [isMaintenanceActive, setIsMaintenanceActive] = useState(true);
  const [isChecking, setIsChecking] = useState(true);
  const message = sessionStorage.getItem('maintenance_message') || 'Le système est en maintenance. Veuillez réessayer plus tard.';

  // Check if maintenance mode is still active
  useEffect(() => {
    const checkMaintenance = async () => {
      try {
        // Try to access a simple endpoint to check if maintenance is still active
        await api.get('/settings/system/');
        // If we get here, maintenance is off - redirect to home
        sessionStorage.removeItem('maintenance_message');
        window.location.replace('/');
      } catch (error: unknown) {
        const axiosError = error as { response?: { status?: number; data?: { code?: string } } };
        if (axiosError.response?.status === 503 && axiosError.response?.data?.code === 'maintenance_mode') {
          // Maintenance is still active
          setIsMaintenanceActive(true);
        } else {
          // Other error or maintenance is off
          sessionStorage.removeItem('maintenance_message');
          window.location.replace('/');
        }
      } finally {
        setIsChecking(false);
      }
    };
    
    checkMaintenance();
  }, []);

  const handleLogout = () => {
    sessionStorage.removeItem('maintenance_message');
    localStorage.clear();
    sessionStorage.clear();
    window.location.replace('/login');
  };

  // Show loading while checking
  if (isChecking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500"></div>
      </div>
    );
  }

  // If maintenance is not active, this will redirect (handled in useEffect)
  if (!isMaintenanceActive) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-yellow-50 flex items-center justify-center p-4 overflow-hidden relative">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating circles */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-orange-200/40 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-amber-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-72 h-72 bg-yellow-200/40 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid pattern */}
        <div className="absolute inset-0 bg-[linear-gradient(rgba(0,0,0,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,0,0,0.03)_1px,transparent_1px)] bg-[size:50px_50px]" />
      </div>

      {/* Main card */}
      <div className="relative max-w-lg w-full">
        {/* Glow effect behind card */}
        <div className="absolute -inset-1 bg-gradient-to-r from-orange-400 via-amber-400 to-yellow-400 rounded-3xl blur-lg opacity-20 animate-pulse" />
        
        <div className="relative bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-8 text-center border border-orange-100">
          {/* Animated gear icon */}
          <div className="mx-auto w-32 h-32 mb-8 relative">
            {/* Outer rotating gear */}
            <svg 
              className="w-full h-full text-orange-400 animate-spin" 
              style={{ animationDuration: '8s' }}
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="currentColor" 
              strokeWidth="1.5"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.343 3.94c.09-.542.56-.94 1.11-.94h1.093c.55 0 1.02.398 1.11.94l.149.894c.07.424.384.764.78.93.398.164.855.142 1.205-.108l.737-.527a1.125 1.125 0 011.45.12l.773.774c.39.389.44 1.002.12 1.45l-.527.737c-.25.35-.272.806-.107 1.204.165.397.505.71.93.78l.893.15c.543.09.94.56.94 1.109v1.094c0 .55-.397 1.02-.94 1.11l-.893.149c-.425.07-.765.383-.93.78-.165.398-.143.854.107 1.204l.527.738c.32.447.269 1.06-.12 1.45l-.774.773a1.125 1.125 0 01-1.449.12l-.738-.527c-.35-.25-.806-.272-1.204-.107-.397.165-.71.505-.78.929l-.15.894c-.09.542-.56.94-1.11.94h-1.094c-.55 0-1.019-.398-1.11-.94l-.148-.894c-.071-.424-.384-.764-.781-.93-.398-.164-.854-.142-1.204.108l-.738.527c-.447.32-1.06.269-1.45-.12l-.773-.774a1.125 1.125 0 01-.12-1.45l.527-.737c.25-.35.273-.806.108-1.204-.165-.397-.506-.71-.93-.78l-.894-.15c-.542-.09-.94-.56-.94-1.109v-1.094c0-.55.398-1.02.94-1.11l.894-.149c.424-.07.765-.383.93-.78.165-.398.143-.854-.108-1.204l-.526-.738a1.125 1.125 0 01.12-1.45l.773-.773a1.125 1.125 0 011.45-.12l.737.527c.35.25.807.272 1.204.107.397-.165.71-.505.78-.929l.15-.894z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            
            {/* Inner pulsing circle */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-12 h-12 bg-orange-500/20 rounded-full animate-ping" />
            </div>
          </div>

          {/* Title with gradient */}
          <h1 className="text-3xl font-bold bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 bg-clip-text text-transparent mb-4">
            Maintenance en cours
          </h1>

          {/* Message */}
          <p className="text-gray-600 mb-6 leading-relaxed">
            {message}
          </p>

          {/* Animated progress bar */}
          <div className="w-full h-2 bg-orange-100 rounded-full mb-6 overflow-hidden">
            <div className="h-full bg-gradient-to-r from-orange-500 via-amber-500 to-yellow-500 rounded-full animate-pulse" 
                 style={{ 
                   width: '60%',
                   animation: 'shimmer 2s ease-in-out infinite'
                 }} 
            />
          </div>

          {/* Info box with animation */}
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-3 text-orange-600">
              <svg className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              <p className="text-sm">
                Notre équipe travaille activement sur le système
              </p>
            </div>
          </div>

          {/* Countdown-like dots */}
          <div className="flex justify-center gap-2 mb-8">
            {[0, 1, 2].map((i) => (
              <div 
                key={i}
                className="w-3 h-3 bg-orange-400 rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.2}s` }}
              />
            ))}
          </div>

          {/* Logout button with hover effect */}
          <button
            onClick={handleLogout}
            className="group relative inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-orange-500 to-pink-500 text-white rounded-xl font-semibold shadow-lg shadow-orange-500/25 hover:shadow-orange-500/40 transition-all duration-300 hover:scale-105 overflow-hidden"
          >
            {/* Button shine effect */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            <ArrowRightOnRectangleIcon className="w-5 h-5 relative z-10" />
            <span className="relative z-10">Se déconnecter</span>
          </button>

          {/* Footer */}
          <p className="mt-8 text-xs text-gray-500">
            Si le problème persiste, contactez le{' '}
            <a href="mailto:support@taxfree.cd" className="text-orange-600 hover:text-orange-700 transition-colors font-medium">
              support technique
            </a>
          </p>
        </div>
      </div>

      {/* Custom CSS for shimmer animation */}
      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.5; transform: translateX(-10%); }
          50% { opacity: 1; transform: translateX(10%); }
        }
      `}</style>
    </div>
  );
}
