import React, { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import { StatusBar } from "expo-status-bar";
import { API_BASE_URL } from "./config";

type TransactionType = "income" | "expense";

const INCOME_CATEGORIES = [
  "Salario",
  "Freelance",
  "Inversiones",
  "Regalo",
  "Reembolso",
  "Otro",
];

const EXPENSE_CATEGORIES = [
  "Comida",
  "Transporte",
  "Cuentas",
  "Salud",
  "Entretenimiento",
  "Ropa",
  "Educación",
  "Suscripciones",
  "Otro",
];

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatCLP(value: string): string {
  const num = parseInt(value.replace(/\D/g, ""), 10);
  if (isNaN(num)) return "";
  return num.toLocaleString("es-CL");
}

export default function App() {
  const [type, setType] = useState<TransactionType>("expense");
  const [rawAmount, setRawAmount] = useState("");
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [category, setCategory] = useState(EXPENSE_CATEGORIES[0]);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);

  const categories =
    type === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;

  function handleTypeChange(newType: TransactionType) {
    setType(newType);
    const cats = newType === "income" ? INCOME_CATEGORIES : EXPENSE_CATEGORIES;
    setCategory(cats[0]);
  }

  function handleAmountChange(text: string) {
    // Solo dígitos
    const digits = text.replace(/\D/g, "");
    setRawAmount(digits);
  }

  function handleDateChange(_: DateTimePickerEvent, selected?: Date) {
    setShowDatePicker(Platform.OS === "ios");
    if (selected) setDate(selected);
  }

  async function handleSubmit() {
    const amount = parseInt(rawAmount, 10);
    if (!rawAmount || isNaN(amount) || amount <= 0) {
      Alert.alert("Error", "Ingresa un monto válido mayor a 0.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/transactions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          amount,
          date: formatDate(date),
          category,
          description: description.trim() || null,
        }),
      });

      if (!response.ok) {
        const err = await response.json();
        throw new Error(JSON.stringify(err));
      }

      Alert.alert(
        "Guardado",
        `${type === "income" ? "Ingreso" : "Gasto"} registrado correctamente.`,
        [
          {
            text: "OK",
            onPress: () => {
              setRawAmount("");
              setDescription("");
              setDate(new Date());
            },
          },
        ]
      );
    } catch (e: any) {
      Alert.alert("Error", `No se pudo guardar la transacción.\n${e.message}`);
    } finally {
      setLoading(false);
    }
  }

  const isIncome = type === "income";
  const accentColor = isIncome ? "#22c55e" : "#ef4444";

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Nueva transacción</Text>

        {/* Toggle ingreso / gasto */}
        <View style={styles.toggleRow}>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              isIncome && { backgroundColor: "#22c55e", borderColor: "#22c55e" },
            ]}
            onPress={() => handleTypeChange("income")}
          >
            <Text style={[styles.toggleText, isIncome && styles.toggleTextActive]}>
              Ingreso
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.toggleBtn,
              !isIncome && { backgroundColor: "#ef4444", borderColor: "#ef4444" },
            ]}
            onPress={() => handleTypeChange("expense")}
          >
            <Text style={[styles.toggleText, !isIncome && styles.toggleTextActive]}>
              Gasto
            </Text>
          </TouchableOpacity>
        </View>

        {/* Monto */}
        <Text style={styles.label}>Monto (CLP)</Text>
        <View style={styles.amountRow}>
          <Text style={[styles.currencySymbol, { color: accentColor }]}>$</Text>
          <TextInput
            style={[styles.amountInput, { borderColor: accentColor }]}
            placeholder="0"
            placeholderTextColor="#9ca3af"
            keyboardType="number-pad"
            value={rawAmount ? formatCLP(rawAmount) : ""}
            onChangeText={handleAmountChange}
          />
        </View>

        {/* Fecha */}
        <Text style={styles.label}>Fecha</Text>
        <TouchableOpacity
          style={styles.fieldButton}
          onPress={() => setShowDatePicker(true)}
        >
          <Text style={styles.fieldButtonText}>{formatDate(date)}</Text>
        </TouchableOpacity>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={handleDateChange}
            maximumDate={new Date()}
          />
        )}

        {/* Categoría */}
        <Text style={styles.label}>Categoría</Text>
        <TouchableOpacity
          style={styles.fieldButton}
          onPress={() => setShowCategoryModal(true)}
        >
          <Text style={styles.fieldButtonText}>{category}</Text>
          <Text style={styles.chevron}>›</Text>
        </TouchableOpacity>

        {/* Descripción */}
        <Text style={styles.label}>Descripción (opcional)</Text>
        <TextInput
          style={styles.descriptionInput}
          placeholder="Agrega una nota..."
          placeholderTextColor="#9ca3af"
          value={description}
          onChangeText={setDescription}
          multiline
          numberOfLines={3}
          textAlignVertical="top"
        />

        {/* Botón guardar */}
        <TouchableOpacity
          style={[
            styles.submitBtn,
            { backgroundColor: accentColor },
            loading && styles.submitBtnDisabled,
          ]}
          onPress={handleSubmit}
          disabled={loading}
        >
          <Text style={styles.submitText}>
            {loading ? "Guardando..." : "Guardar"}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Modal categoría */}
      <Modal
        visible={showCategoryModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowCategoryModal(false)}
        />
        <View style={styles.modalSheet}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Categoría</Text>
            <TouchableOpacity onPress={() => setShowCategoryModal(false)}>
              <Text style={styles.modalClose}>Cerrar</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={categories}
            keyExtractor={(item) => item}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  item === category && { backgroundColor: "#f0fdf4" },
                ]}
                onPress={() => {
                  setCategory(item);
                  setShowCategoryModal(false);
                }}
              >
                <Text
                  style={[
                    styles.modalOptionText,
                    item === category && { color: accentColor, fontWeight: "700" },
                  ]}
                >
                  {item}
                </Text>
                {item === category && (
                  <Text style={[styles.checkmark, { color: accentColor }]}>✓</Text>
                )}
              </TouchableOpacity>
            )}
          />
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scroll: {
    padding: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 28,
  },
  toggleRow: {
    flexDirection: "row",
    marginBottom: 24,
    gap: 12,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#d1d5db",
    alignItems: "center",
    backgroundColor: "#ffffff",
  },
  toggleText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6b7280",
  },
  toggleTextActive: {
    color: "#ffffff",
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  amountRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  currencySymbol: {
    fontSize: 28,
    fontWeight: "700",
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
    borderBottomWidth: 2,
    paddingBottom: 4,
  },
  fieldButton: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 14,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  fieldButtonText: {
    fontSize: 16,
    color: "#374151",
    fontWeight: "500",
  },
  chevron: {
    fontSize: 22,
    color: "#9ca3af",
    lineHeight: 24,
  },
  descriptionInput: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    color: "#374151",
    marginBottom: 32,
    minHeight: 80,
  },
  submitBtn: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
  },
  submitBtnDisabled: {
    opacity: 0.6,
  },
  submitText: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "700",
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalSheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "55%",
    paddingBottom: 34,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  modalClose: {
    fontSize: 15,
    color: "#6b7280",
  },
  modalOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  modalOptionText: {
    fontSize: 16,
    color: "#374151",
  },
  checkmark: {
    fontSize: 18,
  },
});
