import { addDays, zonedDateTime, zonedDay } from './zone';

describe('zone', () => {
  it('formats an instant in the activity time zone', () => {
    expect(zonedDateTime('2026-10-25T23:30:00Z', 'Africa/Dakar')).toBe('25/10/2026 23:30');
    expect(zonedDateTime('2026-10-25T23:30:00Z', 'Europe/Paris')).toBe('26/10/2026 00:30');
    expect(zonedDateTime(null, 'Africa/Dakar')).toBe('');
    expect(zonedDay('2026-10-25T23:30:00Z', 'Europe/Paris')).toBe('2026-10-26');
  });

  it('shifts a civil day across months', () => {
    expect(addDays('2026-10-31', 1)).toBe('2026-11-01');
    expect(addDays('2026-03-01', -1)).toBe('2026-02-28');
  });
});
