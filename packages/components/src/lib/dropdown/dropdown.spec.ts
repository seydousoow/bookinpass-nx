import { Component, signal } from '@angular/core';
import { render } from '../../testing';
import { Dropdown } from './dropdown';

@Component({
  imports: [Dropdown],
  template: `
    <bip-dropdown [(opened)]="opened" [value]="value()" [disabled]="disabled()" [error]="false" label="Voyageurs" name="travellers">
      <p class="panel">Contenu</p>
    </bip-dropdown>
  `,
})
class Host {
  readonly opened = signal(false);
  readonly value = signal<string | undefined>(undefined);
  readonly disabled = signal(false);
}

describe('Dropdown', () => {
  const trigger = (element: HTMLElement) => element.querySelector<HTMLButtonElement>('button')!;

  it('affiche le texte d’attente sans valeur, puis la valeur', async () => {
    const { element, host, stable } = await render(Host);
    expect(trigger(element).textContent).toContain('common.select');
    host.value.set('2 adultes');
    await stable();
    expect(trigger(element).textContent).toContain('2 adultes');
  });

  it('ouvre et ferme le panneau au clic', async () => {
    const { element, host, stable } = await render(Host);
    expect(element.querySelector('.panel')).toBeNull();

    trigger(element).click();
    await stable();
    expect(host.opened()).toBe(true);
    expect(element.querySelector('.panel')).not.toBeNull();
    expect(trigger(element).getAttribute('aria-expanded')).toBe('true');

    trigger(element).click();
    await stable();
    expect(host.opened()).toBe(false);
  });

  it('se ferme avec Échap', async () => {
    const { element, host, stable } = await render(Host);
    host.opened.set(true);
    await stable();

    element.querySelector('bip-dropdown')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    await stable();
    expect(host.opened()).toBe(false);
  });

  it('ne s’ouvre pas désactivé', async () => {
    const { element, host, stable } = await render(Host);
    host.disabled.set(true);
    await stable();
    expect(trigger(element).disabled).toBe(true);
  });
});
