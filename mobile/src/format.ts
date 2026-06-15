export function formatMoney(amount: number | null | undefined, currency = "UZS"): string {
  const grouped = new Intl.NumberFormat("ru-RU").format(amount || 0).replace(/\s/g, " ");
  return grouped + " " + currency;
}

export function iso(d: Date | null): string {
  return d ? d.toISOString().slice(0, 10) : "";
}

export function fmtTime(s: string | null): string {
  return s ? new Date(s).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "—";
}

export function startOfMonth(): Date {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), 1);
}
