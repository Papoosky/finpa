import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  Scale,
  WalletCards,
} from "lucide-react";
import { api } from "../lib/api";
import { calculateDashboard } from "../lib/dashboard";
import { dateRange } from "../lib/dates";
import { formatCurrency } from "../lib/format";
import { MONTHS } from "../constants";
import { PeriodPicker } from "../components/PeriodPicker";
import { EmptyState } from "../components/EmptyState";

function MetricCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof ArrowUpRight;
  tone: "green" | "red" | "slate";
}) {
  const tones = {
    green:
      "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
    red: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
    slate: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
  };
  return (
    <article className="card p-5">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
          {label}
        </p>
        <span
          className={`grid size-9 place-items-center rounded-xl ${tones[tone]}`}
        >
          <Icon size={18} />
        </span>
      </div>
      <p className="mt-5 text-2xl font-semibold tracking-tight text-slate-950 sm:text-3xl dark:text-white">
        {formatCurrency(value)}
      </p>
    </article>
  );
}

export function DashboardPage() {
  const now = new Date();
  const [mode, setMode] = useState<"month" | "year">("month");
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const range = useMemo(
    () => dateRange(mode, month, year),
    [mode, month, year],
  );
  const transactions = useQuery({
    queryKey: ["transactions", range],
    queryFn: () => api.transactions.list(range.dateFrom, range.dateTo),
  });
  const dashboard = calculateDashboard(transactions.data?.items ?? []);
  const chartData = dashboard.monthly.map((item) => ({
    ...item,
    name: MONTHS[item.month].slice(0, 3),
  }));
  const maxMonthlyValue = Math.max(
    1,
    ...chartData.flatMap((item) => [item.income, item.expense]),
  );
  const pieBackground = dashboard.categories.length
    ? `conic-gradient(${dashboard.categories
        .reduce((parts, category, index, items) => {
          const start = items
            .slice(0, index)
            .reduce((sum, item) => sum + item.percent, 0);
          parts.push(
            `${category.color} ${start}% ${start + category.percent}%`,
          );
          return parts;
        }, [] as string[])
        .join(", ")})`
    : "#e2e8f0";

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <p className="text-sm font-medium text-emerald-600 dark:text-emerald-400">
            Tu panorama financiero
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Resumen
          </h1>
        </div>
        <div className="flex flex-col gap-3 sm:items-end">
          <Link
            to="/transactions/new"
            className="button-primary hidden sm:inline-flex"
          >
            <Plus size={18} /> Nueva transacción
          </Link>
          <PeriodPicker
            mode={mode}
            month={month}
            year={year}
            onModeChange={setMode}
            onChange={(nextMonth, nextYear) => {
              setMonth(nextMonth);
              setYear(nextYear);
            }}
          />
        </div>
      </div>

      {transactions.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-32 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : transactions.isError ? (
        <div className="card border-red-200 p-5 text-sm text-red-700 dark:border-red-900 dark:text-red-300">
          {transactions.error.message}
        </div>
      ) : !transactions.data?.items.length ? (
        <EmptyState
          icon={WalletCards}
          title="Aún no hay movimientos"
          description="Registra tu primera transacción para ver el resumen y los gráficos de este periodo."
          action={{ label: "Crear transacción", to: "/transactions/new" }}
        />
      ) : (
        <>
          <section className="grid gap-4 sm:grid-cols-3">
            <MetricCard
              label="Ingresos"
              value={dashboard.income}
              icon={ArrowUpRight}
              tone="green"
            />
            <MetricCard
              label="Gastos"
              value={dashboard.expense}
              icon={ArrowDownRight}
              tone="red"
            />
            <MetricCard
              label="Balance"
              value={dashboard.balance}
              icon={Scale}
              tone="slate"
            />
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.45fr_0.75fr]">
            <article className="card p-5 sm:p-6">
              <div className="mb-6">
                <h2 className="font-semibold text-slate-950 dark:text-white">
                  {mode === "year" ? "Evolución anual" : "Gastos por categoría"}
                </h2>
                <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                  {mode === "year"
                    ? "Ingresos y gastos mes a mes"
                    : "Dónde se fue tu plata este mes"}
                </p>
              </div>
              <div className="h-72">
                {mode === "year" ? (
                  <div className="flex h-full items-end gap-1 border-b border-slate-200 pt-6 sm:gap-2 dark:border-slate-700">
                    {chartData.map((item) => (
                      <div
                        key={item.month}
                        className="group flex h-full min-w-0 flex-1 flex-col justify-end"
                      >
                        <div className="flex h-[calc(100%-24px)] items-end justify-center gap-px sm:gap-1">
                          <div
                            title={`Ingresos: ${formatCurrency(item.income)}`}
                            className="w-1/2 max-w-4 rounded-t bg-emerald-500 transition-opacity group-hover:opacity-80"
                            style={{
                              height: `${Math.max(item.income ? 2 : 0, (item.income / maxMonthlyValue) * 100)}%`,
                            }}
                          />
                          <div
                            title={`Gastos: ${formatCurrency(item.expense)}`}
                            className="w-1/2 max-w-4 rounded-t bg-rose-500 transition-opacity group-hover:opacity-80"
                            style={{
                              height: `${Math.max(item.expense ? 2 : 0, (item.expense / maxMonthlyValue) * 100)}%`,
                            }}
                          />
                        </div>
                        <span className="mt-2 truncate text-center text-[10px] text-slate-400 sm:text-xs">
                          {item.name}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid h-full place-items-center">
                    <div
                      className="relative size-56 rounded-full"
                      style={{ background: pieBackground }}
                    >
                      <div className="absolute inset-[22%] grid place-items-center rounded-full bg-white text-center shadow-inner dark:bg-slate-900">
                        <div>
                          <p className="text-xs text-slate-400">Total</p>
                          <p className="mt-1 text-lg font-semibold text-slate-950 dark:text-white">
                            {formatCurrency(dashboard.expense)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </article>

            <article className="card p-5 sm:p-6">
              <h2 className="font-semibold text-slate-950 dark:text-white">
                Principales gastos
              </h2>
              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                Ordenados por monto
              </p>
              <div className="mt-5 space-y-4">
                {dashboard.categories.slice(0, 6).map((category) => (
                  <div key={category.name}>
                    <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                      <span className="font-medium text-slate-700 dark:text-slate-200">
                        {category.emoji} {category.name}
                      </span>
                      <span className="text-slate-500 dark:text-slate-400">
                        {formatCurrency(category.value)}
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${category.percent}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
}
