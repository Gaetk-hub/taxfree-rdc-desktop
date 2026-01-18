import axios, { AxiosRequestConfig, AxiosResponse } from 'axios';
import { useAuthStore } from '../store/authStore';
import { navigateTo } from './navigation';
import type { 
  LoginCredentials, 
  OtpVerification,
  ClientRegistrationData,
  MerchantRegistrationData,
  PaginatedResponse,
  MerchantRegistrationRequest,
  User,
} from '../types';

// ============================================
// AXIOS INSTANCE CONFIGURATION
// ============================================

// Check if running inside Tauri
const isTauriApp = typeof window !== 'undefined' && '__TAURI__' in window;

// API Base URLs
const BACKEND_URL = 'https://detaxerdc.onrender.com/api';
const API_BASE_URL = isTauriApp ? BACKEND_URL : (import.meta.env.VITE_API_URL || '/api');

// ============================================
// TAURI HTTP CLIENT (bypasses CORS)
// ============================================

let tauriFetchModule: { fetch: typeof fetch } | null = null;
let tauriFetchPromise: Promise<{ fetch: typeof fetch }> | null = null;

// Initialize Tauri HTTP client
if (isTauriApp) {
  tauriFetchPromise = import('@tauri-apps/plugin-http').then((module) => {
    tauriFetchModule = module;
    return module;
  }).catch((err) => {
    console.error('[Tauri] HTTP plugin error:', err);
    throw err;
  });
}

// Get Tauri fetch (waits for initialization if needed)
const getTauriFetch = async (): Promise<typeof fetch> => {
  if (tauriFetchModule) {
    return tauriFetchModule.fetch;
  }
  if (tauriFetchPromise) {
    const module = await tauriFetchPromise;
    return module.fetch;
  }
  throw new Error('Tauri HTTP not available');
};

// Custom adapter for Tauri
const tauriAdapter = async (config: AxiosRequestConfig): Promise<AxiosResponse> => {
  const tauriFetch = await getTauriFetch();

  const url = config.baseURL 
    ? `${config.baseURL}${config.url}` 
    : config.url || '';
  
  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tauri-App': 'TaxFreeRDC/1.0',
  };
  
  if (config.headers) {
    Object.entries(config.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers[key] = value;
      }
    });
  }

  // Handle FormData
  let body: BodyInit | undefined;
  if (config.data instanceof FormData) {
    body = config.data;
    delete headers['Content-Type']; // Let browser set it for FormData
  } else if (config.data) {
    // Check if data is already a string (already serialized)
    body = typeof config.data === 'string' ? config.data : JSON.stringify(config.data);
  }

  // Build URL with params
  let finalUrl = url;
  if (config.params) {
    const params = new URLSearchParams();
    Object.entries(config.params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        params.append(key, String(value));
      }
    });
    const paramString = params.toString();
    if (paramString) {
      finalUrl += (url.includes('?') ? '&' : '?') + paramString;
    }
  }

  const response = await tauriFetch(finalUrl, {
    method: config.method?.toUpperCase() || 'GET',
    headers,
    body,
  });

  // Parse response
  let data;
  const contentType = response.headers.get('content-type');
  
  if (config.responseType === 'blob') {
    data = await response.blob();
  } else if (contentType?.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  // Throw error for non-2xx responses (like axios does)
  if (!response.ok) {
    const error = new Error(`Request failed with status ${response.status}`) as Error & { 
      response: AxiosResponse;
      config: AxiosRequestConfig;
    };
    error.response = {
      data,
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      config,
    } as AxiosResponse;
    error.config = config;
    throw error;
  }

  return {
    data,
    status: response.status,
    statusText: response.statusText,
    headers: Object.fromEntries(response.headers.entries()),
    config,
  } as AxiosResponse;
};

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
  withCredentials: !isTauriApp,
});

// Use Tauri adapter when in desktop app
if (isTauriApp) {
  api.defaults.adapter = tauriAdapter;
  api.defaults.baseURL = BACKEND_URL;
}

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh and maintenance mode
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    
    // Handle maintenance mode (503 Service Unavailable)
    // Don't redirect if user is logging out or on login/maintenance pages
    if (error.response?.status === 503 && error.response?.data?.code === 'maintenance_mode') {
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath === '/login' || currentPath === '/maintenance' || currentPath === '/register';
      const isLogoutRequest = error.config?.url?.includes('/logout');
      
      if (!isAuthPage && !isLogoutRequest) {
        const message = error.response?.data?.detail || 'Le système est en maintenance.';
        // Store maintenance message for display
        sessionStorage.setItem('maintenance_message', message);
        // Redirect to maintenance page
        navigateTo('/maintenance', { replace: true });
      }
      return Promise.reject(error);
    }
    
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Don't try to refresh if we're on auth pages or if it's an auth request
      const currentPath = window.location.pathname;
      const isAuthPage = currentPath === '/login' || currentPath === '/register';
      const isAuthRequest = originalRequest.url?.includes('/auth/login') || 
                           originalRequest.url?.includes('/auth/verify-otp') ||
                           originalRequest.url?.includes('/auth/refresh');
      
      if (isAuthPage || isAuthRequest) {
        return Promise.reject(error);
      }
      
      try {
        await useAuthStore.getState().refreshAccessToken();
        const token = useAuthStore.getState().accessToken;
        originalRequest.headers.Authorization = `Bearer ${token}`;
        return api(originalRequest);
      } catch (refreshError) {
        useAuthStore.getState().logout();
        navigateTo('/login', { replace: true });
        return Promise.reject(refreshError);
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;

// ============================================
// AUTH API
// ============================================

export const authApi = {
  // Login with credentials (step 1 - sends OTP)
  login: (credentials: LoginCredentials) => 
    api.post('/auth/login/', credentials),
  
  // Verify OTP (step 2 - completes login)
  verifyOtp: (data: OtpVerification) => 
    api.post('/auth/verify-otp/', data),
  
  // Resend OTP
  resendOtp: (email: string) => 
    api.post('/auth/resend-otp/', { email }),
  
  // Refresh token
  refresh: (refresh: string) => 
    api.post('/auth/refresh/', { refresh }),
  
  // Get current user
  me: () => 
    api.get('/auth/users/me/'),
  
  // Validate activation token
  validateToken: (token: string) => 
    api.get(`/auth/validate-token/${token}/`),
  
  // Activate account with password
  activateAccount: (token: string, data: { password: string; password_confirm: string }) => 
    api.post(`/auth/activate/${token}/`, data),
  
  // Forgot password
  forgotPassword: (email: string) => 
    api.post('/auth/forgot-password/', { email }),
  
  // Reset password
  resetPassword: (token: string, data: { password: string; password_confirm: string }) => 
    api.post(`/auth/reset-password/${token}/`, data),
};

// ============================================
// REGISTRATION API
// ============================================

export const registrationApi = {
  // Register client account
  registerClient: (data: ClientRegistrationData) => 
    api.post('/accounts/register/client/', data),
  
  // Register merchant (submit registration request)
  registerMerchant: (data: MerchantRegistrationData) => 
    api.post('/auth/register/merchant/', data),
};

// ============================================
// MERCHANTS API
// ============================================

export const merchantsApi = {
  // CRUD operations
  list: (params?: Record<string, unknown>) => api.get('/merchants/', { params }),
  get: (id: string) => api.get(`/merchants/${id}/`),
  create: (data: Record<string, unknown>) => api.post('/merchants/', data),
  update: (id: string, data: Record<string, unknown>) => api.patch(`/merchants/${id}/`, data),
  
  // Status actions
  submit: (id: string) => api.post(`/merchants/${id}/submit/`),
  approve: (id: string) => api.post(`/merchants/${id}/approve/`),
  reject: (id: string, reason: string) => api.post(`/merchants/${id}/reject/`, { reason }),
  suspend: (id: string, reason: string) => api.post(`/merchants/${id}/suspend/`, { reason }),
  
  // Registration requests management (admin)
  getRegistrationRequests: (params?: Record<string, unknown>) => 
    api.get<PaginatedResponse<MerchantRegistrationRequest>>('/auth/registration-requests/', { params }),
  getRegistrationRequest: (id: string) => 
    api.get<MerchantRegistrationRequest>(`/auth/registration-requests/${id}/`),
  approveRequest: (id: string) => 
    api.post(`/auth/registration-requests/${id}/approve/`),
  rejectRequest: (id: string, reason: string) => 
    api.post(`/auth/registration-requests/${id}/reject/`, { reason }),
  
  // Document request workflow
  requestDocuments: (id: string, data: { message: string; documents_requested?: string[] }) => 
    api.post(`/auth/registration-requests/${id}/request_documents/`, data),
  reviewDocuments: (id: string, data: { action: 'accept' | 'request_more' | 'reject'; notes?: string; message?: string; documents_requested?: string[]; rejection_reason?: string }) => 
    api.post(`/auth/registration-requests/${id}/review_documents/`, data),
  getComments: (id: string) => 
    api.get(`/auth/registration-requests/${id}/comments/`),
  addComment: (id: string, data: { content: string; is_internal?: boolean }) => 
    api.post(`/auth/registration-requests/${id}/add_comment/`, data),
  resendActivation: (id: string) => 
    api.post(`/auth/registration-requests/${id}/resend_activation/`),
  sendPasswordReset: (id: string) => 
    api.post(`/auth/registration-requests/${id}/send_password_reset/`),
};

// ============================================
// PASSWORD RESET API (Public)
// ============================================

export const passwordResetApi = {
  validateToken: (token: string) => 
    api.get(`/auth/validate-reset-token/${token}/`),
  resetPassword: (token: string, data: { password: string; password_confirm: string }) => 
    api.post(`/auth/reset-password/${token}/`, data),
};

// ============================================
// DOCUMENT REQUEST API (Public)
// ============================================

export const documentRequestApi = {
  // Validate document request token (public)
  validateToken: (token: string) => 
    api.get(`/auth/document-request/${token}/`),
  
  // Upload a file (public)
  uploadFile: (token: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post(`/auth/document-request/${token}/upload/`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  
  // Submit documents (public)
  submitDocuments: (token: string, data: { response_message: string; documents?: Array<{ name: string; file_path: string; file_type?: string; file_size?: number }> }) => 
    api.post(`/auth/document-request/${token}/submit/`, data),
  
  // Download document via proxy (bypasses Cloudinary PDF restrictions)
  downloadDocument: (documentId: string) => 
    api.get(`/auth/documents/${documentId}/download/`, { responseType: 'blob' }),
};

// ============================================
// NOTIFICATIONS API
// ============================================

export const notificationsApi = {
  list: (params?: Record<string, unknown>) => 
    api.get('/auth/notifications/', { params }),
  getUnreadCount: () => 
    api.get('/auth/notifications/unread_count/'),
  markAsRead: (id: string) => 
    api.post(`/auth/notifications/${id}/mark_read/`),
  markAllAsRead: () => 
    api.post('/auth/notifications/mark_all_read/'),
};

// ============================================
// USERS API (Admin)
// ============================================

export const usersApi = {
  list: (params?: Record<string, unknown>) => 
    api.get<PaginatedResponse<User>>('/auth/users/', { params }),
  get: (id: string) => 
    api.get<User>(`/auth/users/${id}/`),
  update: (id: string, data: Partial<User>) => 
    api.patch(`/auth/users/${id}/`, data),
  delete: (id: string) => 
    api.delete(`/auth/users/${id}/`),
  activate: (id: string) => 
    api.post(`/auth/users/${id}/activate/`),
  deactivate: (id: string) => 
    api.post(`/auth/users/${id}/deactivate/`),
};

// ============================================
// MERCHANT MANAGEMENT API (for merchant admins)
// ============================================

export interface Outlet {
  id: string;
  merchant: string;
  name: string;
  code: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
  pos_devices_count?: number;
  created_at: string;
  updated_at: string;
}

export interface MerchantUser {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  phone?: string;
  role: string;
  role_display: string;
  outlet_id?: string;
  outlet_name?: string;
  is_active: boolean;
  created_at: string;
  last_login?: string;
}

export interface MerchantInvitation {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  role: string;
  role_display: string;
  outlet?: string;
  outlet_name?: string;
  invited_by_name?: string;
  is_accepted: boolean;
  expires_at: string;
  created_at: string;
}

export const merchantManageApi = {
  // Dashboard
  dashboard: () => api.get('/merchants/manage/dashboard/'),
  
  // Outlets management
  outlets: {
    list: (params?: Record<string, unknown>) => 
      api.get<Outlet[]>('/merchants/manage/my-outlets/', { params }),
    get: (id: string) => 
      api.get<Outlet>(`/merchants/manage/my-outlets/${id}/`),
    create: (data: Partial<Outlet>) => 
      api.post<Outlet>('/merchants/manage/my-outlets/', data),
    update: (id: string, data: Partial<Outlet>) => 
      api.patch<Outlet>(`/merchants/manage/my-outlets/${id}/`, data),
    delete: (id: string) => 
      api.delete(`/merchants/manage/my-outlets/${id}/`),
    activate: (id: string) => 
      api.post(`/merchants/manage/my-outlets/${id}/activate/`),
  },
  
  // Users management
  users: {
    list: (params?: Record<string, unknown>) => 
      api.get<MerchantUser[]>('/merchants/manage/my-users/', { params }),
    get: (id: string) => 
      api.get<MerchantUser>(`/merchants/manage/my-users/${id}/`),
    update: (id: string, data: Partial<MerchantUser>) => 
      api.patch<MerchantUser>(`/merchants/manage/my-users/${id}/`, data),
    delete: (id: string) => 
      api.delete(`/merchants/manage/my-users/${id}/`),
    activate: (id: string) => 
      api.post(`/merchants/manage/my-users/${id}/activate/`),
    activity: (id: string) => 
      api.get(`/merchants/manage/my-users/${id}/activity/`),
    stats: (id: string) => 
      api.get(`/merchants/manage/my-users/${id}/stats/`),
    invite: (data: { 
      email: string; 
      first_name: string; 
      last_name: string; 
      phone?: string;
      role: string; 
      outlet_id?: string;
    }) => api.post<MerchantInvitation>('/merchants/manage/my-users/invite/', data),
    invitations: () => 
      api.get<MerchantInvitation[]>('/merchants/manage/my-users/invitations/'),
    resendInvitation: (invitationId: string) => 
      api.post(`/merchants/manage/my-users/invitations/${invitationId}/resend/`),
    cancelInvitation: (invitationId: string) => 
      api.delete(`/merchants/manage/my-users/invitations/${invitationId}/`),
  },
  
  // Travelers management
  travelers: {
    list: () => api.get('/merchants/manage/travelers/'),
    get: (id: string) => api.get(`/merchants/manage/travelers/${id}/`),
  },
  
  // Reports
  reports: {
    get: (params?: { start_date?: string; end_date?: string }) => 
      api.get('/merchants/manage/reports/', { params }),
  },
};

// ============================================
// MERCHANT INVITATION API (Public)
// ============================================

export const invitationApi = {
  validateToken: (token: string) => 
    api.get(`/auth/invitation/${token}/`),
  acceptInvitation: (token: string, data: { password: string; password_confirm: string }) => 
    api.post(`/auth/invitation/${token}/accept/`, data),
};

// ============================================
// SALES API
// ============================================

export const salesApi = {
  createInvoice: (data: Record<string, unknown>) => api.post('/sales/invoices/', data),
  getInvoice: (id: string) => api.get(`/sales/invoices/${id}/`),
  listInvoices: (params?: Record<string, unknown>) => api.get('/sales/invoices/', { params }),
};

// ============================================
// TAX FREE API
// ============================================

export const taxfreeApi = {
  createForm: (data: Record<string, unknown>) => api.post('/taxfree/forms/', data),
  getForm: (id: string) => api.get(`/taxfree/forms/${id}/`),
  listForms: (params?: Record<string, unknown>) => api.get('/taxfree/forms/', { params }),
  issueForm: (id: string) => api.post(`/taxfree/forms/${id}/issue/`),
  cancelForm: (id: string, reason: string) => api.post(`/taxfree/forms/${id}/cancel/`, { reason }),
  printForm: (id: string) => api.get(`/taxfree/forms/${id}/print/`),
  sendEmail: (id: string) => api.post(`/taxfree/forms/${id}/send_email/`),
  checkStatus: (data: Record<string, unknown>) => api.post('/taxfree/status/', data),
  // PDF endpoints - use axios to handle authentication
  downloadPdf: (id: string) => api.get(`/taxfree/forms/${id}/download_pdf/`, { responseType: 'blob' }),
  viewPdf: (id: string) => api.get(`/taxfree/forms/${id}/view_pdf/`, { responseType: 'blob' }),
};

// ============================================
// CUSTOMS API
// ============================================

export const customsApi = {
  scan: (qr_string: string) => api.post('/customs/scan/', { qr_string }),
  decide: (formId: string, data: Record<string, unknown>) => api.post(`/customs/forms/${formId}/decide/`, data),
  syncOffline: (data: Record<string, unknown>) => api.post('/customs/offline/sync/', data),
  listValidations: (params?: Record<string, unknown>) => api.get('/customs/validations/', { params }),
};

// ============================================
// REFUNDS API
// ============================================

export const refundsApi = {
  list: (params?: Record<string, unknown>) => api.get('/refunds/', { params }),
  get: (id: string) => api.get(`/refunds/${id}/`),
  initiate: (formId: string, data: Record<string, unknown>) => api.post(`/refunds/initiate/${formId}/`, data),
  retry: (id: string) => api.post(`/refunds/${id}/retry/`),
  collectCash: (id: string, data?: { actual_amount?: number }) => api.post(`/refunds/${id}/collect_cash/`, data || {}),
  queue: () => api.get('/refunds/queue/'),
  downloadReceipt: (id: string) => api.get(`/refunds/${id}/download_receipt/`, { responseType: 'blob' }),
  sendReceipt: (id: string) => api.post(`/refunds/${id}/send_receipt/`),
};

// ============================================
// RULES API
// ============================================

export const rulesApi = {
  listRulesets: (params?: Record<string, unknown>) => api.get('/rules/rulesets/', { params }),
  getRuleset: (id: string) => api.get(`/rules/rulesets/${id}/`),
  createRuleset: (data: Record<string, unknown>) => api.post('/rules/rulesets/', data),
  updateRuleset: (id: string, data: Record<string, unknown>) => api.patch(`/rules/rulesets/${id}/`, data),
  activateRuleset: (id: string) => api.post(`/rules/rulesets/${id}/activate/`),
  getActiveRuleset: () => api.get('/rules/rulesets/active/'),
  initializeRuleset: () => api.post('/rules/rulesets/initialize/'),
  
  // Product Categories
  listCategories: (params?: Record<string, unknown>) => api.get('/rules/categories/', { params }),
  getActiveCategories: () => api.get('/rules/categories/active/'),
  getCategory: (id: string) => api.get(`/rules/categories/${id}/`),
  createCategory: (data: Record<string, unknown>) => api.post('/rules/categories/', data),
  updateCategory: (id: string, data: Record<string, unknown>) => api.patch(`/rules/categories/${id}/`, data),
  deleteCategory: (id: string) => api.delete(`/rules/categories/${id}/`),
  toggleCategoryEligibility: (id: string) => api.post(`/rules/categories/${id}/toggle_eligibility/`),
  toggleCategoryActive: (id: string) => api.post(`/rules/categories/${id}/toggle_active/`),
  
  // Currencies
  listCurrencies: (params?: Record<string, unknown>) => api.get('/rules/currencies/', { params }),
  getActiveCurrencies: () => api.get('/rules/currencies/active/'),
  getCurrency: (id: string) => api.get(`/rules/currencies/${id}/`),
  createCurrency: (data: Record<string, unknown>) => api.post('/rules/currencies/', data),
  updateCurrency: (id: string, data: Record<string, unknown>) => api.patch(`/rules/currencies/${id}/`, data),
  deleteCurrency: (id: string) => api.delete(`/rules/currencies/${id}/`),
  toggleCurrencyActive: (id: string) => api.post(`/rules/currencies/${id}/toggle_active/`),
  getCurrencyHistory: (id: string) => api.get(`/rules/currencies/${id}/history/`),
};

// ============================================
// AUDIT API
// ============================================

export const auditApi = {
  listLogs: (params?: Record<string, unknown>) => api.get('/audit/logs/', { params }),
  getStats: (params?: Record<string, unknown>) => api.get('/audit/logs/stats/', { params }),
  getFilters: () => api.get('/audit/logs/filters/'),
  getEntityHistory: (entity: string, entityId: string) => 
    api.get('/audit/logs/entity_history/', { params: { entity, entity_id: entityId } }),
  getActorHistory: (actorId?: string, actorEmail?: string) => 
    api.get('/audit/logs/actor_history/', { params: { actor_id: actorId, actor_email: actorEmail } }),
  export: (params?: Record<string, unknown>) => 
    api.get('/audit/logs/export/', { params, responseType: 'blob' }),
};

// ============================================
// REPORTS API
// ============================================

export const reportsApi = {
  getSummary: (params?: Record<string, unknown>) => api.get('/reports/summary/', { params }),
  exportCsv: (type: string, params?: Record<string, unknown>) => 
    api.get('/reports/export/', { params: { type, ...params }, responseType: 'blob' }),
  exportRefundsExcel: (params?: Record<string, string>) =>
    api.get('/taxfree/admin/refunds/export/', { params, responseType: 'blob' }),
};

// ============================================
// DISPUTES API
// ============================================

export const disputesApi = {
  list: (params?: Record<string, unknown>) => api.get('/disputes/', { params }),
  get: (id: string) => api.get(`/disputes/${id}/`),
  create: (data: Record<string, unknown>) => api.post('/disputes/', data),
  addMessage: (id: string, data: Record<string, unknown>) => api.post(`/disputes/${id}/add_message/`, data),
  addMessageWithAttachments: (id: string, formData: FormData) => api.post(`/disputes/${id}/add_message/`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  resolve: (id: string, data: Record<string, unknown>) => api.post(`/disputes/${id}/resolve/`, data),
  updateStatus: (id: string, data: Record<string, unknown>) => api.post(`/disputes/${id}/update_status/`, data),
  assign: (id: string, agentId: string) => api.post(`/disputes/${id}/assign/`, { agent_id: agentId }),
  take: (id: string) => api.post(`/disputes/${id}/take/`),
  escalate: (id: string, data: { to_user_id: string; reason: string }) => api.post(`/disputes/${id}/escalate/`, data),
  updatePriority: (id: string, priority: string) => api.post(`/disputes/${id}/update_priority/`, { priority }),
  close: (id: string) => api.post(`/disputes/${id}/close/`),
  myTickets: () => api.get('/disputes/my_tickets/'),
  unassigned: () => api.get('/disputes/unassigned/'),
  overdue: () => api.get('/disputes/overdue/'),
  stats: () => api.get('/disputes/stats/'),
  // Observers
  getObservers: (id: string) => api.get(`/disputes/${id}/observers/`),
  addObserver: (id: string, userId: string) => api.post(`/disputes/${id}/add_observer/`, { user_id: userId }),
  removeObserver: (id: string, userId: string) => api.delete(`/disputes/${id}/remove_observer/${userId}/`),
  // User search (reuse from chat)
  searchUsers: (query: string, role?: string) => api.get('/support/conversations/search_users/', { params: { q: query, role } }),
};

// ============================================
// SETTINGS API
// ============================================

export const settingsApi = {
  getSettings: () => api.get('/settings/system/'),
  updateSettings: (data: Record<string, unknown>) => api.put('/settings/system/', data),
};

// ============================================
// USER PROFILE API
// ============================================

export const userApi = {
  getProfile: () => api.get('/auth/users/me/'),
  updateProfile: (data: Record<string, unknown>) => api.patch('/auth/users/me/', data),
  updateProfilePhoto: (formData: FormData) => api.patch('/auth/users/me/photo/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  changePassword: (data: { current_password: string; new_password: string }) => 
    api.post('/auth/users/me/change_password/', data),
};

// ============================================
// SUPPORT CHAT API
// ============================================

export const chatApi = {
  // Conversations
  listConversations: (params?: Record<string, unknown>) => api.get('/support/conversations/', { params }),
  getConversation: (id: string) => api.get(`/support/conversations/${id}/`),
  createConversation: (data: { category: string; subject: string; initial_message: string; related_form?: string; related_merchant?: string }) => 
    api.post('/support/conversations/', data),
  createForUser: (data: { recipient_id: string; category: string; subject: string; initial_message: string }) =>
    api.post('/support/conversations/create_for_user/', data),
  assignConversation: (id: string, agentId: string) => api.post(`/support/conversations/${id}/assign/`, { agent_id: agentId }),
  takeConversation: (id: string) => api.post(`/support/conversations/${id}/take/`),
  resolveConversation: (id: string) => api.post(`/support/conversations/${id}/resolve/`),
  closeConversation: (id: string) => api.post(`/support/conversations/${id}/close/`),
  markRead: (id: string) => api.post(`/support/conversations/${id}/mark_read/`),
  getUnreadCount: () => api.get('/support/conversations/unread_count/'),
  
  // User search for autocomplete
  searchUsers: (query: string, role?: string) => api.get('/support/conversations/search_users/', { params: { q: query, role } }),
  
  // Participants
  getParticipants: (id: string) => api.get(`/support/conversations/${id}/participants/`),
  addParticipant: (id: string, userId: string) => api.post(`/support/conversations/${id}/add_participant/`, { user_id: userId }),
  removeParticipant: (id: string, userId: string) => api.delete(`/support/conversations/${id}/remove_participant/${userId}/`),
  
  // Messages
  listMessages: (conversationId: string) => api.get('/support/messages/', { params: { conversation: conversationId } }),
  sendMessage: (data: { conversation: string; content: string }) => api.post('/support/messages/', data),
  sendMessageWithAttachment: (formData: FormData) => api.post('/support/messages/', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
};

// Support counters for sidebar badges
export const supportApi = {
  getUnreadCounts: () => api.get('/support/conversations/unread_count/'),
  getTicketStats: () => api.get('/disputes/stats/'),
};

// ============================================
// TRAINING API
// ============================================

export const trainingApi = {
  // Categories
  listCategories: () => api.get('/support/training/categories/'),
  getCategory: (slug: string) => api.get(`/support/training/categories/${slug}/`),
  
  // Content
  listContent: (params?: Record<string, unknown>) => api.get('/support/training/content/', { params }),
  getContent: (slug: string) => api.get(`/support/training/content/${slug}/`),
  getContentByFeature: (feature: string) => api.get('/support/training/content/by_feature/', { params: { feature } }),
  updateProgress: (slug: string, data: { progress_percent?: number; last_position?: number; is_completed?: boolean }) => 
    api.post(`/support/training/content/${slug}/update_progress/`, data),
  markComplete: (slug: string) => api.post(`/support/training/content/${slug}/mark_complete/`),
  
  // Progress
  getMyProgress: () => api.get('/support/training/progress/'),
  getProgressSummary: () => api.get('/support/training/progress/summary/'),
};
