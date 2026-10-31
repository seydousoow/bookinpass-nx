/**
 * Dates des activités, dans le fuseau de leur ville (et non celui de l'appareil) : `25/10/2026 09:30`. Le back-office
 * affiche toujours le format jour/mois/année, comme pour les départs de car (`dakar.ts`).
 */
export function zonedDateTime(iso: string | null | undefined, timeZone: string): string {
  if (!iso) {
    return '';
  }
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(iso));
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return `${part('day')}/${part('month')}/${part('year')} ${part('hour')}:${part('minute')}`;
}

/** Jour civil (`2026-10-25`) d'un instant dans un fuseau IANA. */
export function zonedDay(iso: string, timeZone: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date(iso));
}

/** Jour `day` (`AAAA-MM-JJ`) décalé de `days` jours. */
export function addDays(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
