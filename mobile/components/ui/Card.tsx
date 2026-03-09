import React from 'react';
import { View, ViewProps, ViewStyle, Platform } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';

type CardVariant = 'elevated' | 'outlined' | 'flat';

type CardProps = ViewProps & {
  variant?: CardVariant;
  padding?: number;
};

export function Card({ variant = 'elevated', padding, style, children, ...props }: CardProps) {
  const { colors, spacing, radii, isDark } = useTheme();

  const base: ViewStyle = {
    borderRadius: radii.md,
    padding: padding ?? spacing.lg,
  };

  const variantStyles: Record<CardVariant, ViewStyle> = {
    elevated: {
      backgroundColor: colors.surface,
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: isDark ? 0.3 : 0.08,
          shadowRadius: 8,
        },
        android: {
          elevation: isDark ? 4 : 2,
        },
      }),
    },
    outlined: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.border,
    },
    flat: {
      backgroundColor: colors.surfaceAlt,
    },
  };

  return (
    <View style={[base, variantStyles[variant], style]} {...props}>
      {children}
    </View>
  );
}
