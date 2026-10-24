import { TestBed } from '@angular/core/testing';
import { IPersistedFlightSearch, IsoDate } from 'models';
import { SearchStore } from './search.store';

const SEARCH: IPersistedFlightSearch = {
  tripType: 'round',
  origin: 'DSS',
  destination: 'CDG',
  dates: { start: '2026-12-20' as IsoDate, end: '2027-01-05' as IsoDate },
  passengers: { adults: 1, children: 0, infants: 0 },
  cabin: 'economy',
};

describe('SearchStore', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('démarre sans recherche', () => {
    expect(TestBed.inject(SearchStore).lastSearch()).toBeNull();
  });

  it('mémorise la recherche validée', () => {
    TestBed.inject(SearchStore).save(SEARCH);
    expect(TestBed.inject(SearchStore).lastSearch()).toEqual(SEARCH);
    expect(JSON.parse(localStorage.getItem('bip.search') ?? 'null')).toEqual(SEARCH);
  });

  it('restaure la dernière recherche au démarrage', () => {
    localStorage.setItem('bip.search', JSON.stringify(SEARCH));
    expect(TestBed.inject(SearchStore).lastSearch()).toEqual(SEARCH);
  });

  it('ignore une sauvegarde corrompue', () => {
    localStorage.setItem('bip.search', '{pas du json');
    expect(TestBed.inject(SearchStore).lastSearch()).toBeNull();
  });
});
