import { CONTRACT_CURRENCY, fractionDigits } from './money.model';

describe('fractionDigits', () => {
  it('n’affiche pas de décimales pour les devises sans sous-unité', () => {
    expect(fractionDigits(CONTRACT_CURRENCY)).toBe(0);
    expect(fractionDigits('JPY')).toBe(0);
  });

  it('affiche deux décimales pour les autres devises', () => {
    expect(fractionDigits('EUR')).toBe(2);
    expect(fractionDigits('USD')).toBe(2);
  });

  it('ignore la casse du code', () => {
    expect(fractionDigits('xof')).toBe(0);
  });
});
