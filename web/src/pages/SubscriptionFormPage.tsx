import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { SERVICES } from "../constants";
import { api } from "../lib/api";
import { todayInputValue } from "../lib/dates";

const schema = z.object({
  name: z.string().trim().min(1, "Ingresa un nombre.").max(100),
  service_key: z.string(),
  amount: z.coerce.number().positive("Ingresa un monto mayor a cero."),
  currency: z.enum(["CLP", "USD"]),
  interval: z.enum(["monthly", "yearly"]),
  billing_day: z.coerce.number().int().min(1).max(31),
  start_date: z.string().min(1),
  description: z.string().max(500).optional(),
});
type FormValues = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;

export function SubscriptionFormPage({
  subscriptionId,
}: {
  subscriptionId?: string;
}) {
  const editing = Boolean(subscriptionId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const subscriptions = useQuery({
    queryKey: ["subscriptions"],
    queryFn: api.subscriptions.list,
    enabled: editing,
  });
  const current = subscriptions.data?.find(
    (item) => item.uuid === subscriptionId,
  );
  const {
    register,
    reset,
    watch,
    setValue,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: "",
      service_key: "",
      amount: 0,
      currency: "CLP",
      interval: "monthly",
      billing_day: new Date().getDate(),
      start_date: todayInputValue(),
      description: "",
    },
  });

  useEffect(() => {
    if (!current) return;
    reset({
      name: current.name,
      service_key: current.service_key ?? "",
      amount: current.amount,
      currency: current.currency,
      interval: current.interval,
      billing_day: current.billing_day,
      start_date: current.start_date,
      description: current.description ?? "",
    });
  }, [current, reset]);

  const selectedService = watch("service_key");
  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        service_key: values.service_key || null,
        description: values.description?.trim() || null,
      };
      return editing
        ? api.subscriptions.update(subscriptionId!, payload)
        : api.subscriptions.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["subscriptions"] });
      void navigate({ to: "/subscriptions" });
    },
  });

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/subscriptions"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950 dark:hover:text-white"
      >
        <ArrowLeft size={17} /> Volver a suscripciones
      </Link>
      <div className="mb-7">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {editing ? "Editar suscripción" : "Nueva suscripción"}
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          {editing
            ? "Actualiza los datos de este pago recurrente."
            : "Finpa creará el gasto cuando llegue la fecha de cobro."}
        </p>
      </div>
      <form
        className="card space-y-6 p-5 sm:p-7"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <div>
          <p className="mb-3 text-sm font-medium text-slate-700 dark:text-slate-300">
            Servicio
          </p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {SERVICES.map((service) => (
              <button
                key={service.key}
                type="button"
                onClick={() => {
                  setValue("service_key", service.key);
                  setValue("name", service.name);
                }}
                className={`flex flex-col items-center gap-2 rounded-xl border p-3 text-xs font-medium transition ${selectedService === service.key ? "border-slate-950 bg-slate-50 ring-1 ring-slate-950 dark:border-white dark:bg-slate-800 dark:ring-white" : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"}`}
              >
                <span
                  className="grid size-9 place-items-center rounded-xl text-xs font-bold text-white"
                  style={{ backgroundColor: service.color }}
                >
                  {service.initials}
                </span>
                <span className="max-w-full truncate text-slate-700 dark:text-slate-200">
                  {service.name}
                </span>
              </button>
            ))}
          </div>
        </div>
        <Field label="Nombre" error={errors.name?.message}>
          <input
            className="input"
            placeholder="Ej. Gimnasio"
            {...register("name")}
          />
        </Field>
        <div className="grid gap-5 sm:grid-cols-[1fr_140px]">
          <Field label="Monto" error={errors.amount?.message}>
            <input
              className="input"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              {...register("amount")}
            />
          </Field>
          <Field label="Moneda">
            <select className="input" {...register("currency")}>
              <option value="CLP">CLP</option>
              <option value="USD">USD</option>
            </select>
          </Field>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Frecuencia">
            <select className="input" {...register("interval")}>
              <option value="monthly">Mensual</option>
              <option value="yearly">Anual</option>
            </select>
          </Field>
          <Field label="Día de cobro" error={errors.billing_day?.message}>
            <input
              className="input"
              type="number"
              min="1"
              max="31"
              {...register("billing_day")}
            />
          </Field>
        </div>
        <Field label="Fecha de inicio">
          <input className="input" type="date" {...register("start_date")} />
        </Field>
        <Field label="Descripción" hint="Opcional">
          <textarea
            className="input min-h-24 resize-y"
            {...register("description")}
          />
        </Field>
        {mutation.isError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {mutation.error.message}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end dark:border-slate-800">
          <Link to="/subscriptions" className="button-secondary">
            Cancelar
          </Link>
          <button className="button-primary" disabled={mutation.isPending}>
            {mutation.isPending && (
              <LoaderCircle className="animate-spin" size={18} />
            )}
            {editing ? "Guardar cambios" : "Crear suscripción"}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between text-sm font-medium text-slate-700 dark:text-slate-300">
        <span>{label}</span>
        {hint && (
          <span className="text-xs font-normal text-slate-400">{hint}</span>
        )}
      </span>
      {children}
      {error && (
        <span className="mt-1.5 block text-xs text-red-600">{error}</span>
      )}
    </label>
  );
}
