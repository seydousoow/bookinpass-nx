import { of } from 'rxjs';
import { DepartureDetail, Luggage } from '../../core/models';
import { button, departure, get, pick, renderPage, staffApiMock, staffUser, type } from '../../../testing';
import { DeparturePage } from './departure';

const detail = (over: Partial<DepartureDetail['departure']> = {}): DepartureDetail => ({
  departure: departure(over),
  passengers: [{ code: 'ABCDEFGH23', given_name: 'Awa', family_name: 'Diop', reference: 'BIP123', phone: '+221771234567', scanned_at: null, scanned_by: null }],
  luggage: [],
  incidents: [],
});

const LUGGAGE: Luggage = {
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
  description: null,
  weight_kg: '12.5',
  price: '2000',
  currency: 'XOF',
  status: 'registered',
  registered_by: 'awa',
  created_at: '2026-10-25T06:00:00Z',
  delivered_at: null,
};

describe('DeparturePage', () => {
  const open = (user = staffUser('station_chief'), api = staffApiMock({ departure: () => of(detail()) })) => renderPage(DeparturePage, { api, user, inputs: { id: '3' } });

  it('montre le départ et ses passagers', async () => {
    const { element, api } = await open();
    expect(api.departure).toHaveBeenCalledWith(3);
    expect(element.querySelector('h1')?.textContent).toContain('Dakar → Thiès');
    expect(element.querySelector('tbody')?.textContent).toContain('Diop Awa');
  });

  it('marque le car parti (chef de gare), puis montre le départ renvoyé', async () => {
    const api = staffApiMock({ departure: () => of(detail()), markDeparted: () => of(detail({ departed_at: '2026-10-25T07:04:00Z' })) });
    const { element, stable } = await open(staffUser('station_chief'), api);
    button(element, 'departure.mark-departed').click();
    await stable();
    expect(api.markDeparted).toHaveBeenCalledWith(3);
    expect(element.textContent).toContain('departure.mark-arrived');
  });

  it('ne laisse un contrôleur ni marquer le car ni enregistrer de bagage', async () => {
    const { element } = await open(staffUser('inspector'));
    expect(element.textContent).not.toContain('departure.mark-departed');
    expect(element.textContent).not.toContain('luggage.register');
  });

  it('change les places (responsable)', async () => {
    const api = staffApiMock({ departure: () => of(detail()), resize: () => of(detail({ capacity: 60 })) });
    const { element, stable } = await open(staffUser('manager'), api);
    const capacity = get<HTMLInputElement>(element, 'input[name="capacity"]');
    expect(capacity.value).toBe('50');
    type(capacity, '60');
    await stable();
    button(element, 'common.save').click();
    await stable();
    expect(api.resize).toHaveBeenCalledWith(3, 60);
  });

  it('enregistre un bagage valide et affiche son code d’étiquette', async () => {
    const api = staffApiMock({ departure: () => of(detail()), registerLuggage: () => of(LUGGAGE) });
    const { element, stable } = await open(staffUser('station_chief'), api);
    const form = element.querySelectorAll('form')[0];
    const [sender, senderPhone, , , receiver, receiverPhone, weight, price] = [...form.querySelectorAll<HTMLInputElement>('input:not([role="combobox"])')].filter(
      (input) => input.type !== 'search',
    );
    type(sender, 'Awa Diop');
    type(senderPhone, '771234567');
    type(receiver, 'Moussa Fall');
    type(receiverPhone, '781234567');
    type(weight, '12.5');
    type(price, '2000');
    await stable();
    button(element, 'luggage.register').click();
    await stable();
    expect(api.registerLuggage).toHaveBeenCalledWith(3, {
      sender_name: 'Awa Diop',
      sender_phone: '+221771234567',
      sender_id_number: null,
      receiver_name: 'Moussa Fall',
      receiver_phone: '+221781234567',
      description: null,
      weight_kg: 12.5,
      price: 2000,
    });
    expect(element.querySelector('[role="status"]')?.textContent).toContain('BG234567');
  });

  it('refuse un bagage sans destinataire', async () => {
    const { element, stable, api } = await open();
    button(element, 'luggage.register').click();
    await stable();
    expect(api.registerLuggage).not.toHaveBeenCalled();
    expect(element.textContent).toContain('common.required-field');
  });

  it('signale un incident sur le départ', async () => {
    const api = staffApiMock({ departure: () => of(detail()), reportIncident: () => of({} as never) });
    const { element, fixture, stable } = await open(staffUser('inspector'), api);
    pick(fixture, 0, 'breakdown');
    type(get<HTMLInputElement>(element, 'input[name="incident-text"]'), ' Pneu crevé ');
    await stable();
    button(element, 'incidents.report').click();
    await stable();
    expect(api.reportIncident).toHaveBeenCalledWith({ departure_id: 3, route_id: null, type: 'breakdown', description: 'Pneu crevé' });
    expect(api.departure).toHaveBeenCalledTimes(2);
  });
});
