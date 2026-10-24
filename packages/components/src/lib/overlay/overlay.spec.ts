import { Component, signal } from '@angular/core';
import { render } from '../../testing';
import { Overlay } from './overlay';

@Component({
  imports: [Overlay],
  template: `<bip-overlay (clicked)="clicks.set(clicks() + 1)" />`,
})
class Host {
  readonly clicks = signal(0);
}

describe('Overlay', () => {
  it('signale le clic sans rien fermer lui-même', async () => {
    const { element, host } = await render(Host);
    element.querySelector<HTMLElement>('bip-overlay')!.click();
    expect(host.clicks()).toBe(1);
  });

  it('est masqué aux technologies d’assistance', async () => {
    const { element } = await render(Host);
    expect(element.querySelector('bip-overlay')?.getAttribute('aria-hidden')).toBe('true');
  });
});
