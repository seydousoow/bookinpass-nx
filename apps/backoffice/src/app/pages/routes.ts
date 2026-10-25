import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslocoDirective } from '@jsverse/transloco';
import { Observable } from 'rxjs';
import { Button } from 'components/button/button';
import { Checkbox } from 'components/checkbox/checkbox';
import { Input } from 'components/input/input';
import { Select } from 'components/select/select';
import { Spinner } from 'components/spinner/spinner';
import { SystemState } from 'components/system-state/system-state';
import { createAction } from '../core/action';
import { StaffApi } from '../core/api';
import { Network, NETWORKS, Route } from '../core/models';
import { translatedOptions } from '../core/options';
import { injectStations, stationOptions } from '../core/stations';

interface RouteDraft {
  readonly price: number | null;
  readonly capacity: number | null;
  readonly active: boolean;
}

interface ScheduleDraft {
  /** Lundi (index 0) … dimanche (index 6). */
  readonly days: readonly boolean[];
  readonly departs_at: string;
  readonly last_departure: string;
}

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;

export function emptySchedule(): ScheduleDraft {
  return { days: DAYS.map(() => false), departs_at: '', last_departure: '' };
}

function routeDraft(route: Route): RouteDraft {
  return { price: Number(route.price), capacity: route.capacity, active: route.active };
}

/**
 * Réseau (admin, manager) : prix par passager (frais Book In Pass en plus), places d'un car, mise en vente et horaires
 * de chaque ligne ; création d'une ligne entre deux gares. Les heures sont celles de Dakar.
 */
@Component({
  selector: 'bo-routes',
  imports: [TranslocoDirective, Button, Checkbox, Input, Select, Spinner, SystemState],
  template: `
    <section *transloco="let t" class="space-y-4">
      <h1 class="text-xl font-bold">{{ t('routes.title') }}</h1>
      <p class="text-xs text-muted">{{ t('routes.hint') }}</p>
      @if (action.error(); as code) {
        <p class="text-state-error" role="alert">{{ t('errors.' + code) }}</p>
      }

      <form (submit)="$event.preventDefault(); create()" class="bo-card grid gap-3 sm:grid-cols-2 lg:grid-cols-6 lg:items-end">
        <h2 class="font-bold sm:col-span-2 lg:col-span-6">{{ t('routes.new') }}</h2>
        <bip-select
          (valueChange)="origin.set($event[0] ?? null)"
          [options]="stations()"
          [value]="origin() === null ? [] : [origin()!]"
          class="lg:col-span-2"
          label="routes.origin"
          name="origin" />
        <bip-select
          (valueChange)="destination.set($event[0] ?? null)"
          [options]="stations()"
          [value]="destination() === null ? [] : [destination()!]"
          class="lg:col-span-2"
          label="routes.destination"
          name="destination" />
        <bip-select (valueChange)="network.set($event[0] ?? 'interurban')" [options]="networks()" [value]="[network()]" label="routes.network" name="network" />
        <bip-input [(value)]="price" [min]="1" [step]="1" label="routes.price" name="price" type="number" />
        <bip-input [(value)]="capacity" [min]="1" [step]="1" label="routes.capacity" name="capacity" type="number" />
        <button [disabled]="!canCreate()" [loading]="action.busy()" bipButton type="submit">{{ t('routes.create') }}</button>
      </form>

      @if (list.isLoading() && !list.hasValue()) {
        <bip-spinner class="py-8" label="common.loading" showLabel />
      } @else if (list.error()) {
        <bip-system-state (retry)="list.reload()" message="errors.unexpected" status="error" />
      }
      @for (r of list.value() ?? []; track r.id) {
        @let draft = edit(r);
        @let next = schedule(r);
        <article [class.opacity-60]="!r.active" class="bo-card space-y-3">
          <div class="flex flex-wrap items-end gap-3">
            <div class="mr-auto">
              <h2 class="font-bold">{{ r.origin.place }} → {{ r.destination.place }}</h2>
              <p class="text-xs text-muted">{{ r.origin.name }} → {{ r.destination.name }} · {{ t('routes.networks.' + r.network) }} · {{ t('routes.fee', { fee: r.fee }) }}</p>
            </div>
            <bip-input
              (valueChange)="patchEdit(r, { price: $event })"
              [min]="1"
              [name]="'price-' + r.id"
              [step]="1"
              [value]="draft.price"
              class="w-28"
              label="routes.price"
              type="number" />
            <bip-input
              (valueChange)="patchEdit(r, { capacity: $event })"
              [min]="1"
              [name]="'capacity-' + r.id"
              [step]="1"
              [value]="draft.capacity"
              class="w-24"
              label="routes.capacity"
              type="number" />
            <bip-checkbox
              (checkedChange)="patchEdit(r, { active: $event })"
              [checked]="draft.active"
              [label]="t('routes.on-sale')"
              [name]="'active-' + r.id"
              class="flex min-h-11 items-center" />
            <button (clicked)="save(r)" [disabled]="!draft.price || !draft.capacity" [loading]="action.busy()" bipButton variant="outline">{{ t('common.save') }}</button>
          </div>
          <div class="flex flex-wrap gap-2 text-sm">
            @for (s of r.schedules; track s.id) {
              <span class="inline-flex items-center gap-1 rounded-pill border border-border-subtle bg-surface-muted py-1 pr-1 pl-3">
                {{ t('days.' + s.day_of_week) }} {{ s.departs_at }}{{ s.last_departure ? '–' + s.last_departure : '' }}
                <button
                  (click)="run(api.deleteSchedule(s.id))"
                  [attr.aria-label]="t('routes.remove-schedule')"
                  [disabled]="action.busy()"
                  class="bip-focusable size-7 rounded-pill hover:bg-state-error-soft"
                  type="button">
                  ×
                </button>
              </span>
            } @empty {
              <span class="text-muted">{{ t('routes.no-schedule') }}</span>
            }
          </div>
          <form (submit)="$event.preventDefault(); addSchedule(r)" class="flex flex-wrap items-end gap-3 border-t border-border-subtle pt-3">
            <fieldset class="flex flex-wrap items-center gap-3">
              <legend class="mb-1 block text-xs font-semibold text-muted">{{ t('routes.days') }}</legend>
              @for (day of days; track day) {
                <bip-checkbox (checkedChange)="toggleDay(r, day, $event)" [checked]="next.days[day - 1]" [label]="t('days.' + day)" [name]="'day-' + r.id + '-' + day" />
              }
            </fieldset>
            <bip-input
              (valueChange)="patchSchedule(r, { departs_at: $event ?? '' })"
              [name]="'at-' + r.id"
              [value]="next.departs_at"
              class="w-36"
              label="routes.departs-at"
              type="time" />
            <bip-input
              (valueChange)="patchSchedule(r, { last_departure: $event ?? '' })"
              [name]="'last-' + r.id"
              [value]="next.last_departure"
              class="w-36"
              label="routes.last-departure"
              type="time" />
            <button [disabled]="!next.departs_at" [loading]="action.busy()" bipButton type="submit" variant="outline">{{ t('routes.add-schedule') }}</button>
          </form>
        </article>
      }
    </section>
  `,
})
export class RoutesPage {
  protected readonly api = inject(StaffApi);
  protected readonly action = createAction();
  protected readonly days = DAYS;
  protected readonly stations = stationOptions(injectStations());
  protected readonly networks = translatedOptions(NETWORKS, 'routes.networks.');
  protected readonly list = rxResource({ stream: () => this.api.routes() });

  protected readonly origin = signal<number | null>(null);
  protected readonly destination = signal<number | null>(null);
  protected readonly network = signal<Network>('interurban');
  protected readonly price = signal<number | null>(1000);
  protected readonly capacity = signal<number | null>(50);

  /** Brouillons d'édition par ligne, créés à la première saisie : une saisie en cours n'est pas écrasée au rechargement. */
  private readonly edits = signal<Readonly<Record<number, RouteDraft>>>({});
  private readonly schedules = signal<Readonly<Record<number, ScheduleDraft>>>({});

  protected canCreate(): boolean {
    return this.origin() !== null && this.destination() !== null && (this.price() ?? 0) >= 1 && (this.capacity() ?? 0) >= 1;
  }

  protected edit(route: Route): RouteDraft {
    return this.edits()[route.id] ?? routeDraft(route);
  }

  protected patchEdit(route: Route, patch: Partial<RouteDraft>): void {
    this.edits.update((all) => ({ ...all, [route.id]: { ...this.edit(route), ...patch } }));
  }

  protected schedule(route: Route): ScheduleDraft {
    return this.schedules()[route.id] ?? emptySchedule();
  }

  protected patchSchedule(route: Route, patch: Partial<ScheduleDraft>): void {
    this.schedules.update((all) => ({ ...all, [route.id]: { ...this.schedule(route), ...patch } }));
  }

  protected toggleDay(route: Route, day: number, checked: boolean): void {
    const days = this.schedule(route).days.map((value, index) => (index === day - 1 ? checked : value));
    this.patchSchedule(route, { days });
  }

  protected save(route: Route): void {
    const { price, capacity, active } = this.edit(route);
    if (!price || !capacity) {
      return;
    }
    this.run(this.api.updateRoute(route.id, { price, capacity, active }));
  }

  protected addSchedule(route: Route): void {
    const draft = this.schedule(route);
    const days = DAYS.filter((day) => draft.days[day - 1]);
    if (!days.length) {
      this.action.error.set('days-required');
      return;
    }
    this.run(this.api.addSchedule(route.id, { days, departs_at: draft.departs_at, last_departure: draft.last_departure || null }), () =>
      this.schedules.update((all) => ({ ...all, [route.id]: emptySchedule() })),
    );
  }

  protected create(): void {
    const origin = this.origin();
    const destination = this.destination();
    const price = this.price();
    const capacity = this.capacity();
    if (origin === null || destination === null || !price || !capacity) {
      return;
    }
    this.run(this.api.createRoute({ origin_station_id: origin, destination_station_id: destination, network: this.network(), price, capacity }));
  }

  /** Après chaque modification, la ligne est relue du serveur : son brouillon d'édition repart de cette version. */
  protected run(request: Observable<Route>, done?: () => void): void {
    this.action.run(request, (route) => {
      this.edits.update((all) => {
        const rest = { ...all };
        delete rest[route.id];
        return rest;
      });
      done?.();
      this.list.reload();
    });
  }
}
