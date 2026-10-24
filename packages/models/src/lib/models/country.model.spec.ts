import { COUNTRY_CODES } from './country.model';

describe('COUNTRY_CODES', () => {
  it('ne contient que des codes ISO alpha-2, sans doublon', () => {
    expect(COUNTRY_CODES.every((code) => /^[A-Z]{2}$/.test(code))).toBe(true);
    expect(new Set(COUNTRY_CODES).size).toBe(COUNTRY_CODES.length);
  });

  it('est trié, pour un affichage stable', () => {
    expect([...COUNTRY_CODES].sort()).toEqual(COUNTRY_CODES);
  });

  it('exclut les codes disparus', () => {
    expect(COUNTRY_CODES).not.toContain('AN');
    expect(COUNTRY_CODES).not.toContain('CS');
  });

  it('contient les pays desservis', () => {
    expect(COUNTRY_CODES).toEqual(expect.arrayContaining(['SN', 'CI', 'FR']));
  });
});
