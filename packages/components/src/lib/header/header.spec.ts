import { Component, signal } from '@angular/core';
import { provideRouter } from '@angular/router';
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
});
