import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import {
  VictoryChart,
  VictoryLine,
  VictoryAxis,
  VictoryPie,
  VictoryTheme,
} from "victory-native";
import { API_BASE_URL } from "../config";
import { CATEGORY_EMOJI_MAP } from "../constants/categories";
import MonthYearPicker from "../components/MonthYearPicker";

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

const MONTH_LABELS = [
  "Ene", "Feb", "Mar", "Abr", "May", "Jun",
  "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
];

type Props = {
  token: string;
  onUnauthorized: () => void;
};

export default function DashboardScreen({ token, onUnauthorized }: Props) {
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [viewMode, setViewMode] = useState<"month" | "year">("month");
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  // Compute date range based on viewMode
  const { dateFrom, dateTo } = useMemo(() => {
    if (viewMode === "month") {
      const from = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-01`;
      const lastDay = new Date(selectedYear, selectedMonth + 1, 0).getDate();
      const to = `${selectedYear}-${String(selectedMonth + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
      return { dateFrom: from, dateTo: to };
    } else {
      return {
        dateFrom: `${selectedYear}-01-01`,
        dateTo: `${selectedYear}-12-31`,
      };
    }
  }, [viewMode, selectedMonth, selectedYear]);

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

  // Basic totals
  const { expenses, incomes, totalExpense, totalIncome, balance } = useMemo(() => {
    const exp = transactions.filter((t) => t.type === "expense");
    const inc = transactions.filter((t) => t.type === "income");
    const totExp = exp.reduce((s, t) => s + t.amount, 0);
    const totInc = inc.reduce((s, t) => s + t.amount, 0);
    return {
      expenses: exp,
      incomes: inc,
      totalExpense: totExp,
      totalIncome: totInc,
      balance: totInc - totExp,
    };
  }, [transactions]);

  // Category breakdown for monthly bar chart
  const categoryTotals: CategoryTotal[] = useMemo(() => {
    const catMap = new Map<string, number>();
    for (const t of expenses) {
      catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
    }
    const result: CategoryTotal[] = [];
    let i = 0;
    for (const [category, total] of [...catMap.entries()].sort((a, b) => b[1] - a[1])) {
      result.push({
        category,
        total,
        percent: totalExpense > 0 ? (total / totalExpense) * 100 : 0,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      });
      i++;
    }
    return result;
  }, [expenses, totalExpense]);

  // Annual view data
  const lineData = useMemo(() => {
    if (viewMode !== "year") return [];
    const monthlyIncome: number[] = new Array(12).fill(0);
    const monthlyExpense: number[] = new Array(12).fill(0);
    for (const t of transactions) {
      const m = new Date(t.date).getMonth();
      if (t.type === "income") {
        monthlyIncome[m] += t.amount;
      } else {
        monthlyExpense[m] += t.amount;
      }
    }
    return Array.from({ length: 12 }, (_, i) => ({
      month: i,
      income: monthlyIncome[i],
      expense: monthlyExpense[i],
    }));
  }, [viewMode, transactions]);

  const pieData = useMemo(() => {
    if (viewMode !== "year") return { slices: [] as { x: string; y: number }[], colors: [] as string[], legend: [] as { emoji: string; name: string; total: number; percent: number; color: string }[] };
    const catMap = new Map<string, number>();
    for (const t of expenses) {
      catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
    }
    const sorted = [...catMap.entries()].sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    const rest = sorted.slice(5);
    const otrosTotal = rest.reduce((s, [, v]) => s + v, 0);

    const entries: { name: string; total: number }[] = top5.map(([name, total]) => ({ name, total }));
    if (otrosTotal > 0) {
      entries.push({ name: "Otros", total: otrosTotal });
    }

    const slices = entries.map((e) => ({ x: e.name, y: e.total }));
    const colors = entries.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]);
    const legend = entries.map((e, i) => ({
      emoji: CATEGORY_EMOJI_MAP[e.name] || "📌",
      name: e.name,
      total: e.total,
      percent: totalExpense > 0 ? (e.total / totalExpense) * 100 : 0,
      color: colors[i],
    }));

    return { slices, colors, legend };
  }, [viewMode, expenses, totalExpense]);

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
      {/* View mode toggle */}
      <View style={styles.toggleRow}>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            viewMode === "month" && { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
          ]}
          onPress={() => setViewMode("month")}
        >
          <Text style={[styles.toggleText, viewMode === "month" && styles.toggleTextActive]}>
            Mes
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.toggleBtn,
            viewMode === "year" && { backgroundColor: "#3b82f6", borderColor: "#3b82f6" },
          ]}
          onPress={() => setViewMode("year")}
        >
          <Text style={[styles.toggleText, viewMode === "year" && styles.toggleTextActive]}>
            Año
          </Text>
        </TouchableOpacity>
      </View>

      {/* Month/Year picker */}
      <View style={styles.pickerRow}>
        <MonthYearPicker
          mode={viewMode === "month" ? "month" : "year"}
          selectedMonth={selectedMonth}
          selectedYear={selectedYear}
          onChangeMonth={setSelectedMonth}
          onChangeYear={setSelectedYear}
        />
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

      {/* Monthly view: bar chart */}
      {viewMode === "month" && (
        <>
          {categoryTotals.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Gastos por categoria</Text>
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
        </>
      )}

      {/* Annual view: line chart + pie chart */}
      {viewMode === "year" && (
        <>
          {transactions.length > 0 ? (
            <>
              {/* Line chart */}
              <Text style={styles.sectionTitle}>Ingresos vs Gastos mensual</Text>
              <View style={styles.chartContainer}>
                <VictoryChart
                  theme={VictoryTheme.material}
                  width={350}
                  height={250}
                >
                  <VictoryAxis
                    tickValues={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]}
                    tickFormat={MONTH_LABELS}
                    style={{
                      tickLabels: { fontSize: 10, angle: -45 },
                    }}
                  />
                  <VictoryAxis
                    dependentAxis
                    tickFormat={(t: number) => {
                      if (t >= 1000000) return `$${(t / 1000000).toFixed(1)}M`;
                      if (t >= 1000) return `$${(t / 1000).toFixed(0)}k`;
                      return `$${t}`;
                    }}
                    style={{
                      tickLabels: { fontSize: 10 },
                    }}
                  />
                  <VictoryLine
                    data={lineData}
                    x="month"
                    y="income"
                    style={{ data: { stroke: "#22c55e", strokeWidth: 2 } }}
                  />
                  <VictoryLine
                    data={lineData}
                    x="month"
                    y="expense"
                    style={{ data: { stroke: "#ef4444", strokeWidth: 2 } }}
                  />
                </VictoryChart>
              </View>

              {/* Line chart legend */}
              <View style={styles.lineLegend}>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#22c55e" }]} />
                  <Text style={styles.legendLabel}>Ingresos</Text>
                </View>
                <View style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: "#ef4444" }]} />
                  <Text style={styles.legendLabel}>Gastos</Text>
                </View>
              </View>

              {/* Pie chart */}
              {pieData.slices.length > 0 && (
                <>
                  <Text style={[styles.sectionTitle, { marginTop: 28 }]}>
                    Gastos por categoria
                  </Text>
                  <View style={styles.chartContainer}>
                    <VictoryPie
                      data={pieData.slices}
                      colorScale={pieData.colors}
                      labels={({ datum }: { datum: { x: string } }) => datum.x}
                      style={{
                        labels: { fontSize: 11, fill: "#374151" },
                      }}
                      width={300}
                      height={300}
                    />
                  </View>

                  {/* Pie legend */}
                  <View style={styles.pieLegend}>
                    {pieData.legend.map((item) => (
                      <View key={item.name} style={styles.pieLegendRow}>
                        <View style={[styles.legendDot, { backgroundColor: item.color }]} />
                        <Text style={styles.pieLegendText}>
                          {item.emoji} {item.name}
                        </Text>
                        <Text style={styles.pieLegendAmount}>{formatAmount(item.total)}</Text>
                        <Text style={styles.pieLegendPercent}>{item.percent.toFixed(1)}%</Text>
                      </View>
                    ))}
                  </View>
                </>
              )}
            </>
          ) : (
            <Text style={styles.emptyText}>No hay transacciones en este año.</Text>
          )}
        </>
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
  toggleRow: {
    flexDirection: "row",
    marginBottom: 16,
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
  pickerRow: {
    alignItems: "center",
    marginBottom: 24,
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
  chartContainer: {
    alignItems: "center",
    marginBottom: 8,
  },
  lineLegend: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendLabel: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "600",
  },
  pieLegend: {
    marginTop: 12,
    gap: 10,
  },
  pieLegendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  pieLegendText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
  },
  pieLegendAmount: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    width: 100,
    textAlign: "right",
  },
  pieLegendPercent: {
    fontSize: 13,
    color: "#6b7280",
    width: 50,
    textAlign: "right",
  },
});
