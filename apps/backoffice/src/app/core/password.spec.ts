import { temporaryPassword, uniformIndex } from './password';

describe('temporaryPassword', () => {
  it('respecte la règle du serveur : 10 caractères ou plus, une lettre et un chiffre, sans caractère ambigu', () => {
    for (let i = 0; i < 50; i++) {
      const password = temporaryPassword();
      expect(password.length).toBeGreaterThanOrEqual(10);
      expect(password).toMatch(/\p{L}/u);
      expect(password).toMatch(/\d/);
      expect(password).not.toMatch(/[01lIO]/);
    }
  });

  it('se termine toujours par une lettre puis un chiffre', () => {
    const password = temporaryPassword(() => 0);
    expect(password).toBe('aaaaaaaaaaa2');
  });
});

describe('uniformIndex', () => {
  it('rejette les tirages au-delà du dernier multiple de n, qui biaiseraient le modulo', () => {
    // 2^32 % 10 = 6 : les valeurs de 2^32 - 6 à 2^32 - 1 sont écartées.
    const draws = [2 ** 32 - 1, 2 ** 32 - 6, 2 ** 32 - 7];
    expect(uniformIndex(10, () => draws.shift() as number)).toBe((2 ** 32 - 7) % 10);
    expect(draws).toEqual([]);
  });

  it('reste dans [0, n)', () => {
    for (let i = 0; i < 200; i++) {
      const value = uniformIndex(55);
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(55);
    }
  });
});
