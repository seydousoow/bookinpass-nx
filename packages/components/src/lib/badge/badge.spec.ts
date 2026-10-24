import { Component, signal } from '@angular/core';
import { render } from '../../testing';
import { Badge, BadgeTone } from './badge';

@Component({
  imports: [Badge],
  template: `<bip-badge [tone]="tone()" [size]="size()">Nouveau</bip-badge>`,
})
class Host {
  readonly tone = signal<BadgeTone>('neutral');
  readonly size = signal<'sm' | 'md' | 'lg'>('md');
}

describe('Badge', () => {
  it('projette son contenu', async () => {
    const { element } = await render(Host);
    expect(element.querySelector('bip-badge')?.textContent).toBe('Nouveau');
  });

  it('applique le ton et la taille', async () => {
    const { element, host, stable } = await render(Host);
    const badge = element.querySelector('bip-badge')!;
    expect(badge.className).toContain('bg-surface-muted');

    host.tone.set('error');
    host.size.set('lg');
    await stable();

    expect(badge.className).toContain('text-state-error');
    expect(badge.className).toContain('text-sm');
    expect(badge.className).not.toContain('bg-surface-muted');
  });
});
