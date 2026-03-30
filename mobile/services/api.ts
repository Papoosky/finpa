import { API_BASE_URL } from '../config';
import { useAuthStore } from '../stores/authStore';
import { Subscription, SubscriptionFormData, Transaction, TransactionFormData } from '../types';

const REQUEST_TIMEOUT_MS = 15_000;

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = useAuthStore.getState().token;
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timeoutId);
    if (err instanceof DOMException && err.name === 'AbortError') {
      console.warn(`[API] Timeout (${REQUEST_TIMEOUT_MS}ms): ${options.method ?? 'GET'} ${url}`);
      throw new ApiError('La solicitud tardó demasiado. Intenta de nuevo.', 0);
    }
    console.warn(`[API] Network error: ${options.method ?? 'GET'} ${url}`, err);
    throw new ApiError('Error de conexión. Verifica tu red e intenta de nuevo.', 0);
  } finally {
    clearTimeout(timeoutId);
  }

  if (response.status === 401) {
    console.warn(`[API] 401 Unauthorized: ${options.method ?? 'GET'} ${url}`);
    // Try to refresh the access token
    const refreshed = await useAuthStore.getState().refreshAccessToken();
    if (refreshed) {
      // Retry the original request with the new token
      const newToken = useAuthStore.getState().token;
      const retryHeaders = { ...headers };
      if (newToken) retryHeaders['Authorization'] = `Bearer ${newToken}`;

      const retryController = new AbortController();
      const retryTimeoutId = setTimeout(() => retryController.abort(), REQUEST_TIMEOUT_MS);
      try {
        const retryResponse = await fetch(url, {
          ...options,
          headers: retryHeaders,
          signal: retryController.signal,
        });
        clearTimeout(retryTimeoutId);

        if (retryResponse.ok) {
          if (retryResponse.status === 204) return undefined as T;
          return retryResponse.json();
        }
        // If retry also fails with 401, logout
        if (retryResponse.status === 401) {
          useAuthStore.getState().logout();
          throw new ApiError('Sesion expirada', 401);
        }
        const retryErr = await retryResponse.json().catch(() => ({ detail: 'Error desconocido' }));
        throw new ApiError(
          retryErr.detail || `Error ${retryResponse.status}`,
          retryResponse.status,
        );
      } catch (retryError) {
        clearTimeout(retryTimeoutId);
        if (retryError instanceof ApiError) throw retryError;
        throw new ApiError('Error de conexión al reintentar.', 0);
      }
    }
    useAuthStore.getState().logout();
    throw new ApiError('Sesion expirada', 401);
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Error desconocido' }));
    console.warn(`[API] Error ${response.status}: ${options.method ?? 'GET'} ${url}`, err);
    throw new ApiError(err.detail || `Error ${response.status}`, response.status);
  }

  if (response.status === 204) return undefined as T;
  return response.json();
}

export const api = {
  transactions: {
    list: (params: { dateFrom: string; dateTo: string }) =>
      request<Transaction[]>(
        `/transactions/?date_from=${params.dateFrom}&date_to=${params.dateTo}`,
      ).then((data) => {
        // API may return { items: [...] } or [...]
        return Array.isArray(data) ? data : (data as unknown as { items: Transaction[] }).items;
      }),

    create: (data: TransactionFormData) =>
      request<Transaction | Transaction[]>('/transactions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    getInstallmentGroup: (groupUuid: string) =>
      request<Transaction[]>(`/transactions/installment-group/${groupUuid}`),

    update: (uuid: string, data: Partial<TransactionFormData>) =>
      request<Transaction>(`/transactions/${uuid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    delete: (uuid: string) => request<void>(`/transactions/${uuid}`, { method: 'DELETE' }),
  },

  subscriptions: {
    list: () => request<Subscription[]>('/subscriptions/'),

    create: (data: SubscriptionFormData) =>
      request<Subscription>('/subscriptions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    update: (uuid: string, data: Partial<SubscriptionFormData>) =>
      request<Subscription>(`/subscriptions/${uuid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    delete: (uuid: string) => request<void>(`/subscriptions/${uuid}`, { method: 'DELETE' }),

    processDue: () => request<Transaction[]>('/subscriptions/process-due', { method: 'POST' }),
  },
};

export { ApiError };
