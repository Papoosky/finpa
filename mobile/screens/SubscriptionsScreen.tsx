import React, { useCallback, useMemo, useState } from 'react';
import { LayoutAnimation, RefreshControl, SectionList, TouchableOpacity, View } from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../theme/ThemeProvider';
import { createStyles } from '../theme/createStyles';
import { Text, Skeleton, EmptyState, Card } from '../components/ui';
import { SubscriptionRow } from '../components/SubscriptionRow';
import ConfirmDeleteModal from '../components/ConfirmDeleteModal';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useHaptics } from '../hooks/useHaptics';
import { formatAmount } from '../hooks/useDashboard';
import { Subscription } from '../types';

type Section = { title: string; data: Subscription[] };

function getNextChargeDate(sub: Subscription): Date {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (sub.interval === 'monthly') {
    const candidate = new Date(today.getFullYear(), today.getMonth(), sub.billing_day);
    // Clamp to last day of month
    const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    candidate.setDate(Math.min(sub.billing_day, lastDay));
    if (candidate < today) {
      // Already past this month — next month
      const nextMonth = today.getMonth() + 1;
      const nextYear = nextMonth > 11 ? today.getFullYear() + 1 : today.getFullYear();
      const clampedMonth = nextMonth % 12;
      const nextLastDay = new Date(nextYear, clampedMonth + 1, 0).getDate();
      return new Date(nextYear, clampedMonth, Math.min(sub.billing_day, nextLastDay));
    }
    return candidate;
  }

  // yearly
  const billingMonth = new Date(sub.start_date + 'T12:00:00').getMonth();
  const candidate = new Date(today.getFullYear(), billingMonth, sub.billing_day);
  const lastDay = new Date(today.getFullYear(), billingMonth + 1, 0).getDate();
  candidate.setDate(Math.min(sub.billing_day, lastDay));
  if (candidate < today) {
    const nextYear = today.getFullYear() + 1;
    const nextLastDay = new Date(nextYear, billingMonth + 1, 0).getDate();
    return new Date(nextYear, billingMonth, Math.min(sub.billing_day, nextLastDay));
  }
  return candidate;
}

function formatNextCharge(date: Date): string {
  return date.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' });
}

function formatDaysLabel(date: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((date.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff === 0) return 'hoy';
  if (diff === 1) return 'manana';
  return `en ${diff} dias`;
}

function monthlyEquivalent(sub: Subscription, usdRate: number): number {
  const base = sub.currency === 'USD' ? sub.amount * usdRate : sub.amount;
  return sub.interval === 'yearly' ? base / 12 : base;
}

export default function SubscriptionsScreen() {
  const { colors } = useTheme();
  const styles = useStyles();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const navigation = useNavigation<any>();
  const haptics = useHaptics();

  const [deleteTarget, setDeleteTarget] = useState<Subscription | null>(null);
  const [deleting, setDeleting] = useState(false);

  const { subscriptions, loading, refreshing, fetchSubscriptions, refresh, remove } =
    useSubscriptions();

  useFocusEffect(
    useCallback(() => {
      fetchSubscriptions();
    }, [fetchSubscriptions]),
  );

  const handleRefresh = useCallback(() => refresh(), [refresh]);

  const handleEdit = useCallback(
    (s: Subscription) => {
      navigation.navigate('AddSubscription', { subscription: s });
    },
    [navigation],
  );

  const handleDeleteRequest = useCallback((s: Subscription) => {
    setDeleteTarget(s);
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
      fetchSubscriptions();
    }
  }, [deleteTarget, haptics, remove, fetchSubscriptions]);

  const { sections, monthlyTotal, yearlyTotal } = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thisMonthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    thisMonthEnd.setHours(23, 59, 59, 999);

    const nextMonthEnd = new Date(today.getFullYear(), today.getMonth() + 2, 0);
    nextMonthEnd.setHours(23, 59, 59, 999);

    const thisMonth: Subscription[] = [];
    const nextMonth: Subscription[] = [];
    const later: Subscription[] = [];

    for (const sub of subscriptions) {
      const next = getNextChargeDate(sub);
      if (next <= thisMonthEnd) thisMonth.push(sub);
      else if (next <= nextMonthEnd) nextMonth.push(sub);
      else later.push(sub);
    }

    const sortByDay = (a: Subscription, b: Subscription) =>
      getNextChargeDate(a).getTime() - getNextChargeDate(b).getTime();

    thisMonth.sort(sortByDay);
    nextMonth.sort(sortByDay);
    later.sort(sortByDay);

    const result: Section[] = [];
    if (thisMonth.length > 0) result.push({ title: 'ESTE MES', data: thisMonth });
    if (nextMonth.length > 0) result.push({ title: 'PRÓXIMO MES', data: nextMonth });
    if (later.length > 0) result.push({ title: 'MÁS ADELANTE', data: later });

    // Totals — use a rough CLP rate of 950 for USD display (exact rate only matters at charge time)
    const USD_APPROX = 950;
    const monthly = subscriptions.reduce((sum, s) => sum + monthlyEquivalent(s, USD_APPROX), 0);

    return { sections: result, monthlyTotal: monthly, yearlyTotal: monthly * 12 };
  }, [subscriptions]);

  if (loading && !refreshing) {
    return (
      <View style={styles.container}>
        <View style={styles.skeletons}>
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} width="100%" height={68} style={{ marginBottom: 8 }} />
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.uuid}
        ListHeaderComponent={
          subscriptions.length > 0 ? (
            <View style={styles.summaryRow}>
              <Card variant="elevated" style={styles.summaryCard}>
                <Text variant="caption" color="textSecondary" style={styles.summaryLabel}>
                  MENSUAL
                </Text>
                <Text variant="titleLarge" style={{ fontWeight: '700', color: colors.expense }}>
                  ${formatAmount(Math.round(monthlyTotal))}
                </Text>
              </Card>
              <Card variant="elevated" style={styles.summaryCard}>
                <Text variant="caption" color="textSecondary" style={styles.summaryLabel}>
                  ANUAL
                </Text>
                <Text variant="titleLarge" style={{ fontWeight: '700', color: colors.expense }}>
                  ${formatAmount(Math.round(yearlyTotal))}
                </Text>
              </Card>
            </View>
          ) : null
        }
        ListEmptyComponent={
          <EmptyState
            icon="📱"
            title="Sin suscripciones"
            description="Agrega tus servicios recurrentes para saber cuando se cobran"
            actionLabel="Agregar suscripcion"
            onAction={() => navigation.navigate('AddSubscription')}
          />
        }
        renderSectionHeader={({ section }) => (
          <Text variant="caption" color="textSecondary" style={styles.sectionHeader}>
            {section.title}
          </Text>
        )}
        renderItem={({ item }) => {
          const next = getNextChargeDate(item);
          return (
            <SubscriptionRow
              item={item}
              nextChargeLabel={formatNextCharge(next)}
              daysLabel={formatDaysLabel(next)}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />
          );
        }}
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

      {/* FAB */}
      <TouchableOpacity
        style={[styles.fab, { backgroundColor: colors.accent }]}
        onPress={() => {
          haptics.light();
          navigation.navigate('AddSubscription');
        }}
      >
        <Ionicons name="add" size={28} color="#ffffff" />
      </TouchableOpacity>

      <ConfirmDeleteModal
        visible={!!deleteTarget}
        transaction={deleteTarget as never}
        loading={deleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </View>
  );
}

const useStyles = createStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  skeletons: { padding: theme.spacing.lg },
  list: { paddingHorizontal: theme.spacing.lg, paddingBottom: 100 },
  summaryRow: {
    flexDirection: 'row' as const,
    gap: theme.spacing.md,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  summaryCard: {
    flex: 1,
    alignItems: 'center' as const,
    paddingVertical: theme.spacing.lg,
  },
  summaryLabel: {
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  sectionHeader: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
    paddingHorizontal: theme.spacing.xs,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  fab: {
    position: 'absolute' as const,
    bottom: 28,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
  },
}));
