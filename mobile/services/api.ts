import { API_BASE_URL } from '../config';
import { useAuthStore } from '../stores/authStore';
import { Transaction, TransactionFormData } from '../types';

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

  const headers: Record<string, string> = {
    ...((options.headers as Record<string, string>) || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  if (response.status === 401) {
    useAuthStore.getState().logout();
    throw new ApiError('Sesion expirada', 401);
  }

  if (!response.ok) {
    const err = await response.json().catch(() => ({ detail: 'Error desconocido' }));
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
      request<Transaction>('/transactions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    update: (uuid: string, data: Partial<TransactionFormData>) =>
      request<Transaction>(`/transactions/${uuid}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),

    delete: (uuid: string) => request<void>(`/transactions/${uuid}`, { method: 'DELETE' }),
  },
};

export { ApiError };
