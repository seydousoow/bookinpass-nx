import { TestBed } from '@angular/core/testing';
import { TranslocoService } from '@jsverse/transloco';
import { button, renderPage, staffUser } from '../../../testing';
import { Main, sectionOf } from './main';

describe('Shell', () => {
  afterEach(() => localStorage.clear());

  const sections = (element: HTMLElement) => [...element.querySelectorAll('nav a')].map((a) => a.textContent?.trim()).filter((v, i, all) => all.indexOf(v) === i);
  const groups = (element: HTMLElement) => [...element.querySelectorAll('nav p')].map((p) => p.textContent?.trim());

  it('ne montre à un contrôleur que les sections de gare', async () => {
    const { element } = await renderPage(Main, { user: staffUser('inspector') });
    expect(sections(element)).toEqual(['nav.home', 'nav.departures', 'nav.incidents', 'nav.bookings']);
    expect(groups(element)).toEqual(['nav.groups.workspace', 'nav.groups.sales']);
  });

  it('montre tout aux responsables, groupé par métier', async () => {
    const { element } = await renderPage(Main, { user: staffUser('manager') });
    expect(sections(element)).toEqual([
      'nav.home',
      'nav.departures',
      'nav.luggage',
      'nav.incidents',
      'nav.bookings',
      'nav.refunds',
      'nav.activities',
      'nav.activity-bookings',
      'nav.activity-reviews',
      'nav.routes',
      'nav.staff',
    ]);
    expect(groups(element)).toEqual(['nav.groups.workspace', 'nav.groups.sales', 'nav.groups.tourism', 'nav.groups.configuration']);
  });

  it('replie le menu et retient le choix sur l’appareil', async () => {
    const { element, stable } = await renderPage(Main);
    element.querySelector<HTMLButtonElement>('button[aria-label="app.collapse-menu"]')!.click();
    await stable();
    expect(localStorage.getItem('bo.sidebar-collapsed')).toBe('1');
    expect(element.querySelector('button[aria-label="app.expand-menu"]')).not.toBeNull();
  });

  it('ouvre le menu en tiroir sur mobile', async () => {
    const { element, stable } = await renderPage(Main);
    element.querySelector<HTMLButtonElement>('button[aria-label="app.open-menu"]')!.click();
    await stable();
    expect(element.querySelector('[role="dialog"] nav')).not.toBeNull();
  });

  it('affiche le membre connecté et sa gare', async () => {
    const { element } = await renderPage(Main, { user: staffUser('station_chief') });
    expect(element.textContent).toContain('Awa Diop');
    expect(element.textContent).toContain('roles.station_chief');
    expect(element.textContent).toContain('Gare des Baux maraîchers');
  });

  it('change de langue et la retient sur l’appareil', async () => {
    const { element, stable } = await renderPage(Main);
    button(element, 'en').click();
    await stable();
    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('en');
    expect(localStorage.getItem('bo.lang')).toBe('en');
  });

  it('déconnecte puis revient à la connexion', async () => {
    const { element, stable, api, navigate } = await renderPage(Main);
    button(element, 'app.logout').click();
    await stable();
    expect(api.logout).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });
});

describe('sectionOf', () => {
  const all = [
    { key: 'home', route: '/', icon: '' },
    { key: 'activities', route: '/activities', icon: '' },
    { key: 'activity-bookings', route: '/activity-bookings', icon: '' },
  ];

  it('retrouve la section d’une page de détail', () => {
    expect(sectionOf('/activity-bookings/ABC123?x=1', all)?.key).toBe('activity-bookings');
    expect(sectionOf('/activities/new', all)?.key).toBe('activities');
  });

  it('ne confond pas l’accueil avec les autres pages', () => {
    expect(sectionOf('/#control', all)?.key).toBe('home');
    expect(sectionOf('/inconnu', all)).toBeUndefined();
  });
});
