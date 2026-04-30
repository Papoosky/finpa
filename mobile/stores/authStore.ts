import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'finpa_token';
const REFRESH_TOKEN_KEY = 'finpa_refresh_token';
const AUTH_TIMEOUT_MS = 15_000;

type AuthState = {
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAccessToken: () => Promise<boolean>;
};

function isTokenExpired(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]));
    // Consider expired if less than 60 seconds remaining
    return payload.exp * 1000 < Date.now() + 60_000;
  } catch {
    return true;
  }
}

async function authFetch(url: string, options: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), AUTH_TIMEOUT_MS);

  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      console.warn(`[Auth] Timeout: ${url}`);
      throw new Error('La solicitud tardó demasiado. Intenta de nuevo.', { cause: err });
    }
    console.warn(`[Auth] Network error: ${url}`, err);
    throw new Error('Error de conexión. Verifica tu red e intenta de nuevo.', { cause: err });
  } finally {
    clearTimeout(timeoutId);
  }
}

async function parseErrorResponse(response: Response, fallback: string): Promise<string> {
  try {
    const err = await response.json();
    return err.detail || fallback;
  } catch {
    console.warn(`[Auth] Non-JSON error response (${response.status})`);
    return fallback;
  }
}

export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);

    if (stored && !isTokenExpired(stored)) {
      set({ token: stored, isInitialized: true });
      return;
    }

    // Access token missing or expired — try to refresh
    if (refreshToken) {
      try {
        const response = await authFetch(`${API_BASE_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (response.ok) {
          const data = await response.json();
          await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
          await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token);
          set({ token: data.access_token, isInitialized: true });
          return;
        }

        // Server explicitly rejected the refresh token — clear everything
        if (response.status === 401 || response.status === 403) {
          await SecureStore.deleteItemAsync(TOKEN_KEY);
          await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
          set({ token: null, isInitialized: true });
          return;
        }

        // Server error (5xx) or unexpected response — keep tokens, let the
        // next API call trigger a retry via the 401 handler in api.ts
        console.warn('[Auth] Refresh returned unexpected status on init', response.status);
      } catch (err) {
        // Network error (device waking up, no signal) — keep tokens and let
        // the user stay logged in; the 401 retry in api.ts will handle it
        console.warn('[Auth] Failed to refresh token on init (network error)', err);
      }

      // Proceed with the stored (possibly expired) access token so the user
      // stays logged in; the first API call will refresh it if needed
      if (stored) {
        set({ token: stored, isInitialized: true });
        return;
      }
    }

    set({ token: null, isInitialized: true });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const formData = new URLSearchParams();
      formData.append('username', email.trim());
      formData.append('password', password);

      const response = await authFetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response, 'Error de autenticación');
        throw new Error(message);
      }

      const data = await response.json();
      await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
      if (data.refresh_token) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token);
      }
      set({ token: data.access_token });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const response = await authFetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });

      if (!response.ok) {
        const message = await parseErrorResponse(response, 'Error al registrar');
        throw new Error(message);
      }

      const data = await response.json();
      await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
      if (data.refresh_token) {
        await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token);
      }
      set({ token: data.access_token });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    // Revoke refresh token on server (best effort)
    if (refreshToken) {
      authFetch(`${API_BASE_URL}/auth/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => {});
    }
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
    set({ token: null });
  },

  refreshAccessToken: async () => {
    const refreshToken = await SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
    if (!refreshToken) return false;

    try {
      const response = await authFetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!response.ok) {
        // Refresh token expired/revoked — force logout
        await SecureStore.deleteItemAsync(TOKEN_KEY);
        await SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY);
        set({ token: null });
        return false;
      }

      const data = await response.json();
      await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
      await SecureStore.setItemAsync(REFRESH_TOKEN_KEY, data.refresh_token);
      set({ token: data.access_token });
      return true;
    } catch (err) {
      console.warn('[Auth] Failed to refresh token', err);
      return false;
    }
  },
}));
