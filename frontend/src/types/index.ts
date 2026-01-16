// ============================================
// USER & AUTH TYPES
// ============================================

export interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  role: UserRole;
  phone?: string;
  merchant?: string;
  merchant_id?: string;
  merchant_name?: string;
  outlet_id?: string;
  outlet_name?: string;
  is_active?: boolean;
  created_at?: string;
}

export type UserRole = 'super_admin' | 'admin' | 'auditor' | 'merchant_admin' | 'merchant_operator' | 'customs_officer' | 'client';

export interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface OtpVerification {
  otp_id: string;
  code: string;
}

export interface TokenInfo {
  valid: boolean;
  email: string;
  first_name: string;
  last_name: string;
  company_name: string;
}

// ============================================
// MERCHANT TYPES
// ============================================

export interface Merchant {
  id: string;
  name: string;
  trade_name: string;
  registration_number: string;
  tax_id: string;
  vat_number?: string;
  address_line1: string;
  address_line2?: string;
  city: string;
  province: string;
  postal_code?: string;
  country: string;
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  bank_name?: string;
  bank_account_number?: string;
  bank_swift_code?: string;
  mobile_money_number?: string;
  mobile_money_provider?: string;
  status: MerchantStatus;
  status_reason?: string;
  submitted_at?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export type MerchantStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'SUSPENDED';

export interface MerchantRegistrationRequest {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  company_name: string;
  trade_name: string;
  registration_number: string;
  tax_id: string;
  national_id: string;
  address: string;
  city: string;
  province: string;
  commune: string;
  company_phone: string;
  company_email: string;
  bank_name: string;
  bank_account_number: string;
  mobile_money_number: string;
  mobile_money_provider: string;
  business_sector: string;
  business_description: string;
  status: RegistrationStatus;
  rejection_reason: string;
  created_at: string;
  reviewed_at: string;
  reviewed_by_name?: string;
}

export type RegistrationStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

// ============================================
// REGISTRATION FORM TYPES
// ============================================

export interface ClientRegistrationData {
  email: string;
  password: string;
  password_confirm: string;
  first_name: string;
  last_name: string;
  phone: string;
}

export interface MerchantRegistrationData {
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  company_name: string;
  trade_name?: string;
  registration_number: string;
  tax_id: string;
  national_id?: string;
  address: string;
  city: string;
  province: string;
  commune?: string;
  company_phone: string;
  company_email: string;
  bank_name?: string;
  bank_account_number?: string;
  mobile_money_number?: string;
  mobile_money_provider?: string;
  business_sector: string;
  business_description?: string;
}

// ============================================
// TAX FREE FORM TYPES
// ============================================

export interface TaxFreeForm {
  id: string;
  form_number: string;
  merchant: string;
  merchant_name: string;
  tourist_name: string;
  tourist_passport: string;
  tourist_nationality: string;
  total_amount: number;
  vat_amount: number;
  refund_amount: number;
  status: TaxFreeFormStatus;
  created_at: string;
  issued_at?: string;
  validated_at?: string;
}

export type TaxFreeFormStatus = 'DRAFT' | 'ISSUED' | 'VALIDATED' | 'REFUNDED' | 'CANCELLED' | 'EXPIRED';

// ============================================
// API RESPONSE TYPES
// ============================================

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}

// ============================================
// REPORT TYPES
// ============================================

export interface ReportSummary {
  total_forms: number;
  total_vat: number;
  total_refunds: number;
  pending_validations: number;
  merchants_count: number;
  forms_by_status: Record<string, number>;
  daily_stats: DailyStat[];
}

export interface DailyStat {
  date: string;
  forms_count: number;
  vat_amount: number;
  refund_amount: number;
}
