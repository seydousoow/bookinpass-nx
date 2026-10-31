import { savedLang, saveLang } from './lang';

describe('langue du back-office', () => {
  afterEach(() => localStorage.clear());

  it('est le français par défaut', () => {
    expect(savedLang()).toBe('fr');
  });

  it('retient la langue choisie sur l’appareil', () => {
    saveLang('en');
    expect(savedLang()).toBe('en');
    expect(localStorage.getItem('bo.lang')).toBe('en');
  });

  it('ignore une valeur inconnue', () => {
    localStorage.setItem('bo.lang', 'de');
    expect(savedLang()).toBe('fr');
  });
});
