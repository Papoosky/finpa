import React, { useCallback, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';
import { Text } from './ui';
import { useTheme } from '../theme/ThemeProvider';
import { useHaptics } from '../hooks/useHaptics';
import { CATEGORY_EMOJI_MAP } from '../constants/categories';
import { Transaction } from '../types';
import { formatAmount } from '../hooks/useDashboard';

const SWIPE_THRESHOLD = 80;

type Props = {
  item: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
};

export function TransactionRow({ item, onEdit, onDelete }: Props) {
  const { colors, radii } = useTheme();
  const haptics = useHaptics();
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);
  const onTouchStart = useRef({ x: 0, y: 0, time: 0 }).current;
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
          onTouchStart.time = Date.now();
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
            <Text style={styles.emoji}>{CATEGORY_EMOJI_MAP[item.category] || '📌'}</Text>
            <View>
              <Text variant="bodyMedium" style={{ fontWeight: '600', color: colors.textPrimary }}>
                {item.category}
              </Text>
              {item.description ? (
                <Text
                  variant="caption"
                  color="textMuted"
                  numberOfLines={1}
                  style={{ maxWidth: 180 }}
                >
                  {item.description}
                </Text>
              ) : null}
            </View>
          </View>
          <Text
            variant="bodyLarge"
            style={{
              fontWeight: '700',
              fontVariant: ['tabular-nums'],
              color: item.type === 'income' ? colors.income : colors.expense,
            }}
          >
            {item.type === 'income' ? '+' : '-'}
            {formatAmount(item.amount)}
          </Text>
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
  emoji: { fontSize: 24 },
});
