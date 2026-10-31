import { IActivityCard, IActivityDetail } from 'models';

/**
 * Durée lisible d'une activité, dans la langue active : « 1 h 30 », « 2 à 3 h » ; plusieurs jours au-delà de 24 h.
 * `t` traduit les clés `activity.duration.*`.
 */
export function activityDuration(
  activity: Pick<IActivityCard | IActivityDetail, 'duration_min_minutes' | 'duration_max_minutes'>,
  t: (key: string, params?: Record<string, unknown>) => string,
): string {
  const min = activity.duration_min_minutes;
  const max = activity.duration_max_minutes;
  if (max && max !== min) {
    return t('activity.duration.range', { from: minutes(min, t), to: minutes(max, t) });
  }
  return minutes(min, t);
}

function minutes(total: number, t: (key: string, params?: Record<string, unknown>) => string): string {
  if (total >= 24 * 60 && total % (24 * 60) === 0) {
    return t('activity.duration.days', { count: total / (24 * 60) });
  }
  const hours = Math.floor(total / 60);
  const rest = total % 60;
  if (!hours) {
    return t('activity.duration.minutes', { count: rest });
  }
  return rest ? t('activity.duration.hours-minutes', { hours, minutes: String(rest).padStart(2, '0') }) : t('activity.duration.hours', { count: hours });
}

/** Note sur 5 affichée à une décimale (« 4.4 », « 4,4 » selon la langue). */
export function ratingLabel(rating: number | null, locale: string): string {
  return rating === null ? '' : new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(rating);
}

/** Nom d'un pays ISO 3166-1 alpha-2 dans la langue active (le code s'il est inconnu). */
export function countryName(code: string | null, locale: string): string {
  if (!code) {
    return '';
  }
  try {
    return new Intl.DisplayNames([locale], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}
