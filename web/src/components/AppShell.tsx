import { useEffect, useState } from "react";
import { Link, Outlet, useLocation } from "@tanstack/react-router";
import {
  ChartNoAxesCombined,
  History,
  LogOut,
  Menu,
  Moon,
  Plus,
  Repeat2,
  Sun,
  WalletCards,
  X,
} from "lucide-react";
import { useAuth } from "../auth/AuthProvider";
import { api } from "../lib/api";
import { useQueryClient } from "@tanstack/react-query";

const navigation = [
  { to: "/", label: "Resumen", icon: ChartNoAxesCombined },
  { to: "/transactions", label: "Movimientos", icon: History },
  { to: "/subscriptions", label: "Suscripciones", icon: Repeat2 },
] as const;

export function AppShell() {
  const { logout } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [dark, setDark] = useState(
    () => localStorage.getItem("finpa-theme") === "dark",
  );

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("finpa-theme", dark ? "dark" : "light");
  }, [dark]);

  useEffect(() => setMenuOpen(false), [location.pathname]);

  useEffect(() => {
    api.subscriptions
      .processDue()
      .then((created) => {
        if (created.length)
          void queryClient.invalidateQueries({ queryKey: ["transactions"] });
      })
      .catch(() => undefined);
  }, [queryClient]);

  const sidebar = (
    <>
      <div className="flex h-20 items-center gap-3 px-6">
        <span className="grid size-10 place-items-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          <WalletCards size={21} />
        </span>
        <span className="text-xl font-bold tracking-tight text-slate-950 dark:text-white">
          Finpa
        </span>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 transition hover:bg-slate-100 hover:text-slate-950 [&.active]:bg-slate-950 [&.active]:text-white dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white dark:[&.active]:bg-white dark:[&.active]:text-slate-950"
          >
            <Icon size={19} />
            {label}
          </Link>
        ))}
      </nav>
      <div className="space-y-1 border-t border-slate-200 p-3 dark:border-slate-800">
        <button
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-950 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          onClick={() => setDark((value) => !value)}
        >
          {dark ? <Sun size={19} /> : <Moon size={19} />}
          {dark ? "Modo claro" : "Modo oscuro"}
        </button>
        <button
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30"
          onClick={() => void logout()}
        >
          <LogOut size={19} />
          Cerrar sesión
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-dvh bg-slate-50 dark:bg-slate-950">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-slate-200 bg-white lg:flex dark:border-slate-800 dark:bg-slate-900">
        {sidebar}
      </aside>

      {menuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm"
            onClick={() => setMenuOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside className="relative flex h-full w-[min(84vw,320px)] flex-col bg-white shadow-2xl dark:bg-slate-900">
            <button
              className="absolute top-6 right-5 text-slate-500"
              onClick={() => setMenuOpen(false)}
            >
              <X size={22} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/90">
        <button
          className="p-2 text-slate-600 dark:text-slate-300"
          onClick={() => setMenuOpen(true)}
          aria-label="Abrir menú"
        >
          <Menu size={23} />
        </button>
        <span className="font-bold text-slate-950 dark:text-white">Finpa</span>
        <Link
          to="/transactions/new"
          className="grid size-9 place-items-center rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950"
          aria-label="Nueva transacción"
        >
          <Plus size={20} />
        </Link>
      </header>

      <main className="pb-24 lg:ml-64 lg:pb-0">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
          <Outlet />
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-3 border-t border-slate-200 bg-white/95 px-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden dark:border-slate-800 dark:bg-slate-900/95">
        {navigation.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            activeOptions={{ exact: to === "/" }}
            className="flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium text-slate-400 [&.active]:text-slate-950 dark:[&.active]:text-white"
          >
            <Icon size={20} />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}
