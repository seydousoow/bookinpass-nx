import { Component, signal } from '@angular/core';
import { render } from '../../testing';
import { Spinner } from './spinner';

@Component({
  imports: [Spinner],
  template: `<bip-spinner [showLabel]="showLabel()" label="search.loading" />`,
})
class Host {
  readonly showLabel = signal(false);
}

describe('Spinner', () => {
  it('s’annonce comme un statut', async () => {
    const { element } = await render(Host);
    const spinner = element.querySelector('bip-spinner')!;
    expect(spinner.getAttribute('role')).toBe('status');
    expect(spinner.getAttribute('aria-live')).toBe('polite');
  });

  it('garde le libellé traduit pour les lecteurs d’écran, visible sur demande', async () => {
    const { element, host, stable } = await render(Host);
    const label = element.querySelector('span')!;
    expect(label.textContent).toBe('search.loading');
    expect(label.classList).toContain('sr-only');

    host.showLabel.set(true);
    await stable();
    expect(label.classList).not.toContain('sr-only');
  });
});
