import { TestBed } from '@angular/core/testing';
import { provideTranslocoConfig } from '@jsverse/transloco';
import { IcuTranspiler } from './icu-transpiler';

describe('IcuTranspiler', () => {
  let transpiler: IcuTranspiler;
  const transpile = (value: unknown, params: Record<string, unknown> = {}) => transpiler.transpile({ value, params, translation: {}, key: 'k' });

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideTranslocoConfig({}), IcuTranspiler] });
    transpiler = TestBed.inject(IcuTranspiler);
  });

  it('accorde le pluriel selon la langue active', () => {
    const places = '{n, plural, one {# place} other {# places}}';
    expect(transpile(places, { n: 0 })).toBe('0 place');
    transpiler.onLangChanged('en');
    expect(transpile('{n, plural, one {# seat} other {# seats}}', { n: 0 })).toBe('0 seats');
  });

  it('remplace les {{ paramètres }} avant le pluriel', () => {
    expect(transpile('{{ ville }} : {n, plural, one {# départ} other {# départs}}', { ville: 'Dakar', n: 3 })).toBe('Dakar : 3 départs');
  });

  it("n'exécute aucun code : le message est interprété, sans new Function", () => {
    const fn = jest.spyOn(globalThis, 'Function');
    transpile('{n, plural, one {# avis} other {# avis}}', { n: 2 });
    const calls = fn.mock.calls.length;
    fn.mockRestore();
    expect(calls).toBe(0);
  });

  it('rend le message brut plutôt que de lever une exception quand un paramètre manque', () => {
    expect(transpile('{n, plural, one {# place} other {# places}}')).toBe('{n, plural, one {# place} other {# places}}');
  });

  it("laisse intacts le texte sans accolade, les valeurs vides et les tableaux, et garde un '<' comme texte", () => {
    expect(transpile("Aujourd'hui")).toBe("Aujourd'hui");
    expect(transpile('')).toBe('');
    expect(transpile(['a', 'b'])).toEqual(['a', 'b']);
    expect(transpile('{n, plural, one {< # km} other {< # km}}', { n: 5 })).toBe('< 5 km');
  });

  it("transpile chaque entrée d'un objet de traductions avec ses propres paramètres", () => {
    const value = { a: '{n, plural, one {# nuit} other {# nuits}}', b: 'fixe' };
    expect(transpile(value, { a: { n: 2 } })).toEqual({ a: '2 nuits', b: 'fixe' });
  });
});
