import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { useAuthStore } from './store/authStore';
import { setNavigate } from './services/navigation';
import PermissionGuard from './components/guards/PermissionGuard';

// Layouts
import MainLayout from './layouts/MainLayout';
import AuthLayout from './layouts/AuthLayout';
import PublicLayout from './layouts/PublicLayout';

// Auth pages
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import ActivateAccountPage from './pages/auth/ActivateAccountPage';
import ActivateAgentPage from './pages/auth/ActivateAgentPage';
import ResetPasswordPage from './pages/auth/ResetPasswordPage';
import AcceptInvitationPage from './pages/auth/AcceptInvitationPage';
import ActivateSystemUserPage from './pages/auth/ActivateSystemUserPage';

// Public pages
import HomePage from './pages/public/HomePage';
import StatusCheckPage from './pages/public/StatusCheckPage';
import VoyageursPage from './pages/public/VoyageursPage';
import CommercantPage from './pages/public/CommercantPage';
import CommentCaMarchePage from './pages/public/CommentCaMarchePage';
import ContactPage from './pages/public/ContactPage';
import CompleteRegistrationPage from './pages/public/CompleteRegistrationPage';
import DownloadPage from './pages/public/DownloadPage';

// Dashboard pages
import AdminDashboard from './pages/dashboard/AdminDashboard';
import MerchantDashboard from './pages/merchant/MerchantDashboard';
import ClientDashboard from './pages/client/ClientDashboard';

// Merchant pages
import FormsListPage from './pages/merchant/FormsListPage';
import FormDetailPage from './pages/merchant/FormDetailPage';
import OutletsPage from './pages/merchant/settings/OutletsPage';
import MerchantUsersPage from './pages/merchant/settings/UsersPage';
import MerchantTravelersPage from './pages/merchant/settings/TravelersPage';
import MerchantReportsPage from './pages/merchant/settings/ReportsPage';
import MerchantNotificationsPage from './pages/merchant/NotificationsPage';

// Customs pages
import CustomsDashboard from './pages/customs/CustomsDashboardNew';
import CustomsScanPage from './pages/customs/CustomsScanPage';
import CustomsOfflinePage from './pages/customs/CustomsOfflinePage';
import RefundPage from './pages/customs/RefundPage';
import RefundsListPage from './pages/customs/RefundsListPage';
import CustomsReportsPage from './pages/customs/CustomsReportsPage';
import CustomsNotificationsPage from './pages/customs/NotificationsPage';
import CustomsSettingsPage from './pages/customs/SettingsPage';

// Operator pages
import RefundQueuePage from './pages/operator/RefundQueuePage';

// Admin pages
import MerchantsManagementPage from './pages/admin/MerchantsManagementPage';
import RulesManagementPage from './pages/admin/RulesManagementPage';
import CategoriesManagementPage from './pages/admin/CategoriesManagementPage';
import CurrenciesManagementPage from './pages/admin/CurrenciesManagementPage';
import AuditLogPage from './pages/admin/AuditLogPage';
import ReportsPage from './pages/admin/ReportsPage';
import UsersManagementPage from './pages/admin/UsersManagementPage';
import NotificationsPage from './pages/admin/NotificationsPage';
import RegistrationRequestDetailPage from './pages/admin/RegistrationRequestDetailPage';
import BordersPage from './pages/admin/BordersPage';
import AgentsPage from './pages/admin/AgentsPage';
import FormsManagementPage from './pages/admin/FormsManagementPage';
import AdminFormDetailPage from './pages/admin/FormDetailPage';
import RefundsManagementPage from './pages/admin/RefundsManagementPage';
import AdminRefundDetailPage from './pages/admin/RefundDetailPage';
import PermissionsPage from './pages/admin/PermissionsPage';
import SettingsPage from './pages/admin/SettingsPage';
import ProfilePage from './pages/shared/ProfilePage';

// Legal pages
import HelpPage from './pages/legal/HelpPage';
import PrivacyPage from './pages/legal/PrivacyPage';
import TermsPage from './pages/legal/TermsPage';

// Maintenance page
import MaintenancePage from './pages/MaintenancePage';

// Support pages
import SupportChatPage from './pages/support/SupportChatPage';
import TicketsPage from './pages/support/TicketsPage';
import TicketDetailPage from './pages/support/TicketDetailPage';
import TrainingPage from './pages/support/TrainingPage';

// Protected route wrapper with strict role-based access control
function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles?: string[] }) {
  const { isAuthenticated, user } = useAuthStore();
  
  // Not authenticated - redirect to login
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  // If allowedRoles is specified, strictly enforce role-based access
  // ADMIN and AUDITOR can only access admin routes
  // MERCHANT can only access merchant routes
  // CUSTOMS_AGENT can only access customs routes
  // etc.
  if (allowedRoles && user) {
    const userRole = user.role;
    
    // Check if user's role is in the allowed roles list
    if (!allowedRoles.includes(userRole)) {
      // Redirect to the user's appropriate dashboard
      return <Navigate to={getDashboardUrl(userRole)} replace />;
    }
  }
  
  return <>{children}</>;
}

// Helper function to get dashboard URL based on role
function getDashboardUrl(role: string): string {
  switch (role) {
    case 'ADMIN':
    case 'AUDITOR':
      return '/admin/dashboard';
    case 'MERCHANT':
      return '/merchant/dashboard';
    case 'CUSTOMS_AGENT':
    case 'OPERATOR':
      return '/customs/dashboard';
    case 'CLIENT':
      return '/client/dashboard';
    default:
      return '/admin/dashboard';
  }
}

// Redirect to appropriate dashboard based on role
function DashboardRedirect() {
  const { user } = useAuthStore();
  return <Navigate to={getDashboardUrl(user?.role || '')} replace />;
}

function App() {
  const navigate = useNavigate();
  
  // Initialize navigation service for use outside React components (e.g., API interceptors)
  useEffect(() => {
    setNavigate(navigate);
  }, [navigate]);

  return (
    <Routes>
      {/* Public routes with shared layout */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/status" element={<StatusCheckPage />} />
        <Route path="/voyageurs" element={<VoyageursPage />} />
        <Route path="/commercants" element={<CommercantPage />} />
        <Route path="/comment-ca-marche" element={<CommentCaMarchePage />} />
        <Route path="/contact" element={<ContactPage />} />
      </Route>
      
      {/* Download page (public, no layout) */}
      <Route path="/download" element={<DownloadPage />} />
      
      {/* Auth routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>
      
      {/* Maintenance page (public, no layout) */}
      <Route path="/maintenance" element={<MaintenancePage />} />
      
      {/* Account activation (public, no layout) */}
      <Route path="/activate-account/:token" element={<ActivateAccountPage />} />
      
      {/* Password reset (public, no layout) */}
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      
      {/* Accept invitation (public, no layout) */}
      <Route path="/accept-invitation/:token" element={<AcceptInvitationPage />} />
      
      {/* Activate agent account (public, no layout) */}
      <Route path="/activate-agent/:token" element={<ActivateAgentPage />} />
      
      {/* Activate system user account (public, no layout) */}
      <Route path="/activate-system-user/:token" element={<ActivateSystemUserPage />} />
      
      {/* Complete registration - document submission (public, no layout) */}
      <Route path="/complete-registration/:token" element={<CompleteRegistrationPage />} />
      
      {/* Legal pages (public, no layout) */}
      <Route path="/help" element={<HelpPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      <Route path="/terms" element={<TermsPage />} />
      
      {/* Protected routes */}
      <Route element={<ProtectedRoute><MainLayout /></ProtectedRoute>}>
        {/* Dashboard redirect - redirects to role-specific dashboard */}
        <Route path="/dashboard" element={<DashboardRedirect />} />
        
        {/* Admin routes - with granular permission checks */}
        <Route path="/admin">
          {/* Redirect /admin to /admin/dashboard with role check */}
          <Route index element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><Navigate to="/admin/dashboard" replace /></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="DASHBOARD"><AdminDashboard /></PermissionGuard></ProtectedRoute>} />
          <Route path="merchants" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="MERCHANTS"><MerchantsManagementPage /></PermissionGuard></ProtectedRoute>} />
          <Route path="merchants/:id" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="MERCHANTS"><RegistrationRequestDetailPage /></PermissionGuard></ProtectedRoute>} />
          <Route path="users" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="USERS"><UsersManagementPage /></PermissionGuard></ProtectedRoute>} />
          {/* Bordereaux management - full traceability */}
          <Route path="forms" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="FORMS"><FormsManagementPage /></PermissionGuard></ProtectedRoute>} />
          <Route path="forms/:id" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="FORMS"><AdminFormDetailPage /></PermissionGuard></ProtectedRoute>} />
          {/* Refunds management - full traceability */}
          <Route path="refunds" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="REFUNDS"><RefundsManagementPage /></PermissionGuard></ProtectedRoute>} />
          <Route path="refunds/:id" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="REFUNDS"><AdminRefundDetailPage /></PermissionGuard></ProtectedRoute>} />
          <Route path="rules" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="RULES"><RulesManagementPage /></PermissionGuard></ProtectedRoute>} />
          <Route path="categories" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="CATEGORIES"><CategoriesManagementPage /></PermissionGuard></ProtectedRoute>} />
          <Route path="currencies" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="CATEGORIES"><CurrenciesManagementPage /></PermissionGuard></ProtectedRoute>} />
          <Route path="audit" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="AUDIT"><AuditLogPage /></PermissionGuard></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="REPORTS"><ReportsPage /></PermissionGuard></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><NotificationsPage /></ProtectedRoute>} />
          {/* Customs agents management */}
          <Route path="borders" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="BORDERS"><BordersPage /></PermissionGuard></ProtectedRoute>} />
          <Route path="agents" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="AGENTS"><AgentsPage /></PermissionGuard></ProtectedRoute>} />
          {/* Permissions management */}
          <Route path="permissions" element={<ProtectedRoute allowedRoles={['ADMIN']}><PermissionGuard requiredModule="PERMISSIONS"><PermissionsPage /></PermissionGuard></ProtectedRoute>} />
          {/* System settings */}
          <Route path="settings" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="SETTINGS"><SettingsPage /></PermissionGuard></ProtectedRoute>} />
          {/* Profile page - no permission check needed */}
          <Route path="profile" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><ProfilePage /></ProtectedRoute>} />
          {/* Support pages - with granular permission check */}
          <Route path="support/chat" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="SUPPORT_CHAT"><SupportChatPage /></PermissionGuard></ProtectedRoute>} />
          <Route path="support/tickets" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="SUPPORT_TICKETS"><TicketsPage /></PermissionGuard></ProtectedRoute>} />
          <Route path="support/tickets/:id" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><PermissionGuard requiredModule="SUPPORT_TICKETS"><TicketDetailPage /></PermissionGuard></ProtectedRoute>} />
          <Route path="training" element={<ProtectedRoute allowedRoles={['ADMIN', 'AUDITOR']}><TrainingPage /></ProtectedRoute>} />
        </Route>
        
        {/* Merchant routes */}
        <Route path="/merchant">
          {/* Redirect /merchant to /merchant/dashboard with role check */}
          <Route index element={<ProtectedRoute allowedRoles={['MERCHANT', 'MERCHANT_EMPLOYEE']}><Navigate to="/merchant/dashboard" replace /></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute allowedRoles={['MERCHANT', 'MERCHANT_EMPLOYEE']}><MerchantDashboard /></ProtectedRoute>} />
          <Route path="sales/new" element={<Navigate to="/merchant/forms" replace />} />
          <Route path="forms" element={<ProtectedRoute allowedRoles={['MERCHANT', 'MERCHANT_EMPLOYEE']}><FormsListPage /></ProtectedRoute>} />
          <Route path="forms/:id" element={<ProtectedRoute allowedRoles={['MERCHANT', 'MERCHANT_EMPLOYEE']}><FormDetailPage /></ProtectedRoute>} />
          {/* Settings sub-routes with dedicated URLs */}
          <Route path="settings" element={<Navigate to="/merchant/settings/outlets" replace />} />
          <Route path="settings/outlets" element={<ProtectedRoute allowedRoles={['MERCHANT']}><OutletsPage /></ProtectedRoute>} />
          <Route path="settings/users" element={<ProtectedRoute allowedRoles={['MERCHANT']}><MerchantUsersPage /></ProtectedRoute>} />
          <Route path="settings/travelers" element={<ProtectedRoute allowedRoles={['MERCHANT']}><MerchantTravelersPage /></ProtectedRoute>} />
          <Route path="settings/reports" element={<ProtectedRoute allowedRoles={['MERCHANT']}><MerchantReportsPage /></ProtectedRoute>} />
          {/* Profile page for merchants */}
          <Route path="profile" element={<ProtectedRoute allowedRoles={['MERCHANT', 'MERCHANT_EMPLOYEE']}><ProfilePage /></ProtectedRoute>} />
          {/* Support pages for merchants */}
          <Route path="support" element={<ProtectedRoute allowedRoles={['MERCHANT', 'MERCHANT_EMPLOYEE']}><SupportChatPage /></ProtectedRoute>} />
          <Route path="tickets" element={<ProtectedRoute allowedRoles={['MERCHANT', 'MERCHANT_EMPLOYEE']}><TicketsPage /></ProtectedRoute>} />
          <Route path="tickets/:id" element={<ProtectedRoute allowedRoles={['MERCHANT', 'MERCHANT_EMPLOYEE']}><TicketDetailPage /></ProtectedRoute>} />
          <Route path="training" element={<ProtectedRoute allowedRoles={['MERCHANT', 'MERCHANT_EMPLOYEE']}><TrainingPage /></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute allowedRoles={['MERCHANT', 'MERCHANT_EMPLOYEE']}><MerchantNotificationsPage /></ProtectedRoute>} />
        </Route>
        
        {/* Customs routes - shared by CUSTOMS_AGENT and OPERATOR */}
        <Route path="/customs">
          {/* Redirect /customs to /customs/dashboard with role check */}
          <Route index element={<ProtectedRoute allowedRoles={['CUSTOMS_AGENT', 'OPERATOR']}><Navigate to="/customs/dashboard" replace /></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute allowedRoles={['CUSTOMS_AGENT', 'OPERATOR']}><CustomsDashboard /></ProtectedRoute>} />
          <Route path="scan" element={<ProtectedRoute allowedRoles={['CUSTOMS_AGENT', 'OPERATOR']}><CustomsScanPage /></ProtectedRoute>} />
          <Route path="offline" element={<ProtectedRoute allowedRoles={['CUSTOMS_AGENT', 'OPERATOR']}><CustomsOfflinePage /></ProtectedRoute>} />
          <Route path="refunds" element={<ProtectedRoute allowedRoles={['CUSTOMS_AGENT', 'OPERATOR']}><RefundsListPage /></ProtectedRoute>} />
          <Route path="refund/:formId" element={<ProtectedRoute allowedRoles={['CUSTOMS_AGENT', 'OPERATOR']}><RefundPage /></ProtectedRoute>} />
          <Route path="reports" element={<ProtectedRoute allowedRoles={['CUSTOMS_AGENT', 'OPERATOR']}><CustomsReportsPage /></ProtectedRoute>} />
          <Route path="notifications" element={<ProtectedRoute allowedRoles={['CUSTOMS_AGENT', 'OPERATOR']}><CustomsNotificationsPage /></ProtectedRoute>} />
          {/* Profile page for customs agents and operators */}
          <Route path="profile" element={<ProtectedRoute allowedRoles={['CUSTOMS_AGENT', 'OPERATOR']}><ProfilePage /></ProtectedRoute>} />
          {/* Support pages for customs agents and operators */}
          <Route path="support" element={<ProtectedRoute allowedRoles={['CUSTOMS_AGENT', 'OPERATOR']}><SupportChatPage /></ProtectedRoute>} />
          <Route path="tickets" element={<ProtectedRoute allowedRoles={['CUSTOMS_AGENT', 'OPERATOR']}><TicketsPage /></ProtectedRoute>} />
          <Route path="tickets/:id" element={<ProtectedRoute allowedRoles={['CUSTOMS_AGENT', 'OPERATOR']}><TicketDetailPage /></ProtectedRoute>} />
          <Route path="training" element={<ProtectedRoute allowedRoles={['CUSTOMS_AGENT', 'OPERATOR']}><TrainingPage /></ProtectedRoute>} />
          <Route path="settings" element={<ProtectedRoute allowedRoles={['CUSTOMS_AGENT', 'OPERATOR']}><CustomsSettingsPage /></ProtectedRoute>} />
        </Route>
        
        {/* Operator routes - redirect to customs dashboard */}
        <Route path="/operator">
          {/* Redirect /operator to /customs/dashboard */}
          <Route index element={<ProtectedRoute allowedRoles={['OPERATOR']}><Navigate to="/customs/dashboard" replace /></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute allowedRoles={['OPERATOR']}><Navigate to="/customs/dashboard" replace /></ProtectedRoute>} />
          <Route path="refunds" element={<ProtectedRoute allowedRoles={['OPERATOR']}><RefundQueuePage /></ProtectedRoute>} />
          {/* Profile page for operators */}
          <Route path="profile" element={<ProtectedRoute allowedRoles={['OPERATOR']}><ProfilePage /></ProtectedRoute>} />
        </Route>
        
        {/* Client routes */}
        <Route path="/client">
          {/* Redirect /client to /client/dashboard with role check */}
          <Route index element={<ProtectedRoute allowedRoles={['CLIENT']}><Navigate to="/client/dashboard" replace /></ProtectedRoute>} />
          <Route path="dashboard" element={<ProtectedRoute allowedRoles={['CLIENT']}><ClientDashboard /></ProtectedRoute>} />
        </Route>
      </Route>
      
      {/* Default redirect for unknown routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
