import { of } from 'rxjs';
import { Incident, Route } from '../../core/models';
import { button, get, pick, renderPage, staffApiMock, staffUser, STATIONS, type } from '../../../testing';
import { IncidentsPage } from './incidents';

const INCIDENT: Incident = {
  id: 8,
  route_code: 'DKR-THS',
  origin: 'Dakar',
  destination: 'Thiès',
  departure_id: 3,
  departs_at: '2026-10-25T07:00:00Z',
  type: 'delay',
  description: 'Retard de 20 minutes',
  reported_by: 'awa',
  reported_at: '2026-10-25T07:10:00Z',
  resolved_at: null,
  resolution: null,
};

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
  schedules: [],
};

describe('IncidentsPage', () => {
  it('montre les incidents ouverts, puis tous', async () => {
    const api = staffApiMock({ incidents: () => of([INCIDENT]) });
    const { element, stable } = await renderPage(IncidentsPage, { api, user: staffUser('inspector') });
    expect(api.incidents).toHaveBeenLastCalledWith(true, null);
    expect(element.textContent).toContain('Retard de 20 minutes');
    button(element, 'common.all').click();
    await stable();
    expect(api.incidents).toHaveBeenLastCalledWith(false, null);
  });

  it('clôt un incident (chef de gare)', async () => {
    const api = staffApiMock({ incidents: () => of([INCIDENT]), resolveIncident: () => of({ ...INCIDENT, resolved_at: '2026-10-25T08:00:00Z' }) });
    const { element, stable } = await renderPage(IncidentsPage, { api, user: staffUser('station_chief') });
    get<HTMLElement>(element, 'tbody tr').click();
    await stable();
    type(get<HTMLInputElement>(element, 'textarea[name="resolution-8"]'), ' Car de remplacement ');
    await stable();
    button(element, 'incidents.resolve').click();
    await stable();
    expect(api.resolveIncident).toHaveBeenCalledWith(8, 'Car de remplacement');
  });

  it('ne laisse pas un contrôleur clore ni signaler sur une ligne', async () => {
    const api = staffApiMock({ incidents: () => of([INCIDENT]) });
    const { element, stable } = await renderPage(IncidentsPage, { api, user: staffUser('inspector') });
    get<HTMLElement>(element, 'tbody tr').click();
    await stable();
    expect(element.textContent).toContain('Retard de 20 minutes');
    expect(element.textContent).not.toContain('incidents.resolve');
    expect(element.textContent).not.toContain('incidents.new');
  });

  it('signale un incident sur une ligne (responsable)', async () => {
    const api = staffApiMock({ routes: () => of([ROUTE]), reportIncident: () => of(INCIDENT) });
    const { element, fixture, stable } = await renderPage(IncidentsPage, { api, user: staffUser('manager') });
    button(element, 'incidents.new').click();
    await stable();
    expect(button(element, 'incidents.report').hasAttribute('disabled')).toBe(true);
    // Sélecteurs : filtre de type (0), gare (1), puis dans le tiroir : ligne (2), type (3).
    pick(fixture, 2, 9);
    pick(fixture, 3, 'breakdown');
    type(get<HTMLInputElement>(element, 'textarea[name="description"]'), 'Car en panne');
    await stable();
    button(element, 'incidents.report').click();
    await stable();
    expect(api.reportIncident).toHaveBeenCalledWith({ departure_id: null, route_id: 9, type: 'breakdown', description: 'Car en panne' });
    expect(element.querySelector('textarea[name="description"]')).toBeNull();
  });

  it('filtre par type sans rappeler le serveur', async () => {
    const api = staffApiMock({ incidents: () => of([INCIDENT, { ...INCIDENT, id: 9, type: 'breakdown', description: 'Pneu' }]) });
    const { element, fixture, stable } = await renderPage(IncidentsPage, { api, user: staffUser('inspector') });
    expect(element.querySelectorAll('tbody tr')).toHaveLength(2);
    pick(fixture, 0, 'breakdown');
    await stable();
    expect(element.querySelectorAll('tbody tr')).toHaveLength(1);
    expect(api.incidents).toHaveBeenCalledTimes(1);
  });
});
