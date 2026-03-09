import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

type ThemeMode = 'dark' | 'light' | 'system';

type ThemeState = {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggleTheme: () => void;
};

function resolveIsDark(mode: ThemeMode): boolean {
  if (mode === 'system') {
    return Appearance.getColorScheme() === 'dark';
  }
  return mode === 'dark';
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      mode: 'dark',
      isDark: true,
      setMode: (mode) => set({ mode, isDark: resolveIsDark(mode) }),
      toggleTheme: () => {
        const current = get().mode;
        const next = current === 'dark' ? 'light' : 'dark';
        set({ mode: next, isDark: resolveIsDark(next) });
      },
    }),
    {
      name: 'finpa-theme',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isDark = resolveIsDark(state.mode);
        }
      },
    },
  ),
);
