import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { INCIDENT_TYPES, NETWORKS, TicketStatus } from './core/models';

type Dictionary = { [key: string]: string | Dictionary };

const read = (path: string): Dictionary => JSON.parse(readFileSync(path, 'utf8')) as Dictionary;
const root = join(__dirname, '..', '..', '..', '..');
const own = (lang: string) => read(join(__dirname, '..', '..', 'public', 'i18n', `${lang}.json`));
const shared = (lang: string) => read(join(root, 'packages', 'components', 'i18n', `${lang}.json`));

function leaves(dictionary: Dictionary, prefix = ''): string[] {
  return Object.entries(dictionary).flatMap(([key, value]) => (typeof value === 'object' ? leaves(value, `${prefix}${key}.`) : [`${prefix}${key}`]));
}

/** Clés du back-office et des composants partagés, telles que HttpTranslocoLoader les fusionne. */
const available = (lang: string) => new Set([...leaves(shared(lang)), ...leaves(own(lang))]);

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    return statSync(path).isDirectory() ? sources(path) : name.endsWith('.ts') && !name.endsWith('.spec.ts') ? [readFileSync(path, 'utf8')] : [];
  });
}

/** Clés écrites en toutes lettres : t('…'), attributs traduits des composants, messages des validateurs. */
function literalKeys(): string[] {
  const code = sources(__dirname).join('\n');
  const patterns = [
    /\bt\('([a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+)'/g,
    /\b(?:label|title|message|placeholder|loadingLabel|hint)="([a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+)"/g,
    /message: '([a-z][a-z0-9-]*(?:\.[a-z0-9-]+)+)'/g,
  ];
  return [...new Set(patterns.flatMap((pattern) => [...code.matchAll(pattern)].map((m) => m[1])))].sort();
}

/** Clés construites à l'exécution (`'roles.' + role`…) : toutes les valeurs possibles. */
const TICKET_STATUSES: readonly TicketStatus[] = ['valid', 'scanned', 'already_scanned', 'not_paid', 'wrong_day', 'other_station', 'unknown'];
const DYNAMIC: Record<string, readonly (string | number)[]> = {
  'roles.': ['admin', 'manager', 'station_chief', 'inspector'],
  'nav.': ['departures', 'scan', 'luggage', 'incidents', 'bookings', 'refunds', 'routes', 'staff'],
  'incidents.types.': INCIDENT_TYPES,
  'routes.networks.': NETWORKS,
  'days.': [1, 2, 3, 4, 5, 6, 7],
  'scan.status.': TICKET_STATUSES,
  'luggage.status.': ['registered', 'delivered'],
  'departures.status.': ['arrived', 'departed', 'planned'],
  'bookings.status.': ['held', 'confirmed', 'released'],
  'bookings.method.': ['card', 'mobile_money'],
  // Codes posés par le back-office lui-même (les autres viennent du serveur).
  'errors.': ['network', 'unexpected', 'days-required', 'station-required', 'departure-not-found', 'weak-password', 'password-mismatch', 'username-required'],
};
const dynamicKeys = Object.entries(DYNAMIC).flatMap(([prefix, values]) => values.map((value) => `${prefix}${value}`));

describe('traductions du back-office', () => {
  it('ont les mêmes clés en français et en anglais', () => {
    expect(leaves(own('en')).sort()).toEqual(leaves(own('fr')).sort());
  });

  it.each(['fr', 'en'])('couvrent chaque clé employée par les pages (%s)', (lang) => {
    const keys = available(lang);
    const missing = [...literalKeys(), ...dynamicKeys].filter((key) => !keys.has(key));
    expect(missing).toEqual([]);
  });

  it('trouvent des clés dans les pages (le relevé fonctionne)', () => {
    expect(literalKeys().length).toBeGreaterThan(100);
  });
});
