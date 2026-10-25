import { Component, signal } from '@angular/core';
import { render } from '../../testing';
import { Textarea } from './textarea';

@Component({
  imports: [Textarea],
  template: `<bip-textarea [(value)]="text" (touch)="touches.set(touches() + 1)" [hint]="hint()" [maxLength]="maxLength()" label="stay.request" name="request" />`,
})
class Host {
  readonly text = signal('');
  readonly touches = signal(0);
  readonly hint = signal<string | undefined>(undefined);
  readonly maxLength = signal<number | undefined>(500);
}

describe('Textarea', () => {
  const setup = async () => {
    const view = await render(Host);
    const field = view.element.querySelector('textarea')!;
    const type = async (text: string) => {
      field.value = text;
      field.dispatchEvent(new Event('input'));
      await view.stable();
    };
    const hint = () => view.element.querySelector('#request-hint')?.textContent;
    return { ...view, field, type, hint };
  };

  it('remonte la saisie et le toucher', async () => {
    const { field, host, type } = await setup();
    await type('Lit bébé');
    expect(host.text()).toBe('Lit bébé');
    field.dispatchEvent(new Event('blur'));
    expect(host.touches()).toBe(1);
  });

  it('compte les caractères utilisés', async () => {
    const { type, hint } = await setup();
    expect(hint()).toBe('0/500');
    await type('Bonjour');
    expect(hint()).toBe('7/500');
  });

  it('accole le compteur à l’indication traduite', async () => {
    const { host, stable, hint } = await setup();
    host.hint.set('stay.request-hint');
    await stable();
    expect(hint()).toBe('stay.request-hint — 0/500');
  });

  it('affiche l’indication seule sans limite de longueur', async () => {
    const { host, stable, hint, field } = await setup();
    host.maxLength.set(undefined);
    host.hint.set('stay.request-hint');
    await stable();
    expect(hint()).toBe('stay.request-hint');
    expect(field.hasAttribute('maxlength')).toBe(false);
  });
});
