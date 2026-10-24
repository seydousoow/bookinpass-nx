import { isValidPassengerCount, MAX_PASSENGER, maximumAdults, maximumChildren, maximumInfants, minimumAdults } from './passenger.utils';

describe('isValidPassengerCount', () => {
  it('exige au moins un adulte', () => {
    expect(isValidPassengerCount({ adults: 0, children: 1, infants: 0 })).toBe(false);
    expect(isValidPassengerCount({ adults: 1, children: 0, infants: 0 })).toBe(true);
  });

  it('autorise deux mineurs par adulte, dont un seul bébé', () => {
    expect(isValidPassengerCount({ adults: 1, children: 2, infants: 0 })).toBe(true);
    expect(isValidPassengerCount({ adults: 1, children: 1, infants: 1 })).toBe(true);
    expect(isValidPassengerCount({ adults: 1, children: 0, infants: 2 })).toBe(false);
    expect(isValidPassengerCount({ adults: 1, children: 3, infants: 0 })).toBe(false);
  });

  it('plafonne le total de passagers', () => {
    expect(isValidPassengerCount({ adults: MAX_PASSENGER, children: 0, infants: 0 })).toBe(true);
    expect(isValidPassengerCount({ adults: MAX_PASSENGER, children: 1, infants: 0 })).toBe(false);
  });

  it('refuse les nombres négatifs', () => {
    expect(isValidPassengerCount({ adults: 1, children: -1, infants: 0 })).toBe(false);
  });
});

describe('bornes des compteurs', () => {
  it('calcule le nombre minimal d’adultes', () => {
    expect(minimumAdults(0, 0)).toBe(1);
    expect(minimumAdults(0, 2)).toBe(2);
    expect(minimumAdults(3, 0)).toBe(2);
  });

  it('calcule les maximums restants', () => {
    expect(maximumChildren(1, 0)).toBe(2);
    expect(maximumChildren(1, 1)).toBe(1);
    expect(maximumInfants(1, 0)).toBe(1);
    expect(maximumInfants(2, 3)).toBe(1);
    expect(maximumAdults(2, 1)).toBe(MAX_PASSENGER - 3);
  });

  it('ne rend jamais de maximum négatif', () => {
    expect(maximumChildren(MAX_PASSENGER, 0)).toBe(0);
    expect(maximumInfants(1, 2)).toBe(0);
  });
});
