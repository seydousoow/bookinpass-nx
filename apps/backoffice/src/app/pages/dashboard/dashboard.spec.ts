import { of } from 'rxjs';
import { ActivityRefund, ActivityReview, ActivitySummary, Incident, Refund } from '../../core/models';
import { renderPage, staffApiMock, staffUser } from '../../../testing';
import { DashboardPage, incidentTiming } from './dashboard';

const DAY = 24 * 60 * 60 * 1000;
const iso = (offset: number) => new Date(Date.now() + offset).toISOString();

function incident(over: Partial<Incident>): Incident {
  return {
    id: 1,
    route_code: 'DKR-THS',
    origin: 'Dakar',
    destination: 'Thiès',
    departure_id: null,
    departs_at: null,
    type: 'delay',
    description: 'Embouteillage',
    reported_by: 'Awa',
    reported_at: iso(-DAY),
    resolved_at: null,
    resolution: null,
    ...over,
  };
}

describe('DashboardPage', () => {
  it('sépare les incidents en cours (départ passé ou sans départ) et prévus', () => {
    expect(incidentTiming(incident({ departs_at: null }))).toBe('ongoing');
    expect(incidentTiming(incident({ departs_at: iso(-DAY) }))).toBe('ongoing');
    expect(incidentTiming(incident({ departs_at: iso(DAY) }))).toBe('expected');
  });

  it('montre au responsable avis, remboursements, activités à prolonger et incidents', async () => {
    const api = staffApiMock({
      activitySettings: () => of({ auto_moderation: true, ai_enabled: true, ai_model: 'claude-haiku-5-5', pending_reviews: 7, auto_approved_reviews: 42 }),
      reviews: () =>
        of({
          items: [{ id: 5, activity_title: 'Île de Gorée', rating: 4, text: 'Superbe', author_name: 'Moussa', ai_verdict: 'review' } as ActivityReview],
          page: 0,
          size: 20,
          total: 7,
        }),
      refunds: () =>
        of([
          {
            id: 1,
            reference: 'BUS123',
            origin: 'Dakar',
            destination: 'Thiès',
            passengers: 'Awa Diop',
            amount: '5000',
            currency: 'XOF',
            status: 'refund_needed',
            paid_at: iso(-DAY),
          } as Refund,
        ]),
      activityRefunds: () =>
        of([
          {
            id: 2,
            reference: 'ACT456',
            activity_title: 'Gorée',
            customer: 'Moussa',
            amount: '15000',
            currency: 'XOF',
            status: 'pending',
            requested_by: null,
            created_at: iso(-2 * DAY),
          } as ActivityRefund,
          {
            id: 3,
            reference: 'ACT789',
            activity_title: 'Lac Rose',
            customer: 'Fatou',
            amount: '9000',
            currency: 'XOF',
            status: 'refunded',
            requested_by: 'admin',
            created_at: iso(-DAY),
          } as ActivityRefund,
        ]),
      activities: () =>
        of([
          { id: 8, title: 'Lac Rose', status: 'published', last_slot_at: iso(10 * DAY), upcoming_bookings: 3 } as ActivitySummary,
          { id: 9, title: 'Saloum', status: 'published', last_slot_at: iso(90 * DAY), upcoming_bookings: 1 } as ActivitySummary,
        ]),
      incidents: () => of([incident({ id: 1 }), incident({ id: 2, type: 'breakdown', departs_at: iso(DAY), departure_id: 4 })]),
      resolvedIncidents: () => of([incident({ id: 3, resolved_at: iso(-DAY), resolution: 'Car remplacé' })]),
    });
    const { element } = await renderPage(DashboardPage, { api, user: staffUser('manager') });
    const text = element.textContent ?? '';

    expect(element.querySelector('#control bo-scan')).not.toBeNull();
    expect(text).toContain('7');
    expect(text).toContain('42');
    expect(text).toContain('Superbe');
    expect(text).toContain('dashboard.reviews.more');
    // Remboursement de car à faire, remboursement d'activité demandé par le client ; le remboursé n'apparaît pas.
    expect(text).toContain('BUS123');
    expect(text).toContain('ACT456');
    expect(text).toContain('dashboard.refund-states.requested');
    expect(text).not.toContain('ACT789');
    // Seule l'activité dont les créneaux s'arrêtent dans moins d'un mois.
    expect(element.querySelector('a[href="/activities/8"]')).not.toBeNull();
    expect(element.querySelector('a[href="/activities/9"]')).toBeNull();
    expect(text).toContain('dashboard.incidents.ongoing');
    expect(element.querySelector('a[href="/departures/4"]')).not.toBeNull();
    expect(text).toContain('Car remplacé');
    expect(api.resolvedIncidents).toHaveBeenCalledWith(10, null);
  });

  it('ne charge pour un contrôleur que le contrôle et les incidents', async () => {
    const { element, api } = await renderPage(DashboardPage, { user: staffUser('inspector') });
    expect(element.querySelector('#control bo-scan')).not.toBeNull();
    expect(element.textContent).toContain('dashboard.incidents.title');
    expect(element.textContent).not.toContain('dashboard.refunds.title');
    expect(api.reviews).not.toHaveBeenCalled();
    expect(api.refunds).not.toHaveBeenCalled();
    expect(api.activities).not.toHaveBeenCalled();
  });
});
