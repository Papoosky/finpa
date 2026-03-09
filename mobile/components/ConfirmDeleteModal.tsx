import React from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CATEGORY_EMOJI_MAP } from '../constants/categories';

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
  if (!transaction) return null;

  const emoji = CATEGORY_EMOJI_MAP[transaction.category] || '📌';
  const isIncome = transaction.type === 'income';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Eliminar transaccion?</Text>
          <View style={styles.detail}>
            <Text style={styles.detailText}>
              {emoji} {transaction.category}
            </Text>
            <Text style={[styles.detailAmount, { color: isIncome ? '#22c55e' : '#ef4444' }]}>
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
                <ActivityIndicator size="small" color="#ffffff" />
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

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 340,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
    textAlign: 'center',
    marginBottom: 16,
  },
  detail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f9fafb',
    borderRadius: 10,
    padding: 14,
    marginBottom: 24,
  },
  detailText: {
    fontSize: 16,
    color: '#374151',
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
    backgroundColor: '#f3f4f6',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#6b7280',
  },
  deleteBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 10,
    backgroundColor: '#ef4444',
    alignItems: 'center',
  },
  deleteText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#ffffff',
  },
});
