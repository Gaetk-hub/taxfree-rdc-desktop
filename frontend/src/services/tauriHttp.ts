/**
 * Tauri HTTP Client
 * Uses Tauri's HTTP plugin for requests when running in desktop app.
 * This bypasses CORS restrictions as requests go through Rust backend.
 */

import { isTauri } from '../utils/tauri';

const API_BASE_URL = 'https://detaxerdc.onrender.com/api';

interface RequestOptions {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
}

interface TauriResponse<T = unknown> {
  data: T;
  status: number;
  ok: boolean;
}

/**
 * Make HTTP request using Tauri's HTTP plugin
 * Only works when running inside Tauri app
 */
export async function tauriFetch<T = unknown>(
  endpoint: string,
  options: RequestOptions
): Promise<TauriResponse<T>> {
  if (!isTauri()) {
    throw new Error('tauriFetch can only be used in Tauri app');
  }

  const { fetch } = await import('@tauri-apps/plugin-http');
  
  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tauri-App': 'TaxFreeRDC/1.0',
    ...options.headers,
  };

  const response = await fetch(url, {
    method: options.method,
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  let data: T;
  const contentType = response.headers.get('content-type');
  
  if (contentType?.includes('application/json')) {
    data = await response.json() as T;
  } else {
    data = await response.text() as unknown as T;
  }

  return {
    data,
    status: response.status,
    ok: response.ok,
  };
}

/**
 * Check if we should use Tauri HTTP client
 */
export function shouldUseTauriHttp(): boolean {
  return isTauri();
}
