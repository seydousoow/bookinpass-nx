import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslocoDirective } from '@jsverse/transloco';
import { Badge } from 'components/badge/badge';
import { Button } from 'components/button/button';
import { Checkbox } from 'components/checkbox/checkbox';
import { Input } from 'components/input/input';
import { Select } from 'components/select/select';
import { Spinner } from 'components/spinner/spinner';
import { SystemState } from 'components/system-state/system-state';
import { ISelectOption } from 'models';
import { DayCell, monthGrid } from 'utils';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { ActivityDetail, ActivitySlot } from '../../core/models';
import { addDays, addYears, zonedDateTime, zonedDay } from '../../core/zone';

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
/** Créneaux ouverts jusqu'à deux ans à l'avance (comme le serveur). */
export const SLOT_YEARS_AHEAD = 2;
/** Créneaux montrés dans une case du calendrier ; les autres sont comptés (« +3 »). */
const SHOWN_PER_DAY = 3;
/** Durées proposées pour ouvrir des créneaux, en mois à partir du premier jour. */
const SPANS = [1, 3, 6, 12, 24] as const;

/**
 * Créneaux d'une option, dans le fuseau de la ville de l'activité, sur un calendrier mensuel : un jour choisi montre ses
 * créneaux (places, suppression sans réservation, annulation avec remboursement des réservations payées). Ouverture par
 * jours de la semaine et heures sur une période, jusqu'à deux ans à l'avance.
 */
@Component({
  selector: 'bo-activity-slots',
  imports: [TranslocoDirective, Badge, Button, Checkbox, Input, Select, Spinner, SystemState],
  host: { class: 'block' },
  template: `
    <section *transloco="let t" class="space-y-3 bo-card">
      <div class="flex flex-wrap items-center gap-3">
        <h2 class="mr-auto font-bold">{{ t('slots.title') }}</h2>
        @if (activity().options.length) {
          <bip-select
            (valueChange)="option.set($event[0] ?? null)"
            [options]="optionChoices()"
            [value]="option() === null ? [] : [option()!]"
            class="min-w-56"
            label="slots.option"
            name="slot-option" />
        }
      </div>
      <p class="text-xs text-muted">{{ t('slots.hint', { zone: activity().city.timezone }) }}</p>
      @if (!activity().options.length) {
        <p class="text-sm text-muted">{{ t('slots.no-option') }}</p>
      } @else {
        @if (action.error(); as code) {
          <p class="text-state-error" role="alert">{{ t('errors.' + code) }}</p>
        }
        @if (message(); as m) {
          <p class="text-sm text-state-success" role="status">✓ {{ t(m.key, { count: m.count }) }}</p>
        }

        <details class="rounded-card border border-border-subtle">
          <summary class="bip-focusable cursor-pointer p-3 font-semibold select-none">{{ t('slots.open') }}</summary>
          <form (submit)="$event.preventDefault(); open()" class="space-y-3 border-t border-border-subtle p-3">
            <div class="flex flex-wrap items-end gap-3">
              <bip-input [(value)]="from" [dateMax]="horizon()" class="w-44" label="slots.from" name="slots-from" type="date" />
              <bip-input [(value)]="to" [dateMax]="horizon()" class="w-44" label="slots.to" name="slots-to" type="date" />
              <div [attr.aria-label]="t('slots.span')" class="flex flex-wrap gap-1" role="group">
                @for (months of spans; track months) {
                  <button (click)="span(months)" class="bip-focusable min-h-11 rounded-pill border border-border-subtle px-3 text-xs font-semibold" type="button">
                    {{ t('slots.spans.' + months) }}
                  </button>
                }
              </div>
            </div>
            <fieldset class="flex flex-wrap items-center gap-3">
              <legend class="mb-1 block text-xs font-semibold text-muted">{{ t('routes.days') }}</legend>
              @for (day of days; track day) {
                <bip-checkbox (checkedChange)="toggleDay(day, $event)" [checked]="openDays()[day - 1]" [label]="t('days.' + day)" [name]="'open-day-' + day" />
              }
            </fieldset>
            <div class="flex flex-wrap items-end gap-3">
              <bip-input [(value)]="times" class="w-56" hint="slots.times-hint" label="slots.times" name="slot-times" placeholder="09:00, 14:30" />
              <bip-input [(value)]="capacity" [min]="1" class="w-32" hint="slots.capacity-hint" label="slots.capacity" name="slot-capacity" type="number" />
              <button [disabled]="!canOpen()" [loading]="action.busy()" bipButton type="submit">{{ t('slots.open-button') }}</button>
            </div>
            <p class="text-xs text-muted">{{ t('slots.open-hint', { date: horizonLabel() }) }}</p>
          </form>
        </details>

        <!-- Calendrier du mois -->
        <div class="flex flex-wrap items-center gap-2">
          <button
            (click)="shift(-1)"
            [attr.aria-label]="t('slots.previous')"
            [disabled]="!canGoBack()"
            class="bip-focusable size-11 rounded-button border border-border-subtle disabled:opacity-40"
            type="button">
            ←
          </button>
          <p aria-live="polite" class="min-w-40 text-center font-semibold">{{ t('calendar.months.' + (month().getMonth() + 1)) }} {{ month().getFullYear() }}</p>
          <button
            (click)="shift(1)"
            [attr.aria-label]="t('slots.next')"
            [disabled]="!canGoForward()"
            class="bip-focusable size-11 rounded-button border border-border-subtle disabled:opacity-40"
            type="button">
            →
          </button>
          <button (clicked)="goToday()" bipButton size="sm" variant="ghost">{{ t('slots.today') }}</button>
          @if (list.isLoading()) {
            <bip-spinner class="ml-auto" label="common.loading" />
          }
        </div>

        @if (list.error()) {
          <bip-system-state (retry)="list.reload()" message="errors.unexpected" status="error" />
        } @else {
          <div class="grid grid-cols-7 gap-px overflow-hidden rounded-card border border-border-subtle bg-border-subtle text-xs">
            @for (day of days; track day) {
              <div class="bg-surface-muted p-1 text-center font-semibold">{{ t('days.' + day) }}</div>
            }
            @for (cell of grid(); track cell.iso) {
              @let cellSlots = byDay().get(cell.iso) ?? [];
              <button
                (click)="selected.set(cell.iso)"
                [attr.aria-label]="t('slots.cell', { date: dayLabel(cell.iso), count: cellSlots.length })"
                [attr.aria-pressed]="selected() === cell.iso"
                [class]="cellClass(cell)"
                class="bip-focusable flex min-h-20 min-w-0 flex-col items-stretch gap-0.5 p-1 text-left"
                type="button">
                <span [class.text-brand-primary]="cell.iso === today()" class="font-semibold">{{ cell.dayNumber }}</span>
                @for (slot of cellSlots.slice(0, shownPerDay); track slot.id) {
                  <span [class]="chipClass(slot)" class="truncate rounded px-1">{{ time(slot.starts_at) }} · {{ slot.sold }}/{{ slot.capacity }}</span>
                }
                @if (cellSlots.length > shownPerDay) {
                  <span class="text-muted">+{{ cellSlots.length - shownPerDay }}</span>
                }
              </button>
            }
          </div>
        }

        <!-- Créneaux du jour choisi -->
        @if (selected(); as day) {
          @let daySlots = byDay().get(day) ?? [];
          <div class="space-y-2 rounded-card border border-border-subtle p-3">
            <div class="flex items-center gap-2">
              <h3 class="mr-auto font-semibold">{{ t('slots.day-title', { date: dayLabel(day) }) }}</h3>
              <button (clicked)="selected.set(null)" bipButton size="sm" variant="ghost">{{ t('slots.close-day') }}</button>
            </div>
            @if (!daySlots.length) {
              <p class="text-sm text-muted">{{ t('slots.none-day') }}</p>
            }
            <ul class="divide-y divide-border-subtle">
              @for (slot of daySlots; track slot.id) {
                <li [class.opacity-60]="slot.cancelled_at" class="flex flex-wrap items-end gap-3 py-2 text-sm">
                  <div class="mr-auto">
                    <p class="font-semibold">{{ time(slot.starts_at) }}</p>
                    <p class="text-muted">{{ t('slots.counts', { sold: slot.sold, held: slot.held, capacity: slot.capacity }) }}</p>
                    @if (slot.cancelled_at) {
                      <bip-badge size="sm" tone="error">{{ t('slots.cancelled', { reason: slot.cancel_reason }) }}</bip-badge>
                    }
                  </div>
                  @if (!slot.cancelled_at) {
                    <bip-input
                      (valueChange)="setCapacity(slot.id, $event)"
                      [min]="1"
                      [name]="'capacity-' + slot.id"
                      [value]="capacities()[slot.id] ?? slot.capacity"
                      class="w-24"
                      label="slots.capacity"
                      type="number" />
                    <button (clicked)="resize(slot)" [disabled]="!capacities()[slot.id]" [loading]="action.busy()" bipButton size="sm" variant="outline">
                      {{ t('common.save') }}
                    </button>
                    @if (!slot.sold && !slot.held) {
                      <button (clicked)="remove(slot)" [loading]="action.busy()" bipButton size="sm" variant="ghost">{{ t('slots.delete') }}</button>
                    }
                    @if (cancelling() === slot.id) {
                      <form (submit)="$event.preventDefault(); cancel(slot)" class="flex w-full flex-wrap items-end gap-2">
                        <bip-input [(value)]="reason" [maxLength]="500" class="min-w-64 flex-1" label="slots.reason" name="cancel-reason" />
                        <button [disabled]="!reason()?.trim()" [loading]="action.busy()" bipButton size="sm" type="submit">
                          {{ t('slots.confirm-cancel', { count: slot.sold }) }}
                        </button>
                        <button (clicked)="cancelling.set(null)" bipButton size="sm" type="button" variant="ghost">{{ t('common.cancel') }}</button>
                      </form>
                    } @else {
                      <button (clicked)="cancelling.set(slot.id); reason.set('')" bipButton size="sm" variant="ghost">{{ t('slots.cancel') }}</button>
                    }
                  }
                </li>
              }
            </ul>
          </div>
        }
      }
    </section>
  `,
})
export class ActivitySlots {
  readonly activity = input.required<ActivityDetail>();

  protected readonly days = DAYS;
  protected readonly spans = SPANS;
  protected readonly shownPerDay = SHOWN_PER_DAY;
  protected readonly action = createAction();
  protected readonly option = signal<number | null>(null);
  /** Premier jour du mois affiché. */
  protected readonly month = signal(new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  protected readonly selected = signal<string | null>(null);
  protected readonly from = signal<string | null>(null);
  protected readonly to = signal<string | null>(null);
  protected readonly openDays = signal<readonly boolean[]>(DAYS.map(() => true));
  protected readonly times = signal<string | null>('');
  protected readonly capacity = signal<number | null>(null);
  protected readonly capacities = signal<Readonly<Record<number, number | null>>>({});
  protected readonly cancelling = signal<number | null>(null);
  protected readonly reason = signal<string | null>('');
  protected readonly message = signal<{ key: string; count: number } | null>(null);
  protected readonly optionChoices = computed((): ISelectOption<number>[] => this.activity().options.map((o) => ({ value: o.id, label: o.title })));
  /** Dernier jour où un créneau peut être ouvert. */
  protected readonly horizon = computed(() => addYears(this.today(), SLOT_YEARS_AHEAD));
  protected readonly horizonLabel = computed(() => this.dayLabel(this.horizon()));
  protected readonly grid = computed(() => monthGrid(this.month()));
  /** Un an en arrière au plus (créneaux passés), deux ans en avant (dernier jour ouvrable). */
  protected readonly canGoBack = computed(() => {
    const [year, month] = this.today().split('-').map(Number);
    return this.month() > new Date(year - 1, month - 1, 1);
  });
  protected readonly canGoForward = computed(() => {
    const [year, month] = this.horizon().split('-').map(Number);
    return this.month() < new Date(year, month - 1, 1);
  });
  private readonly zone = computed(() => this.activity().city.timezone);
  /** Aujourd'hui dans le fuseau de l'activité. */
  protected readonly today = computed(() => zonedDay(new Date().toISOString(), this.zone()));
  /** Créneaux par jour civil du fuseau de l'activité. */
  protected readonly byDay = computed(() => {
    const map = new Map<string, ActivitySlot[]>();
    for (const slot of this.list.value() ?? []) {
      const day = zonedDay(slot.starts_at, this.zone());
      map.set(day, [...(map.get(day) ?? []), slot]);
    }
    return map;
  });
  private readonly parsedTimes = computed(() =>
    (this.times() ?? '')
      .split(/[\s,;]+/)
      .map((time) => time.trim())
      .filter(Boolean),
  );
  protected readonly canOpen = computed(() => {
    const from = this.from();
    const to = this.to();
    return (
      this.option() !== null &&
      !!from &&
      !!to &&
      from <= to &&
      to <= this.horizon() &&
      this.openDays().some(Boolean) &&
      this.parsedTimes().length > 0 &&
      this.parsedTimes().every((time) => TIME.test(time))
    );
  });
  private readonly api = inject(StaffApi);
  /** Créneaux des six semaines affichées (42 jours : sous la limite de trois mois du serveur). */
  protected readonly list = rxResource({
    params: () => {
      const option = this.option();
      const cells = this.grid();
      return option === null ? undefined : { option, from: cells[0].iso, to: cells[cells.length - 1].iso };
    },
    stream: ({ params }) => this.api.slots(params.option, params.from, params.to),
  });

  constructor() {
    // Première option, et un mois d'ouverture à partir d'aujourd'hui, dans le fuseau de l'activité.
    effect(() => {
      const activity = this.activity();
      untracked(() => {
        if (this.option() === null || !activity.options.some((o) => o.id === this.option())) {
          this.option.set(activity.options[0]?.id ?? null);
        }
        if (!this.from()) {
          const today = this.today();
          this.from.set(today);
          this.to.set(addDays(today, 30));
          this.goToday();
        }
      });
    });
  }

  protected time(iso: string): string {
    return zonedDateTime(iso, this.zone()).slice(11);
  }

  /** `2026-11-12` → `12/11/2026`. */
  protected dayLabel(day: string): string {
    return `${day.slice(8, 10)}/${day.slice(5, 7)}/${day.slice(0, 4)}`;
  }

  protected cellClass(cell: DayCell): string {
    const base = cell.inMonth ? 'bg-surface-card hover:bg-brand-soft' : 'bg-surface-muted text-muted';
    const past = cell.iso < this.today() ? ' opacity-60' : '';
    const chosen = this.selected() === cell.iso ? ' ring-2 ring-inset ring-brand-primary' : '';
    return base + past + chosen;
  }

  /** Annulé (barré), complet (rouge), avec des ventes (couleur de la marque), libre (neutre). */
  protected chipClass(slot: ActivitySlot): string {
    if (slot.cancelled_at) {
      return 'bg-surface-muted text-muted line-through';
    }
    if (slot.sold + slot.held >= slot.capacity) {
      return 'bg-state-error text-onbrand';
    }
    return slot.sold ? 'bg-brand-soft text-brand-dark' : 'bg-surface-muted';
  }

  protected shift(months: number): void {
    const month = this.month();
    this.month.set(new Date(month.getFullYear(), month.getMonth() + months, 1));
  }

  protected goToday(): void {
    const [year, month] = this.today().split('-').map(Number);
    this.month.set(new Date(year, month - 1, 1));
    this.selected.set(this.today());
  }

  /** Période d'ouverture de `months` mois à partir du premier jour (aujourd'hui au plus tôt), sans dépasser deux ans. */
  protected span(months: number): void {
    const chosen = this.from();
    const from = chosen && chosen >= this.today() ? chosen : this.today();
    const [year, month, day] = from.split('-').map(Number);
    const end = new Date(Date.UTC(year, month - 1 + months, day - 1)).toISOString().slice(0, 10);
    this.from.set(from);
    this.to.set(end > this.horizon() ? this.horizon() : end);
  }

  protected toggleDay(day: number, checked: boolean): void {
    this.openDays.update((days) => days.map((value, index) => (index === day - 1 ? checked : value)));
  }

  protected setCapacity(id: number, capacity: number | null): void {
    this.capacities.update((all) => ({ ...all, [id]: capacity }));
  }

  protected open(): void {
    const option = this.option();
    const from = this.from();
    const to = this.to();
    if (option === null || !from || !to || !this.canOpen()) {
      return;
    }
    const days = DAYS.filter((day) => this.openDays()[day - 1]);
    this.message.set(null);
    this.action.run(this.api.openSlots(option, { from, to, days: [...days], times: this.parsedTimes(), capacity: this.capacity() }), ({ created }) => {
      this.message.set({ key: 'slots.opened', count: created });
      this.list.reload();
    });
  }

  protected resize(slot: ActivitySlot): void {
    const capacity = this.capacities()[slot.id];
    if (!capacity) {
      return;
    }
    this.action.run(this.api.resizeSlot(slot.id, capacity), () => {
      this.setCapacity(slot.id, null);
      this.list.reload();
    });
  }

  protected remove(slot: ActivitySlot): void {
    this.action.run(this.api.deleteSlot(slot.id), () => this.list.reload());
  }

  protected cancel(slot: ActivitySlot): void {
    const reason = this.reason()?.trim();
    if (!reason) {
      return;
    }
    this.action.run(this.api.cancelSlot(slot.id, reason), ({ cancelled }) => {
      this.cancelling.set(null);
      this.message.set({ key: 'slots.bookings-cancelled', count: cancelled });
      this.list.reload();
    });
  }
}
