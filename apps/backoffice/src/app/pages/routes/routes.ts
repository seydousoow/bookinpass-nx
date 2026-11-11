import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Observable } from 'rxjs';
import { Button } from 'components/button/button';
import { Checkbox } from 'components/checkbox/checkbox';
import { Input } from 'components/input/input';
import { Select } from 'components/select/select';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroArrowsRightLeft, heroInformationCircle, heroPlus, heroXMark } from '@ng-icons/heroicons/outline';
import { SystemState } from 'components/system-state/system-state';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { Network, NETWORKS, Route, Schedule } from '../../core/models';
import { translatedOptions } from '../../core/options';
import { injectStations, stationOptions } from '../../core/stations';
import { Drawer, EmptyState, PageHeader, StatusBadge, Toasts } from '../../ui';

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

/** Horaires d'une ligne regroupés par heure : une ligne par heure, ses jours en pastilles. */
export interface ScheduleGroup {
  readonly key: string;
  readonly departs_at: string;
  readonly last_departure: string | null;
  readonly schedules: readonly Schedule[];
}

export function groupSchedules(schedules: readonly Schedule[]): ScheduleGroup[] {
  const groups = new Map<string, Schedule[]>();
  for (const s of schedules) {
    const key = `${s.departs_at}|${s.last_departure ?? ''}`;
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }
  return [...groups.entries()]
    .map(([key, list]) => ({ key, departs_at: list[0].departs_at, last_departure: list[0].last_departure, schedules: [...list].sort((a, b) => a.day_of_week - b.day_of_week) }))
    .sort((a, b) => a.departs_at.localeCompare(b.departs_at));
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
  imports: [TranslocoDirective, NgIcon, Button, Checkbox, Input, Select, SystemState, Drawer, EmptyState, PageHeader, StatusBadge],
  providers: [provideIcons({ heroArrowsRightLeft, heroInformationCircle, heroPlus, heroXMark })],
  templateUrl: './routes.html',
})
export class RoutesPage {
  protected readonly api = inject(StaffApi);
  protected readonly action = createAction();
  protected readonly days = DAYS;
  protected readonly stations = stationOptions(injectStations());
  protected readonly networks = translatedOptions(NETWORKS, 'routes.networks.');
  protected readonly list = rxResource({ stream: () => this.api.routes() });
  /** Tiroir « Nouvelle ligne ». */
  protected readonly creating = signal(false);
  /** Ligne ouverte dans le tiroir. */
  protected readonly selectedId = signal<number | null>(null);
  protected readonly selected = computed(() => this.list.value()?.find((r) => r.id === this.selectedId()) ?? null);
  protected readonly origin = signal<number | null>(null);
  protected readonly destination = signal<number | null>(null);
  protected readonly network = signal<Network>('interurban');
  protected readonly price = signal<number | null>(1000);
  protected readonly capacity = signal<number | null>(50);
  private readonly toasts = inject(Toasts);
  private readonly transloco = inject(TranslocoService);
  /** Brouillons d'édition par ligne, créés à la première saisie : une saisie en cours n'est pas écrasée au rechargement. */
  private readonly edits = signal<Readonly<Record<number, RouteDraft>>>({});
  private readonly schedules = signal<Readonly<Record<number, ScheduleDraft>>>({});

  protected readonly grouped = (route: Route) => groupSchedules(route.schedules);

  /** Premières heures de départ, pour la liste. */
  protected firstTimes(route: Route): string {
    const groups = groupSchedules(route.schedules);
    return (
      groups
        .slice(0, 3)
        .map((g) => g.departs_at)
        .join(' · ') + (groups.length > 3 ? ' …' : '')
    );
  }

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
    this.run(this.api.updateRoute(route.id, { price, capacity, active }), () => this.toasts.success(this.transloco.translate('common.saved')));
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
    this.run(this.api.createRoute({ origin_station_id: origin, destination_station_id: destination, network: this.network(), price, capacity }), () => {
      this.creating.set(false);
      this.origin.set(null);
      this.destination.set(null);
    });
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
