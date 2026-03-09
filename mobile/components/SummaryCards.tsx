import React from 'react';
import { View } from 'react-native';
import { Card, Text } from './ui';
import { useTheme } from '../theme/ThemeProvider';
import { createStyles } from '../theme/createStyles';
import { formatAmount } from '../hooks/useDashboard';

type Props = {
  totalIncome: number;
  totalExpense: number;
  balance: number;
};

export function SummaryCards({ totalIncome, totalExpense, balance }: Props) {
  const styles = useStyles();
  const { colors } = useTheme();

  return (
    <>
      <View style={styles.row}>
        <Card
          variant="elevated"
          style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.income }]}
        >
          <Text variant="caption" color="textSecondary" style={styles.label}>
            Ingresos
          </Text>
          <Text variant="amount" style={{ color: colors.income, fontSize: 22 }}>
            {formatAmount(totalIncome)}
          </Text>
        </Card>
        <Card
          variant="elevated"
          style={[styles.card, { borderLeftWidth: 4, borderLeftColor: colors.expense }]}
        >
          <Text variant="caption" color="textSecondary" style={styles.label}>
            Gastos
          </Text>
          <Text variant="amount" style={{ color: colors.expense, fontSize: 22 }}>
            {formatAmount(totalExpense)}
          </Text>
        </Card>
      </View>
      <Card
        variant="elevated"
        style={[
          styles.balanceCard,
          { borderLeftWidth: 4, borderLeftColor: balance >= 0 ? colors.income : colors.expense },
        ]}
      >
        <Text variant="caption" color="textSecondary" style={styles.label}>
          Balance
        </Text>
        <Text variant="amount" style={{ color: balance >= 0 ? colors.income : colors.expense }}>
          {formatAmount(balance)}
        </Text>
      </Card>
    </>
  );
}

const useStyles = createStyles((theme) => ({
  row: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    marginBottom: theme.spacing.md,
  },
  card: {
    flex: 1,
  },
  label: {
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: theme.spacing.xs,
  },
  balanceCard: {
    marginBottom: theme.spacing.xxl,
  },
}));
