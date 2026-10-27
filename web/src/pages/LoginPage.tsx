import { useState, type FormEvent } from "react";
import { LoaderCircle, LockKeyhole, WalletCards } from "lucide-react";
import { useAuth } from "../auth/AuthProvider";

export function LoginPage() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password);
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "No pudimos iniciar sesión.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-dvh bg-slate-950 lg:grid-cols-[1.15fr_0.85fr]">
      <section className="hidden flex-col justify-between overflow-hidden p-12 text-white lg:flex">
        <div className="flex items-center gap-3 text-xl font-bold">
          <span className="grid size-11 place-items-center rounded-2xl bg-white/10">
            <WalletCards size={24} />
          </span>
          Finpa
        </div>
        <div className="relative z-10 max-w-xl">
          <p className="mb-5 text-sm font-semibold tracking-[0.2em] text-emerald-400 uppercase">
            Finanzas sin ruido
          </p>
          <h1 className="text-6xl leading-[1.05] font-semibold tracking-tight">
            Tu plata, finalmente clara.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-8 text-slate-300">
            Registra gastos, entiende tus hábitos y mantén tus suscripciones
            bajo control.
          </p>
        </div>
        <p className="text-sm text-slate-500">
          Hecho para tomar mejores decisiones, no para llenar planillas.
        </p>
      </section>

      <section className="flex min-h-dvh items-center justify-center bg-slate-50 px-5 py-10 dark:bg-slate-900">
        <div className="w-full max-w-md">
          <div className="mb-10 flex items-center gap-3 text-xl font-bold text-slate-950 lg:hidden dark:text-white">
            <span className="grid size-11 place-items-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
              <WalletCards size={24} />
            </span>
            Finpa
          </div>
          <div className="mb-8">
            <h2 className="text-3xl font-semibold tracking-tight text-slate-950 dark:text-white">
              Qué bueno verte
            </h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Ingresa para revisar tus finanzas.
            </p>
          </div>
          <form onSubmit={submit} className="space-y-5">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Email
              </span>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                autoComplete="email"
                required
                autoFocus
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                Contraseña
              </span>
              <div className="relative">
                <LockKeyhole
                  className="absolute top-1/2 left-3 -translate-y-1/2 text-slate-400"
                  size={18}
                />
                <input
                  className="input pl-10"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </div>
            </label>
            {error && (
              <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {error}
              </p>
            )}
            <button className="button-primary w-full" disabled={loading}>
              {loading && <LoaderCircle className="animate-spin" size={18} />}
              {loading ? "Ingresando…" : "Iniciar sesión"}
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
