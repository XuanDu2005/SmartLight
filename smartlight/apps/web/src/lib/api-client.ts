/**
 * HTTP client for the SmartLight storefront (browser).
 *
 * - Axios instance with `withCredentials` so refresh-token cookie is sent.
 * - Response interceptor normalises the SmartLight error envelope.
 * - 401 path triggers a single refresh attempt; concurrent failures share it.
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

/**
 * Refresh the access token via `/v1/auth/refresh`.
 *
 * The server rotates the refresh token in a Set-Cookie header AND returns a
 * new access token in the JSON body (clients that don't use cookies can pass
 * the refresh token in the request body instead). We persist the new access
 * token via `setAccessToken` so the immediate retry of the original request
 * uses the fresh credentials.
 */
const refresh = async (): Promise<boolean> => {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshPromise = axios
      .post<{
        accessToken?: string;
        refreshToken?: string;
      }>(`${API_BASE_URL}${API_PREFIX}/auth/refresh`, null, {
        withCredentials: true,
      })
      .then((res) => {
        const next = res.data?.accessToken;
        if (next) {
          setAccessToken(next);
        }
        return true;
      })
      .catch(() => {
        // Refresh failed (refresh token also expired/revoked) — clear the
        // stale access token so the *next* request doesn't keep retrying
        // with dead credentials.
        clearAccessToken();
        return false;
      })
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

  // Request interceptor
  instance.interceptors.request.use((cfg: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('smartlight.access');
    if (token) {
      cfg.headers.set('Authorization', `Bearer ${token}`);
    }
    return cfg;
  });

  // Response interceptor
  instance.interceptors.response.use(
    (response) => response,
    async (error: AxiosError<SmartlightErrorEnvelope>) => {
      const status = error.response?.status ?? 0;
      const errBody = error.response?.data;
      const env = errBody?.error;

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
  localStorage.setItem('smartlight.access', token);
};

export const clearAccessToken = (): void => {
  localStorage.removeItem('smartlight.access');
};
