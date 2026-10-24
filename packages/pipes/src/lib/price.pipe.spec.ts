import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoLocaleService } from '@jsverse/transloco-locale';
import { CurrencyStore } from 'state';
import { formatMoney } from 'utils';
import { PricePipe } from './price.pipe';

/** Taux fictif : 1 XOF = 0,002 EUR ; aucune autre devise n'est servie. */
function makePipe() {
  const selected = signal('XOF');
  const convertFromContract = jest.fn((amount: number, currency: string) => (currency === 'XOF' ? amount : currency === 'EUR' ? amount * 0.002 : null));
  TestBed.configureTestingModule({
    providers: [PricePipe, { provide: CurrencyStore, useValue: { selected, convertFromContract } }, { provide: TranslocoLocaleService, useValue: { getLocale: () => 'fr-SN' } }],
  });
  return { pipe: TestBed.inject(PricePipe), selected, convertFromContract };
}

describe('PricePipe', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('rend une chaîne vide sans montant', () => {
    const { pipe } = makePipe();
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform(Number.NaN)).toBe('');
  });

  it('affiche le montant contractuel dans la devise choisie', () => {
    const { pipe, selected } = makePipe();
    expect(pipe.transform(10000)).toBe(formatMoney(10000, 'XOF', 'fr-SN'));
    selected.set('EUR');
    expect(pipe.transform(10000)).toBe(formatMoney(20, 'EUR', 'fr-SN'));
  });

  it('respecte une devise imposée par l’appelant', () => {
    const { pipe } = makePipe();
    expect(pipe.transform(10000, 'EUR')).toBe(formatMoney(20, 'EUR', 'fr-SN'));
  });

  it('montre le montant en XOF plutôt qu’un prix inventé si le taux manque', () => {
    const { pipe } = makePipe();
    expect(pipe.transform(10000, 'JPY')).toBe(formatMoney(10000, 'XOF', 'fr-SN'));
  });

  it('ne recalcule pas pour les mêmes entrées', () => {
    const { pipe, convertFromContract } = makePipe();
    pipe.transform(10000);
    pipe.transform(10000);
    expect(convertFromContract).toHaveBeenCalledTimes(1);
  });
});
