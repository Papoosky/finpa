import { ChevronLeft, ChevronRight } from "lucide-react";
import { MONTHS } from "../constants";

export function PeriodPicker({
  mode,
  month,
  year,
  onModeChange,
  onChange,
}: {
  mode: "month" | "year";
  month: number;
  year: number;
  onModeChange?: (mode: "month" | "year") => void;
  onChange: (month: number, year: number) => void;
}) {
  function move(direction: -1 | 1) {
    if (mode === "year") return onChange(month, year + direction);
    const date = new Date(year, month + direction, 1);
    onChange(date.getMonth(), date.getFullYear());
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {onModeChange && (
        <div className="flex rounded-xl bg-slate-100 p-1 dark:bg-slate-800">
          {(["month", "year"] as const).map((option) => (
            <button
              key={option}
              onClick={() => onModeChange(option)}
              className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                mode === option
                  ? "bg-white text-slate-950 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {option === "month" ? "Mes" : "Año"}
            </button>
          ))}
        </div>
      )}
      <div className="flex items-center rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <button
          className="p-2.5 text-slate-500 hover:text-slate-950 dark:hover:text-white"
          onClick={() => move(-1)}
          aria-label="Periodo anterior"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="min-w-36 text-center text-sm font-semibold text-slate-800 dark:text-slate-100">
          {mode === "month" ? `${MONTHS[month]} ${year}` : year}
        </span>
        <button
          className="p-2.5 text-slate-500 hover:text-slate-950 dark:hover:text-white"
          onClick={() => move(1)}
          aria-label="Periodo siguiente"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
