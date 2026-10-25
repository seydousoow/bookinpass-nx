import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { departure, optionsOf, pick, renderPage, staffApiMock, STATIONS, staffUser, type, get } from '../../testing';
import { DeparturesPage } from './departures';

describe('DeparturesPage', () => {
  it('liste les départs du jour, avec leur état', async () => {
    const api = staffApiMock({
      departures: () => of([departure({ id: 3 }), departure({ id: 4, departed_at: '2026-10-25T07:05:00Z', open_incidents: 1 })]),
    });
    const { element } = await renderPage(DeparturesPage, { api });
    const links = [...element.querySelectorAll('a')];
    expect(links.map((a) => a.getAttribute('href'))).toEqual(['/departures/3', '/departures/4']);
    expect(links[0].textContent).toContain('07:00');
    expect(links[0].querySelector('bip-badge')?.textContent?.trim()).toBe('departures.status.planned');
    expect(links[1].textContent).toContain('departures.status.departed');
    expect(links[1].textContent).toContain('departures.incidents');
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
    expect(element.querySelector('bip-system-state')?.textContent).toContain('departures.empty');
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
