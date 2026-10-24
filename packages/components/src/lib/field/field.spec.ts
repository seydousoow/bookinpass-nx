import { Component, signal } from '@angular/core';
import { ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { render } from '../../testing';
import { Field } from './field';

@Component({
  imports: [Field],
  template: `
    <bip-field
      label="form.email"
      name="email"
      [hint]="hint()"
      [errors]="errors()"
      [showErrors]="showErrors()"
      [required]="required()"
      [hideLabel]="hideLabel()"
    >
      <input id="email" />
    </bip-field>
  `,
})
class Host {
  readonly hint = signal<string | undefined>('form.email-hint');
  readonly errors = signal<readonly WithOptionalFieldTree<ValidationError>[]>([{ kind: 'required', message: 'form.required' }]);
  readonly showErrors = signal(false);
  readonly required = signal(false);
  readonly hideLabel = signal(false);
}

describe('Field', () => {
  it('relie le libellé traduit au champ', async () => {
    const { element } = await render(Host);
    const label = element.querySelector('label')!;
    expect(label.getAttribute('for')).toBe('email');
    expect(label.textContent?.trim()).toBe('form.email');
    expect(label.classList).not.toContain('sr-only');
  });

  it('garde le libellé pour les lecteurs d’écran quand il est masqué', async () => {
    const { element, host, stable } = await render(Host);
    host.hideLabel.set(true);
    await stable();
    expect(element.querySelector('label')?.classList).toContain('sr-only');
  });

  it('marque un champ obligatoire', async () => {
    const { element, host, stable } = await render(Host);
    expect(element.querySelector('label span')).toBeNull();
    host.required.set(true);
    await stable();
    expect(element.querySelector('label span')?.textContent).toBe('*');
  });

  it('affiche l’indication, puis les erreurs à la place', async () => {
    const { element, host, stable } = await render(Host);
    expect(element.querySelector('#email-hint')?.textContent).toBe('form.email-hint');

    host.showErrors.set(true);
    await stable();

    expect(element.querySelector('#email-hint')).toBeNull();
    // Les champs pointent leur aria-describedby sur `<name>-error`.
    expect(element.querySelector('#email-error')?.textContent).toContain('form.required');
  });
});
