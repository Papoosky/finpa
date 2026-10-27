import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, LoaderCircle } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from "../constants";
import { api } from "../lib/api";
import { todayInputValue } from "../lib/dates";

const schema = z.object({
  type: z.enum(["income", "expense"]),
  amount: z.coerce.number().positive("Ingresa un monto mayor a cero."),
  date: z.string().min(1, "Selecciona una fecha."),
  category: z.string().min(1, "Selecciona una categoría."),
  description: z.string().max(500).optional(),
  installments: z.coerce.number().int().min(1).max(48),
});

type FormValues = z.infer<typeof schema>;
type FormInput = z.input<typeof schema>;

export function TransactionFormPage({
  transactionId,
}: {
  transactionId?: string;
}) {
  const editing = Boolean(transactionId);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const transaction = useQuery({
    queryKey: ["transaction", transactionId],
    queryFn: () => api.transactions.get(transactionId!),
    enabled: editing,
  });
  const {
    register,
    reset,
    setValue,
    watch,
    handleSubmit,
    formState: { errors },
  } = useForm<FormInput, unknown, FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "expense",
      amount: 0,
      date: todayInputValue(),
      category: "Comida",
      description: "",
      installments: 1,
    },
  });

  useEffect(() => {
    if (!transaction.data) return;
    reset({
      type: transaction.data.type,
      amount: transaction.data.amount,
      date: transaction.data.date,
      category: transaction.data.category,
      description: transaction.data.description ?? "",
      installments: 1,
    });
  }, [reset, transaction.data]);

  const type = watch("type");
  const categories =
    type === "expense" ? EXPENSE_CATEGORIES : INCOME_CATEGORIES;
  const typeField = register("type");
  const mutation = useMutation({
    mutationFn: (values: FormValues) => {
      const payload = {
        ...values,
        description: values.description?.trim() || null,
        installments:
          editing || values.installments === 1 ? null : values.installments,
      };
      return editing
        ? api.transactions.update(transactionId!, payload)
        : api.transactions.create(payload);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      void navigate({ to: "/transactions" });
    },
  });

  if (transaction.isLoading) {
    return (
      <div className="h-96 animate-pulse rounded-2xl bg-slate-200 dark:bg-slate-800" />
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link
        to="/transactions"
        className="mb-5 inline-flex items-center gap-2 text-sm font-medium text-slate-500 hover:text-slate-950 dark:hover:text-white"
      >
        <ArrowLeft size={17} /> Volver a movimientos
      </Link>
      <div className="mb-7">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
          {editing ? "Editar transacción" : "Nueva transacción"}
        </h1>
        <p className="mt-2 text-slate-500 dark:text-slate-400">
          {editing
            ? "Actualiza los datos de este movimiento."
            : "Registra un ingreso o gasto en pocos segundos."}
        </p>
      </div>

      <form
        className="card space-y-6 p-5 sm:p-7"
        onSubmit={handleSubmit((values) => mutation.mutate(values))}
      >
        <fieldset>
          <legend className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">
            Tipo
          </legend>
          <div className="grid grid-cols-2 rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
            {(["expense", "income"] as const).map((option) => (
              <label
                key={option}
                className={`cursor-pointer rounded-lg py-2.5 text-center text-sm font-semibold transition ${type === option ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white" : "text-slate-500"}`}
              >
                <input
                  type="radio"
                  value={option}
                  className="sr-only"
                  {...typeField}
                  onChange={(event) => {
                    void typeField.onChange(event);
                    setValue(
                      "category",
                      option === "expense"
                        ? EXPENSE_CATEGORIES[0].label
                        : INCOME_CATEGORIES[0].label,
                    );
                  }}
                />
                {option === "expense" ? "Gasto" : "Ingreso"}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Monto" error={errors.amount?.message}>
            <div className="relative">
              <span className="absolute top-1/2 left-3.5 -translate-y-1/2 text-slate-400">
                $
              </span>
              <input
                className="input pl-8"
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                {...register("amount")}
              />
            </div>
          </Field>
          <Field label="Fecha" error={errors.date?.message}>
            <input className="input" type="date" {...register("date")} />
          </Field>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Categoría" error={errors.category?.message}>
            <select className="input" {...register("category")}>
              {categories.map((category) => (
                <option key={category.label} value={category.label}>
                  {category.emoji} {category.label}
                </option>
              ))}
            </select>
          </Field>
          {!editing && type === "expense" ? (
            <Field
              label="Cuotas"
              hint="El monto total se divide automáticamente."
            >
              <select className="input" {...register("installments")}>
                {Array.from({ length: 48 }, (_, index) => index + 1).map(
                  (value) => (
                    <option key={value} value={value}>
                      {value === 1 ? "Sin cuotas" : `${value} cuotas`}
                    </option>
                  ),
                )}
              </select>
            </Field>
          ) : (
            <div />
          )}
        </div>

        <Field
          label="Descripción"
          error={errors.description?.message}
          hint="Opcional"
        >
          <textarea
            className="input min-h-24 resize-y"
            placeholder="Ej. Compra del supermercado"
            {...register("description")}
          />
        </Field>

        {mutation.isError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {mutation.error.message}
          </p>
        )}
        <div className="flex flex-col-reverse gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:justify-end dark:border-slate-800">
          <Link to="/transactions" className="button-secondary">
            Cancelar
          </Link>
          <button className="button-primary" disabled={mutation.isPending}>
            {mutation.isPending && (
              <LoaderCircle className="animate-spin" size={18} />
            )}
            {editing ? "Guardar cambios" : "Crear transacción"}
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
