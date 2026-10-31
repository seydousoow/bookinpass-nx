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
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { Network, NETWORKS, Route } from '../../core/models';
import { translatedOptions } from '../../core/options';
import { injectStations, stationOptions } from '../../core/stations';

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
  templateUrl: './routes.html',
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
