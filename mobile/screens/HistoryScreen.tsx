import React, { useCallback, useMemo, useState } from 'react';
import { LayoutAnimation, RefreshControl, SectionList, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { createStyles } from '../theme/createStyles';
import { Text, Skeleton, EmptyState } from '../components/ui';
import { TransactionRow } from '../components/TransactionRow';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import MonthYearPicker from '../components/MonthYearPicker';
import { useTransactions } from '../hooks/useTransactions';
import { useHaptics } from '../hooks/useHaptics';
import { Transaction } from '../types';

type Section = { title: string; data: Transaction[] };

function formatSectionDate(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  const formatted = date.toLocaleDateString('es-CL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export default function HistoryScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const haptics = useHaptics();

  const [month, setMonth] = useState(new Date());
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedYear = month.getFullYear();
  const selectedMonth = month.getMonth();
  const dateFrom = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-01`;
  const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const dateTo = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

  const { transactions, loading, refreshing, fetchTransactions, refresh, remove } =
    useTransactions();

  useFocusEffect(
    useCallback(() => {
      fetchTransactions(dateFrom, dateTo);
    }, [fetchTransactions, dateFrom, dateTo]),
  );

  const handleRefresh = useCallback(() => refresh(dateFrom, dateTo), [refresh, dateFrom, dateTo]);

  const handleEdit = useCallback(
    (t: Transaction) => {
      navigation.navigate('Transaction', { transaction: t });
    },
    [navigation],
  );

  const handleDeleteRequest = useCallback((t: Transaction) => {
    setDeleteTarget(t);
  }, []);

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    haptics.warning();
    const success = await remove(deleteTarget.uuid);
    setDeleting(false);
    if (success) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setDeleteTarget(null);
      fetchTransactions(dateFrom, dateTo);
    }
  }, [deleteTarget, haptics, remove, fetchTransactions, dateFrom, dateTo]);

  const sections: Section[] = useMemo(() => {
    const dateMap = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const existing = dateMap.get(t.date);
      if (existing) existing.push(t);
      else dateMap.set(t.date, [t]);
    }
    return [...dateMap.entries()].map(([date, data]) => ({ title: formatSectionDate(date), data }));
  }, [transactions]);

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.pickerRow}>
          <MonthYearPicker
            mode="month"
            selectedMonth={selectedMonth}
            selectedYear={selectedYear}
            onChangeMonth={(m) => setMonth(new Date(selectedYear, m, 1))}
            onChangeYear={(y) => setMonth(new Date(y, selectedMonth, 1))}
          />
        </View>
        <View style={styles.skeletons}>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={60} style={{ marginBottom: 8 }} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.pickerRow}>
        <MonthYearPicker
          mode="month"
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onChangeMonth={(m) => setMonth(new Date(selectedYear, m, 1))}
          onChangeYear={(y) => setMonth(new Date(y, selectedMonth, 1))}
        />
      </View>

      {transactions.length === 0 ? (
        <EmptyState
          icon="📋"
          title="No hay transacciones"
          description="Empieza registrando un gasto o ingreso"
          actionLabel="Agregar transaccion"
          onAction={() => navigation.navigate('Transaction')}
        />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.uuid}
          renderSectionHeader={({ section }) => (
            <Text variant="caption" color="textSecondary" style={styles.sectionHeader}>
              {section.title}
            </Text>
          )}
          renderItem={({ item }) => (
            <TransactionRow item={item} onEdit={handleEdit} onDelete={handleDeleteRequest} />
          )}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={colors.textPrimary}
            />
          }
        />
      )}

      <ConfirmDeleteModal
        visible={!!deleteTarget}
        transaction={deleteTarget}
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  pickerRow: { alignItems: 'center' as const, paddingVertical: theme.spacing.lg },
  skeletons: { padding: theme.spacing.lg },
  list: { paddingHorizontal: theme.spacing.lg, paddingBottom: 40 },
  sectionHeader: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    textTransform: 'uppercase' as const,
  },
}));
