import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';
import { API_BASE_URL } from '../config';

const TOKEN_KEY = 'finpa_token';

type AuthState = {
  token: string | null;
  isLoading: boolean;
  isInitialized: boolean;
  initialize: () => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>()((set) => ({
  token: null,
  isLoading: false,
  isInitialized: false,

  initialize: async () => {
    const stored = await SecureStore.getItemAsync(TOKEN_KEY);
    set({ token: stored, isInitialized: true });
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const formData = new URLSearchParams();
      formData.append('username', email.trim());
      formData.append('password', password);

      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Error de autenticacion');
      }

      const data = await response.json();
      await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
      set({ token: data.access_token });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true });
    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(err.detail || 'Error al registrar');
      }

      const data = await response.json();
      await SecureStore.setItemAsync(TOKEN_KEY, data.access_token);
      set({ token: data.access_token });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync(TOKEN_KEY);
    set({ token: null });
  },
}));
