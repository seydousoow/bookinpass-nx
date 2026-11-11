import { ActivitySummary } from './models';

/** Créneaux qui s'arrêtent dans moins de 30 jours : il faut en ouvrir d'autres. */
export const SLOTS_ENDING_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Activité publiée dont le dernier créneau ouvert est dans moins d'un mois (ou qui n'en a plus aucun). */
export function slotsEndingSoon(activity: ActivitySummary, now = Date.now()): boolean {
  return activity.status === 'published' && (activity.last_slot_at === null || Date.parse(activity.last_slot_at) - now < SLOTS_ENDING_DAYS * DAY_MS);
}
