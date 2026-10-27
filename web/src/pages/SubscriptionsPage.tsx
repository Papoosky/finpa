import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { CalendarClock, Edit3, Plus, Repeat2, Trash2 } from "lucide-react";
import { EmptyState } from "../components/EmptyState";
import { SERVICES } from "../constants";
import { api } from "../lib/api";
import { formatDate } from "../lib/dates";
import { formatCurrency } from "../lib/format";

export function SubscriptionsPage() {
  const queryClient = useQueryClient();
  const subscriptions = useQuery({
    queryKey: ["subscriptions"],
    queryFn: api.subscriptions.list,
  });
  const remove = useMutation({
    mutationFn: api.subscriptions.delete,
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["subscriptions"] }),
  });
  const monthlyTotal =
    subscriptions.data?.reduce(
      (sum, item) =>
        sum +
        (item.interval === "monthly" && item.currency === "CLP"
          ? item.amount
          : 0),
      0,
    ) ?? 0;

  function confirmDelete(uuid: string) {
    if (
      window.confirm(
        "¿Eliminar esta suscripción? Las transacciones anteriores se conservarán.",
      )
    )
      remove.mutate(uuid);
  }

  return (
    <div className="space-y-7">
      <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            Suscripciones
          </h1>
          <p className="mt-2 text-slate-500 dark:text-slate-400">
            Controla tus pagos recurrentes en un solo lugar.
          </p>
        </div>
        <Link to="/subscriptions/new" className="button-primary">
          <Plus size={18} /> Nueva suscripción
        </Link>
      </div>

      <section className="card flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Costo mensual conocido en CLP
          </p>
          <p className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
            {formatCurrency(monthlyTotal)}
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <CalendarClock size={18} /> Los cargos se registran al abrir Finpa
        </div>
      </section>

      {subscriptions.isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {[0, 1, 2].map((item) => (
            <div
              key={item}
              className="h-52 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800"
            />
          ))}
        </div>
      ) : subscriptions.isError ? (
        <div className="card p-5 text-red-600">
          {subscriptions.error.message}
        </div>
      ) : !subscriptions.data?.length ? (
        <EmptyState
          icon={Repeat2}
          title="No tienes suscripciones"
          description="Agrega tus servicios recurrentes para que Finpa registre sus cobros automáticamente."
          action={{ label: "Agregar suscripción", to: "/subscriptions/new" }}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {subscriptions.data.map((subscription) => {
            const service = SERVICES.find(
              (item) => item.key === subscription.service_key,
            );
            return (
              <article key={subscription.uuid} className="card p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className="grid size-12 shrink-0 place-items-center rounded-2xl text-sm font-bold text-white"
                      style={{ backgroundColor: service?.color ?? "#475569" }}
                    >
                      {service?.initials ??
                        subscription.name.slice(0, 2).toUpperCase()}
                    </span>
                    <div className="min-w-0">
                      <h2 className="truncate font-semibold text-slate-950 dark:text-white">
                        {subscription.name}
                      </h2>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {subscription.interval === "monthly"
                          ? "Mensual"
                          : "Anual"}{" "}
                        · día {subscription.billing_day}
                      </p>
                    </div>
                  </div>
                  <div className="flex">
                    <Link
                      to="/subscriptions/$subscriptionId/edit"
                      params={{ subscriptionId: subscription.uuid }}
                      className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-950 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      <Edit3 size={17} />
                    </Link>
                    <button
                      onClick={() => confirmDelete(subscription.uuid)}
                      className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                    >
                      <Trash2 size={17} />
                    </button>
                  </div>
                </div>
                <p className="mt-6 text-2xl font-semibold tracking-tight text-slate-950 dark:text-white">
                  {formatCurrency(subscription.amount, subscription.currency)}{" "}
                  <span className="text-sm font-normal text-slate-400">
                    /{subscription.interval === "monthly" ? "mes" : "año"}
                  </span>
                </p>
                <div className="mt-5 border-t border-slate-100 pt-4 text-xs text-slate-500 dark:border-slate-800">
                  {subscription.last_charged_date
                    ? `Último cargo: ${formatDate(subscription.last_charged_date)}`
                    : `Comienza: ${formatDate(subscription.start_date)}`}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
