import type {
  PaginatedTransactions,
  Subscription,
  SubscriptionFormData,
  TokenResponse,
  Transaction,
  TransactionFormData,
} from "../types";

const API_URL = (
  import.meta.env.VITE_API_URL ?? "https://finpa-api.pzuni.com"
).replace(/\/$/, "");

let accessToken: string | null = null;
let refreshPromise: Promise<boolean> | null = null;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function setAccessToken(token: string | null) {
  accessToken = token;
}

async function errorMessage(response: Response): Promise<string> {
  const body = (await response.json().catch(() => null)) as {
    detail?: string;
  } | null;
  return body?.detail ?? `Error ${response.status}`;
}

async function refreshSession(): Promise<boolean> {
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        "X-Finpa-Client": "web",
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          setAccessToken(null);
          return false;
        }
        const tokens = (await response.json()) as TokenResponse;
        setAccessToken(tokens.access_token);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

async function request<T>(
  path: string,
  init: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
  if (init.body && !headers.has("Content-Type"))
    headers.set("Content-Type", "application/json");

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers,
      credentials: "include",
    });
  } catch {
    throw new ApiError("No pudimos conectar con Finpa. Revisa tu conexión.", 0);
  }

  if (response.status === 401 && retry) {
    if (await refreshSession()) return request<T>(path, init, false);
    window.dispatchEvent(new Event("finpa:auth-expired"));
  }
  if (!response.ok)
    throw new ApiError(await errorMessage(response), response.status);
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const authApi = {
  restore: refreshSession,
  async login(email: string, password: string) {
    const body = new URLSearchParams({ username: email.trim(), password });
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Finpa-Client": "web",
      },
      body,
    });
    if (!response.ok)
      throw new ApiError(await errorMessage(response), response.status);
    const tokens = (await response.json()) as TokenResponse;
    setAccessToken(tokens.access_token);
  },
  async logout() {
    await fetch(`${API_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
      headers: { "X-Finpa-Client": "web" },
    }).catch(() => undefined);
    setAccessToken(null);
  },
};

export const api = {
  transactions: {
    list: async (dateFrom: string, dateTo: string) => {
      const params = new URLSearchParams({
        date_from: dateFrom,
        date_to: dateTo,
        limit: "500",
      });
      return request<PaginatedTransactions>(`/transactions/?${params}`);
    },
    get: (uuid: string) => request<Transaction>(`/transactions/${uuid}`),
    create: (data: TransactionFormData) =>
      request<Transaction | Transaction[]>("/transactions/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (uuid: string, data: Partial<TransactionFormData>) =>
      request<Transaction>(`/transactions/${uuid}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (uuid: string) =>
      request<void>(`/transactions/${uuid}`, {
        method: "DELETE",
      }),
  },
  subscriptions: {
    list: () => request<Subscription[]>("/subscriptions/"),
    create: (data: SubscriptionFormData) =>
      request<Subscription>("/subscriptions/", {
        method: "POST",
        body: JSON.stringify(data),
      }),
    update: (uuid: string, data: Partial<SubscriptionFormData>) =>
      request<Subscription>(`/subscriptions/${uuid}`, {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
    delete: (uuid: string) =>
      request<void>(`/subscriptions/${uuid}`, {
        method: "DELETE",
      }),
    processDue: () =>
      request<Transaction[]>("/subscriptions/process-due", {
        method: "POST",
      }),
  },
};
