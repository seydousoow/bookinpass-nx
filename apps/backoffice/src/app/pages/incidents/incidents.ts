import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { catchError, of } from 'rxjs';
import { ISelectOption } from 'models';
import { Button } from 'components/button/button';
import { Select } from 'components/select/select';
import { Textarea } from 'components/textarea/textarea';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroCheckCircle, heroPlus } from '@ng-icons/heroicons/outline';
import { SystemState } from 'components/system-state/system-state';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { Session } from '../../core/session';
import { dakarDateTime } from '../../core/dakar';
import { INCIDENT_TYPES, IncidentType, Route } from '../../core/models';
import { translatedOptions } from '../../core/options';
import { injectStations, stationOptions } from '../../core/stations';
import { Drawer, EmptyState, FilterToolbar, PageHeader, StatusBadge, Toasts } from '../../ui';

/**
 * Incidents des lignes de la gare : ouverts (par défaut) ou tous ; clos par un chef de gare ou un responsable. Les
 * responsables signalent aussi un incident sur une ligne, sans départ (les autres le font depuis le départ).
 */
@Component({
  selector: 'bo-incidents',
  imports: [RouterLink, TranslocoDirective, NgIcon, Button, Select, SystemState, Textarea, Drawer, EmptyState, FilterToolbar, PageHeader, StatusBadge],
  providers: [provideIcons({ heroCheckCircle, heroPlus })],
  templateUrl: './incidents.html',
})
export class IncidentsPage {
  protected readonly session = inject(Session);
  protected readonly action = createAction();
  protected readonly openOnly = signal(true);
  protected readonly station = signal<number | null>(null);
  protected readonly stations = stationOptions(injectStations(), { all: true });
  protected readonly types = translatedOptions(INCIDENT_TYPES, 'incidents.types.');
  protected readonly routeId = signal<number | null>(null);
  protected readonly type = signal<IncidentType>('delay');
  protected readonly description = signal<string | null>('');
  /** Filtre par type, appliqué à la liste reçue. */
  protected readonly typeFilter = signal<IncidentType | null>(null);
  /** Tiroir « Signaler un incident ». */
  protected readonly reporting = signal(false);
  /** Incident ouvert dans le tiroir de détail. */
  protected readonly selectedId = signal<number | null>(null);
  /** Résolution en cours de saisie, par incident. */
  protected readonly resolutions = signal<Readonly<Record<number, string>>>({});
  protected readonly dateTime = dakarDateTime;
  private readonly api = inject(StaffApi);
  protected readonly list = rxResource({
    params: () => ({ open: this.openOnly(), station: this.station() }),
    stream: ({ params }) => this.api.incidents(params.open, params.station),
  });
  protected readonly shown = computed(() => {
    const type = this.typeFilter();
    return (this.list.value() ?? []).filter((i) => !type || i.type === type);
  });
  protected readonly selected = computed(() => this.list.value()?.find((i) => i.id === this.selectedId()) ?? null);
  protected readonly activeFilters = computed(() => Number(!this.openOnly()) + Number(this.typeFilter() !== null) + Number(this.station() !== null));
  private readonly toasts = inject(Toasts);
  private readonly transloco = inject(TranslocoService);
  private readonly routes = toSignal(this.session.manager() ? this.api.routes().pipe(catchError(() => of([] as Route[]))) : of([] as Route[]), {
    initialValue: [] as Route[],
  });
  protected readonly routeOptions = computed<readonly ISelectOption<number>[]>(() =>
    this.routes().map((route) => ({ value: route.id, label: `${route.origin.place} → ${route.destination.place} (${route.origin.name})` })),
  );

  protected resetFilters(): void {
    this.openOnly.set(true);
    this.typeFilter.set(null);
    this.station.set(null);
  }

  protected setResolution(id: number, text: string | null): void {
    this.resolutions.update((all) => ({ ...all, [id]: text ?? '' }));
  }

  protected report(): void {
    const routeId = this.routeId();
    const description = this.description()?.trim();
    if (routeId === null || !description) {
      return;
    }
    this.action.run(this.api.reportIncident({ departure_id: null, route_id: routeId, type: this.type(), description }), () => {
      this.description.set('');
      this.reporting.set(false);
      this.toasts.success(this.transloco.translate('incidents.reported-done'));
      this.list.reload();
    });
  }

  protected resolve(id: number): void {
    const resolution = this.resolutions()[id]?.trim();
    if (!resolution) {
      return;
    }
    this.action.run(this.api.resolveIncident(id, resolution), () => {
      this.setResolution(id, '');
      this.toasts.success(this.transloco.translate('incidents.resolved-done'));
      this.list.reload();
    });
  }
}
