/**
 * HTTP client for the SmartLight admin dashboard.
 * Mirrors the storefront client — separate instance so the two apps
 * can set different `baseURL`/tokens without interfering.
 */
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import type { Paginated, PaginatedEnvelope } from './types';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ?? 'http://localhost:4000';
const API_PREFIX = '/v1';

export interface SmartlightErrorEnvelope {
  error: {
    code: string;
    message: string;
    details?: unknown;
    traceId?: string;
    timestamp?: string;
    path?: string;
    fieldErrors?: Array<{ message: string; field?: string }>;
  };
}

export class ApiError extends Error {
  public readonly code: string;
  public readonly httpStatus: number;
  public readonly details: unknown;
  public readonly traceId?: string;
  public readonly fieldErrors?: Array<{ message: string; field?: string }>;

  constructor(
    code: string,
    message: string,
    httpStatus: number,
    details?: unknown,
    fieldErrors?: Array<{ message: string; field?: string }>,
    traceId?: string,
  ) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.httpStatus = httpStatus;
    this.details = details;
    this.traceId = traceId;
    this.fieldErrors = fieldErrors;
  }
}

let isRefreshing = false;
let refreshPromise: Promise<boolean> | null = null;

const refresh = async (): Promise<boolean> => {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = axios
      .post(`${API_BASE_URL}${API_PREFIX}/auth/admin/refresh`, null, {
        withCredentials: true,
      })
      .then(() => true)
      .catch(() => false)
      .finally(() => {
        isRefreshing = false;
        refreshPromise = null;
      });
  }
  return refreshPromise ?? Promise.resolve(false);
};

export const createApiClient = (): AxiosInstance => {
  const instance = axios.create({
    baseURL: `${API_BASE_URL}${API_PREFIX}`,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
    },
    timeout: 30000,
  });

  instance.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('smartlight.admin.access');
    if (token) {
      cfg.headers.set('Authorization', `Bearer ${token}`);
    }
    return cfg;
  });

  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<SmartlightErrorEnvelope>) => {
      const status = error.response?.status ?? 0;
      const env = error.response?.data?.error;

      if (status === 401 && !error.config?.url?.includes('/auth/')) {
        const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
        if (!original._retry) {
          original._retry = true;
          const ok = await refresh();
          if (ok) {
            return instance.request(original);
          }
        }
      }

      if (env) {
        throw new ApiError(
          env.code,
          env.message,
          status,
          env.details,
          env.fieldErrors as Array<{ message: string; field?: string }> | undefined,
          env.traceId,
        );
      }
      throw new ApiError('NETWORK_ERROR', error.message, status);
    },
  );

  return instance;
};

export const apiClient = createApiClient();

/**
 * Unwrap a plain resource object: the API wraps single entities in
 * `{ data: T }`, so this strips that layer when present.
 *
 * Handles both shapes:
 * - `{ data: T }` → T
 * - bare `T` → T
 */
export function unwrapResource<T>(raw: unknown): T {
  if (!raw || typeof raw !== 'object') {
    throw new Error('Unexpected response: expected object, got ' + typeof raw);
  }
  const obj = raw as { data?: T };
  if ('data' in obj) {
    if (!obj.data) throw new Error('Unexpected null data in response');
    return obj.data;
  }
  return raw as T;
}

/**
 * Unwrap the server's paginated envelope into the legacy
 * `Paginated<T>` view (`{ items, total, page, limit }`) so existing pages
 * can keep reading `result.items.length` / `result.total` without changes.
 *
 * Handles both response shapes the API has shipped over time:
 * - `{ data: { data: [...], meta: { pagination: {...} } } }` — current (double-wrapped)
 * - `{ data: T[], meta: { pagination: { totalItems, page, limit } } }` — simple
 * - `{ items: T[], total, page, limit }` — legacy
 * - bare `T[]` — last-resort fallback
 */
export function unwrapPaginated<T>(
  envelope: unknown,
): Paginated<T> {
  if (Array.isArray(envelope)) {
    return {
      items: envelope as T[],
      total: envelope.length,
      page: 1,
      limit: envelope.length,
    };
  }
  if (!envelope || typeof envelope !== 'object') {
    return { items: [], total: 0, page: 1, limit: 0 };
  }
  const env = envelope as {
    items?: T[];
    data?: T[] | { data?: T[]; items?: T[]; total?: number; meta?: { pagination?: { totalItems?: number; page?: number; limit?: number } } };
    total?: number;
    page?: number;
    limit?: number;
    meta?: { pagination?: { totalItems?: number; page?: number; limit?: number } };
  };

  let items: T[] = [];
  let total = 0;
  let page = 1;
  let limit = 20;

  // Handle double-wrapped response: { data: { data: [...], meta: {...} } }
  if (env.data && typeof env.data === 'object' && !Array.isArray(env.data)) {
    const inner = env.data as { data?: T[]; items?: T[]; total?: number; meta?: { pagination?: { totalItems?: number; page?: number; limit?: number } } };
    items = Array.isArray(inner.data) ? inner.data : (Array.isArray(inner.items) ? inner.items : []);
    total = inner.total ?? inner.meta?.pagination?.totalItems ?? items.length;
    page = inner.meta?.pagination?.page ?? 1;
    limit = inner.meta?.pagination?.limit ?? items.length;
  } else if (Array.isArray(env.items)) {
    items = env.items;
  } else if (Array.isArray(env.data)) {
    items = env.data;
  }

  if (env.total !== undefined) total = env.total;
  if (env.page !== undefined) page = env.page;
  if (env.limit !== undefined) limit = env.limit;

  const meta = env.meta?.pagination;
  if (meta) {
    if (meta.totalItems !== undefined) total = meta.totalItems;
    if (meta.page !== undefined) page = meta.page;
    if (meta.limit !== undefined) limit = meta.limit;
  }

  return { items, total, page, limit };
}

/**
 * Read a list of items out of any response shape the API might return:
 * - New `{ data: T[], meta.pagination.totalItems }`
 * - Old `{ items: T[], total }`
 * - Bare `T[]`
 *
 * Returns `{ items, total }`. Use this in callers that fetch raw axios
 * responses without going through `unwrapPaginated`.
 */
export function readList<T>(raw: unknown): { items: T[]; total: number } {
  if (Array.isArray(raw)) {
    return { items: raw as T[], total: (raw as unknown[]).length };
  }
  if (raw && typeof raw === 'object') {
    const env = raw as {
      items?: T[];
      total?: number;
      data?: T[];
      meta?: { pagination?: { totalItems?: number } };
    };
    const items: T[] = Array.isArray(env.items)
      ? env.items
      : Array.isArray(env.data)
        ? env.data
        : [];
    const total: number =
      typeof env.total === 'number'
        ? env.total
        : typeof env.meta?.pagination?.totalItems === 'number'
          ? env.meta.pagination.totalItems
          : items.length;
    return { items, total };
  }
  return { items: [], total: 0 };
}

/**
 * Server-side cap for paginated `?limit=` query params. Any value above
 * this triggers ValidationPipe 400 in the API, so callers should clamp.
 */
export const MAX_LIST_LIMIT = 100;

export const setAccessToken = (token: string): void => {
  localStorage.setItem('smartlight.admin.access', token);
};

export const clearAccessToken = (): void => {
  localStorage.removeItem('smartlight.admin.access');
};
