/** Format a numeric amount with grouping and a currency suffix.
 *  In JS regex, \s also matches the locale no-break spaces (U+00A0 / U+202F)
 *  that Intl uses as a grouping separator, so this yields a deterministic,
 *  regular-space output across environments (e.g. CI). */
export function formatMoney(amount: number, currency = "UZS"): string {
  const grouped = new Intl.NumberFormat("ru-RU").format(amount).replace(/\s/g, " ");
  return grouped + " " + currency;
}

/** Inclusive number of days between two ISO dates (yyyy-mm-dd). */
export function inclusiveDays(fromIso: string, toIso: string): number {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  const ms = to.getTime() - from.getTime();
  return Math.floor(ms / 86_400_000) + 1;
}

/** Sign for a payroll adjustment: bonus/allowance add, the rest subtract. */
export function adjustmentSign(type: string): 1 | -1 {
  return type === "bonus" || type === "allowance" ? 1 : -1;
}
