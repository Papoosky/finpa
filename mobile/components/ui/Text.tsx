import React from 'react';
import { Text as RNText, TextProps as RNTextProps, TextStyle } from 'react-native';
import { useTheme } from '../../theme/ThemeProvider';
import { TypographyVariant, ColorTokens } from '../../theme/tokens';

type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: keyof ColorTokens;
};

export function Text({ variant = 'bodyLarge', color, style, ...props }: TextProps) {
  const { typography, colors } = useTheme();

  const baseStyle: TextStyle = {
    ...typography[variant],
    color: color ? colors[color] : colors.textPrimary,
  };

  return <RNText style={[baseStyle, style]} {...props} />;
}
