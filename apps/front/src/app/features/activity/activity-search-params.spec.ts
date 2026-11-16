import { fromActivityQueryParams, toActivityQueryParams } from './activity-search-params';

describe('activity search params', () => {
  it('reads valid params and ignores the rest', () => {
    expect(fromActivityQueryParams({ city: '2253354', category: 'cruise', q: 'gorée', page: '3' })).toEqual({
      city_id: 2253354,
      country: null,
      category: 'cruise',
      q: 'gorée',
      page: 2,
    });
    expect(fromActivityQueryParams({ city: 'x', country: 'Senegal', category: 'casino', page: '-1' })).toEqual({
      city_id: null,
      country: null,
      category: null,
      q: '',
      page: 0,
    });
    expect(fromActivityQueryParams({ country: 'sn' }).country).toBe('SN');
  });

  it('writes only what is set, pages from 1, the city before the country', () => {
    expect(toActivityQueryParams({ city_id: 1, country: 'SN', category: null, q: ' ', page: 0 })).toEqual({
      city: 1,
      country: undefined,
      category: undefined,
      q: undefined,
      page: undefined,
    });
    expect(toActivityQueryParams({ city_id: null, country: 'GM', category: 'tour', q: 'lac', page: 1 })).toEqual({
      city: undefined,
      country: 'GM',
      category: 'tour',
      q: 'lac',
      page: 2,
    });
  });
});
