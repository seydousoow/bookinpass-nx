import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { APP_CONFIG } from 'configs/configs/app-config.token';
import { StaffApi } from './api';

describe('StaffApi', () => {
  let http: HttpTestingController;
  let api: StaffApi;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: APP_CONFIG, useValue: { production: false, apiBaseUrl: 'https://api.example.com/api' } }],
    });
    http = TestBed.inject(HttpTestingController);
    api = TestBed.inject(StaffApi);
  });

  afterEach(() => http.verify());

  it('appelle l’API configurée par le déploiement', () => {
    api.me().subscribe();
    expect(http.expectOne('https://api.example.com/api/staff/auth/me').request.method).toBe('GET');
  });

  it('n’envoie la gare que si elle est choisie', () => {
    api.departures('2026-10-25', null).subscribe();
    const all = http.expectOne((r) => r.url.endsWith('/staff/departures'));
    expect(all.request.params.keys()).toEqual(['date']);
    all.flush([]);

    api.departures('2026-10-25', 4).subscribe();
    const one = http.expectOne((r) => r.url.endsWith('/staff/departures'));
    expect(one.request.params.get('station_id')).toBe('4');
    one.flush([]);
  });

  it('encode les codes dans l’URL', () => {
    api.scanTicket('AB/CD').subscribe();
    http.expectOne('https://api.example.com/api/staff/tickets/AB%2FCD/scan').flush({});
  });

  it('envoie les corps attendus par le serveur', () => {
    api.changePassword('ancien', 'nouveau-mot').subscribe();
    expect(http.expectOne((r) => r.url.endsWith('/auth/password')).request.body).toEqual({ current_password: 'ancien', new_password: 'nouveau-mot' });

    api.resetPassword(7, 'Provisoire23').subscribe();
    expect(http.expectOne((r) => r.url.endsWith('/users/7/password')).request.body).toEqual({ temporary_password: 'Provisoire23' });

    api.searchBookings('DIOP').subscribe();
    expect(http.expectOne((r) => r.url.endsWith('/staff/bookings')).request.params.get('q')).toBe('DIOP');

    api.refunds(true).subscribe();
    expect(http.expectOne((r) => r.url.endsWith('/staff/refunds')).request.params.get('all')).toBe('true');
  });
});
