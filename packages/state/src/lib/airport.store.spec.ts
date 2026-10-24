import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { APP_CONFIG } from 'configs';
import { IAirport } from 'models';
import { AirportStore } from './airport.store';

const DSS: IAirport = {
  iata: 'DSS',
  name: 'Blaise Diagne',
  cityName: 'Dakar',
  cityCode: 'DKR',
  state: 'Dakar',
  countryName: 'Sénégal',
  countryCode: 'SN',
};

describe('AirportStore', () => {
  let http: HttpTestingController;
  let store: AirportStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: APP_CONFIG, useValue: { production: false, apiBaseUrl: '/api' } }],
    });
    store = TestBed.inject(AirportStore);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('charge le référentiel dès sa création', () => {
    expect(store.loading()).toBe(true);
    http.expectOne('/api/airports').flush([DSS]);
    expect(store.airports()).toEqual([DSS]);
    expect(store.loading()).toBe(false);
  });

  it('garde une liste vide si le chargement échoue', () => {
    http.expectOne('/api/airports').flush('indisponible', { status: 503, statusText: 'Service Unavailable' });
    expect(store.airports()).toEqual([]);
    expect(store.loading()).toBe(false);
  });
});
