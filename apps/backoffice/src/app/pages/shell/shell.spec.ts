import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { button, renderPage, staffUser } from '../../../testing';
import { Shell } from './shell';

describe('Shell', () => {
  afterEach(() => localStorage.clear());

  const sections = (element: HTMLElement) => [...element.querySelectorAll('nav a')].map((a) => a.textContent?.trim()).filter((v, i, all) => all.indexOf(v) === i);

  it('ne montre à un contrôleur que les sections de gare', async () => {
    const { element } = await renderPage(Shell, { user: staffUser('inspector') });
    expect(sections(element)).toEqual(['nav.departures', 'nav.scan', 'nav.incidents', 'nav.bookings']);
  });

  it('montre tout aux responsables', async () => {
    const { element } = await renderPage(Shell, { user: staffUser('manager') });
    expect(sections(element)).toEqual(['nav.departures', 'nav.scan', 'nav.luggage', 'nav.incidents', 'nav.bookings', 'nav.refunds', 'nav.routes', 'nav.staff']);
  });

  it('affiche le membre connecté et sa gare', async () => {
    const { element } = await renderPage(Shell, { user: staffUser('station_chief') });
    expect(element.textContent).toContain('Awa Diop');
    expect(element.textContent).toContain('roles.station_chief');
    expect(element.textContent).toContain('Gare des Baux maraîchers');
  });

  it('change de langue et la retient sur l’appareil', async () => {
    const { element, stable } = await renderPage(Shell);
    button(element, 'en').click();
    await stable();
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('en');
    expect(localStorage.getItem('bo.lang')).toBe('en');
  });

  it('déconnecte puis revient à la connexion', async () => {
    const { element, stable, api, navigate } = await renderPage(Shell);
    button(element, 'app.logout').click();
    await stable();
    expect(api.logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});
