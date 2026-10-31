import { IsoDate } from 'models';

/** Jour civil d'un instant dans un fuseau IANA (`2026-10-25`). */
export function dayIn(timeZone: string, instant: Date = new Date()): IsoDate {
  // en-CA écrit les dates au format ISO (AAAA-MM-JJ).
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(instant) as IsoDate;
}

/** Les `count` mois (`AAAA-MM`) à partir de celui de `day`. */
export function monthsFrom(day: IsoDate, count: number): string[] {
  const [year, month] = day.split('-').map(Number);
  return Array.from({ length: count }, (_, i) => {
    const date = new Date(Date.UTC(year, month - 1 + i, 1));
    return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
  });
}

/** Dernier jour d'un mois `AAAA-MM`. */
export function lastDayOf(month: string): IsoDate {
  const [year, m] = month.split('-').map(Number);
  return new Date(Date.UTC(year, m, 0)).toISOString().slice(0, 10) as IsoDate;
}

/** Jours de `from` à `to` (inclus) absents de `available` : à griser dans le calendrier. */
export function unavailableDays(from: IsoDate, to: IsoDate, available: ReadonlySet<string>): IsoDate[] {
  const days: IsoDate[] = [];
  for (let day = new Date(`${from}T00:00:00Z`); day <= new Date(`${to}T00:00:00Z`); day.setUTCDate(day.getUTCDate() + 1)) {
    const iso = day.toISOString().slice(0, 10) as IsoDate;
    if (!available.has(iso)) {
      days.push(iso);
    }
  }
  return days;
}
