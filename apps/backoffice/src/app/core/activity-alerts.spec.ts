import { ActivitySummary } from './models';
import { slotsEndingSoon } from './activity-alerts';

const NOW = Date.parse('2026-11-11T10:00:00Z');

function activity(over: Partial<ActivitySummary>): ActivitySummary {
  return { status: 'published', last_slot_at: '2027-03-01T09:00:00Z', upcoming_bookings: 0, ...over } as ActivitySummary;
}

describe('slotsEndingSoon', () => {
  it('alerts a published activity whose last slot is less than a month away, or which has none', () => {
    expect(slotsEndingSoon(activity({ last_slot_at: '2026-12-01T09:00:00Z' }), NOW)).toBe(true);
    expect(slotsEndingSoon(activity({ last_slot_at: null }), NOW)).toBe(true);
    expect(slotsEndingSoon(activity({ last_slot_at: '2027-01-15T09:00:00Z' }), NOW)).toBe(false);
  });

  it('ignores drafts and archived activities', () => {
    expect(slotsEndingSoon(activity({ status: 'draft', last_slot_at: null }), NOW)).toBe(false);
    expect(slotsEndingSoon(activity({ status: 'archived', last_slot_at: null }), NOW)).toBe(false);
  });
});
