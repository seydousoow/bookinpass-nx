import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { catchError, of } from 'rxjs';
import { ISelectOption } from 'models';
import { Button } from 'components/button/button';
import { Checkbox } from 'components/checkbox/checkbox';
import { Input } from 'components/input/input';
import { Select } from 'components/select/select';
import { Spinner } from 'components/spinner/spinner';
import { SystemState } from 'components/system-state/system-state';
import { createAction } from '../core/action';
import { StaffApi } from '../core/api';
import { Session } from '../core/session';
import { dakarDateTime } from '../core/dakar';
import { INCIDENT_TYPES, IncidentType, Route } from '../core/models';
import { translatedOptions } from '../core/options';
import { injectStations, stationOptions } from '../core/stations';

/**
 * Incidents des lignes de la gare : ouverts (par défaut) ou tous ; clos par un chef de gare ou un responsable. Les
 * responsables signalent aussi un incident sur une ligne, sans départ (les autres le font depuis le départ).
 */
@Component({
  selector: 'bo-incidents',
  imports: [RouterLink, TranslocoDirective, Button, Checkbox, Input, Select, Spinner, SystemState],
  template: `
    <section *transloco="let t" class="space-y-4">
      <div class="flex flex-wrap items-end gap-3">
        <h1 class="mr-auto text-xl font-bold">{{ t('incidents.title') }}</h1>
        <bip-checkbox [(checked)]="openOnly" [label]="t('incidents.open-only')" class="flex min-h-11 items-center" name="open-only" />
        @if (session.manager()) {
          <bip-select (valueChange)="station.set($event[0] ?? null)" [options]="stations()" [value]="[station()]" class="w-64" label="common.station" name="station" />
        }
      </div>
      @if (action.error(); as code) {
        <p class="text-state-error" role="alert">{{ t('errors.' + code) }}</p>
      }

      @if (session.manager()) {
        <form (submit)="$event.preventDefault(); report()" class="bo-card flex flex-wrap items-end gap-3">
          <bip-select
            (valueChange)="routeId.set($event[0] ?? null)"
            [options]="routeOptions()"
            [value]="routeId() === null ? [] : [routeId()!]"
            class="w-72"
            label="incidents.route"
            name="route" />
          <bip-select (valueChange)="type.set($event[0] ?? 'delay')" [options]="types()" [value]="[type()]" class="w-56" label="incidents.type" name="type" />
          <bip-input [(value)]="description" [maxLength]="1000" class="min-w-64 flex-1" label="incidents.description" name="description" />
          <button [disabled]="routeId() === null || !description()?.trim()" [loading]="action.busy()" bipButton type="submit" variant="outline">
            {{ t('incidents.report') }}
          </button>
        </form>
      }

      @if (list.isLoading()) {
        <bip-spinner class="py-8" label="common.loading" showLabel />
      } @else if (list.error()) {
        <bip-system-state (retry)="list.reload()" message="errors.unexpected" status="error" />
      } @else if (!list.value()?.length) {
        <bip-system-state status="empty" title="incidents.empty" />
      } @else {
        <ul class="grid gap-2">
          @for (i of list.value(); track i.id) {
            <li class="bo-card space-y-1 text-sm">
              <p class="flex flex-wrap justify-between gap-2">
                <span class="font-semibold">{{ t('incidents.types.' + i.type) }} · {{ i.origin }} → {{ i.destination }}</span>
                <span class="text-muted">{{ dateTime(i.reported_at) }} · {{ i.reported_by }}</span>
              </p>
              @if (i.departure_id) {
                <a [routerLink]="['/departures', i.departure_id]" class="text-brand-primary underline">{{ t('incidents.departure', { time: dateTime(i.departs_at) }) }}</a>
              }
              <p>{{ i.description }}</p>
              @if (i.resolved_at) {
                <p class="text-state-success">✓ {{ i.resolution }} ({{ dateTime(i.resolved_at) }})</p>
              } @else if (session.chief()) {
                <form (submit)="$event.preventDefault(); resolve(i.id)" class="flex flex-wrap items-end gap-2">
                  <bip-input
                    (valueChange)="setResolution(i.id, $event)"
                    [maxLength]="1000"
                    [name]="'resolution-' + i.id"
                    [value]="resolutions()[i.id] ?? ''"
                    class="min-w-64 flex-1"
                    hideLabel
                    label="incidents.resolution"
                    placeholder="incidents.resolution" />
                  <button [disabled]="!resolutions()[i.id]?.trim()" [loading]="action.busy()" bipButton type="submit">{{ t('incidents.resolve') }}</button>
                </form>
              }
            </li>
          }
        </ul>
      }
    </section>
  `,
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
  /** Résolution en cours de saisie, par incident. */
  protected readonly resolutions = signal<Readonly<Record<number, string>>>({});
  protected readonly dateTime = dakarDateTime;
  private readonly api = inject(StaffApi);
  protected readonly list = rxResource({
    params: () => ({ open: this.openOnly(), station: this.station() }),
    stream: ({ params }) => this.api.incidents(params.open, params.station),
  });
  private readonly routes = toSignal(this.session.manager() ? this.api.routes().pipe(catchError(() => of([] as Route[]))) : of([] as Route[]), {
    initialValue: [] as Route[],
  });
  protected readonly routeOptions = computed<readonly ISelectOption<number>[]>(() =>
    this.routes().map((route) => ({ value: route.id, label: `${route.origin.place} → ${route.destination.place} (${route.origin.name})` })),
  );

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
      this.list.reload();
    });
  }
}
