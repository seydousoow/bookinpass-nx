import { Component, signal } from '@angular/core';
import { ISelectOption } from 'models';
import { render } from '../../testing';
import { RadioGroup } from './radio-group';

@Component({
  imports: [RadioGroup],
  template: `
    <bip-radio-group
      [(value)]="trip"
      (touch)="touches.set(touches() + 1)"
      [options]="options"
      [appearance]="appearance()"
      [disabled]="disabled()"
      label="search.trip"
      name="trip"
    />
  `,
})
class Host {
  readonly trip = signal<string | null>('round');
  readonly touches = signal(0);
  readonly appearance = signal<'list' | 'segmented'>('list');
  readonly disabled = signal(false);
  readonly options: readonly ISelectOption<string>[] = [
    { value: 'round', label: 'search.round' },
    { value: 'oneway', label: 'search.oneway' },
    { value: 'multi', label: 'search.multi', disabled: true },
  ];
}

describe('RadioGroup', () => {
  const radios = (element: HTMLElement) => [...element.querySelectorAll<HTMLInputElement>('input[type="radio"]')];

  it('rend un groupe natif, libellé par sa légende', async () => {
    const { element } = await render(Host);
    expect(element.querySelector('legend')?.textContent?.trim()).toBe('search.trip');
    expect(radios(element).map((r) => r.id)).toEqual(['trip-0', 'trip-1', 'trip-2']);
    expect(radios(element).map((r) => r.checked)).toEqual([true, false, false]);
    expect(radios(element)[2].disabled).toBe(true);
  });

  it('remonte le choix et le toucher', async () => {
    const { element, host } = await render(Host);
    radios(element)[1].click();
    expect(host.trip()).toBe('oneway');
    radios(element)[1].dispatchEvent(new Event('blur'));
    expect(host.touches()).toBe(1);
  });

  it('ne change pas de valeur désactivé', async () => {
    const { element, host, stable } = await render(Host);
    host.disabled.set(true);
    await stable();
    radios(element)[1].dispatchEvent(new Event('change'));
    expect(host.trip()).toBe('round');
  });

  it('s’affiche en segments', async () => {
    const { element, host, stable } = await render(Host);
    host.appearance.set('segmented');
    await stable();
    expect(element.querySelector('[role="radiogroup"]')).not.toBeNull();
    expect(element.querySelector('label')?.className).toContain('bg-brand-primary');
  });
});
