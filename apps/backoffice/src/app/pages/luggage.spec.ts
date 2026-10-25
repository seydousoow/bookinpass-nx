import { of } from 'rxjs';
import { Luggage } from '../core/models';
import { button, renderPage, staffApiMock, staffUser, type, get } from '../../testing';
import { LuggagePage } from './luggage';

const BAG: Luggage = {
  code: 'BG234567',
  departure_id: 3,
  origin: 'Dakar',
  destination: 'Thiès',
  departs_at: '2026-10-25T07:00:00Z',
  sender_name: 'Awa Diop',
  sender_phone: '+221771234567',
  sender_id_number: null,
  receiver_name: 'Moussa Fall',
  receiver_phone: '+221781234567',
  description: 'Valise',
  weight_kg: '12.5',
  price: '2000',
  currency: 'XOF',
  status: 'registered',
  registered_by: 'awa',
  created_at: '2026-10-25T06:00:00Z',
  delivered_at: null,
};

describe('LuggagePage', () => {
  it('liste les bagages du jour', async () => {
    const api = staffApiMock({ luggage: () => of([BAG]) });
    const { element } = await renderPage(LuggagePage, { api, user: staffUser('station_chief') });
    expect(element.textContent).toContain('BG234567');
    expect(element.textContent).toContain('Moussa Fall');
  });

  it('retrouve un bagage par son code d’étiquette (8 caractères)', async () => {
    const api = staffApiMock({ findLuggage: () => of(BAG) });
    const { element, stable } = await renderPage(LuggagePage, { api });
    const field = get<HTMLInputElement>(element, 'input[name="code"]');
    type(field, 'bg2345');
    await stable();
    expect(button(element, 'luggage.find').hasAttribute('disabled')).toBe(true);
    type(field, 'bg234567');
    await stable();
    button(element, 'luggage.find').click();
    await stable();
    expect(api.findLuggage).toHaveBeenCalledWith('BG234567');
    expect(element.querySelector('.border-brand-primary')?.textContent).toContain('BG234567');
  });

  it('remet un bagage au destinataire et recharge la liste', async () => {
    const api = staffApiMock({ luggage: () => of([BAG]), deliverLuggage: () => of({ ...BAG, status: 'delivered' as const, delivered_at: '2026-10-25T09:00:00Z' }) });
    const { element, stable } = await renderPage(LuggagePage, { api });
    button(element, 'luggage.deliver').click();
    await stable();
    expect(api.deliverLuggage).toHaveBeenCalledWith('BG234567');
    expect(api.luggage).toHaveBeenCalledTimes(2);
  });
});
