import { IsoDate } from 'models';
import { dayIn, lastDayOf, monthsFrom, unavailableDays } from './availability-calendar';

describe('availability calendar', () => {
  it('reads the civil day in the activity time zone', () => {
    const lateEvening = new Date('2026-10-25T23:30:00Z');
    expect(dayIn('Africa/Dakar', lateEvening)).toBe('2026-10-25');
    expect(dayIn('Europe/Paris', lateEvening)).toBe('2026-10-26');
  });

  it('lists months across a year end', () => {
    expect(monthsFrom('2026-11-30' as IsoDate, 3)).toEqual(['2026-11', '2026-12', '2027-01']);
    expect(lastDayOf('2027-02')).toBe('2027-02-28');
  });

  it('greys out the days without availability', () => {
    expect(unavailableDays('2026-10-25' as IsoDate, '2026-10-28' as IsoDate, new Set(['2026-10-26', '2026-10-28']))).toEqual(['2026-10-25', '2026-10-27']);
  });
});
