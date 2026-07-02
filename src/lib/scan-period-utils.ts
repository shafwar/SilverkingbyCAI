/** Rolling scan windows — always count backwards from today (local midnight boundaries). */

export function startOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfLocalDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Inclusive rolling window: `days` calendar days ending today (7 → today + prior 6 days). */
export function rollingWindowStart(now: Date, days: number): Date {
  const start = startOfLocalDay(now);
  start.setDate(start.getDate() - (days - 1));
  return start;
}

export function formatShortDate(date: Date, locale = "en-GB"): string {
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

export function formatLongDate(date: Date, locale = "en-GB"): string {
  return date.toLocaleDateString(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatDateRange(start: Date, end: Date, locale = "en-GB"): string {
  const sameYear = start.getFullYear() === end.getFullYear();
  const sameMonth = sameYear && start.getMonth() === end.getMonth();
  if (sameMonth) {
    return `${start.getDate()} – ${formatShortDate(end, locale)} ${end.getFullYear()}`;
  }
  if (sameYear) {
    return `${formatShortDate(start, locale)} – ${formatShortDate(end, locale)} ${end.getFullYear()}`;
  }
  return `${formatShortDate(start, locale)} ${start.getFullYear()} – ${formatShortDate(end, locale)} ${end.getFullYear()}`;
}
