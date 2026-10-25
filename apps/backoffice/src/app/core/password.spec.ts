import { temporaryPassword } from './password';

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
