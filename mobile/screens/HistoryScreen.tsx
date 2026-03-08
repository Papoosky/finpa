import React, { useCallback, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { API_BASE_URL } from "../config";
import { CATEGORY_EMOJI_MAP } from "../constants/categories";
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";
import MonthYearPicker from "../components/MonthYearPicker";

type Transaction = {
  uuid: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  category: string;
  description: string | null;
};

type Section = {
  title: string;
  data: Transaction[];
};

type Props = {
  token: string;
  onUnauthorized: () => void;
};

function formatAmount(n: number): string {
  return "$" + n.toLocaleString("es-CL");
}

function formatSectionDate(dateStr: string): string {
  const date = new Date(dateStr + "T12:00:00");
  const formatted = date.toLocaleDateString("es-CL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

const SWIPE_THRESHOLD = 80;

function SwipeableRow({
  item,
  onEdit,
  onDelete,
}: {
  item: Transaction;
  onEdit: (t: Transaction) => void;
  onDelete: (t: Transaction) => void;
}) {
  const translateX = useRef(new Animated.Value(0)).current;
  const lastOffset = useRef(0);

  const panResponder = useRef(
    Animated.event([], { useNativeDriver: false })
  ).current;

  const onTouchStart = useRef({ x: 0, y: 0, time: 0 }).current;
  const isTracking = useRef(false);
  const isHorizontal = useRef<boolean | null>(null);

  function resetPosition() {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
    lastOffset.current = 0;
  }

  return (
    <View style={swipeStyles.container}>
      {/* Left action (edit) */}
      <View style={[swipeStyles.action, swipeStyles.editAction]}>
        <Text style={swipeStyles.actionText}>Editar</Text>
      </View>
      {/* Right action (delete) */}
      <View style={[swipeStyles.action, swipeStyles.deleteAction]}>
        <Text style={swipeStyles.actionText}>Eliminar</Text>
      </View>

      <Animated.View
        style={[swipeStyles.row, { transform: [{ translateX }] }]}
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

          const newValue = lastOffset.current + dx;
          translateX.setValue(newValue);
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
            onEdit(item);
            resetPosition();
          } else if (finalValue < -SWIPE_THRESHOLD) {
            onDelete(item);
            resetPosition();
          } else {
            resetPosition();
          }
        }}
      >
        <View style={swipeStyles.content}>
          <View style={swipeStyles.left}>
            <Text style={swipeStyles.emoji}>
              {CATEGORY_EMOJI_MAP[item.category] || "📌"}
            </Text>
            <View>
              <Text style={swipeStyles.category}>{item.category}</Text>
              {item.description ? (
                <Text style={swipeStyles.description} numberOfLines={1}>
                  {item.description}
                </Text>
              ) : null}
            </View>
          </View>
          <Text
            style={[
              swipeStyles.amount,
              { color: item.type === "income" ? "#22c55e" : "#ef4444" },
            ]}
          >
            {item.type === "income" ? "+" : "-"}{formatAmount(item.amount)}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

export default function HistoryScreen({ token, onUnauthorized }: Props) {
  const navigation = useNavigation<any>();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [month, setMonth] = useState(new Date());
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);
  const [deleting, setDeleting] = useState(false);

  const selectedYear = month.getFullYear();
  const selectedMonth = month.getMonth();
  const dateFrom = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
  const dateTo = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

  useFocusEffect(
    useCallback(() => {
      fetchTransactions();
    }, [dateFrom, dateTo])
  );

  async function fetchTransactions() {
    setLoading(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/transactions/?date_from=${dateFrom}&date_to=${dateTo}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      const data = await res.json();
      setTransactions(data.items ?? data);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  const handleEdit = useCallback((transaction: Transaction) => {
    navigation.navigate("Transaction", { transaction });
  }, [navigation]);

  const handleDeleteRequest = useCallback((transaction: Transaction) => {
    setDeleteTarget(transaction);
  }, []);

  async function handleDeleteConfirm() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(
        `${API_BASE_URL}/transactions/${deleteTarget.uuid}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.status === 401) {
        onUnauthorized();
        return;
      }
      if (!res.ok) {
        throw new Error("Error al eliminar");
      }
      setDeleteTarget(null);
      fetchTransactions();
    } catch (e: any) {
      Alert.alert("Error", e.message);
    } finally {
      setDeleting(false);
    }
  }

  // Group transactions by date
  const sections = useMemo(() => {
    const result: Section[] = [];
    const dateMap = new Map<string, Transaction[]>();
    for (const t of transactions) {
      const existing = dateMap.get(t.date);
      if (existing) {
        existing.push(t);
      } else {
        dateMap.set(t.date, [t]);
      }
    }
    for (const [date, data] of dateMap) {
      result.push({ title: formatSectionDate(date), data });
    }
    return result;
  }, [transactions]);

  if (loading) {
    return (
      <View style={[styles.container, styles.centered]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Month selector */}
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
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No hay transacciones en este mes</Text>
        </View>
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.uuid}
          renderSectionHeader={({ section }) => (
            <Text style={styles.sectionHeader}>{section.title}</Text>
          )}
          renderItem={({ item }) => (
            <SwipeableRow
              item={item}
              onEdit={handleEdit}
              onDelete={handleDeleteRequest}
            />
          )}
          contentContainerStyle={styles.list}
          stickySectionHeadersEnabled={false}
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

const swipeStyles = StyleSheet.create({
  container: {
    marginBottom: 2,
    overflow: "hidden",
    borderRadius: 10,
  },
  action: {
    position: "absolute",
    top: 0,
    bottom: 0,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  editAction: {
    left: 0,
    backgroundColor: "#3b82f6",
    borderRadius: 10,
  },
  deleteAction: {
    right: 0,
    backgroundColor: "#ef4444",
    borderRadius: 10,
  },
  actionText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  row: {
    backgroundColor: "#ffffff",
    borderRadius: 10,
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  emoji: {
    fontSize: 24,
  },
  category: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  description: {
    fontSize: 13,
    color: "#9ca3af",
    marginTop: 2,
    maxWidth: 180,
  },
  amount: {
    fontSize: 16,
    fontWeight: "700",
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pickerRow: {
    alignItems: "center",
    paddingVertical: 16,
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginTop: 16,
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  emptyText: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 16,
  },
});
