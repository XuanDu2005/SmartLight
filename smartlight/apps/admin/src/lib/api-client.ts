/**
 * HTTP client for the SmartLight admin dashboard.
 * Mirrors the storefront client \u2014 separate instance so the two apps
 * can set different `baseURL`/tokens without interfering.
 */
import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';

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

export const setAccessToken = (token: string): void => {
  localStorage.setItem('smartlight.admin.access', token);
};

export const clearAccessToken = (): void => {
  localStorage.removeItem('smartlight.admin.access');
};