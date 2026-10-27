import { CATEGORY_EMOJI } from "../constants";
import type { Transaction } from "../types";

const COLORS = [
  "#f97316",
  "#eab308",
  "#22c55e",
  "#06b6d4",
  "#3b82f6",
  "#8b5cf6",
];

export function calculateDashboard(transactions: Transaction[]) {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((sum, transaction) => sum + transaction.amount, 0);
  const expenseTransactions = transactions.filter(
    (transaction) => transaction.type === "expense",
  );
  const expense = expenseTransactions.reduce(
    (sum, transaction) => sum + transaction.amount,
    0,
  );

  const categoryMap = new Map<string, number>();
  for (const transaction of expenseTransactions) {
    categoryMap.set(
      transaction.category,
      (categoryMap.get(transaction.category) ?? 0) + transaction.amount,
    );
  }

  const categories = [...categoryMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], index) => ({
      name,
      value,
      emoji: CATEGORY_EMOJI[name] ?? "📌",
      color: COLORS[index % COLORS.length],
      percent: expense ? (value / expense) * 100 : 0,
    }));

  const monthly = Array.from({ length: 12 }, (_, month) => ({
    month,
    income: 0,
    expense: 0,
  }));
  for (const transaction of transactions) {
    const month = Number(transaction.date.slice(5, 7)) - 1;
    monthly[month][transaction.type] += transaction.amount;
  }

  return { income, expense, balance: income - expense, categories, monthly };
}
