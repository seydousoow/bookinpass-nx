/**
 * Date de voyage : un jour civil (`YYYY-MM-DD`), pas un instant. Marque de type : une chaîne quelconque ne passe pas
 * pour une date sans `toIso` (components/date-picker/date-utils).
 */
declare const isoDateBrand: unique symbol;

export type IsoDate = string & {
  readonly [isoDateBrand]: true;
};
