import React from 'react';
import { View } from 'react-native';
import { createStyles } from '../../theme/createStyles';
import { Text } from './Text';
import { Button } from './Button';

type EmptyStateProps = {
  icon: string;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function EmptyState({ icon, title, description, actionLabel, onAction }: EmptyStateProps) {
  const styles = useStyles();

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>{icon}</Text>
      <Text variant="titleMedium" color="textSecondary" style={styles.title}>
        {title}
      </Text>
      {description && (
        <Text variant="bodyMedium" color="textMuted" style={styles.description}>
          {description}
        </Text>
      )}
      {actionLabel && onAction && (
        <View style={styles.action}>
          <Button label={actionLabel} onPress={onAction} variant="secondary" size="sm" />
        </View>
      )}
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  container: {
    flex: 1,
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    padding: theme.spacing.xxxl,
  },
  icon: {
    fontSize: 48,
    marginBottom: theme.spacing.lg,
  },
  title: {
    textAlign: 'center' as const,
    marginBottom: theme.spacing.sm,
  },
  description: {
    textAlign: 'center' as const,
    marginBottom: theme.spacing.xl,
  },
  action: {
    marginTop: theme.spacing.md,
  },
}));
