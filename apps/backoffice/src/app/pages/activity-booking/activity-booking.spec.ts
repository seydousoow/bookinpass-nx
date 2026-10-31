import { of } from 'rxjs';
import { ActivityBookingDetail } from '../../core/models';
import { button, get, renderPage, staffApiMock, type } from '../../../testing';
import { ActivityBookingPage } from './activity-booking';

const DETAIL: ActivityBookingDetail = {
  booking: {
    reference: 'K7MPQ2',
    status: 'confirmed',
    activity_id: 3,
    activity_title: 'Île de Gorée',
    option_title: 'Visite guidée',
    starts_at: '2026-10-28T09:30:00Z',
    timezone: 'Africa/Dakar',
    given_name: 'Awa',
    family_name: 'Sène',
    email: 'awa@example.com',
    phone: '+221771234567',
    adults: 2,
    children: 0,
    total: '30000',
    currency: 'XOF',
    payment_method: 'card',
    payment_status: 'captured',
    refunded: '0',
    created_at: '2026-10-25T12:00:00Z',
  },
  slot_id: 1,
  option_id: 2,
  lang: 'fr',
  adult_price: '15000',
  child_price: null,
  hold_expires_at: '2026-10-25T12:36:00Z',
  confirmed_at: '2026-10-25T12:05:00Z',
  released_at: null,
  cancelled_at: null,
  cancelled_by: null,
  cancel_reason: null,
  payment: { method: 'card', status: 'captured', card_brand: 'visa', card_last4: '4242', receipt_url: null, reference: 'pi_1' },
  refunds: [],
  refundable: '30000',
  review: null,
};

describe('ActivityBookingPage', () => {
  it('annule une réservation payée avec un remboursement partiel', async () => {
    const api = staffApiMock({
      activityBooking: () => of(DETAIL),
      cancelActivityBooking: () => of({ ...DETAIL, booking: { ...DETAIL.booking, status: 'cancelled' as const } }),
    });
    const { element, stable } = await renderPage(ActivityBookingPage, { api, inputs: { reference: 'K7MPQ2' } });
    expect(element.textContent).toContain('visa •••• 4242');

    button(element, 'activity-booking.cancel').click();
    await stable();
    expect(get<HTMLInputElement>(element, 'input[name="amount"]').value).toBe('30000');
    type(get<HTMLInputElement>(element, 'input[name="reason"]'), 'Prestataire indisponible');
    type(get<HTMLInputElement>(element, 'input[name="amount"]'), '20000');
    await stable();
    button(element, 'activity-booking.confirm-cancel').click();
    await stable();
    expect(api.cancelActivityBooking).toHaveBeenCalledWith('K7MPQ2', 'Prestataire indisponible', 20000);
    expect(element.textContent).toContain('activity-bookings.statuses.cancelled');
  });

  it('refuse un remboursement au-delà de ce qui reste', async () => {
    const api = staffApiMock({ activityBooking: () => of(DETAIL) });
    const { element, stable } = await renderPage(ActivityBookingPage, { api, inputs: { reference: 'K7MPQ2' } });
    button(element, 'activity-booking.refund').click();
    await stable();
    type(get<HTMLInputElement>(element, 'input[name="reason"]'), 'Geste');
    type(get<HTMLInputElement>(element, 'input[name="amount"]'), '40000');
    await stable();
    expect(button(element, 'activity-booking.confirm-refund').hasAttribute('disabled')).toBe(true);
  });
});
