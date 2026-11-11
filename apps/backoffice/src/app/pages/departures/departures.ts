import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Badge, BadgeTone, Input, Select, Spinner, SystemState } from 'components';
import { StaffApi } from '../../core/api';
import { Session } from '../../core/session';
import { dakarTime, dakarToday } from '../../core/dakar';
import { Departure, Station } from '../../core/models';
import { injectStations, stationOptions } from '../../core/stations';

type DepartureStatus = 'arrived' | 'departed' | 'planned';

const STATUS_TONE: Record<DepartureStatus, BadgeTone> = { arrived: 'success', departed: 'info', planned: 'neutral' };

/** Départs d'une gare de départ, avec ses totaux pour l'en-tête de l'accordéon. */
export interface StationDepartures {
  readonly station: Station;
  readonly departures: readonly Departure[];
  readonly passengers: number;
  readonly scanned: number;
  readonly incidents: number;
}

/** Départs regroupés par gare de départ, gares dans l'ordre alphabétique de leur ville. */
export function byOrigin(departures: readonly Departure[]): StationDepartures[] {
  const groups = new Map<number, Departure[]>();
  for (const d of departures) {
    groups.set(d.origin.id, [...(groups.get(d.origin.id) ?? []), d]);
  }
  return [...groups.values()]
    .map((list) => ({
      station: list[0].origin,
      departures: list,
      passengers: list.reduce((sum, d) => sum + d.passengers, 0),
      scanned: list.reduce((sum, d) => sum + d.scanned, 0),
      incidents: list.reduce((sum, d) => sum + d.open_incidents, 0),
    }))
    .sort((a, b) => a.station.place.localeCompare(b.station.place) || a.station.name.localeCompare(b.station.name));
}

/** Départs d'un jour au départ de sa gare (responsables : gare au choix, ou toutes), en accordéon par gare de départ. */
@Component({
  selector: 'bo-departures',
  imports: [RouterLink, TranslocoDirective, Badge, Input, Select, Spinner, SystemState],
  templateUrl: './departures.html',
})
export class DeparturesPage {
  protected readonly session = inject(Session);
  protected readonly date = signal<string | null>(dakarToday());
  protected readonly station = signal<number | null>(null);
  protected readonly stations = stationOptions(injectStations(), { all: true });
  protected readonly time = dakarTime;
  private readonly api = inject(StaffApi);
  protected readonly departures = rxResource({
    // Champ de date vidé : on revient au jour même plutôt que d'appeler l'API sans date.
    params: () => ({ date: this.date() || dakarToday(), station: this.station() }),
    stream: ({ params }) => this.api.departures(params.date, params.station),
  });
  protected readonly groups = computed(() => byOrigin(this.departures.value() ?? []));
  /** Gares ouvertes dans l'accordéon ; une seule gare : ouverte d'office. */
  private readonly opened = signal<ReadonlySet<number>>(new Set());

  protected isOpen(station: number): boolean {
    return this.groups().length === 1 || this.opened().has(station);
  }

  protected toggle(station: number, open: boolean): void {
    this.opened.update((all) => {
      const next = new Set(all);
      if (open) {
        next.add(station);
      } else {
        next.delete(station);
      }
      return next;
    });
  }

  protected setAll(open: boolean): void {
    this.opened.set(new Set(open ? this.groups().map((g) => g.station.id) : []));
  }

  protected status(d: Departure): DepartureStatus {
    return d.arrived_at ? 'arrived' : d.departed_at ? 'departed' : 'planned';
  }

  protected tone(d: Departure): BadgeTone {
    return STATUS_TONE[this.status(d)];
  }
}
