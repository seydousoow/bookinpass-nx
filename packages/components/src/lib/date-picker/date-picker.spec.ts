import { Component, signal } from '@angular/core';
import { IDateRangeValue, IsoDate } from 'models';
import { render } from '../../testing';
import { DatePicker, DatePickerMode } from './date-picker';

@Component({
  imports: [DatePicker],
  template: `<bip-date-picker [(value)]="dates" [mode]="mode()" [minDate]="minDate()" [unavailable]="unavailable()" label="search.dates" name="dates" />`,
})
class Host {
  readonly dates = signal<IDateRangeValue>({ start: null, end: null });
  readonly mode = signal<DatePickerMode>('single');
  readonly minDate = signal<IsoDate | null>(null);
  readonly unavailable = signal<readonly IsoDate[]>([]);
}

describe('DatePicker', () => {
  // Seule l'horloge est figée (octobre 2026) : les timers restent réels pour la détection de changements.
  beforeAll(() =>
    jest.useFakeTimers({
      now: new Date(2026, 9, 10),
      doNotFake: [
        'nextTick',
        'setImmediate',
        'clearImmediate',
        'setTimeout',
        'clearTimeout',
        'setInterval',
        'clearInterval',
        'queueMicrotask',
        'requestAnimationFrame',
        'cancelAnimationFrame',
        'requestIdleCallback',
        'cancelIdleCallback',
        'hrtime',
        'performance',
      ],
    }),
  );
  afterAll(() => jest.useRealTimers());

  const setup = async () => {
    const view = await render(Host);
    const trigger = () => view.element.querySelector<HTMLButtonElement>('bip-dropdown button')!;
    trigger().click();
    await view.stable();
    const day = (n: number) => [...view.element.querySelectorAll<HTMLButtonElement>('td button')].find((b) => b.textContent?.trim() === String(n))!;
    const pick = async (n: number) => {
      day(n).click();
      await view.stable();
    };
    return { ...view, trigger, day, pick };
  };

  it('affiche le mois courant', async () => {
    const { element } = await setup();
    expect(element.querySelector('p.capitalize')?.textContent?.toLowerCase()).toContain('octobre');
    expect(element.querySelectorAll('td button')).toHaveLength(31);
  });

  it('choisit une date simple et se referme', async () => {
    const { host, pick, element } = await setup();
    await pick(20);
    expect(host.dates()).toEqual({ start: '2026-10-20', end: null });
    expect(element.querySelector('td')).toBeNull();
  });

  it('choisit une plage en deux clics', async () => {
    const { host, stable, pick } = await setup();
    host.mode.set('range');
    await stable();

    await pick(12);
    expect(host.dates()).toEqual({ start: '2026-10-12', end: null });
    await pick(18);
    expect(host.dates()).toEqual({ start: '2026-10-12', end: '2026-10-18' });
  });

  it('recommence la plage si la fin précède le début', async () => {
    const { host, stable, pick } = await setup();
    host.mode.set('range');
    await stable();
    await pick(18);
    await pick(12);
    expect(host.dates()).toEqual({ start: '2026-10-12', end: null });
  });

  it('refuse les dates hors bornes ou indisponibles', async () => {
    const { host, stable, day } = await setup();
    host.minDate.set('2026-10-10' as IsoDate);
    host.unavailable.set(['2026-10-15' as IsoDate]);
    await stable();
    expect(day(9).disabled).toBe(true);
    expect(day(15).disabled).toBe(true);
    expect(day(16).disabled).toBe(false);
  });

  it('change de mois, sans revenir avant la date minimale', async () => {
    const { element, host, stable } = await setup();
    host.minDate.set('2026-10-01' as IsoDate);
    await stable();
    const [previous, next] = [...element.querySelectorAll<HTMLElement>('bip-button')];
    expect(previous.getAttribute('aria-disabled')).toBe('true');

    next.click();
    await stable();
    expect(element.querySelector('p.capitalize')?.textContent?.toLowerCase()).toContain('novembre');
  });

  it('efface la sélection', async () => {
    const { element, host, stable } = await setup();
    host.dates.set({ start: '2026-10-20' as IsoDate, end: null });
    await stable();
    const buttons = [...element.querySelectorAll<HTMLElement>('bip-button')];
    buttons[buttons.length - 1].click();
    expect(host.dates()).toEqual({ start: null, end: null });
  });
});
