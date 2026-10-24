import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { ICurrencyOption } from 'models';
import { render } from '../../testing';
import { CurrencySelector } from './currency-selector';

@Component({
  imports: [CurrencySelector],
  template: `<bip-currency-selector [(selected)]="currency" [currencies]="currencies" />`,
})
class Host {
  readonly currency = signal('XOF');
  readonly currencies: readonly ICurrencyOption[] = [
    { code: 'XOF', label: 'franc CFA' },
    { code: 'EUR', label: 'euro' },
  ];
}

describe('CurrencySelector', () => {
  const setup = async () => {
    const view = await render(Host);
    const selector = view.fixture.debugElement.query(By.directive(CurrencySelector)).componentInstance as CurrencySelector;
    return { ...view, selector };
  };

  it('affiche la devise choisie', async () => {
    const { element } = await setup();
    expect(element.querySelector('[ngCombobox]')?.textContent).toContain('XOF');
  });

  it('remonte le choix et referme la liste', async () => {
    const { host, selector } = await setup();
    selector.opened.set(true);
    selector.onPick(['EUR']);
    expect(host.currency()).toBe('EUR');
    expect(selector.opened()).toBe(false);
  });

  it('ignore une sélection vide ou multiple', async () => {
    const { host, selector } = await setup();
    selector.onPick([]);
    selector.onPick(['EUR', 'XOF']);
    expect(host.currency()).toBe('XOF');
  });

  it('liste les devises à l’ouverture', async () => {
    const { element, selector, stable } = await setup();
    selector.opened.set(true);
    await stable();
    const options = [...element.querySelectorAll('[ngOption]')].map((o) => [...o.querySelectorAll('span')].map((s) => s.textContent?.trim()));
    expect(options).toEqual([
      ['XOF', 'franc CFA'],
      ['EUR', 'euro'],
    ]);
  });
});
