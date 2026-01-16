// ============================================
// RDC PROVINCES
// ============================================

export const RDC_PROVINCES = [
  'Kinshasa',
  'Kongo-Central',
  'Kwango',
  'Kwilu',
  'Mai-Ndombe',
  'Kasaï',
  'Kasaï-Central',
  'Kasaï-Oriental',
  'Lomami',
  'Sankuru',
  'Maniema',
  'Sud-Kivu',
  'Nord-Kivu',
  'Ituri',
  'Haut-Uele',
  'Tshopo',
  'Bas-Uele',
  'Nord-Ubangi',
  'Mongala',
  'Sud-Ubangi',
  'Équateur',
  'Tshuapa',
  'Tanganyika',
  'Haut-Lomami',
  'Lualaba',
  'Haut-Katanga',
] as const;

export type RDCProvince = typeof RDC_PROVINCES[number];

// ============================================
// BUSINESS SECTORS
// ============================================

export const BUSINESS_SECTORS = [
  'Commerce de détail',
  'Commerce de gros',
  'Hôtellerie',
  'Restauration',
  'Mode et textile',
  'Bijouterie et montres',
  'Électronique',
  'Artisanat',
  'Art et antiquités',
  'Cosmétiques et parfums',
  'Alimentation',
  'Autre',
] as const;

export type BusinessSector = typeof BUSINESS_SECTORS[number];

// ============================================
// MOBILE MONEY PROVIDERS
// ============================================

export const MOBILE_MONEY_PROVIDERS = [
  'M-Pesa',
  'Orange Money',
  'Airtel Money',
  'Afrimoney',
] as const;

export type MobileMoneyProvider = typeof MOBILE_MONEY_PROVIDERS[number];

// ============================================
// USER ROLES
// ============================================

export const USER_ROLES = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  AUDITOR: 'auditor',
  MERCHANT_ADMIN: 'merchant_admin',
  MERCHANT_OPERATOR: 'merchant_operator',
  CUSTOMS_OFFICER: 'customs_officer',
  CLIENT: 'client',
} as const;

export const USER_ROLE_LABELS: Record<string, string> = {
  super_admin: 'Super Administrateur',
  admin: 'Administrateur',
  auditor: 'Auditeur',
  merchant_admin: 'Admin Commerçant',
  merchant_operator: 'Opérateur Commerçant',
  customs_officer: 'Agent Douane',
  client: 'Client',
};

// ============================================
// STATUS LABELS & COLORS
// ============================================

export const REGISTRATION_STATUS_CONFIG = {
  PENDING: { label: 'En attente', bgColor: 'bg-amber-100', textColor: 'text-amber-700' },
  APPROVED: { label: 'Approuvé', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  REJECTED: { label: 'Rejeté', bgColor: 'bg-red-100', textColor: 'text-red-700' },
} as const;

export const MERCHANT_STATUS_CONFIG = {
  DRAFT: { label: 'Brouillon', bgColor: 'bg-gray-100', textColor: 'text-gray-700' },
  SUBMITTED: { label: 'Soumis', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  APPROVED: { label: 'Approuvé', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  REJECTED: { label: 'Rejeté', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  SUSPENDED: { label: 'Suspendu', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
} as const;

export const FORM_STATUS_CONFIG = {
  DRAFT: { label: 'Brouillon', bgColor: 'bg-gray-100', textColor: 'text-gray-700' },
  ISSUED: { label: 'Émis', bgColor: 'bg-blue-100', textColor: 'text-blue-700' },
  VALIDATED: { label: 'Validé', bgColor: 'bg-emerald-100', textColor: 'text-emerald-700' },
  REFUNDED: { label: 'Remboursé', bgColor: 'bg-green-100', textColor: 'text-green-700' },
  CANCELLED: { label: 'Annulé', bgColor: 'bg-red-100', textColor: 'text-red-700' },
  EXPIRED: { label: 'Expiré', bgColor: 'bg-orange-100', textColor: 'text-orange-700' },
} as const;

// ============================================
// API ENDPOINTS (for reference)
// ============================================

export const API_ENDPOINTS = {
  // Auth
  LOGIN: '/auth/login/',
  VERIFY_OTP: '/auth/verify-otp/',
  RESEND_OTP: '/auth/resend-otp/',
  REFRESH: '/auth/refresh/',
  ME: '/auth/users/me/',
  USERS: '/auth/users/',
  VALIDATE_TOKEN: '/auth/validate-token/',
  ACTIVATE: '/auth/activate/',
  
  // Registration
  REGISTER_CLIENT: '/accounts/register/client/',
  REGISTER_MERCHANT: '/auth/register/merchant/',
  REGISTRATION_REQUESTS: '/auth/registration-requests/',
  
  // Merchants
  MERCHANTS: '/merchants/',
  
  // Tax Free
  FORMS: '/taxfree/forms/',
  
  // Reports
  REPORTS_SUMMARY: '/reports/summary/',
  REPORTS_EXPORT: '/reports/export/',
  
  // Customs
  CUSTOMS_SCAN: '/customs/scan/',
  CUSTOMS_VALIDATIONS: '/customs/validations/',
  
  // Refunds
  REFUNDS: '/refunds/',
  
  // Disputes
  DISPUTES: '/disputes/',
  
  // Audit
  AUDIT_LOGS: '/audit/logs/',
  
  // Rules
  RULESETS: '/rules/rulesets/',
} as const;

// ============================================
// VALIDATION RULES
// ============================================

export const PASSWORD_RULES = {
  MIN_LENGTH: 8,
  REQUIRE_UPPERCASE: true,
  REQUIRE_LOWERCASE: true,
  REQUIRE_NUMBER: true,
  REQUIRE_SPECIAL: true,
  SPECIAL_CHARS: '!@#$%^&*(),.?":{}|<>',
} as const;

export const PHONE_REGEX = /^\+?[0-9]{9,15}$/;
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ============================================
// PAGINATION
// ============================================

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100] as const;
