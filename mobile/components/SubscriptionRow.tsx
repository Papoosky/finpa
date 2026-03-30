import React, { useCallback, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from './ui';
import { ServiceBadge } from './ServiceBadge';
import { useTheme } from '../theme/ThemeProvider';
import { useHaptics } from '../hooks/useHaptics';
import { Subscription } from '../types';
import { formatAmount } from '../hooks/useDashboard';

const SWIPE_THRESHOLD = 80;

type Props = {
  item: Subscription;
  nextChargeLabel: string;
  daysLabel: string;
  onEdit: (s: Subscription) => void;
  onDelete: (s: Subscription) => void;
};

export function SubscriptionRow({ item, nextChargeLabel, daysLabel, onEdit, onDelete }: Props) {
  const { colors, radii } = useTheme();
  const haptics = useHaptics();
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);
  const onTouchStart = useRef({ x: 0, y: 0 }).current;
  const isTracking = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);

  const resetPosition = useCallback(() => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
    lastOffset.current = 0;
  }, [translateX]);

  const amountLabel =
    item.currency === 'USD' ? `USD ${item.amount.toFixed(2)}` : `$${formatAmount(item.amount)}`;

  return (
    <View style={[styles.container, { borderRadius: radii.sm }]}>
      <View
        style={[
          styles.action,
          styles.editAction,
          { backgroundColor: colors.accent, borderRadius: radii.sm },
        ]}
      >
        <Text style={styles.actionText}>Editar</Text>
      </View>
      <View
        style={[
          styles.action,
          styles.deleteAction,
          { backgroundColor: colors.danger, borderRadius: radii.sm },
        ]}
      >
        <Text style={styles.actionText}>Eliminar</Text>
      </View>

      <Animated.View
        style={[
          { backgroundColor: colors.surface, borderRadius: radii.sm },
          { transform: [{ translateX }] },
        ]}
        onTouchStart={(e) => {
          onTouchStart.x = e.nativeEvent.pageX;
          onTouchStart.y = e.nativeEvent.pageY;
          isTracking.current = true;
          isHorizontal.current = null;
        }}
        onTouchMove={(e) => {
          if (!isTracking.current) return;
          const dx = e.nativeEvent.pageX - onTouchStart.x;
          const dy = e.nativeEvent.pageY - onTouchStart.y;
          if (isHorizontal.current === null) {
            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
              isHorizontal.current = Math.abs(dx) > Math.abs(dy);
              if (!isHorizontal.current) {
                isTracking.current = false;
                return;
              }
            } else {
              return;
            }
          }
          translateX.setValue(lastOffset.current + dx);
        }}
        onTouchEnd={(e) => {
          if (!isTracking.current || !isHorizontal.current) {
            isTracking.current = false;
            return;
          }
          isTracking.current = false;
          const dx = e.nativeEvent.pageX - onTouchStart.x;
          const finalValue = lastOffset.current + dx;
          if (finalValue > SWIPE_THRESHOLD) {
            haptics.success();
            onEdit(item);
          } else if (finalValue < -SWIPE_THRESHOLD) {
            haptics.warning();
            onDelete(item);
          }
          resetPosition();
        }}
      >
        <View style={styles.content}>
          <View style={styles.left}>
            <ServiceBadge serviceKey={item.service_key} size={38} />
            <View>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: colors.textPrimary }}>
                {item.name}
              </Text>
              <Text variant="caption" color="textMuted">
                {nextChargeLabel} · {daysLabel}
              </Text>
            </View>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text
              variant="bodyLarge"
              style={{ fontWeight: '700', fontVariant: ['tabular-nums'], color: colors.expense }}
            >
              {amountLabel}
            </Text>
            <Text variant="caption" color="textMuted" style={{ fontSize: 11, marginTop: 2 }}>
              {item.interval === 'monthly' ? 'mensual' : 'anual'}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 2, overflow: 'hidden' },
  action: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  editAction: { left: 0 },
  deleteAction: { right: 0 },
  actionText: { color: '#ffffff', fontSize: 14, fontWeight: '700' },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  left: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
});
