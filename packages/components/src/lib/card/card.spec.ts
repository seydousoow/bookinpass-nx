import { Component, signal } from '@angular/core';
import { render } from '../../testing';
import { Card } from './card';

@Component({
  imports: [Card],
  template: `
    <bip-card [title]="title()" [subtitle]="subtitle()" [interactive]="interactive()" [flat]="flat()" padding="lg">
      <button cardActions>Action</button>
      <p>Corps</p>
      <footer cardFooter>Pied</footer>
    </bip-card>
  `,
})
class Host {
  readonly title = signal<string | undefined>('card.title');
  readonly subtitle = signal<string | undefined>(undefined);
  readonly interactive = signal(false);
  readonly flat = signal(false);
}

describe('Card', () => {
  it('affiche le titre traduit et projette les zones', async () => {
    const { element } = await render(Host);
    expect(element.querySelector('h3')?.textContent).toBe('card.title');
    expect(element.querySelector('header [cardActions]')).not.toBeNull();
    expect(element.textContent).toContain('Corps');
    expect(element.textContent).toContain('Pied');
  });

  it('affiche le sous-titre seulement s’il est fourni', async () => {
    const { element, host, stable } = await render(Host);
    expect(element.querySelector('header p')).toBeNull();
    host.subtitle.set('card.subtitle');
    await stable();
    expect(element.querySelector('header p')?.textContent).toBe('card.subtitle');
  });

  it('n’affiche pas d’en-tête sans titre', async () => {
    const { element, host, stable } = await render(Host);
    host.title.set(undefined);
    await stable();
    expect(element.querySelector('header')).toBeNull();
  });

  it('reflète les variantes interactive et plate', async () => {
    const { element, host, stable } = await render(Host);
    const card = element.querySelector('bip-card')!;
    expect(card.className).toContain('p-6');
    expect(card.classList).toContain('shadow-card');
    expect(card.className).not.toContain('cursor-pointer');

    host.interactive.set(true);
    host.flat.set(true);
    await stable();

    expect(card.className).toContain('cursor-pointer');
    expect(card.classList).not.toContain('shadow-card');
  });
});
