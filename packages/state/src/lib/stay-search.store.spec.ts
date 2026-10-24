import { TestBed } from '@angular/core/testing';
import { IsoDate, IStaySearch } from 'models';
import { StaySearchStore } from './stay-search.store';

const SEARCH: IStaySearch = {
  location: '2253354',
  dates: { start: '2026-12-20' as IsoDate, end: '2026-12-27' as IsoDate },
  guests: { rooms: 1, adults: 2, childAges: [5] },
};

describe('StaySearchStore', () => {
  afterEach(() => {
    TestBed.resetTestingModule();
    localStorage.clear();
  });

  it('démarre sans recherche', () => {
    expect(TestBed.inject(StaySearchStore).lastSearch()).toBeNull();
  });

  it('mémorise la recherche validée', () => {
    TestBed.inject(StaySearchStore).save(SEARCH);
    expect(TestBed.inject(StaySearchStore).lastSearch()).toEqual(SEARCH);
    expect(JSON.parse(localStorage.getItem('bip.stay-search') ?? 'null')).toEqual(SEARCH);
  });

  it('restaure la dernière recherche au démarrage', () => {
    localStorage.setItem('bip.stay-search', JSON.stringify(SEARCH));
    expect(TestBed.inject(StaySearchStore).lastSearch()).toEqual(SEARCH);
  });

  it('ignore une sauvegarde corrompue', () => {
    localStorage.setItem('bip.stay-search', '{pas du json');
    expect(TestBed.inject(StaySearchStore).lastSearch()).toBeNull();
  });
});
