import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TranslocoService } from '@jsverse/transloco';
import { APP_CONFIG } from 'configs';
import { ICheckoutSession, PaymentService } from './payment.service';

const SESSION: ICheckoutSession = {
  checkout_session_id: 'cs_test_1',
  client_secret: 'cs_secret',
  publishable_key: 'pk_test',
  amount: '193.69',
  currency: 'EUR',
};

describe('PaymentService', () => {
  let http: HttpTestingController;
  let service: PaymentService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { production: false, apiBaseUrl: '/api' } },
        { provide: TranslocoService, useValue: { getActiveLang: () => 'en' } },
      ],
    });
    service = TestBed.inject(PaymentService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('ouvre une session pour un vol, sans jamais envoyer de montant', () => {
    let session: ICheckoutSession | undefined;
    service.flightCheckout('off/1', [{ id: 'bag_1', quantity: 1 }], '/flight/off', 2).subscribe((s) => (session = s));

    const request = http.expectOne('/api/payments/flights/off%2F1/checkout-session');
    expect(request.request.method).toBe('POST');
    expect(request.request.body).toEqual({ services: [{ id: 'bag_1', quantity: 1 }], return_path: '/flight/off', attempt: 2, locale: 'en' });
    request.flush(SESSION);
    expect(session).toEqual(SESSION);
  });

  it('ouvre une session pour un séjour', () => {
    service.stayCheckout('quo_1', '/stay/quo_1', 1).subscribe();
    const request = http.expectOne('/api/payments/stays/quo_1/checkout-session');
    expect(request.request.body).toEqual({ return_path: '/stay/quo_1', attempt: 1, locale: 'en' });
    request.flush(SESSION);
  });
});
