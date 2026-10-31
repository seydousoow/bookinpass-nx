import { fromActivityQueryParams, toActivityQueryParams } from './activity-search-params';

describe('activity search params', () => {
  it('reads valid params and ignores the rest', () => {
    expect(fromActivityQueryParams({ city: '2253354', category: 'cruise', q: 'gorée', page: '3' })).toEqual({
      city_id: 2253354,
      category: 'cruise',
      q: 'gorée',
      page: 2,
    });
    expect(fromActivityQueryParams({ city: 'x', category: 'casino', page: '-1' })).toEqual({ city_id: null, category: null, q: '', page: 0 });
  });

  it('writes only what is set, pages from 1', () => {
    expect(toActivityQueryParams({ city_id: 1, category: null, q: ' ', page: 0 })).toEqual({ city: 1, category: undefined, q: undefined, page: undefined });
    expect(toActivityQueryParams({ city_id: null, category: 'tour', q: 'lac', page: 1 })).toEqual({ city: undefined, category: 'tour', q: 'lac', page: 2 });
  });
});
