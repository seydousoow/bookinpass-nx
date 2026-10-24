import { normalizeCabin } from './search.model';

describe('normalizeCabin', () => {
  it('garde une classe connue', () => {
    expect(normalizeCabin('business')).toBe('business');
    expect(normalizeCabin('premium_economy')).toBe('premium_economy');
  });

  it('ignore la casse', () => {
    expect(normalizeCabin('Business')).toBe('business');
    expect(normalizeCabin('FIRST')).toBe('first');
  });

  it('se replie sur economy si la valeur est absente ou inconnue', () => {
    expect(normalizeCabin(undefined)).toBe('economy');
    expect(normalizeCabin('')).toBe('economy');
    expect(normalizeCabin('luxury')).toBe('economy');
  });
});
