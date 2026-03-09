import React, { useState } from 'react';
import { TextInput, TextInputProps, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useTheme } from '../../theme/ThemeProvider';
import { createStyles } from '../../theme/createStyles';
import { Text } from './Text';

type InputProps = TextInputProps & {
  label?: string;
  error?: string;
};

export function Input({ label, error, style, ...props }: InputProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  const [focused, setFocused] = useState(false);

  const borderColor = error ? colors.danger : focused ? colors.accent : colors.border;

  return (
    <View style={styles.container}>
      {label && (
        <Text variant="caption" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      )}
      <TextInput
        style={[styles.input, { borderColor }, style]}
        placeholderTextColor={colors.textMuted}
        onFocus={(e) => {
          setFocused(true);
          props.onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          props.onBlur?.(e);
        }}
        {...props}
      />
      {error && (
        <Animated.View entering={FadeIn.duration(200)}>
          <Text variant="caption" color="danger" style={styles.error}>
            {error}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  container: {
    marginBottom: theme.spacing.xl,
  },
  label: {
    marginBottom: theme.spacing.xs,
    textTransform: 'uppercase' as const,
  },
  input: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: theme.colors.textPrimary,
  },
  error: {
    marginTop: theme.spacing.xs,
  },
}));
