import { ApplicationRef } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { APP_CONFIG } from 'configs';
import { IAirlineReference } from 'models';
import { AirlineStore } from './airline.store';

const AIR_SENEGAL: IAirlineReference = {
  iata: 'HC',
  name: 'Air Sénégal',
  logoSymbolUrl: null,
  logoLockupUrl: null,
  conditionsOfCarriageUrl: null,
};

describe('AirlineStore', () => {
  let http: HttpTestingController;
  let store: AirlineStore;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), { provide: APP_CONFIG, useValue: { production: false, apiBaseUrl: '/api' } }],
    });
    store = TestBed.inject(AirlineStore);
    http = TestBed.inject(HttpTestingController);
    // httpResource n'émet sa requête qu'au premier passage de l'effet.
    TestBed.tick();
  });

  afterEach(() => http.verify());

  it('indexe les compagnies par code IATA', async () => {
    http.expectOne('/api/airlines').flush([AIR_SENEGAL]);
    await TestBed.inject(ApplicationRef).whenStable();
    expect(store.byCode().get('HC')).toEqual(AIR_SENEGAL);
  });

  it('reste vide si le chargement échoue', async () => {
    http.expectOne('/api/airlines').flush('indisponible', { status: 503, statusText: 'Service Unavailable' });
    await TestBed.inject(ApplicationRef).whenStable();
    expect(store.byCode().size).toBe(0);
  });
});
