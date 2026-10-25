import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { isValidPhone, PhoneInput } from './phone-input';

@Component({
  imports: [PhoneInput],
  template: `<bip-phone-input [(value)]="phone" label="phone" />`,
})
class Host {
  readonly phone = signal('');
}

describe('PhoneInput', () => {
  const setup = async (initial = '') => {
    await TestBed.configureTestingModule({
      imports: [Host, TranslocoTestingModule.forRoot({ langs: { fr: {} }, translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' } })],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    fixture.componentInstance.phone.set(initial);
    await fixture.whenStable();
    const element: HTMLElement = fixture.nativeElement;
    const field = element.querySelector<HTMLInputElement>('input[type="tel"]')!;
    const type = async (text: string) => {
      field.value = text;
      field.dispatchEvent(new InputEvent('input', { inputType: 'insertText' }));
      await fixture.whenStable();
    };
    return { fixture, element, field, type, host: fixture.componentInstance };
  };

  it('met en forme à la frappe et rend le numéro E.164 du pays choisi', async () => {
    const { field, type, host, element } = await setup();
    expect(element.textContent).toContain('+221');

    await type('771234567');

    expect(field.value).toBe('77 123 45 67');
    expect(host.phone()).toBe('+221771234567');
    expect(isValidPhone(host.phone())).toBe(true);
  });

  it('bascule de pays sur un numéro international collé', async () => {
    const { field, type, host, element } = await setup();

    await type('+33 6 12 34 56 78');

    expect(host.phone()).toBe('+33612345678');
    expect(element.textContent).toContain('+33');
    expect(field.value).toBe('06 12 34 56 78');
  });

  it('relit une valeur venue du formulaire (coordonnées mémorisées)', async () => {
    const { field, element } = await setup('+14155552671');

    expect(element.textContent).toContain('+1');
    expect(field.value).toBe('(415) 555-2671');
  });

  it('émet un numéro incomplet, refusé par la validation, et rien sans chiffre', async () => {
    const { type, host } = await setup();

    await type('77');
    expect(host.phone()).toBe('+22177');
    expect(isValidPhone(host.phone())).toBe(false);

    await type('');
    expect(host.phone()).toBe('');
  });

  it('n’émet plus rien une fois détruit (blur d’un champ retiré du DOM avec le focus)', async () => {
    const { fixture } = await setup();
    const phone = fixture.debugElement.query(By.directive(PhoneInput)).componentInstance as unknown as { onBlur(): void };
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    fixture.destroy();
    phone.onBlur();
    // Angular signale une émission après destruction par un avertissement NG0953, pas par une exception.
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('NG0953'));
    warn.mockRestore();
  });

  it('referme la liste des pays après un choix sans émission tardive d’@angular/aria', async () => {
    // jsdom n'implémente pas scrollIntoView, appelé par la liste pour l'option active.
    Element.prototype.scrollIntoView = () => undefined;
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
    const { fixture, element, host } = await setup();
    // Dans le document : le focus et le focusout doivent réellement se produire.
    document.body.appendChild(element);
    const pause = () => new Promise((resolve) => setTimeout(resolve, 20));

    element.querySelector<HTMLButtonElement>('button')!.click();
    await fixture.whenStable();
    await pause();
    document.querySelector<HTMLInputElement>('input[ngCombobox]')!.focus();
    const france = [...document.querySelectorAll<HTMLElement>('[ngOption]')].find((o) => o.textContent?.includes('+33'))!;
    france.click();
    // commit() referme la liste au tour suivant, puis le setTimeout de focusout du combobox s'exécute.
    await pause();
    await fixture.whenStable();

    expect(document.querySelector('[ngOption]')).toBeNull();
    expect(element.textContent).toContain('+33');
    expect(host.phone()).toBe('');
    expect(warn).not.toHaveBeenCalledWith(expect.stringContaining('NG0953'));
    warn.mockRestore();
    element.remove();
  });
});
