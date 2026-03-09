import React from 'react';
import { Card, Text } from './ui';
import { createStyles } from '../theme/createStyles';

type Props = {
  title: string;
  children: React.ReactNode;
};

export function ChartCard({ title, children }: Props) {
  const styles = useStyles();

  return (
    <Card variant="elevated" style={styles.card}>
      <Text variant="titleMedium" style={styles.title}>
        {title}
      </Text>
      {children}
    </Card>
  );
}

const useStyles = createStyles((theme) => ({
  card: {
    marginBottom: theme.spacing.lg,
    alignItems: 'center' as const,
  },
  title: {
    alignSelf: 'flex-start' as const,
    marginBottom: theme.spacing.md,
  },
}));
