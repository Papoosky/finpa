import { LoaderCircle, WalletCards } from "lucide-react";

export function LoadingScreen() {
  return (
    <main className="grid min-h-dvh place-items-center bg-slate-50 dark:bg-slate-950">
      <div className="flex flex-col items-center gap-4 text-slate-500">
        <span className="grid size-14 place-items-center rounded-2xl bg-slate-950 text-white dark:bg-white dark:text-slate-950">
          <WalletCards size={28} />
        </span>
        <LoaderCircle className="animate-spin" size={22} />
      </div>
    </main>
  );
}
