const LETTERS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ';
const DIGITS = '23456789';
const RANGE = 2 ** 32;

/** Mot de passe provisoire lisible (sans l/1, O/0) : 12 caractères, au moins une lettre et un chiffre. */
export function temporaryPassword(random: (n: number) => number = uniformIndex): string {
  const all = LETTERS + DIGITS;
  const chars = Array.from({ length: 10 }, () => all[random(all.length)]);
  chars.push(LETTERS[random(LETTERS.length)], DIGITS[random(DIGITS.length)]);
  return chars.join('');
}

/**
 * Entier uniforme dans [0, n) tiré de `getRandomValues`. Un simple `% n` favoriserait les petites valeurs quand n ne
 * divise pas 2^32 : les tirages au-delà du dernier multiple de n sont rejetés.
 */
export function uniformIndex(n: number, next: () => number = () => crypto.getRandomValues(new Uint32Array(1))[0]): number {
  const limit = RANGE - (RANGE % n);
  let value = next();
  while (value >= limit) {
    value = next();
  }
  return value % n;
}
