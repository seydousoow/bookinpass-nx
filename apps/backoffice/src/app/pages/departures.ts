import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Badge, BadgeTone } from 'components/badge/badge';
import { Input } from 'components/input/input';
import { Select } from 'components/select/select';
import { Spinner } from 'components/spinner/spinner';
import { SystemState } from 'components/system-state/system-state';
import { StaffApi } from '../core/api';
import { Session } from '../core/session';
import { dakarTime, dakarToday } from '../core/dakar';
import { Departure } from '../core/models';
import { injectStations, stationOptions } from '../core/stations';

type DepartureStatus = 'arrived' | 'departed' | 'planned';

const STATUS_TONE: Record<DepartureStatus, BadgeTone> = { arrived: 'success', departed: 'info', planned: 'neutral' };

/** Départs d'un jour au départ de sa gare (responsables : gare au choix, ou toutes). */
@Component({
  selector: 'bo-departures',
  imports: [RouterLink, TranslocoDirective, Badge, Input, Select, Spinner, SystemState],
  template: `
    <section *transloco="let t" class="space-y-4">
      <div class="flex flex-wrap items-end gap-3">
        <h1 class="mr-auto text-xl font-bold">{{ t('departures.title') }}</h1>
        <bip-input [(value)]="date" class="w-44" label="common.date" name="date" type="date" />
        @if (session.manager()) {
          <bip-select (valueChange)="station.set($event[0] ?? null)" [options]="stations()" [value]="[station()]" class="w-64" label="common.station" name="station" />
        }
      </div>
      <p class="text-xs text-muted">{{ t('common.dakar-time') }}</p>

      @if (departures.isLoading()) {
        <bip-spinner class="py-8" label="common.loading" showLabel />
      } @else if (departures.error()) {
        <bip-system-state (retry)="departures.reload()" message="errors.unexpected" status="error" />
      } @else if (!departures.value()?.length) {
        <bip-system-state status="empty" title="departures.empty" />
      } @else {
        <ul class="grid gap-2">
          @for (d of departures.value(); track d.id) {
            <li>
              <a [routerLink]="['/departures', d.id]" class="bo-card bip-focusable flex flex-wrap items-center gap-x-6 gap-y-2 transition-colors hover:border-brand-primary">
                <span class="w-28 text-2xl font-bold">
                  {{ time(d.departs_at) }}
                  @if (d.last_departure_at) {
                    <span class="block text-xs font-normal text-muted">{{ t('departures.until', { time: time(d.last_departure_at) }) }}</span>
                  }
                </span>
                <span class="min-w-48 flex-1">
                  <span class="block font-semibold">{{ d.origin.place }} → {{ d.destination.place }}</span>
                  <span class="block text-xs text-muted">{{ d.origin.name }}</span>
                </span>
                <span class="text-sm">{{ t('departures.passengers', { scanned: d.scanned, total: d.passengers }) }}</span>
                <span class="text-sm">{{ d.capacity === null ? t('departures.continuous') : t('departures.seats', { sold: d.sold, held: d.held, capacity: d.capacity }) }}</span>
                @if (d.luggage) {
                  <span class="text-sm">{{ t('departures.luggage', { count: d.luggage }) }}</span>
                }
                @if (d.open_incidents) {
                  <bip-badge size="sm" tone="error">{{ t('departures.incidents', { count: d.open_incidents }) }}</bip-badge>
                }
                <bip-badge [tone]="tone(d)" size="sm">{{ t('departures.status.' + status(d)) }}</bip-badge>
              </a>
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class DeparturesPage {
  protected readonly session = inject(Session);
  private readonly api = inject(StaffApi);
  protected readonly date = signal<string | null>(dakarToday());
  protected readonly station = signal<number | null>(null);
  protected readonly stations = stationOptions(injectStations(), { all: true });
  protected readonly departures = rxResource({
    // Champ de date vidé : on revient au jour même plutôt que d'appeler l'API sans date.
    params: () => ({ date: this.date() || dakarToday(), station: this.station() }),
    stream: ({ params }) => this.api.departures(params.date, params.station),
  });
  protected readonly time = dakarTime;

  protected status(d: Departure): DepartureStatus {
    return d.arrived_at ? 'arrived' : d.departed_at ? 'departed' : 'planned';
  }

  protected tone(d: Departure): BadgeTone {
    return STATUS_TONE[this.status(d)];
  }
}
