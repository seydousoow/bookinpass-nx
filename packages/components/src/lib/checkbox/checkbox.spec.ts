import { Component, signal } from '@angular/core';
import { ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { render } from '../../testing';
import { Checkbox } from './checkbox';

@Component({
  imports: [Checkbox],
  template: `
    <bip-checkbox
      [(checked)]="checked"
      (touch)="touches.set(touches() + 1)"
      [touched]="touched()"
      [invalid]="invalid()"
      [disabled]="disabled()"
      [errors]="errors"
      hint="J’accepte les conditions"
      label="Conditions"
      name="terms"
    />
  `,
})
class Host {
  readonly checked = signal(false);
  readonly touches = signal(0);
  readonly touched = signal(false);
  readonly invalid = signal(false);
  readonly disabled = signal(false);
  readonly errors: readonly WithOptionalFieldTree<ValidationError>[] = [{ kind: 'required', message: 'Obligatoire' }];
}

describe('Checkbox', () => {
  it('relie le libellé à la case', async () => {
    const { element } = await render(Host);
    expect(element.querySelector('input')?.id).toBe('terms');
    expect(element.querySelector('label')?.getAttribute('for')).toBe('terms');
  });

  it('remonte l’état coché et le toucher', async () => {
    const { element, host } = await render(Host);
    const input = element.querySelector('input')!;
    input.click();
    expect(host.checked()).toBe(true);

    input.dispatchEvent(new Event('blur'));
    expect(host.touches()).toBe(1);
  });

  it('reflète la valeur fournie', async () => {
    const { element, host, stable } = await render(Host);
    host.checked.set(true);
    await stable();
    expect(element.querySelector('input')?.checked).toBe(true);
  });

  it('affiche les erreurs une fois touché et invalide, l’indication sinon', async () => {
    const { element, host, stable } = await render(Host);
    expect(element.textContent).toContain('J’accepte les conditions');
    expect(element.textContent).not.toContain('Obligatoire');

    host.touched.set(true);
    host.invalid.set(true);
    await stable();

    expect(element.textContent).toContain('Obligatoire');
    expect(element.querySelector('input')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('se désactive', async () => {
    const { element, host, stable } = await render(Host);
    host.disabled.set(true);
    await stable();
    expect(element.querySelector('input')?.disabled).toBe(true);
  });
});
