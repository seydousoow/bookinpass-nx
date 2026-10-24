import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { IAirport } from 'models';
import { render } from '../../testing';
import { LocationField } from './location-field';

const airport = (iata: string, name: string, cityCode: string, cityName: string): IAirport => ({
  iata,
  name,
  cityCode,
  cityName,
  state: '',
  countryName: 'Sénégal',
  countryCode: 'SN',
});

const AIRPORTS = [
  airport('DSS', 'Blaise Diagne', 'DKR', 'Dakar'),
  airport('DKR', 'Léopold Sédar Senghor', 'DKR', 'Dakar'),
  airport('ZIG', 'Ziguinchor', 'ZIG', 'Ziguinchor'),
];

@Component({
  imports: [LocationField],
  template: `<bip-location-field [(value)]="place" [airports]="airports" label="search.origin" name="origin" />`,
})
class Host {
  readonly place = signal<string | null>(null);
  readonly airports = AIRPORTS;
}

/** Accès aux membres protégés pilotés par le combobox, que jsdom ne sait pas animer. */
interface LocationFieldInternals {
  groups(): readonly { cityCode: string; airports: readonly IAirport[] }[];
  query: { set(value: string): void; (): string };
  onPick(codes: string[]): void;
}

describe('LocationField', () => {
  const setup = async () => {
    const view = await render(Host);
    const field = view.fixture.debugElement.query(By.directive(LocationField)).componentInstance as unknown as LocationFieldInternals & LocationField;
    return { ...view, field };
  };

  it('regroupe les aéroports par ville', async () => {
    const { field } = await setup();
    expect(field.groups().map((g) => [g.cityCode, g.airports.map((a) => a.iata)])).toEqual([
      ['DKR', ['DSS', 'DKR']],
      ['ZIG', ['ZIG']],
    ]);
  });

  it('filtre à partir de deux caractères', async () => {
    const { field } = await setup();
    field.query.set('z');
    expect(field.groups()).toHaveLength(2);
    field.query.set('zigu');
    expect(field.groups().map((g) => g.cityCode)).toEqual(['ZIG']);
  });

  it('choisit un aéroport', async () => {
    const { field, host } = await setup();
    field.onPick(['airport:DSS']);
    expect(host.place()).toBe('DSS');
    expect(field.query()).toBe('Blaise Diagne (DSS)');
  });

  it('choisit une ville entière', async () => {
    const { field, host } = await setup();
    field.onPick(['city:DKR']);
    expect(host.place()).toBe('DKR');
    expect(field.query()).toBe('Dakar (DKR)');
  });

  it('ignore un code inconnu ou mal formé', async () => {
    const { field, host } = await setup();
    field.onPick(['airport:XXX']);
    field.onPick(['DSS']);
    field.onPick([]);
    expect(host.place()).toBeNull();
  });

  it('affiche la valeur reçue de l’extérieur', async () => {
    const { field, host, stable } = await setup();
    host.place.set('ZIG');
    await stable();
    expect(field.query()).toBe('Ziguinchor (ZIG)');
  });

  it('s’efface', async () => {
    const { field, host } = await setup();
    field.onPick(['airport:DSS']);
    field.clear();
    expect(host.place()).toBeNull();
    expect(field.query()).toBe('');
  });
});
