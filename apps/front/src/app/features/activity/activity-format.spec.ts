import { activityDuration, countryName, ratingLabel } from './activity-format';

/** Traduction factice : la clé et ses paramètres, pour vérifier ce qui est demandé. */
const t = (key: string, params?: Record<string, unknown>) => `${key.replace('activity.duration.', '')}(${Object.values(params ?? {}).join(',')})`;

describe('activity format', () => {
  it('writes durations in minutes, hours, days or ranges', () => {
    expect(activityDuration({ duration_min_minutes: 45, duration_max_minutes: null }, t)).toBe('minutes(45)');
    expect(activityDuration({ duration_min_minutes: 120, duration_max_minutes: 120 }, t)).toBe('hours(2)');
    expect(activityDuration({ duration_min_minutes: 90, duration_max_minutes: null }, t)).toBe('hours-minutes(1,30)');
    expect(activityDuration({ duration_min_minutes: 2880, duration_max_minutes: null }, t)).toBe('days(2)');
    expect(activityDuration({ duration_min_minutes: 70, duration_max_minutes: 90 }, t)).toBe('range(hours-minutes(1,10),hours-minutes(1,30))');
  });

  it('formats ratings and countries in the active language', () => {
    expect(ratingLabel(4.4, 'fr')).toBe('4,4');
    expect(ratingLabel(4, 'en')).toBe('4.0');
    expect(ratingLabel(null, 'en')).toBe('');
    expect(countryName('SN', 'fr')).toBe('Sénégal');
    expect(countryName(null, 'fr')).toBe('');
  });
});
