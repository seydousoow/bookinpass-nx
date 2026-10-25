import { of } from 'rxjs';
import { Route } from '../core/models';
import { button, optionsOf, pick, renderPage, staffApiMock, STATIONS, type, get } from '../../testing';
import { RoutesPage } from './routes';

const ROUTE: Route = {
  id: 9,
  code: 'DKR-THS',
  network: 'interurban',
  origin: STATIONS[0],
  destination: STATIONS[1],
  price: '3000',
  fee: '500',
  currency: 'XOF',
  capacity: 50,
  active: true,
  schedules: [{ id: 21, day_of_week: 1, departs_at: '07:00', last_departure: null }],
};

describe('RoutesPage', () => {
  const open = (overrides: Parameters<typeof staffApiMock>[0] = {}) => {
    const api = staffApiMock({ stations: () => of(STATIONS), routes: () => of([ROUTE]), ...overrides });
    return renderPage(RoutesPage, { api, user: undefined });
  };

  it('crée une ligne entre deux gares, une fois départ et arrivée choisis', async () => {
    const { element, fixture, stable, api } = await open({ createRoute: () => of(ROUTE) });
    expect(button(element, 'routes.create').hasAttribute('disabled')).toBe(true);
    expect(optionsOf(fixture, 2).map((o) => o.value)).toEqual(['interurban', 'international', 'airport']);
    // Sélecteurs : départ (0), arrivée (1), réseau (2).
    pick(fixture, 0, 1);
    pick(fixture, 1, 2);
    pick(fixture, 2, 'airport');
    await stable();
    button(element, 'routes.create').click();
    await stable();
    expect(api.createRoute).toHaveBeenCalledWith({ origin_station_id: 1, destination_station_id: 2, network: 'airport', price: 1000, capacity: 50 });
  });

  it('enregistre le prix, les places et la mise en vente d’une ligne', async () => {
    const { element, stable, api } = await open({ updateRoute: () => of(ROUTE) });
    type(get<HTMLInputElement>(element, 'input[name="price-9"]'), '3500');
    get<HTMLInputElement>(element, 'input[name="active-9"]').click();
    await stable();
    button(get(element, 'article'), 'common.save').click();
    await stable();
    expect(api.updateRoute).toHaveBeenCalledWith(9, { price: 3500, capacity: 50, active: false });
  });

  it('exige au moins un jour pour un horaire', async () => {
    const { element, stable, api } = await open();
    type(get<HTMLInputElement>(element, 'input[name="at-9"]'), '08:30');
    await stable();
    button(element, 'routes.add-schedule').click();
    await stable();
    expect(api.addSchedule).not.toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('errors.days-required');
  });

  it('ajoute un horaire sur les jours cochés, puis supprime un horaire', async () => {
    const { element, stable, api } = await open({ addSchedule: () => of(ROUTE), deleteSchedule: () => of(ROUTE) });
    get<HTMLInputElement>(element, 'input[name="day-9-1"]').click();
    get<HTMLInputElement>(element, 'input[name="day-9-5"]').click();
    type(get<HTMLInputElement>(element, 'input[name="at-9"]'), '08:30');
    type(get<HTMLInputElement>(element, 'input[name="last-9"]'), '18:00');
    await stable();
    button(element, 'routes.add-schedule').click();
    await stable();
    expect(api.addSchedule).toHaveBeenCalledWith(9, { days: [1, 5], departs_at: '08:30', last_departure: '18:00' });

    get<HTMLButtonElement>(element, 'button[aria-label="routes.remove-schedule"]').click();
    await stable();
    expect(api.deleteSchedule).toHaveBeenCalledWith(21);
  });
});
