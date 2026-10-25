import { Component, signal } from '@angular/core';
import { render } from '../../testing';
import { Modal } from './modal';

@Component({
  imports: [Modal],
  template: `
    <bip-modal [(opened)]="opened" (closed)="closes.set(closes() + 1)" [dismissible]="dismissible()" [backdropDismissible]="backdropDismissible()" title="Confirmer">
      <p>Corps</p>
      <button modalFooter>OK</button>
    </bip-modal>
  `,
})
class Host {
  readonly opened = signal(true);
  readonly closes = signal(0);
  readonly dismissible = signal(true);
  readonly backdropDismissible = signal(true);
}

describe('Modal', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  const escape = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));

  it('s’annonce comme un dialogue et bloque le défilement', async () => {
    const { element } = await render(Host);
    const dialog = element.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(dialog.getAttribute('aria-label')).toBe('Confirmer');
    expect(element.querySelector('[modalFooter]')).not.toBeNull();
    expect(document.body.style.overflow).toBe('hidden');
  });

  it('se ferme avec Échap et le signale', async () => {
    const { element, host, stable } = await render(Host);
    escape();
    await stable();
    expect(host.opened()).toBe(false);
    expect(host.closes()).toBe(1);
    expect(element.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.style.overflow).toBe('');
  });

  it('se ferme au clic sur le voile, sauf pour une décision engageante', async () => {
    const { element, host, stable } = await render(Host);
    host.backdropDismissible.set(false);
    await stable();
    element.querySelector<HTMLElement>('bip-overlay')!.click();
    expect(host.opened()).toBe(true);

    host.backdropDismissible.set(true);
    await stable();
    element.querySelector<HTMLElement>('bip-overlay')!.click();
    expect(host.opened()).toBe(false);
  });

  it('ne se ferme ni par Échap ni par bouton quand elle n’est pas refermable', async () => {
    const { element, host, stable } = await render(Host);
    host.dismissible.set(false);
    await stable();
    expect(element.querySelector('header bip-button')).toBeNull();
    escape();
    expect(host.opened()).toBe(true);
  });

  it('se ferme par son bouton', async () => {
    const { element, host } = await render(Host);
    element.querySelector<HTMLElement>('header bip-button')!.click();
    expect(host.opened()).toBe(false);
  });
});
