/** Composition des passagers d'une recherche ; règles de validité dans components/passenger-selector/passenger.helper. */
export interface IPassengerCount {
  readonly adults: number;
  readonly children: number;
  readonly infants: number;
}
