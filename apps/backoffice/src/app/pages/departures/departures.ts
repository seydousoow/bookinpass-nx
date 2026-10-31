import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Badge, BadgeTone, Input, Select, Spinner, SystemState } from 'components';
import { StaffApi } from '../../core/api';
import { Session } from '../../core/session';
import { dakarTime, dakarToday } from '../../core/dakar';
import { Departure } from '../../core/models';
import { injectStations, stationOptions } from '../../core/stations';

type DepartureStatus = 'arrived' | 'departed' | 'planned';

const STATUS_TONE: Record<DepartureStatus, BadgeTone> = { arrived: 'success', departed: 'info', planned: 'neutral' };

/** Départs d'un jour au départ de sa gare (responsables : gare au choix, ou toutes). */
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

  protected status(d: Departure): DepartureStatus {
    return d.arrived_at ? 'arrived' : d.departed_at ? 'departed' : 'planned';
  }

  protected tone(d: Departure): BadgeTone {
    return STATUS_TONE[this.status(d)];
  }
}
