export const lightColors = {
  background: '#FAFAFA',
  surface: '#FFFFFF',
  surfaceAlt: '#F3F4F6',
  border: '#E5E7EB',
  borderSubtle: '#F0F0F0',

  textPrimary: '#111827',
  textSecondary: '#6B7280',
  textMuted: '#9CA3AF',

  accent: '#4F46E5',
  accentSoft: '#4F46E510',

  income: '#10B981',
  incomeSoft: '#10B98110',

  expense: '#EF4444',
  expenseSoft: '#EF444410',

  danger: '#DC2626',
};

export const darkColors = {
  background: '#0F0F0F',
  surface: '#1A1A1A',
  surfaceAlt: '#242424',
  border: '#2E2E2E',
  borderSubtle: '#1F1F1F',

  textPrimary: '#F5F5F5',
  textSecondary: '#A3A3A3',
  textMuted: '#666666',

  accent: '#6366F1',
  accentSoft: '#6366F120',

  income: '#34D399',
  incomeSoft: '#34D39920',

  expense: '#F87171',
  expenseSoft: '#F8717120',

  danger: '#EF4444',
};

export type ColorTokens = typeof lightColors;

export const typography = {
  displayLarge: { fontSize: 32, fontWeight: '700' as const, letterSpacing: -0.5 },
  displayMedium: { fontSize: 24, fontWeight: '700' as const, letterSpacing: -0.3 },
  titleLarge: { fontSize: 20, fontWeight: '600' as const },
  titleMedium: { fontSize: 17, fontWeight: '600' as const },
  bodyLarge: { fontSize: 16, fontWeight: '400' as const },
  bodyMedium: { fontSize: 14, fontWeight: '400' as const },
  caption: { fontSize: 12, fontWeight: '500' as const, letterSpacing: 0.3 },
  amount: {
    fontSize: 28,
    fontWeight: '700' as const,
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums' as const],
  },
};

export type TypographyTokens = typeof typography;
export type TypographyVariant = keyof TypographyTokens;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
} as const;

export const radii = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 9999,
} as const;

export type Theme = {
  colors: ColorTokens;
  typography: TypographyTokens;
  spacing: typeof spacing;
  radii: typeof radii;
  isDark: boolean;
};
