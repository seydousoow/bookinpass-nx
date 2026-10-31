import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Translation } from '@jsverse/transloco';
import { firstValueFrom } from 'rxjs';
import { HttpTranslocoLoader, mergeTranslations } from './transloco-loader';

describe('mergeTranslations', () => {
  it('réunit les branches communes, la valeur de l’application l’emporte', () => {
    const components = { common: { select: 'Sélectionner', loading: 'Chargement' }, picker: { next: 'Suivant' } };
    const app = { common: { loading: 'Chargement…', save: 'Enregistrer' }, app: { title: 'Gares' } };
    expect(mergeTranslations(components, app)).toEqual({
      common: { select: 'Sélectionner', loading: 'Chargement…', save: 'Enregistrer' },
      picker: { next: 'Suivant' },
      app: { title: 'Gares' },
    });
  });

  it('ne modifie pas les traductions reçues', () => {
    const components = { common: { select: 'Sélectionner' } };
    mergeTranslations(components, { common: { save: 'Enregistrer' } });
    expect(components).toEqual({ common: { select: 'Sélectionner' } });
  });
});

describe('HttpTranslocoLoader', () => {
  let http: HttpTestingController;
  let loader: HttpTranslocoLoader;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    http = TestBed.inject(HttpTestingController);
    loader = TestBed.inject(HttpTranslocoLoader);
  });

  afterEach(() => http.verify());

  it('charge les libellés des composants puis ceux de l’application', async () => {
    const result = firstValueFrom(loader.getTranslation('fr'));
    http.expectOne('/i18n/components/fr.json').flush({ common: { select: 'Sélectionner' } });
    http.expectOne('/i18n/fr.json').flush({ common: { save: 'Enregistrer' } });
    expect(await result).toEqual({ common: { select: 'Sélectionner', save: 'Enregistrer' } } satisfies Translation);
  });

  it('reste utilisable sans les libellés des composants', async () => {
    const result = firstValueFrom(loader.getTranslation('en'));
    http.expectOne('/i18n/components/en.json').flush('introuvable', { status: 404, statusText: 'Not Found' });
    http.expectOne('/i18n/en.json').flush({ app: { title: 'Stations' } });
    expect(await result).toEqual({ app: { title: 'Stations' } });
  });
});
