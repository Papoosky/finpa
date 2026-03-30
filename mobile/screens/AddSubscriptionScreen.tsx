import React, { useEffect, useRef, useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity, View } from 'react-native';
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeProvider';
import { createStyles } from '../theme/createStyles';
import { Text, Button, Input } from '../components/ui';
import { ServiceModal } from '../components/ServiceModal';
import { ServiceBadge } from '../components/ServiceBadge';
import { useSubscriptions } from '../hooks/useSubscriptions';
import { useHaptics } from '../hooks/useHaptics';
import { getServiceByKey } from '../constants/services';
import {
  SubscriptionFormData,
  SubscriptionInterval,
  SubscriptionCurrency,
  DrawerParamList,
} from '../types';

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

export default function AddSubscriptionScreen() {
  const { colors, isDark } = useTheme();
  const styles = useStyles();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<DrawerParamList, 'AddSubscription'>>();
  const haptics = useHaptics();
  const { create, update } = useSubscriptions();
  const scrollRef = useRef<ScrollView>(null);

  const editSub = route.params?.subscription;
  const isEditing = !!editSub;

  const [serviceKey, setServiceKey] = useState<string | null>(editSub?.service_key ?? null);
  const [name, setName] = useState(editSub?.name ?? '');
  const [rawAmount, setRawAmount] = useState(editSub ? String(editSub.amount) : '');
  const [currency, setCurrency] = useState<SubscriptionCurrency>(editSub?.currency ?? 'CLP');
  const [interval, setInterval] = useState<SubscriptionInterval>(editSub?.interval ?? 'monthly');
  const [billingDay, setBillingDay] = useState(
    editSub ? String(editSub.billing_day) : String(new Date().getDate()),
  );
  const [startDate, setStartDate] = useState(
    editSub ? new Date(editSub.start_date + 'T12:00:00') : new Date(),
  );
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [description, setDescription] = useState(editSub?.description ?? '');
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editSub) {
      setServiceKey(editSub.service_key);
      setName(editSub.name);
      setRawAmount(String(editSub.amount));
      setCurrency(editSub.currency);
      setInterval(editSub.interval);
      setBillingDay(String(editSub.billing_day));
      setStartDate(new Date(editSub.start_date + 'T12:00:00'));
      setDescription(editSub.description ?? '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editSub?.uuid]);

  const selectedService = getServiceByKey(serviceKey);

  async function handleSubmit() {
    const trimmedName = name.trim();
    if (!trimmedName) {
      haptics.error?.();
      return;
    }
    const amount = parseFloat(rawAmount.replace(/\D/g, ''));
    if (!rawAmount || isNaN(amount) || amount <= 0) {
      haptics.error?.();
      return;
    }
    const day = parseInt(billingDay, 10);
    if (isNaN(day) || day < 1 || day > 31) {
      haptics.error?.();
      return;
    }

    setLoading(true);
    const formData: SubscriptionFormData = {
      name: trimmedName,
      service_key: serviceKey,
      amount,
      currency,
      interval,
      billing_day: day,
      start_date: formatDate(startDate),
      description: description.trim() || null,
    };

    let success: boolean;
    if (isEditing) {
      success = await update(editSub!.uuid, formData);
    } else {
      success = await create(formData);
    }

    setLoading(false);
    if (success) {
      navigation.goBack();
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
        {/* Service picker */}
        <Text variant="caption" color="textSecondary" style={styles.label}>
          SERVICIO
        </Text>
        <TouchableOpacity style={styles.fieldButton} onPress={() => setShowServiceModal(true)}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            {serviceKey ? (
              <ServiceBadge serviceKey={serviceKey} size={28} />
            ) : (
              <View
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 14,
                  backgroundColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ fontSize: 14, color: colors.textMuted }}>?</Text>
              </View>
            )}
            <Text variant="bodyLarge" color={selectedService ? 'textPrimary' : 'textMuted'}>
              {selectedService?.name ?? 'Seleccionar servicio'}
            </Text>
          </View>
          <Text style={{ fontSize: 22, color: colors.textMuted }}>›</Text>
        </TouchableOpacity>

        {/* Name (editable, pre-filled from service) */}
        <Input label="Nombre" placeholder="ej. Claude Pro" value={name} onChangeText={setName} />

        {/* Interval toggle */}
        <Text variant="caption" color="textSecondary" style={styles.label}>
          FRECUENCIA
        </Text>
        <View style={styles.toggleRow}>
          {(['monthly', 'yearly'] as SubscriptionInterval[]).map((opt) => (
            <TouchableOpacity
              key={opt}
              style={[
                styles.toggleBtn,
                interval === opt && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
              onPress={() => {
                haptics.medium();
                setInterval(opt);
              }}
            >
              <Text
                variant="bodyMedium"
                style={{
                  fontWeight: '600',
                  color: interval === opt ? '#fff' : colors.textSecondary,
                }}
              >
                {opt === 'monthly' ? 'Mensual' : 'Anual'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Amount + currency */}
        <Text variant="caption" color="textSecondary" style={styles.label}>
          MONTO
        </Text>
        <View style={styles.toggleRow}>
          {(['CLP', 'USD'] as SubscriptionCurrency[]).map((cur) => (
            <TouchableOpacity
              key={cur}
              style={[
                styles.toggleBtn,
                currency === cur && { backgroundColor: colors.accent, borderColor: colors.accent },
              ]}
              onPress={() => {
                haptics.medium();
                setCurrency(cur);
                setRawAmount('');
              }}
            >
              <Text
                variant="bodyMedium"
                style={{
                  fontWeight: '600',
                  color: currency === cur ? '#fff' : colors.textSecondary,
                }}
              >
                {cur}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.amountRow}>
          <Text style={[styles.currencySymbol, { color: colors.expense }]}>
            {currency === 'CLP' ? '$' : 'USD'}
          </Text>
          <View style={{ flex: 1 }}>
            <Input
              placeholder="0"
              keyboardType="decimal-pad"
              value={currency === 'CLP' ? (rawAmount ? formatCLP(rawAmount) : '') : rawAmount}
              onChangeText={(t) => {
                if (currency === 'CLP') {
                  setRawAmount(t.replace(/\D/g, ''));
                } else {
                  setRawAmount(t.replace(/[^0-9.]/g, ''));
                }
              }}
              style={[
                styles.amountInput,
                {
                  borderColor: colors.expense,
                  borderBottomWidth: 2,
                  borderWidth: 0,
                  borderRadius: 0,
                  backgroundColor: 'transparent',
                  paddingVertical: 12,
                },
              ]}
            />
          </View>
        </View>

        {/* Billing day */}
        <Input
          label="Día de cobro (1–31)"
          placeholder="29"
          keyboardType="number-pad"
          value={billingDay}
          onChangeText={(t) => setBillingDay(t.replace(/\D/g, ''))}
        />

        {/* Start date */}
        <Text variant="caption" color="textSecondary" style={styles.label}>
          DESDE
        </Text>
        <TouchableOpacity style={styles.fieldButton} onPress={() => setShowDatePicker(true)}>
          <Text variant="bodyLarge">{formatDate(startDate)}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={startDate}
            mode="date"
            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
            themeVariant={isDark ? 'dark' : 'light'}
            onChange={(_: DateTimePickerEvent, selected?: Date) => {
              setShowDatePicker(Platform.OS === 'ios');
              if (selected) setStartDate(selected);
            }}
          />
        )}

        {/* Description */}
        <Input
          label="Descripcion (opcional)"
          placeholder="Agrega una nota..."
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={2}
          textAlignVertical="top"
          style={{ minHeight: 60 }}
          onFocus={() => setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 300)}
        />

        <Button
          label={loading ? 'Guardando...' : isEditing ? 'Guardar cambios' : 'Agregar suscripcion'}
          onPress={handleSubmit}
          loading={loading}
          size="lg"
          variant="danger"
        />
      </ScrollView>

      <ServiceModal
        visible={showServiceModal}
        selected={serviceKey}
        onSelect={(s) => {
          setServiceKey(s.key);
          if (!name || name === getServiceByKey(serviceKey)?.name) {
            setName(s.name);
          }
        }}
        onClose={() => setShowServiceModal(false)}
      />
    </KeyboardAvoidingView>
  );
}

const useStyles = createStyles((theme) => ({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scroll: { padding: theme.spacing.xxl, paddingBottom: 40 },
  label: { textTransform: 'uppercase' as const, letterSpacing: 0.5, marginBottom: 6 },
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
  toggleRow: {
    flexDirection: 'row' as const,
    marginBottom: theme.spacing.xl,
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
  amountRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    marginBottom: theme.spacing.xl,
  },
  currencySymbol: {
    fontSize: 24,
    fontWeight: '700' as const,
    marginRight: theme.spacing.sm,
    marginBottom: theme.spacing.xl,
  },
  amountInput: { flex: 1, fontSize: 28, fontWeight: '700' as const, minHeight: 48 },
}));
