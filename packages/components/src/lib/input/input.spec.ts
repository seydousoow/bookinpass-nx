import { Component, signal } from '@angular/core';
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
      type="email"
    />
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
});
