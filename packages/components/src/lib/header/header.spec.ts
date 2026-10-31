import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { ICurrencyOption } from 'models';
import { render } from '../../testing';
import { Header, NavEntry } from './header';

@Component({
  imports: [Header],
  template: ` <bip-header [(currentLang)]="lang" [(currentCurrency)]="currency" [languages]="languages" [currencies]="currencies()" [entries]="entries" /> `,
})
class Host {
  readonly lang = signal('fr');
  readonly currency = signal('XOF');
  readonly languages = ['fr', 'en'];
  readonly currencies = signal<readonly ICurrencyOption[]>([]);
  readonly entries: readonly NavEntry[] = [
    { labelKey: 'nav.flights', route: '/flights' },
    { labelKey: 'nav.activities', route: '/activities', disabled: true },
  ];
}

describe('Header', () => {
  const setup = () => render(Host, [provideRouter([])]);
  const langButtons = (element: HTMLElement) => [...element.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')];

  it('rend la navigation, une entrée désactivée sans lien', async () => {
    const { element } = await setup();
    const nav = element.querySelector('nav')!;
    expect(nav.querySelector('a[href="/flights"]')?.textContent?.trim()).toBe('nav.flights');
    expect(nav.querySelector('[aria-disabled="true"]')?.textContent?.trim()).toBe('nav.activities');
  });

  it('change de langue', async () => {
    const { element, host, stable } = await setup();
    expect(langButtons(element).map((b) => b.getAttribute('aria-pressed'))).toEqual(['true', 'false']);

    langButtons(element)[1].click();
    await stable();

    expect(host.lang()).toBe('en');
    expect(langButtons(element).map((b) => b.getAttribute('aria-pressed'))).toEqual(['false', 'true']);
  });

  it('n’affiche le choix de devise que s’il y en a', async () => {
    const { element, host, stable } = await setup();
    expect(element.querySelector('bip-currency-selector')).toBeNull();
    host.currencies.set([{ code: 'XOF', label: 'franc CFA' }]);
    await stable();
    expect(element.querySelector('bip-currency-selector')).not.toBeNull();
  });

  it('ouvre le menu mobile', async () => {
    const { element, stable } = await setup();
    expect(element.querySelectorAll('nav')).toHaveLength(1);
    element.querySelector<HTMLElement>('bip-button')!.click();
    await stable();
    expect(element.querySelectorAll('nav')).toHaveLength(2);
  });

  describe('sans devises, avec des actions (back-office)', () => {
    @Component({ template: '' })
    class Page {}

    @Component({
      imports: [Header],
      template: `
        <bip-header [(currentLang)]="lang" [entries]="entries" [languages]="languages">
          <button class="logout" headerActions type="button">Se déconnecter</button>
        </bip-header>
      `,
    })
    class Backoffice {
      readonly lang = signal('fr');
      readonly languages = ['fr', 'en'];
      readonly entries: readonly NavEntry[] = [
        { labelKey: 'nav.departures', route: '/' },
        { labelKey: 'nav.scan', route: '/scan' },
      ];
    }

    it('affiche les actions projetées, sans choix de devise', async () => {
      const { element } = await render(Backoffice, [provideRouter([])]);
      expect(element.querySelector('header .logout')?.textContent).toBe('Se déconnecter');
      expect(element.querySelector('bip-currency-selector')).toBeNull();
    });

    it('signale la section courante aux lecteurs d’écran', async () => {
      const { element, stable } = await render(Backoffice, [provideRouter([{ path: 'scan', component: Page }])]);
      await TestBed.inject(Router).navigateByUrl('/scan');
      await stable();
      const nav = element.querySelector('nav')!;
      expect(nav.querySelector('a[href="/scan"]')?.getAttribute('aria-current')).toBe('page');
      expect(nav.querySelector('a[href="/"]')?.getAttribute('aria-current')).toBeNull();
    });
  });
});
