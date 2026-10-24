import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideTranslocoLocale } from '@jsverse/transloco-locale';
import { loadStripe } from '@stripe/stripe-js';
import { ICheckoutSession } from '../payment.service';
import { IPaymentAuthorisation, PaymentForm } from './payment-form';

jest.mock('@stripe/stripe-js', () => ({ loadStripe: jest.fn() }));

const SESSION: ICheckoutSession = {
  checkout_session_id: 'cs_test_1',
  client_secret: 'cs_secret',
  publishable_key: 'pk_test',
  amount: '193.69',
  currency: 'EUR',
};

type TStatus = 'open' | 'complete' | 'expired';

/** Stripe.js factice : le formulaire Checkout et ses événements sont pilotés par le test. */
function fakeStripe(options: { status?: TStatus; loadError?: boolean } = {}) {
  const handlers: Record<string, (event?: unknown) => void> = {};
  const form = {
    on: jest.fn((name: string, handler: (event?: unknown) => void) => (handlers[name] = handler)),
    mount: jest.fn(),
    destroy: jest.fn(),
  };
  const confirm = jest.fn();
  const checkout = {
    loadActions: jest.fn(async () =>
      options.loadError
        ? { type: 'error' }
        : { type: 'success', actions: { getSession: () => ({ status: { type: options.status ?? 'open' } }), confirm } },
    ),
    createForm: jest.fn(() => form),
  };
  const stripe = { initCheckoutFormSdk: jest.fn(() => checkout) };
  jest.mocked(loadStripe).mockResolvedValue(stripe as never);
  return { stripe, checkout, form, confirm, handlers, options };
}

@Component({
  imports: [PaymentForm],
  template: `<bip-payment-form [session]="session()" (authorised)="authorisations.push($event)" />`,
})
class Host {
  readonly session = signal(SESSION);
  readonly authorisations: IPaymentAuthorisation[] = [];
}

describe('PaymentForm', () => {
  const setup = async () => {
    await TestBed.configureTestingModule({
      imports: [Host, TranslocoTestingModule.forRoot({ langs: { fr: {} }, translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' } })],
      providers: [provideTranslocoLocale({ langToLocaleMapping: { fr: 'fr-FR' } })],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    const element: HTMLElement = fixture.nativeElement;
    /** Laisse s'achever le montage asynchrone (Stripe.js, loadActions), puis la détection de changements. */
    const settle = async () => {
      await new Promise((resolve) => setTimeout(resolve));
      await fixture.whenStable();
    };
    await settle();
    return { fixture, element, host: fixture.componentInstance, settle };
  };

  afterEach(() => jest.mocked(loadStripe).mockReset());

  it('monte le formulaire Checkout dans la langue du site', async () => {
    const { stripe, checkout, form, handlers } = fakeStripe();
    const { element, settle } = await setup();

    expect(loadStripe).toHaveBeenCalledWith('pk_test', { locale: 'fr' });
    expect(stripe.initCheckoutFormSdk).toHaveBeenCalledWith(expect.objectContaining({ clientSecret: 'cs_secret' }));
    expect(checkout.createForm).toHaveBeenCalledWith({ layout: 'expanded' });
    expect(form.mount).toHaveBeenCalled();
    expect(element.querySelector('bip-spinner')).not.toBeNull();

    handlers['ready']();
    await settle();
    expect(element.querySelector('bip-spinner')).toBeNull();
  });

  it('reconnaît une session déjà payée au montage', async () => {
    const { checkout } = fakeStripe({ status: 'complete' });
    const { element, host } = await setup();
    expect(checkout.createForm).not.toHaveBeenCalled();
    expect(host.authorisations).toEqual([{ checkoutSessionId: 'cs_test_1' }]);
    expect(element.querySelector('[role="status"]')?.textContent).toContain('payment.authorised');
  });

  it('signale une session expirée', async () => {
    fakeStripe({ status: 'expired' });
    const { element } = await setup();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('payment.errors.expired');
  });

  it('propose de réessayer si Stripe est indisponible', async () => {
    const { form, options } = fakeStripe({ loadError: true });
    const { element, settle } = await setup();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('payment.errors.unavailable');

    // L'instance Stripe.js est gardée : c'est le chargement de la session qui réussit cette fois.
    options.loadError = false;
    element.querySelector<HTMLButtonElement>('[role="alert"] button')!.click();
    await settle();
    expect(form.mount).toHaveBeenCalled();
    expect(element.querySelector('[role="alert"]')).toBeNull();
  });

  it('émet l’autorisation une fois le paiement confirmé', async () => {
    const { confirm, handlers, form } = fakeStripe();
    confirm.mockResolvedValue({ type: 'success', session: { status: { type: 'complete' } } });
    const { host, settle } = await setup();

    handlers['confirm']({});
    await settle();

    expect(confirm).toHaveBeenCalledWith({ formConfirmEvent: {}, redirect: 'if_required' });
    expect(host.authorisations).toEqual([{ checkoutSessionId: 'cs_test_1' }]);
    expect(form.destroy).toHaveBeenCalled();
  });

  it('affiche le message de refus de Stripe et laisse réessayer', async () => {
    const { confirm, handlers } = fakeStripe();
    confirm.mockResolvedValue({ type: 'error', error: { message: 'Votre carte a été refusée.' } });
    const { element, host, settle } = await setup();

    handlers['confirm']({});
    await settle();

    expect(element.querySelector('[role="alert"]')?.textContent).toContain('Votre carte a été refusée.');
    expect(host.authorisations).toEqual([]);
  });

  it('remonte le formulaire pour une nouvelle session', async () => {
    const { stripe } = fakeStripe();
    const { host, settle } = await setup();
    host.session.set({ ...SESSION, client_secret: 'cs_secret_2' });
    await settle();
    expect(stripe.initCheckoutFormSdk).toHaveBeenLastCalledWith(expect.objectContaining({ clientSecret: 'cs_secret_2' }));
  });
});
