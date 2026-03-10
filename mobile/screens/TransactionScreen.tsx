import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { createStyles } from '../theme/createStyles';
import { Text, Button, Input, showToast } from '../components/ui';
import { CategoryModal } from '../components/CategoryModal';
import { useTransactions } from '../hooks/useTransactions';
import { useHaptics } from '../hooks/useHaptics';
import { INCOME_CATEGORIES, EXPENSE_CATEGORIES } from '../constants/categories';
import { TransactionType, DrawerParamList } from '../types';

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatCLP(value: string): string {
  const num = parseInt(value.replace(/\D/g, ''), 10);
  if (isNaN(num)) return '';
  return num.toLocaleString('es-CL');
}

export default function TransactionScreen() {
  const { colors, isDark } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<DrawerParamList, 'Transaction'>>();
  const haptics = useHaptics();
  const { create, update } = useTransactions();

  const editTransaction = route.params?.transaction;
  const isEditing = !!editTransaction;

  const [type, setType] = useState<TransactionType>(editTransaction?.type ?? 'expense');
  const [rawAmount, setRawAmount] = useState(editTransaction ? String(editTransaction.amount) : '');
  const [date, setDate] = useState(
    editTransaction ? new Date(editTransaction.date + 'T12:00:00') : new Date(),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState(
    editTransaction?.category ?? EXPENSE_CATEGORIES[0].label,
  );
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [description, setDescription] = useState(editTransaction?.description ?? '');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (editTransaction) {
      setType(editTransaction.type);
      setRawAmount(String(editTransaction.amount));
      setDate(new Date(editTransaction.date + 'T12:00:00'));
      setCategory(editTransaction.category);
      setDescription(editTransaction.description ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editTransaction?.uuid]);

  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
  const selectedCat = categories.find((c) => c.label === category);
  const isIncome = type === 'income';
  const accentColor = isIncome ? colors.income : colors.expense;

  function handleTypeChange(newType: TransactionType) {
    haptics.medium();
    setType(newType);
    const cats = newType === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    if (!cats.find((c) => c.label === category)) setCategory(cats[0].label);
  }

  async function handleSubmit() {
    const amount = parseInt(rawAmount, 10);
    if (!rawAmount || isNaN(amount) || amount <= 0) {
      showToast('error', 'Error', 'Ingresa un monto valido mayor a 0.');
      return;
    }

    setLoading(true);
    const formData = {
      type,
      amount,
      date: formatDate(date),
      category,
      description: description.trim() || null,
    };

    let success: boolean;
    if (isEditing) {
      success = await update(editTransaction!.uuid, formData);
    } else {
      success = await create(formData);
    }

    setLoading(false);
    if (success) {
      if (isEditing) {
        navigation.goBack();
      } else {
        setRawAmount('');
        setDescription('');
        setDate(new Date());
      }
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        {/* Type toggle */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              isIncome && { backgroundColor: colors.income, borderColor: colors.income },
            ]}
            onPress={() => handleTypeChange('income')}
          >
            <Text
              variant="bodyMedium"
              style={{ fontWeight: '600', color: isIncome ? '#fff' : colors.textSecondary }}
            >
              Ingreso
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              !isIncome && { backgroundColor: colors.expense, borderColor: colors.expense },
            ]}
            onPress={() => handleTypeChange('expense')}
          >
            <Text
              variant="bodyMedium"
              style={{ fontWeight: '600', color: !isIncome ? '#fff' : colors.textSecondary }}
            >
              Gasto
            </Text>
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <Text variant="caption" color="textSecondary" style={styles.label}>
          Monto (CLP)
        </Text>
        <View style={styles.amountRow}>
          <Text style={[styles.currencySymbol, { color: accentColor }]}>$</Text>
          <Input
            placeholder="0"
            keyboardType="number-pad"
            value={rawAmount ? formatCLP(rawAmount) : ''}
            onChangeText={(t) => setRawAmount(t.replace(/\D/g, ''))}
            style={[
              styles.amountInput,
              {
                borderColor: accentColor,
                borderBottomWidth: 2,
                borderWidth: 0,
                borderRadius: 0,
                backgroundColor: 'transparent',
              },
            ]}
          />
        </View>

        {/* Date */}
        <Text variant="caption" color="textSecondary" style={styles.label}>
          Fecha
        </Text>
        <TouchableOpacity style={styles.fieldButton} onPress={() => setShowDatePicker(true)}>
          <Text variant="bodyLarge">{formatDate(date)}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant={isDark ? 'dark' : 'light'}
            onChange={(_: DateTimePickerEvent, selected?: Date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selected) setDate(selected);
            }}
            maximumDate={new Date()}
          />
        )}

        {/* Category */}
        <Text variant="caption" color="textSecondary" style={styles.label}>
          Categoria
        </Text>
        <TouchableOpacity style={styles.fieldButton} onPress={() => setShowCategoryModal(true)}>
          <Text variant="bodyLarge">
            {selectedCat ? `${selectedCat.emoji} ${selectedCat.label}` : category}
          </Text>
          <Text style={{ fontSize: 22, color: colors.textMuted }}>›</Text>
        </TouchableOpacity>

        {/* Description */}
        <Input
          label="Descripcion (opcional)"
          placeholder="Agrega una nota..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
          style={{ minHeight: 80 }}
          onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
        />

        <Button
          label={loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Guardar'}
          onPress={handleSubmit}
          loading={loading}
          size="lg"
          variant={isIncome ? 'primary' : 'danger'}
        />
      </ScrollView>

      <CategoryModal
        visible={showCategoryModal}
        categories={categories}
        selected={category}
        accentColor={accentColor}
        onSelect={setCategory}
        onClose={() => setShowCategoryModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

const useStyles = createStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.xxl, paddingBottom: 40 },
  toggleRow: {
    flexDirection: 'row' as const,
    marginBottom: theme.spacing.xxl,
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
  label: { textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
  amountRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.xl,
  },
  currencySymbol: { fontSize: 28, fontWeight: '700' as const, marginRight: theme.spacing.sm },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700' as const },
  fieldButton: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radii.sm,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: theme.spacing.xl,
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
  },
}));
