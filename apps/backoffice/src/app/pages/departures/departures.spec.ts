import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { button, departure, get, optionsOf, pick, renderPage, staffApiMock, staffUser, STATIONS, type } from '../../../testing';
import { byOrigin, DeparturesPage } from './departures';

describe('DeparturesPage', () => {
  it('liste les départs du jour, avec leur état', async () => {
    const api = staffApiMock({
      departures: () => of([departure({ id: 3 }), departure({ id: 4, departed_at: '2026-10-25T07:05:00Z', open_incidents: 1 })]),
    });
    const { element } = await renderPage(DeparturesPage, { api });
    const links = [...element.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/departures/3', '/departures/4']);
    expect(links[0].textContent).toContain('07:00');
    expect(links[0].querySelector('bo-status')?.textContent?.trim()).toBe('departures.status.planned');
    expect(links[1].textContent).toContain('departures.status.departed');
    expect(links[1].textContent).toContain('departures.incidents');
  });

  it('regroupe les départs par gare de départ, en accordéon', async () => {
    const thies = { ...STATIONS[1] };
    const api = staffApiMock({
      departures: () =>
        of([departure({ id: 3 }), departure({ id: 4, origin: thies, destination: STATIONS[0], passengers: 5, scanned: 2 }), departure({ id: 5, open_incidents: 2 })]),
    });
    const { element, stable } = await renderPage(DeparturesPage, { api });
    const panels = [...element.querySelectorAll('details')];
    expect(panels.map((p) => p.querySelector('summary')?.textContent)).toEqual([expect.stringContaining('Dakar'), expect.stringContaining('Thiès')]);
    expect(panels[0].querySelectorAll('a')).toHaveLength(2);
    expect(panels.every((p) => !p.open)).toBe(true);

    button(element, 'departures.expand-all').click();
    await stable();
    expect([...element.querySelectorAll('details')].every((p) => p.open)).toBe(true);
    expect(byOrigin([departure({ id: 3 }), departure({ id: 5, open_incidents: 2, passengers: 3, scanned: 1 })])[0]).toEqual(
      expect.objectContaining({ passengers: 15, scanned: 5, incidents: 2 }),
    );
  });

  it('filtre par jour, et par gare pour un responsable', async () => {
    const api = staffApiMock({ stations: () => of(STATIONS) });
    const { element, fixture, stable } = await renderPage(DeparturesPage, { api, user: staffUser('manager') });
    expect(api.departures).toHaveBeenLastCalledWith(expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/), null);
    expect(optionsOf(fixture, 0).map((o) => o.value)).toEqual([null, 1, 2]);

    type(get<HTMLInputElement>(element, 'input[type="date"]'), '2026-11-02');
    await stable();
    pick(fixture, 0, 2);
    await stable();
    expect(api.departures).toHaveBeenLastCalledWith('2026-11-02', 2);
  });

  it('ne propose pas le choix de gare au personnel d’une gare', async () => {
    const { element } = await renderPage(DeparturesPage, { user: staffUser('inspector') });
    expect(element.querySelector('bip-select')).toBeNull();
  });

  it('annonce une journée sans départ', async () => {
    const { element } = await renderPage(DeparturesPage);
    expect(element.querySelector('bo-empty')?.textContent).toContain('departures.empty');
  });

  it('propose de réessayer si l’API échoue', async () => {
    let calls = 0;
    const api = staffApiMock({ departures: () => (++calls === 1 ? throwError(() => new HttpErrorResponse({ status: 500 })) : of([departure()])) });
    const { element, stable } = await renderPage(DeparturesPage, { api });
    expect(element.textContent).toContain('errors.unexpected');
    get<HTMLElement>(element, 'bip-system-state bip-button').click();
    await stable();
    expect(element.querySelectorAll('a[href^="/departures/"]')).toHaveLength(1);
  });
});
