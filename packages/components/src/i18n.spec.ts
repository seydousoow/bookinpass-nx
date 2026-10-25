import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { componentTranslations } from './testing';

/** Clés « feuilles » d'un dictionnaire (`common.phone.search`…). */
function leaves(translation: object, prefix = ''): string[] {
  return Object.entries(translation).flatMap(([key, value]) => (typeof value === 'object' && value !== null ? leaves(value, `${prefix}${key}.`) : [`${prefix}${key}`]));
}

/** Clés citées en dur dans le code des composants (hors specs). */
function keysUsedByComponents(dir = join(__dirname, 'lib')): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) {
      return keysUsedByComponents(path);
    }
    if (!/\.(ts|html)$/.test(name) || name.endsWith('.spec.ts')) {
      return [];
    }
    return [...readFileSync(path, 'utf8').matchAll(/'((?:common|picker|nav|search|footer)\.[a-z0-9.-]+)'/g)].map((m) => m[1]);
  });
}

/**
 * Les composants partagés traduisent eux-mêmes leurs libellés internes : chaque application les reçoit de
 * `packages/components/i18n`. Une clé manquante s'afficherait brute dans le site comme dans le back-office.
 */
describe('traductions des composants', () => {
  const fr = leaves(componentTranslations('fr')).sort();
  const en = leaves(componentTranslations('en')).sort();

  it('ont les mêmes clés en français et en anglais', () => {
    expect(en).toEqual(fr);
  });

  it('couvrent toutes les clés citées par les composants', () => {
    const missing = [...new Set(keysUsedByComponents())].filter((key) => !fr.includes(key));
    expect(missing).toEqual([]);
  });

  it('couvrent les textes par défaut de SystemState', () => {
    for (const status of ['idle', 'empty', 'expired', 'error', 'offline']) {
      expect(fr).toEqual(expect.arrayContaining([`common.system-state.${status}.title`, `common.system-state.${status}.message`]));
    }
    expect(fr).toEqual(expect.arrayContaining(['common.system-state.retry', 'common.system-state.partial.title']));
  });
});
