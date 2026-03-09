import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CATEGORY_EMOJI_MAP } from '../constants/categories';
import { useTheme } from '../theme/ThemeProvider';

type Transaction = {
  uuid: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
};

type Props = {
  visible: boolean;
  transaction: Transaction | null;
  loading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

function formatAmount(n: number): string {
  return '$' + n.toLocaleString('es-CL');
}

function ConfirmDeleteModal({ visible, transaction, loading, onConfirm, onCancel }: Props) {
  const { colors } = useTheme();

  if (!transaction) return null;

  const emoji = CATEGORY_EMOJI_MAP[transaction.category] || '📌';
  const isIncome = transaction.type === 'income';

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
      padding: 32,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '100%',
      maxWidth: 340,
    },
    title: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.textPrimary,
      textAlign: 'center',
      marginBottom: 16,
    },
    detail: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      backgroundColor: colors.surfaceAlt,
      borderRadius: 10,
      padding: 14,
      marginBottom: 24,
    },
    detailText: {
      fontSize: 16,
      color: colors.textSecondary,
      fontWeight: '500',
    },
    detailAmount: {
      fontSize: 16,
      fontWeight: '700',
    },
    buttons: {
      flexDirection: 'row',
      gap: 12,
    },
    cancelBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: colors.surfaceAlt,
      alignItems: 'center',
    },
    cancelText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.textSecondary,
    },
    deleteBtn: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: 10,
      backgroundColor: colors.danger,
      alignItems: 'center',
    },
    deleteText: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.surface,
    },
  });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Eliminar transaccion?</Text>
          <View style={styles.detail}>
            <Text style={styles.detailText}>
              {emoji} {transaction.category}
            </Text>
            <Text
              style={[styles.detailAmount, { color: isIncome ? colors.income : colors.danger }]}
            >
              {isIncome ? '+' : '-'}
              {formatAmount(transaction.amount)}
            </Text>
          </View>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onCancel} disabled={loading}>
              <Text style={styles.cancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.deleteBtn, loading && { opacity: 0.6 }]}
              onPress={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.surface} />
              ) : (
                <Text style={styles.deleteText}>Eliminar</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default React.memo(ConfirmDeleteModal);
