import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { IPayDunyaMethod, IPayDunyaPayment } from '../paydunya';
import { PayDunyaForm } from './paydunya-form';

const METHODS: IPayDunyaMethod[] = [
  { id: 'paydunya-card', country: null, dial_code: null, otp: false },
  { id: 'wave-senegal', country: 'SN', dial_code: '221', otp: false },
  { id: 'orange-money-ci', country: 'CI', dial_code: '225', otp: true },
];

@Component({
  imports: [PayDunyaForm],
  template: `<bip-paydunya-form (pay)="paid.set($event)" [methods]="methods()" />`,
})
class Host {
  readonly methods = signal<IPayDunyaMethod[]>(METHODS);
  readonly paid = signal<IPayDunyaPayment | null>(null);
}

async function render(methods: IPayDunyaMethod[] = METHODS) {
  await TestBed.configureTestingModule({
    imports: [Host, TranslocoTestingModule.forRoot({ langs: { fr: {} }, translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' } })],
  }).compileComponents();
  const fixture = TestBed.createComponent(Host);
  fixture.componentInstance.methods.set(methods);
  fixture.detectChanges();
  await fixture.whenStable();
  const element = fixture.nativeElement as HTMLElement;
  const stable = async () => {
    fixture.detectChanges();
    await fixture.whenStable();
  };
  const choose = async (value: string) => {
    element.querySelector<HTMLInputElement>(`input[type="radio"][value="${value}"]`)?.click();
    await stable();
  };
  const type = async (name: string, value: string) => {
    const input = element.querySelector<HTMLInputElement>(`input[name="${name}"]`);
    if (!input) throw new Error(`no input ${name}`);
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await stable();
  };
  const submit = async () => {
    element.querySelector('form')?.dispatchEvent(new Event('submit'));
    await stable();
  };
  return { element, host: fixture.componentInstance, choose, type, submit, stable };
}

describe('PayDunyaForm', () => {
  it('propose les pays des moyens, la carte sous « Monde »', async () => {
    const { element } = await render();
    expect([...element.querySelectorAll('input[name^="paydunya-country"]')].length).toBe(3);
  });

  it('envoie le numéro national derrière l’indicatif imposé', async () => {
    const { element, host, type, submit } = await render([METHODS[1]]);
    expect(element.textContent).toContain('+221');
    await type('paydunya-phone', '+221 77 123 45 67');
    await submit();
    expect(host.paid()).toEqual({ method: 'wave-senegal', phone: '771234567', otp: null });
  });

  it('bloque un numéro faux ou un code manquant', async () => {
    const { element, host, type, submit } = await render([METHODS[2]]);
    await type('paydunya-phone', '0501234567');
    await submit();
    expect(host.paid()).toBeNull();
    expect(element.querySelectorAll('[role="alert"]').length).toBe(2);

    await type('paydunya-phone', '07 07 12 34 56');
    await type('paydunya-otp', '4821');
    await submit();
    expect(host.paid()).toEqual({ method: 'orange-money-ci', phone: '0707123456', otp: '4821' });
  });

  it('carte PayDunya : aucun numéro demandé', async () => {
    const { element, host, submit } = await render([METHODS[0]]);
    expect(element.querySelector('input[name="paydunya-phone"]')).toBeNull();
    await submit();
    expect(host.paid()).toEqual({ method: 'paydunya-card', phone: null, otp: null });
  });
});
