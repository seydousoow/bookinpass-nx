import { computed, inject, Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { translateSignal } from '@jsverse/transloco';
import { catchError, of } from 'rxjs';
import { ISelectOption } from 'models';
import { StaffApi } from './api';
import { Station } from './models';

/** Gares du réseau, chargées une fois par page ; vide si l'API ne répond pas (les filtres restent utilisables). */
export function injectStations(): Signal<readonly Station[]> {
  return toSignal(
    inject(StaffApi)
      .stations()
      .pipe(catchError(() => of([] as Station[]))),
    { initialValue: [] as Station[] },
  );
}

/** Libellé d'une gare dans une liste : « Gare routière (Dakar) ». */
export function stationLabel(station: Station): string {
  return `${station.name} (${station.place})`;
}

/** Options de gare pour `bip-select` ; avec `all`, une première option « Toutes les gares » (valeur `null`). */
export function stationOptions(stations: Signal<readonly Station[]>, options: { all: true }): Signal<readonly ISelectOption<number | null>[]>;
export function stationOptions(stations: Signal<readonly Station[]>): Signal<readonly ISelectOption<number>[]>;
export function stationOptions(stations: Signal<readonly Station[]>, options?: { all: true }): Signal<readonly ISelectOption<number | null>[]> {
  const allLabel = translateSignal('common.all-stations');
  return computed(() => [...(options?.all ? [{ value: null, label: allLabel() }] : []), ...stations().map((station) => ({ value: station.id, label: stationLabel(station) }))]);
}
