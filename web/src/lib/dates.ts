export function todayInputValue(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Santiago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export function dateRange(mode: "month" | "year", month: number, year: number) {
  if (mode === "year") {
    return { dateFrom: `${year}-01-01`, dateTo: `${year}-12-31` };
  }
  const lastDay = new Date(year, month + 1, 0).getDate();
  const monthText = String(month + 1).padStart(2, "0");
  return {
    dateFrom: `${year}-${monthText}-01`,
    dateTo: `${year}-${monthText}-${String(lastDay).padStart(2, "0")}`,
  };
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat("es-CL", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T12:00:00Z`));
}
