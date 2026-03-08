import React, { useMemo, useState } from "react";
import {
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

const MONTH_NAMES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const MONTH_DATA = MONTH_NAMES.map((name, i) => ({ name, index: i }));

type Props = {
  mode: "month" | "year";
  selectedMonth: number;
  selectedYear: number;
  onChangeMonth: (month: number) => void;
  onChangeYear: (year: number) => void;
};

export default function MonthYearPicker({
  mode,
  selectedMonth,
  selectedYear,
  onChangeMonth,
  onChangeYear,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [modalYear, setModalYear] = useState(selectedYear);

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const minYear = currentYear - 3;

  const years = useMemo(() => {
    const result: number[] = [];
    for (let y = currentYear; y >= minYear; y--) {
      result.push(y);
    }
    return result;
  }, [currentYear, minYear]);

  const label =
    mode === "month"
      ? `${MONTH_NAMES[selectedMonth]} ${selectedYear}`
      : `${selectedYear}`;

  function isMonthDisabled(month: number, year: number): boolean {
    if (year > currentYear) return true;
    if (year === currentYear && month > currentMonth) return true;
    if (year < minYear) return true;
    return false;
  }

  function handleOpen() {
    setModalYear(selectedYear);
    setVisible(true);
  }

  function handleSelectMonth(month: number) {
    onChangeMonth(month);
    onChangeYear(modalYear);
    setVisible(false);
  }

  function handleSelectYear(year: number) {
    onChangeYear(year);
    if (mode === "month" && year === currentYear && selectedMonth > currentMonth) {
      onChangeMonth(currentMonth);
    }
    setVisible(false);
  }

  function changeModalYear(delta: number) {
    const newYear = modalYear + delta;
    if (newYear >= minYear && newYear <= currentYear) {
      setModalYear(newYear);
    }
  }

  return (
    <>
      <TouchableOpacity style={styles.button} onPress={handleOpen}>
        <Text style={styles.buttonText}>{label}</Text>
        <Text style={styles.chevron}>▾</Text>
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="slide"
        onRequestClose={() => setVisible(false)}
      >
        <TouchableOpacity
          style={styles.overlay}
          activeOpacity={1}
          onPress={() => setVisible(false)}
        />
        <View style={styles.sheet}>
          <View style={styles.header}>
            <Text style={styles.title}>
              {mode === "month" ? "Seleccionar mes" : "Seleccionar año"}
            </Text>
            <TouchableOpacity onPress={() => setVisible(false)}>
              <Text style={styles.close}>Cerrar</Text>
            </TouchableOpacity>
          </View>

          {mode === "month" && (
            <>
              <View style={styles.yearRow}>
                <TouchableOpacity onPress={() => changeModalYear(-1)}>
                  <Text style={[styles.yearArrow, modalYear <= minYear && styles.disabled]}>‹</Text>
                </TouchableOpacity>
                <Text style={styles.yearLabel}>{modalYear}</Text>
                <TouchableOpacity onPress={() => changeModalYear(1)}>
                  <Text style={[styles.yearArrow, modalYear >= currentYear && styles.disabled]}>›</Text>
                </TouchableOpacity>
              </View>

              <FlatList
                data={MONTH_DATA}
                keyExtractor={(item) => String(item.index)}
                renderItem={({ item }) => {
                  const disabled = isMonthDisabled(item.index, modalYear);
                  const selected = item.index === selectedMonth && modalYear === selectedYear;
                  return (
                    <TouchableOpacity
                      style={[styles.option, selected && styles.optionSelected]}
                      onPress={() => handleSelectMonth(item.index)}
                      disabled={disabled}
                    >
                      <Text style={[
                        styles.optionText,
                        selected && styles.optionTextSelected,
                        disabled && styles.optionTextDisabled,
                      ]}>
                        {item.name}
                      </Text>
                      {selected && <Text style={styles.checkmark}>✓</Text>}
                    </TouchableOpacity>
                  );
                }}
              />
            </>
          )}

          {mode === "year" && (
            <FlatList
              data={years}
              keyExtractor={(item) => String(item)}
              renderItem={({ item }) => {
                const selected = item === selectedYear;
                return (
                  <TouchableOpacity
                    style={[styles.option, selected && styles.optionSelected]}
                    onPress={() => handleSelectYear(item)}
                  >
                    <Text style={[
                      styles.optionText,
                      selected && styles.optionTextSelected,
                    ]}>
                      {item}
                    </Text>
                    {selected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#ffffff",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
    alignSelf: "center",
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
    textTransform: "capitalize",
  },
  chevron: {
    fontSize: 14,
    color: "#9ca3af",
  },
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  sheet: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: "55%",
    paddingBottom: 34,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#111827",
  },
  close: {
    fontSize: 15,
    color: "#6b7280",
  },
  yearRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 12,
    gap: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  yearArrow: {
    fontSize: 24,
    color: "#6b7280",
    paddingHorizontal: 12,
  },
  yearLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  disabled: {
    opacity: 0.3,
  },
  option: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  optionSelected: {
    backgroundColor: "#eff6ff",
  },
  optionText: {
    fontSize: 16,
    color: "#374151",
  },
  optionTextSelected: {
    color: "#3b82f6",
    fontWeight: "700",
  },
  optionTextDisabled: {
    color: "#d1d5db",
  },
  checkmark: {
    fontSize: 18,
    color: "#3b82f6",
  },
});
