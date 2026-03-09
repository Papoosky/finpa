import { useMemo } from 'react';
import { Transaction } from '../types';
import { CATEGORY_EMOJI_MAP } from '../constants/categories';

const CATEGORY_COLORS = [
  '#ef4444',
  '#f97316',
  '#eab308',
  '#22c55e',
  '#06b6d4',
  '#3b82f6',
  '#8b5cf6',
  '#ec4899',
  '#6b7280',
];

export type CategoryTotal = {
  category: string;
  emoji: string;
  total: number;
  percent: number;
  color: string;
};

export type MonthlyDataPoint = {
  month: number;
  income: number;
  expense: number;
};

export type PieSlice = { x: string; y: number };

export type PieLegendItem = {
  emoji: string;
  name: string;
  total: number;
  percent: number;
  color: string;
};

export function useDashboard(transactions: Transaction[], viewMode: 'month' | 'year') {
  const { expenses, totalExpense, totalIncome, balance } = useMemo(() => {
    const exp = transactions.filter((t) => t.type === 'expense');
    const inc = transactions.filter((t) => t.type === 'income');
    const totExp = exp.reduce((s, t) => s + t.amount, 0);
    const totInc = inc.reduce((s, t) => s + t.amount, 0);
    return { expenses: exp, totalExpense: totExp, totalIncome: totInc, balance: totInc - totExp };
  }, [transactions]);

  const categoryTotals: CategoryTotal[] = useMemo(() => {
    const catMap = new Map<string, number>();
    for (const t of expenses) {
      catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
    }
    return [...catMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([category, total], i) => ({
        category,
        emoji: CATEGORY_EMOJI_MAP[category] || '📌',
        total,
        percent: totalExpense > 0 ? (total / totalExpense) * 100 : 0,
        color: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
      }));
  }, [expenses, totalExpense]);

  const lineData: MonthlyDataPoint[] = useMemo(() => {
    if (viewMode !== 'year') return [];
    const monthlyIncome = new Array(12).fill(0) as number[];
    const monthlyExpense = new Array(12).fill(0) as number[];
    for (const t of transactions) {
      const m = new Date(t.date).getMonth();
      if (t.type === 'income') monthlyIncome[m] += t.amount;
      else monthlyExpense[m] += t.amount;
    }
    return Array.from({ length: 12 }, (_, i) => ({
      month: i,
      income: monthlyIncome[i],
      expense: monthlyExpense[i],
    }));
  }, [viewMode, transactions]);

  const pieData = useMemo(() => {
    if (viewMode !== 'year')
      return {
        slices: [] as PieSlice[],
        colors: [] as string[],
        legend: [] as PieLegendItem[],
      };
    const catMap = new Map<string, number>();
    for (const t of expenses) catMap.set(t.category, (catMap.get(t.category) || 0) + t.amount);
    const sorted = [...catMap.entries()].sort((a, b) => b[1] - a[1]);
    const top5 = sorted.slice(0, 5);
    const otrosTotal = sorted.slice(5).reduce((s, [, v]) => s + v, 0);

    const entries = top5.map(([name, total]) => ({ name, total }));
    if (otrosTotal > 0) entries.push({ name: 'Otros', total: otrosTotal });

    const slices = entries.map((e) => ({ x: e.name, y: e.total }));
    const colors = entries.map((_, i) => CATEGORY_COLORS[i % CATEGORY_COLORS.length]);
    const legend = entries.map((e, i) => ({
      emoji: CATEGORY_EMOJI_MAP[e.name] || '📌',
      name: e.name,
      total: e.total,
      percent: totalExpense > 0 ? (e.total / totalExpense) * 100 : 0,
      color: colors[i],
    }));

    return { slices, colors, legend };
  }, [viewMode, expenses, totalExpense]);

  return { totalIncome, totalExpense, balance, categoryTotals, lineData, pieData };
}

export function formatAmount(n: number): string {
  return '$' + n.toLocaleString('es-CL');
}
