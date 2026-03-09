import React, { useCallback, useState } from 'react';
import { RefreshControl, ScrollView, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { VictoryChart, VictoryLine, VictoryAxis, VictoryPie, VictoryTheme } from 'victory-native';
import { useTheme } from '../theme/ThemeProvider';
import { createStyles } from '../theme/createStyles';
import { Text, Skeleton, EmptyState } from '../components/ui';
import { SummaryCards } from '../components/SummaryCards';
import { ChartCard } from '../components/ChartCard';
import MonthYearPicker from '../components/MonthYearPicker';
import { useTransactions } from '../hooks/useTransactions';
import { useDashboard, formatAmount } from '../hooks/useDashboard';
import { useDateRange } from '../hooks/useDateRange';

const MONTH_LABELS = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

export default function DashboardScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();

  const [viewMode, setViewMode] = useState<'month' | 'year'>('month');
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  const { dateFrom, dateTo } = useDateRange(viewMode, selectedMonth, selectedYear);
  const { transactions, loading, refreshing, fetchTransactions, refresh } = useTransactions();
  const dashboard = useDashboard(transactions, viewMode);

  useFocusEffect(
    useCallback(() => {
      fetchTransactions(dateFrom, dateTo);
    }, [fetchTransactions, dateFrom, dateTo]),
  );

  const handleRefresh = useCallback(() => {
    refresh(dateFrom, dateTo);
  }, [refresh, dateFrom, dateTo]);

  if (loading && !refreshing) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
        <View style={styles.skeletonRow}>
          <Skeleton width="48%" height={80} />
          <Skeleton width="48%" height={80} />
        </View>
        <Skeleton width="100%" height={80} style={{ marginBottom: 16 }} />
        <Skeleton width="100%" height={200} />
      </ScrollView>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scroll}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={handleRefresh}
          tintColor={colors.accent}
        />
      }
    >
      {/* View mode toggle */}
      <View style={styles.toggleRow}>
        {(['month', 'year'] as const).map((mode) => (
          <TouchableOpacity
            key={mode}
            style={[
              styles.toggleBtn,
              viewMode === mode && { backgroundColor: colors.accent, borderColor: colors.accent },
            ]}
            onPress={() => setViewMode(mode)}
          >
            <Text
              variant="bodyMedium"
              style={{
                fontWeight: '600',
                color: viewMode === mode ? '#fff' : colors.textSecondary,
              }}
            >
              {mode === 'month' ? 'Mes' : 'Año'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={styles.pickerRow}>
        <MonthYearPicker
          mode={viewMode === 'month' ? 'month' : 'year'}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onChangeMonth={setSelectedMonth}
          onChangeYear={setSelectedYear}
        />
      </View>

      <SummaryCards
        totalIncome={dashboard.totalIncome}
        totalExpense={dashboard.totalExpense}
        balance={dashboard.balance}
      />

      {/* Monthly: bar chart */}
      {viewMode === 'month' && transactions.length > 0 && dashboard.categoryTotals.length > 0 && (
        <ChartCard title="Gastos por categoria">
          <View style={styles.barChart}>
            {dashboard.categoryTotals.map((cat) => (
              <View key={cat.category} style={styles.barRow}>
                <Text variant="bodyMedium" style={styles.barLabel}>
                  {cat.emoji} {cat.category}
                </Text>
                <View style={[styles.barTrack, { backgroundColor: colors.surfaceAlt }]}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${cat.percent}%` as const, backgroundColor: cat.color },
                    ]}
                  />
                </View>
                <Text variant="caption" style={styles.barAmount}>
                  {formatAmount(cat.total)}
                </Text>
              </View>
            ))}
          </View>
        </ChartCard>
      )}

      {/* Annual: line + pie */}
      {viewMode === 'year' && transactions.length > 0 && (
        <>
          <ChartCard title="Ingresos vs Gastos mensual">
            <VictoryChart theme={VictoryTheme.material} width={350} height={250}>
              <VictoryAxis
                tickValues={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
                tickFormat={MONTH_LABELS}
                style={{ tickLabels: { fontSize: 10, angle: -45, fill: colors.textSecondary } }}
              />
              <VictoryAxis
                dependentAxis
                tickFormat={(t: number) => {
                  if (t >= 1000000) return `$${(t / 1000000).toFixed(1)}M`;
                  if (t >= 1000) return `$${(t / 1000).toFixed(0)}k`;
                  return `$${t}`;
                }}
                style={{ tickLabels: { fontSize: 10, fill: colors.textSecondary } }}
              />
              <VictoryLine
                data={dashboard.lineData}
                x="month"
                y="income"
                style={{ data: { stroke: colors.income, strokeWidth: 2 } }}
              />
              <VictoryLine
                data={dashboard.lineData}
                x="month"
                y="expense"
                style={{ data: { stroke: colors.expense, strokeWidth: 2 } }}
              />
            </VictoryChart>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.income }]} />
                <Text variant="caption" color="textSecondary">
                  Ingresos
                </Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.expense }]} />
                <Text variant="caption" color="textSecondary">
                  Gastos
                </Text>
              </View>
            </View>
          </ChartCard>

          {dashboard.pieData.slices.length > 0 && (
            <ChartCard title="Gastos por categoria">
              <VictoryPie
                data={dashboard.pieData.slices}
                colorScale={dashboard.pieData.colors}
                labels={({ datum }: { datum: { x: string } }) => datum.x}
                style={{ labels: { fontSize: 11, fill: colors.textSecondary } }}
                width={300}
                height={300}
              />
              <View style={styles.pieLegend}>
                {dashboard.pieData.legend.map((item) => (
                  <View key={item.name} style={styles.pieLegendRow}>
                    <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                    <Text variant="bodyMedium" style={{ flex: 1 }}>
                      {item.emoji} {item.name}
                    </Text>
                    <Text
                      variant="caption"
                      style={{ fontWeight: '600', width: 100, textAlign: 'right' }}
                    >
                      {formatAmount(item.total)}
                    </Text>
                    <Text
                      variant="caption"
                      color="textMuted"
                      style={{ width: 50, textAlign: 'right' }}
                    >
                      {item.percent.toFixed(1)}%
                    </Text>
                  </View>
                ))}
              </View>
            </ChartCard>
          )}
        </>
      )}

      {/* Empty state */}
      {transactions.length === 0 && (
        <EmptyState
          icon="📊"
          title={viewMode === 'month' ? 'Sin datos este mes' : 'Sin datos este año'}
          description="Agrega tu primera transaccion"
          actionLabel="Agregar transaccion"
          onAction={() => navigation.navigate('Transaction')}
        />
      )}
    </ScrollView>
  );
}

const useStyles = createStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.xl, paddingBottom: 40 },
  skeletonRow: {
    flexDirection: 'row' as const,
    justifyContent: 'space-between' as const,
    marginBottom: theme.spacing.md,
  },
  toggleRow: {
    flexDirection: 'row' as const,
    marginBottom: theme.spacing.lg,
    gap: theme.spacing.md,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: theme.spacing.md,
    borderRadius: theme.radii.sm,
    borderWidth: 1.5,
    borderColor: theme.colors.border,
    alignItems: 'center' as const,
    backgroundColor: theme.colors.surface,
  },
  pickerRow: { alignItems: 'center' as const, marginBottom: theme.spacing.xxl },
  barChart: { gap: theme.spacing.md, width: '100%' as const },
  barRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: theme.spacing.sm },
  barLabel: { width: 120, color: theme.colors.textSecondary },
  barTrack: { flex: 1, height: 20, borderRadius: theme.radii.sm, overflow: 'hidden' as const },
  barFill: { height: '100%' as const, borderRadius: theme.radii.sm },
  barAmount: {
    width: 90,
    fontWeight: '600' as const,
    textAlign: 'right' as const,
    color: theme.colors.textSecondary,
  },
  legend: {
    flexDirection: 'row' as const,
    justifyContent: 'center' as const,
    gap: theme.spacing.xxl,
    marginBottom: theme.spacing.sm,
  },
  legendItem: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  pieLegend: { marginTop: theme.spacing.md, gap: theme.spacing.sm, width: '100%' as const },
  pieLegendRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: theme.spacing.sm,
  },
}));
