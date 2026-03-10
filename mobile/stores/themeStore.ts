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
      setMode: (mode) => {
        const isDark = resolveIsDark(mode);
        Appearance.setColorScheme(isDark ? 'dark' : 'light');
        set({ mode, isDark });
      },
      toggleTheme: () => {
        const current = get().mode;
        const next = current === 'dark' ? 'light' : 'dark';
        const isDark = resolveIsDark(next);
        Appearance.setColorScheme(isDark ? 'dark' : 'light');
        set({ mode: next, isDark });
      },
    }),
    {
      name: 'finpa-theme',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ mode: state.mode }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          state.isDark = resolveIsDark(state.mode);
          Appearance.setColorScheme(state.isDark ? 'dark' : 'light');
        }
      },
    },
  ),
);
