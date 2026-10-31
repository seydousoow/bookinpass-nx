import { of } from 'rxjs';
import { DeskBooking } from '../../core/models';
import { button, get, renderPage, staffApiMock, staffUser, type } from '../../../testing';
import { BookingsPage } from './bookings';

const BOOKING: DeskBooking = {
  reference: 'BIP123',
  status: 'confirmed',
  origin: 'Dakar',
  destination: 'Thiès',
  departure_id: 3,
  departs_at: '2026-10-25T07:00:00Z',
  email: 'awa@example.sn',
  phone: '+221771234567',
  total: '3500',
  currency: 'XOF',
  payment_method: 'mobile_money',
  payment_status: 'succeeded',
  created_at: '2026-10-20T10:00:00Z',
  confirmed_at: '2026-10-20T10:01:00Z',
  tickets: [{ given_name: 'Awa', family_name: 'Diop', code: 'ABCDEFGH23', scanned_at: null }],
};

describe('BookingsPage', () => {
  it('cherche à partir de deux caractères', async () => {
    const api = staffApiMock({ searchBookings: () => of([BOOKING]) });
    const { element, stable } = await renderPage(BookingsPage, { api });
    const query = get<HTMLInputElement>(element, 'input');
    type(query, 'D');
    await stable();
    expect(button(element, 'bookings.search').hasAttribute('disabled')).toBe(true);

    type(query, ' Diop ');
    await stable();
    button(element, 'bookings.search').click();
    await stable();
    expect(api.searchBookings).toHaveBeenCalledWith('Diop');
    expect(element.textContent).toContain('BIP123');
    expect(element.textContent).toContain('ABCDEFGH23');
    expect(element.textContent).toContain('bookings.not-scanned');
  });

  it('renvoie les billets d’une réservation payée (chef de gare)', async () => {
    const api = staffApiMock({ searchBookings: () => of([BOOKING]), resendTickets: () => of(BOOKING) });
    const { element, stable } = await renderPage(BookingsPage, { api, user: staffUser('station_chief') });
    type(get<HTMLInputElement>(element, 'input'), 'BIP123');
    await stable();
    button(element, 'bookings.search').click();
    await stable();
    button(element, 'bookings.resend').click();
    await stable();
    expect(api.resendTickets).toHaveBeenCalledWith('BIP123');
    expect(element.querySelector('[role="status"]')?.textContent).toContain('BIP123 → awa@example.sn');
  });

  it('ne propose pas le renvoi à un contrôleur', async () => {
    const api = staffApiMock({ searchBookings: () => of([BOOKING]) });
    const { element, stable } = await renderPage(BookingsPage, { api, user: staffUser('inspector') });
    type(get<HTMLInputElement>(element, 'input'), 'BIP123');
    await stable();
    button(element, 'bookings.search').click();
    await stable();
    expect(element.textContent).not.toContain('bookings.resend');
  });
});
