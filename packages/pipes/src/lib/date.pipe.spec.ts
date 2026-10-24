import { TestBed } from '@angular/core/testing';
import { TranslocoLocaleService } from '@jsverse/transloco-locale';
import { DatePipe } from './date.pipe';

function makePipe() {
  let locale = 'fr-SN';
  TestBed.configureTestingModule({
    providers: [DatePipe, { provide: TranslocoLocaleService, useValue: { getLocale: () => locale } }],
  });
  return { pipe: TestBed.inject(DatePipe), setLocale: (next: string) => (locale = next) };
}

describe('DatePipe', () => {
  afterEach(() => TestBed.resetTestingModule());

  it('rend une chaîne vide sans date valide', () => {
    const { pipe } = makePipe();
    expect(pipe.transform(null)).toBe('');
    expect(pipe.transform(undefined)).toBe('');
    expect(pipe.transform('pas une date')).toBe('');
  });

  it('formate à la locale active avec les options Intl telles quelles', () => {
    const { pipe } = makePipe();
    const options: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long', timeZone: 'UTC' };
    expect(pipe.transform('2026-11-20', options)).toBe(new Intl.DateTimeFormat('fr-SN', options).format(new Date('2026-11-20')));
  });

  it('suit le changement de langue', () => {
    const { pipe, setLocale } = makePipe();
    const options: Intl.DateTimeFormatOptions = { month: 'long', timeZone: 'UTC' };
    expect(pipe.transform('2026-11-20', options)).toBe('novembre');
    setLocale('en-US');
    expect(pipe.transform('2026-11-20', options)).toBe('November');
  });
});
