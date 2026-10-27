import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Edit3, Plus, ReceiptText, Trash2 } from "lucide-react";
import { CATEGORY_EMOJI } from "../constants";
import { EmptyState } from "../components/EmptyState";
import { PeriodPicker } from "../components/PeriodPicker";
import { api } from "../lib/api";
import { dateRange, formatDate } from "../lib/dates";
import { formatCurrency } from "../lib/format";

export function TransactionsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());
  const range = useMemo(() => dateRange("month", month, year), [month, year]);
  const queryClient = useQueryClient();
  const transactions = useQuery({
    queryKey: ["transactions", range],
    queryFn: () => api.transactions.list(range.dateFrom, range.dateTo),
  });
  const remove = useMutation({
    mutationFn: api.transactions.delete,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["transactions"] }),
  });

  function confirmDelete(uuid: string) {
    if (
      window.confirm(
        "¿Eliminar esta transacción? Esta acción no se puede deshacer.",
      )
    )
      remove.mutate(uuid);
  }

  const total =
    transactions.data?.items.reduce(
      (sum, transaction) =>
        sum +
        (transaction.type === "income"
          ? transaction.amount
          : -transaction.amount),
      0,
    ) ?? 0;

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Movimientos
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Revisa y administra tus ingresos y gastos.
          </p>
        </div>
        <Link to="/transactions/new" className="button-primary">
          <Plus size={18} /> Nueva transacción
        </Link>
      </div>
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <PeriodPicker
          mode="month"
          month={month}
          year={year}
          onChange={(nextMonth, nextYear) => {
            setMonth(nextMonth);
            setYear(nextYear);
          }}
        />
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Balance del mes:{" "}
          <span
            className={`font-semibold ${total >= 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            {formatCurrency(total)}
          </span>
        </p>
      </div>

      {transactions.isLoading ? (
        <div className="h-80 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
      ) : transactions.isError ? (
        <div className="card p-5 text-red-600">
          {transactions.error.message}
        </div>
      ) : !transactions.data?.items.length ? (
        <EmptyState
          icon={ReceiptText}
          title="No hay movimientos este mes"
          description="Crea una transacción o cambia el periodo para revisar otros movimientos."
          action={{ label: "Crear transacción", to: "/transactions/new" }}
        />
      ) : (
        <div className="card overflow-hidden">
          <div className="hidden grid-cols-[1fr_170px_150px_120px] gap-4 border-b border-slate-200 px-5 py-3 text-xs font-semibold tracking-wide text-slate-400 uppercase md:grid dark:border-slate-800">
            <span>Detalle</span>
            <span>Fecha</span>
            <span className="text-right">Monto</span>
            <span />
          </div>
          <div className="divide-y divide-slate-100 dark:divide-slate-800">
            {transactions.data.items.map((transaction) => (
              <article
                key={transaction.uuid}
                className="grid gap-3 px-4 py-4 transition hover:bg-slate-50 md:grid-cols-[1fr_170px_150px_120px] md:items-center md:gap-4 md:px-5 dark:hover:bg-slate-800/50"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-lg dark:bg-slate-800">
                    {CATEGORY_EMOJI[transaction.category] ?? "📌"}
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-900 dark:text-white">
                      {transaction.description || transaction.category}
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {transaction.category}
                      {transaction.installment_total
                        ? ` · Cuota ${transaction.installment_number}/${transaction.installment_total}`
                        : ""}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-slate-500">
                  {formatDate(transaction.date)}
                </p>
                <p
                  className={`text-left text-sm font-semibold md:text-right ${transaction.type === "income" ? "text-emerald-600" : "text-slate-900 dark:text-slate-100"}`}
                >
                  {transaction.type === "income" ? "+" : "−"}
                  {formatCurrency(transaction.amount)}
                </p>
                <div className="flex justify-end gap-1">
                  <Link
                    to="/transactions/$transactionId/edit"
                    params={{ transactionId: transaction.uuid }}
                    className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-700 dark:hover:text-white"
                    aria-label="Editar"
                  >
                    <Edit3 size={17} />
                  </Link>
                  <button
                    onClick={() => confirmDelete(transaction.uuid)}
                    className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    aria-label="Eliminar"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
      {remove.isError && (
        <p className="text-sm text-red-600">{remove.error.message}</p>
      )}
    </div>
  );
}
