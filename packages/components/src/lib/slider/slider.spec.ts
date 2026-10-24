import { Component, signal } from '@angular/core';
import { provideTranslocoLocale } from '@jsverse/transloco-locale';
import { render } from '../../testing';
import { PriceRange, Slider } from './slider';

@Component({
  imports: [Slider],
  template: `<bip-slider [(value)]="range" [min]="0" [max]="1000" [step]="50" currency="EUR" />`,
})
class Host {
  readonly range = signal<PriceRange>({ min: 200, max: 800 });
}

describe('Slider', () => {
  const setup = async () => {
    const view = await render(Host, [provideTranslocoLocale({ langToLocaleMapping: { fr: 'fr-FR' } })]);
    const [min, max] = [...view.element.querySelectorAll<HTMLInputElement>('input[type="range"]')];
    const slide = async (input: HTMLInputElement, value: number) => {
      input.value = String(value);
      input.dispatchEvent(new Event('input'));
      await view.stable();
    };
    return { ...view, min, max, slide };
  };

  it('positionne la plage sélectionnée', async () => {
    const { element } = await setup();
    const range = element.querySelector<HTMLElement>('.bg-brand-primary')!;
    expect(range.style.left).toBe('20%');
    expect(range.style.right).toBe('20%');
  });

  it('déplace les bornes', async () => {
    const { host, min, max, slide } = await setup();
    await slide(min, 300);
    await slide(max, 600);
    expect(host.range()).toEqual({ min: 300, max: 600 });
  });

  it('empêche les bornes de se croiser', async () => {
    const { host, min, max, slide } = await setup();
    await slide(min, 900);
    expect(host.range()).toEqual({ min: 750, max: 800 });

    await slide(max, 100);
    expect(host.range()).toEqual({ min: 750, max: 800 });
  });

  it('affiche les bornes dans la devise', async () => {
    const { element } = await setup();
    expect(element.textContent).toContain('€');
  });
});
