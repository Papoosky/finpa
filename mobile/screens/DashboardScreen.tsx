import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { API_BASE_URL } from "../config";
import { CATEGORY_EMOJI_MAP } from "../constants/categories";

type Transaction = {
  uuid: string;
  type: "income" | "expense";
  amount: number;
  date: string;
  category: string;
  description: string | null;
};

type CategoryTotal = {
  category: string;
  total: number;
  percent: number;
  color: string;
};

const CATEGORY_COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4",
  "#3b82f6", "#8b5cf6", "#ec4899", "#6b7280",
];

type Props = {
  token: string;
  onUnauthorized: () => void;
};

export default function DashboardScreen({ token, onUnauthorized }: Props) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [month, setMonth] = useState(new Date());

  const year = month.getFullYear();
  const monthNum = month.getMonth();
  const dateFrom = `${year}-${String(monthNum + 1).padStart(2, "0")}-01`;
  const lastDay = new Date(year, monthNum + 1, 0).getDate();
  const dateTo = `${year}-${String(monthNum + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  const monthLabel = month.toLocaleDateString("es-CL", { month: "long", year: "numeric" });

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
      setTransactions(data);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }

  function changeMonth(delta: number) {
    setMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + delta, 1));
  }

  const expenses = transactions.filter((t) => t.type === "expense");
  const incomes = transactions.filter((t) => t.type === "income");
  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0);
  const totalIncome = incomes.reduce((s, t) => s + t.amount, 0);
  const balance = totalIncome - totalExpense;

  const categoryTotals: CategoryTotal[] = [];
  const catMap = new Map<string, number>();
  for (const t of expenses) {
    catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
  }
  let i = 0;
  for (const [category, total] of [...catMap.entries()].sort((a, b) => b[1] - a[1])) {
    categoryTotals.push({
      category,
      total,
      percent: totalExpense > 0 ? (total / totalExpense) * 100 : 0,
      color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
    });
    i++;
  }

  function formatAmount(n: number): string {
    return "$" + n.toLocaleString("es-CL");
  }

  if (loading) {
    return (
      <View style={[styles.container, { justifyContent: "center", alignItems: "center" }]}>
        <ActivityIndicator size="large" color="#3b82f6" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.scroll}>
      {/* Month selector */}
      <View style={styles.monthRow}>
        <TouchableOpacity onPress={() => changeMonth(-1)}>
          <Text style={styles.monthArrow}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.monthLabel}>{monthLabel}</Text>
        <TouchableOpacity onPress={() => changeMonth(1)}>
          <Text style={styles.monthArrow}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Summary cards */}
      <View style={styles.cardsRow}>
        <View style={[styles.card, { borderLeftColor: "#22c55e" }]}>
          <Text style={styles.cardLabel}>Ingresos</Text>
          <Text style={[styles.cardAmount, { color: "#22c55e" }]}>{formatAmount(totalIncome)}</Text>
        </View>
        <View style={[styles.card, { borderLeftColor: "#ef4444" }]}>
          <Text style={styles.cardLabel}>Gastos</Text>
          <Text style={[styles.cardAmount, { color: "#ef4444" }]}>{formatAmount(totalExpense)}</Text>
        </View>
      </View>

      <View style={[styles.balanceCard, { borderLeftColor: balance >= 0 ? "#22c55e" : "#ef4444" }]}>
        <Text style={styles.cardLabel}>Balance</Text>
        <Text style={[styles.balanceAmount, { color: balance >= 0 ? "#22c55e" : "#ef4444" }]}>
          {formatAmount(balance)}
        </Text>
      </View>

      {/* Expense breakdown */}
      {categoryTotals.length > 0 && (
        <>
          <Text style={styles.sectionTitle}>Gastos por categoria</Text>

          {/* Bar chart */}
          <View style={styles.barChart}>
            {categoryTotals.map((cat) => (
              <View key={cat.category} style={styles.barRow}>
                <Text style={styles.barLabel}>
                  {CATEGORY_EMOJI_MAP[cat.category] || "📌"} {cat.category}
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${cat.percent}%`, backgroundColor: cat.color },
                    ]}
                  />
                </View>
                <Text style={styles.barAmount}>{formatAmount(cat.total)}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      {transactions.length === 0 && (
        <Text style={styles.emptyText}>No hay transacciones en este mes.</Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },
  scroll: {
    padding: 20,
    paddingBottom: 40,
  },
  monthRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  monthArrow: {
    fontSize: 28,
    color: "#6b7280",
    paddingHorizontal: 12,
  },
  monthLabel: {
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
    textTransform: "capitalize",
  },
  cardsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 12,
  },
  card: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
  },
  cardLabel: {
    fontSize: 13,
    color: "#6b7280",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  cardAmount: {
    fontSize: 22,
    fontWeight: "700",
  },
  balanceCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    marginBottom: 28,
  },
  balanceAmount: {
    fontSize: 26,
    fontWeight: "800",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 16,
  },
  barChart: {
    gap: 12,
  },
  barRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  barLabel: {
    width: 120,
    fontSize: 14,
    color: "#374151",
  },
  barTrack: {
    flex: 1,
    height: 20,
    backgroundColor: "#f3f4f6",
    borderRadius: 10,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 10,
  },
  barAmount: {
    width: 90,
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    textAlign: "right",
  },
  emptyText: {
    textAlign: "center",
    color: "#9ca3af",
    fontSize: 16,
    marginTop: 40,
  },
});
