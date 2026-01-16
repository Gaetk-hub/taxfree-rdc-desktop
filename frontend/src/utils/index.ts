import { PASSWORD_RULES } from '../constants';

// ============================================
// PASSWORD VALIDATION
// ============================================

export interface PasswordValidation {
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
  strength: number;
  isValid: boolean;
}

export const validatePassword = (password: string): PasswordValidation => {
  const checks = {
    length: password.length >= PASSWORD_RULES.MIN_LENGTH,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: new RegExp(`[${PASSWORD_RULES.SPECIAL_CHARS.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}]`).test(password),
  };
  const strength = Object.values(checks).filter(Boolean).length;
  const isValid = strength >= 3;
  return { checks, strength, isValid };
};

export const getPasswordStrengthColor = (strength: number): string => {
  if (strength <= 2) return 'bg-red-500';
  if (strength <= 3) return 'bg-yellow-500';
  return 'bg-green-500';
};

// ============================================
// DATE FORMATTING
// ============================================

export const formatDate = (dateString: string, locale = 'fr-FR'): string => {
  return new Date(dateString).toLocaleDateString(locale);
};

export const formatDateTime = (dateString: string, locale = 'fr-FR'): string => {
  return new Date(dateString).toLocaleString(locale);
};

export const formatRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'À l\'instant';
  if (diffMins < 60) return `Il y a ${diffMins} min`;
  if (diffHours < 24) return `Il y a ${diffHours}h`;
  if (diffDays < 7) return `Il y a ${diffDays}j`;
  return formatDate(dateString);
};

// ============================================
// NUMBER FORMATTING
// ============================================

export const formatCurrency = (amount: number, currency = 'USD'): string => {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('fr-FR').format(num);
};

export const formatCompactNumber = (num: number): string => {
  return num.toLocaleString('fr-FR');
};

// ============================================
// STRING UTILITIES
// ============================================

export const truncate = (str: string, maxLength: number): string => {
  if (str.length <= maxLength) return str;
  return `${str.slice(0, maxLength)}...`;
};

export const capitalize = (str: string): string => {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
};

export const slugify = (str: string): string => {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
};

// ============================================
// PHONE FORMATTING
// ============================================

export const formatPhone = (phone: string): string => {
  const cleaned = phone.replace(/\D/g, '');
  if (cleaned.startsWith('243')) {
    return `+${cleaned.slice(0, 3)} ${cleaned.slice(3, 6)} ${cleaned.slice(6, 9)} ${cleaned.slice(9)}`;
  }
  return phone;
};

// ============================================
// TIMER FORMATTING
// ============================================

export const formatTimer = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// ============================================
// STORAGE UTILITIES (with encryption for sensitive data)
// ============================================

const STORAGE_PREFIX = 'taxfree_';

export const storage = {
  set: (key: string, value: unknown): void => {
    try {
      const serialized = JSON.stringify(value);
      localStorage.setItem(`${STORAGE_PREFIX}${key}`, serialized);
    } catch (error) {
      console.error('Error saving to localStorage:', error);
    }
  },

  get: <T>(key: string, defaultValue: T | null = null): T | null => {
    try {
      const item = localStorage.getItem(`${STORAGE_PREFIX}${key}`);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },

  remove: (key: string): void => {
    localStorage.removeItem(`${STORAGE_PREFIX}${key}`);
  },

  clear: (): void => {
    Object.keys(localStorage)
      .filter(key => key.startsWith(STORAGE_PREFIX))
      .forEach(key => localStorage.removeItem(key));
  },
};

// ============================================
// VALIDATION UTILITIES
// ============================================

export const isValidEmail = (email: string): boolean => {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

export const isValidPhone = (phone: string): boolean => {
  return /^\+?[0-9]{9,15}$/.test(phone.replace(/\s/g, ''));
};

// ============================================
// ERROR HANDLING
// ============================================

export const getErrorMessage = (error: unknown): string => {
  if (typeof error === 'string') return error;
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && error !== null) {
    const err = error as Record<string, unknown>;
    if (err.detail) return String(err.detail);
    if (err.message) return String(err.message);
    if (err.response && typeof err.response === 'object') {
      const response = err.response as Record<string, unknown>;
      if (response.data && typeof response.data === 'object') {
        const data = response.data as Record<string, unknown>;
        if (data.detail) return String(data.detail);
      }
    }
  }
  return 'Une erreur est survenue';
};

// ============================================
// DEBOUNCE & THROTTLE
// ============================================

export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), wait);
  };
};

// ============================================
// CLASS NAME UTILITIES
// ============================================

export const cn = (...classes: (string | boolean | undefined | null)[]): string => {
  return classes.filter(Boolean).join(' ');
};
