import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; to: string };
}) {
  return (
    <div className="card flex flex-col items-center px-6 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-2xl bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        <Icon size={26} />
      </span>
      <h2 className="mt-5 text-lg font-semibold text-slate-950 dark:text-white">
        {title}
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500 dark:text-slate-400">
        {description}
      </p>
      {action && (
        <Link to={action.to} className="button-primary mt-6">
          {action.label}
        </Link>
      )}
    </div>
  );
}
