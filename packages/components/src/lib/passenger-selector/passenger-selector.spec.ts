import { Component, signal } from '@angular/core';
import { IPassengerCount } from 'models';
import { render } from '../../testing';
import { PassengerSelector } from './passenger-selector';

@Component({
  imports: [PassengerSelector],
  template: `<bip-passenger-selector [(value)]="count" (touch)="touches.set(touches() + 1)" />`,
})
class Host {
  readonly count = signal<IPassengerCount>({ adults: 1, children: 0, infants: 0 });
  readonly touches = signal(0);
}

describe('PassengerSelector', () => {
  const setup = async () => {
    const view = await render(Host);
    view.element.querySelector<HTMLButtonElement>('bip-dropdown button')!.click();
    await view.stable();
    /** Boutons − et + de chaque ligne : adultes, enfants, bébés. */
    const steppers = () => [...view.element.querySelectorAll<HTMLElement>('bip-button')];
    const press = async (index: number) => {
      steppers()[index].click();
      await view.stable();
    };
    return { ...view, steppers, press };
  };

  it('résume la composition dans le déclencheur', async () => {
    const { element } = await setup();
    expect(element.querySelector('bip-dropdown button')?.textContent).toContain('search.passenger.adult.detailed');
  });

  it('ajoute et retire des passagers', async () => {
    const { host, press } = await setup();
    await press(3);
    expect(host.count()).toEqual({ adults: 1, children: 1, infants: 0 });
    await press(2);
    expect(host.count()).toEqual({ adults: 1, children: 0, infants: 0 });
    expect(host.touches()).toBe(2);
  });

  it('désactive les pas qui casseraient la composition', async () => {
    const { steppers, press } = await setup();
    // `<bip-button>` n'est pas un `<button>` natif : il s'annonce désactivé par aria-disabled. Un seul adulte : impossible de le retirer.
    expect(steppers()[0].getAttribute('aria-disabled')).toBe('true');

    await press(5);
    // Un adulte et un bébé : plus de second bébé possible.
    expect(steppers()[5].getAttribute('aria-disabled')).toBe('true');
  });

  it('signale une composition invalide reçue de l’extérieur', async () => {
    const { element, host, stable } = await setup();
    host.count.set({ adults: 1, children: 0, infants: 2 });
    await stable();
    expect(element.querySelector('[role="alert"]')?.textContent).toBe('search.passenger.infant.requirement');
  });
});
