import { Component, signal } from '@angular/core';
import { form, FormField, min, pattern, required } from '@angular/forms/signals';
import { render } from '../../testing';
import { Input } from './input';

@Component({
  imports: [Input],
  template: `
    <bip-input
      [(value)]="email"
      (touch)="touches.set(touches() + 1)"
      [touched]="touched()"
      [invalid]="invalid()"
      [hidden]="hidden()"
      [prefix]="prefix()"
      hint="form.email-hint"
      label="form.email"
      name="email"
      placeholder="form.email-placeholder"
      type="email" />
  `,
})
class Host {
  readonly email = signal<string | null>(null);
  readonly touches = signal(0);
  readonly touched = signal(false);
  readonly invalid = signal(false);
  readonly hidden = signal(false);
  readonly prefix = signal<string | undefined>(undefined);
}

describe('Input', () => {
  const setup = async () => {
    const view = await render(Host);
    const field = view.element.querySelector('input')!;
    return { ...view, field };
  };

  it('rend un champ natif typé, au placeholder traduit', async () => {
    const { field } = await setup();
    expect(field.type).toBe('email');
    expect(field.id).toBe('email');
    expect(field.placeholder).toBe('form.email-placeholder');
    expect(field.value).toBe('');
  });

  it('remonte la saisie et le toucher', async () => {
    const { field, host } = await setup();
    field.value = 'awa@example.sn';
    field.dispatchEvent(new Event('input'));
    expect(host.email()).toBe('awa@example.sn');
    field.dispatchEvent(new Event('blur'));
    expect(host.touches()).toBe(1);
  });

  it('décrit le champ par son indication, puis par son erreur', async () => {
    const { element, field, host, stable } = await setup();
    expect(field.getAttribute('aria-describedby')).toBe('email-hint');

    host.touched.set(true);
    host.invalid.set(true);
    await stable();

    expect(field.getAttribute('aria-describedby')).toBe('email-error');
    expect(element.querySelector('#email-error')).not.toBeNull();
    expect(field.getAttribute('aria-invalid')).toBe('true');
    expect(field.className).toContain('border-state-error');
  });

  it('laisse la place au préfixe', async () => {
    const { element, field, host, stable } = await setup();
    host.prefix.set('@');
    await stable();
    expect(element.textContent).toContain('@');
    expect(field.className).toContain('pl-9');
  });

  it('se masque', async () => {
    const { element, host, stable } = await setup();
    host.hidden.set(true);
    await stable();
    expect(element.querySelector('bip-input')?.classList).toContain('hidden');
  });

  describe('champs numériques, horaires et contraintes natives', () => {
    @Component({
      imports: [Input],
      template: `
        <bip-input [(value)]="price" label="routes.price" name="price" type="number" [min]="1" [step]="1" />
        <bip-input [(value)]="at" label="routes.departs-at" name="at" type="time" />
        <bip-input [(value)]="username" label="staff.username" name="username" pattern="[a-z0-9._-]+" autocapitalize="none" [minLength]="3" [maxLength]="50" />
      `,
    })
    class Fields {
      readonly price = signal<number | null>(1000);
      readonly at = signal<string | null>(null);
      readonly username = signal<string | null>(null);
    }

    const field = (element: HTMLElement, name: string) => element.querySelector<HTMLInputElement>(`input[name="${name}"]`)!;

    it('remonte un nombre, et null pour un champ vidé', async () => {
      const { element, host } = await render(Fields);
      const price = field(element, 'price');
      expect(price.value).toBe('1000');

      price.value = '2500';
      price.dispatchEvent(new Event('input'));
      expect(host.price()).toBe(2500);

      price.value = '';
      price.dispatchEvent(new Event('input'));
      expect(host.price()).toBeNull();
    });

    it('accepte une heure', async () => {
      const { element, host } = await render(Fields);
      const at = field(element, 'at');
      expect(at.type).toBe('time');
      at.value = '07:30';
      at.dispatchEvent(new Event('input'));
      expect(host.at()).toBe('07:30');
    });

    it('pose les contraintes natives', async () => {
      const { element } = await render(Fields);
      const price = field(element, 'price');
      expect(price.getAttribute('min')).toBe('1');
      expect(price.getAttribute('step')).toBe('1');
      const username = field(element, 'username');
      expect(username.getAttribute('pattern')).toBe('[a-z0-9._-]+');
      expect(username.getAttribute('autocapitalize')).toBe('none');
      expect(username.getAttribute('minlength')).toBe('3');
      expect(username.getAttribute('maxlength')).toBe('50');
    });
  });

  it('reçoit les contraintes des validateurs d’un formulaire signal', async () => {
    @Component({
      imports: [Input, FormField],
      template: `
        <bip-input [formField]="staff.username" label="staff.username" name="username" />
        <bip-input [formField]="staff.capacity" label="routes.capacity" name="capacity" type="number" />
      `,
    })
    class SignalForm {
      readonly model = signal({ username: '', capacity: 50 });
      readonly staff = form(this.model, (path) => {
        required(path.username);
        pattern(path.username, /[a-z0-9._-]+/);
        min(path.capacity, 1);
      });
    }

    const { element } = await render(SignalForm);
    // Le formulaire signal donne lui-même un nom à chaque champ : les champs sont pris dans l'ordre.
    const [username, capacity] = [...element.querySelectorAll<HTMLInputElement>('input')];
    expect(username.getAttribute('pattern')).toBe('[a-z0-9._-]+');
    expect(username.required).toBe(true);
    expect(capacity.getAttribute('min')).toBe('1');
    expect(capacity.value).toBe('50');
  });
});
