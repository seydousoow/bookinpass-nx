import { AsYouType, CountryCode, isValidPhoneNumber, parsePhoneNumberFromString } from 'libphonenumber-js/min';

/** Numéro E.164 valide (`+221771234567`) : à utiliser dans le schéma du formulaire, avec `validate`. */
export function isValidPhone(e164: string | null | undefined): boolean {
  return !!e164 && isValidPhoneNumber(e164);
}

export interface ICountryOption {
  readonly code: CountryCode;
  readonly name: string;
  /** Indicatif, sans le `+`. */
  readonly dial: string;
}

export const removeNonDigitsCharacters = (text: string): string => text.replace(/\D/g, '');

export const normalizePhoneNumber = (text: string): string =>
  text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Numéro national affichable : forme officielle s'il est complet (`06 12 34 56 78`), sinon mise en forme partielle. */
export const formatNational = (national: string, country: CountryCode): string => {
  const parsed = national ? parsePhoneNumberFromString(national, country) : undefined;
  return parsed?.isPossible() ? parsed.formatNational() : new AsYouType(country).input(national);
};
