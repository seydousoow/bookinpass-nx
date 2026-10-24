import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoLocaleService } from '@jsverse/transloco-locale';
import { CurrencyStore } from 'state';
import { formatMoney } from 'utils';
import { MoneyPipe } from './money.pipe';

/** Taux fictif : 1 EUR = 500 XOF ; aucune autre conversion n'est servie. */
function makePipe() {
  const selected = signal('XOF');
  const convert = (amount: number, from: string, to: string) => {
    if (from === to) {
      return amount;
    }
    if (from === 'EUR' && to === 'XOF') {
      return amount * 500;
    }
    return null;
  };
  TestBed.configureTestingModule({
    providers: [MoneyPipe, { provide: CurrencyStore, useValue: { selected, convert } }, { provide: TranslocoLocaleService, useValue: { getLocale: () => 'fr-SN' } }],
  });
  return { pipe: TestBed.inject(MoneyPipe), selected };
}

describe('MoneyPipe', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('rend une chaîne vide sans montant valide ou sans devise', () => {
    const { pipe } = makePipe();
    expect(pipe.transform(null, 'EUR')).toBe('');
    expect(pipe.transform(undefined, 'EUR')).toBe('');
    expect(pipe.transform('', 'EUR')).toBe('');
    expect(pipe.transform('abc', 'EUR')).toBe('');
    expect(pipe.transform('799.00', null)).toBe('');
  });

  it('convertit le montant fournisseur dans la devise choisie', () => {
    const { pipe } = makePipe();
    expect(pipe.transform('799.00', 'EUR')).toBe(formatMoney(399500, 'XOF', 'fr-SN', 'narrowSymbol'));
  });

  it('garde la devise d’origine si le taux manque', () => {
    const { pipe, selected } = makePipe();
    selected.set('USD');
    expect(pipe.transform(799, 'EUR')).toBe(formatMoney(799, 'EUR', 'fr-SN', 'narrowSymbol'));
  });

  it('suit le changement de devise', () => {
    const { pipe, selected } = makePipe();
    selected.set('EUR');
    expect(pipe.transform(799, 'EUR')).toBe(formatMoney(799, 'EUR', 'fr-SN', 'narrowSymbol'));
    selected.set('XOF');
    expect(pipe.transform(799, 'EUR')).toBe(formatMoney(399500, 'XOF', 'fr-SN', 'narrowSymbol'));
  });
});
