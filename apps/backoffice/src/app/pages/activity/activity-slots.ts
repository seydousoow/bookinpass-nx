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
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { ActivityDetail, ActivitySlot } from '../../core/models';
import { addDays, zonedDateTime, zonedDay } from '../../core/zone';

const DAYS = [1, 2, 3, 4, 5, 6, 7] as const;
const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/**
 * Créneaux d'une option, dans le fuseau de la ville de l'activité : ouverture par jours de la semaine et heures sur une
 * période, places d'un créneau, suppression (sans réservation) ou annulation (réservations payées annulées et
 * remboursées, clients prévenus).
 */
@Component({
  selector: 'bo-activity-slots',
  imports: [TranslocoDirective, Badge, Button, Checkbox, Input, Select, Spinner, SystemState],
  template: `
    <section *transloco="let t" class="space-y-3 bo-card">
      <h2 class="font-bold">{{ t('slots.title') }}</h2>
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
        <div class="flex flex-wrap items-end gap-3">
          <bip-select
            (valueChange)="option.set($event[0] ?? null)"
            [options]="optionChoices()"
            [value]="option() === null ? [] : [option()!]"
            class="min-w-56"
            label="slots.option"
            name="slot-option" />
          <bip-input [(value)]="from" class="w-44" label="slots.from" name="slots-from" type="date" />
          <bip-input [(value)]="to" class="w-44" label="slots.to" name="slots-to" type="date" />
        </div>

        <form (submit)="$event.preventDefault(); open()" class="flex flex-wrap items-end gap-3 rounded-card border border-border-subtle p-3">
          <p class="w-full font-semibold">{{ t('slots.open') }}</p>
          <fieldset class="flex flex-wrap items-center gap-3">
            <legend class="mb-1 block text-xs font-semibold text-muted">{{ t('routes.days') }}</legend>
            @for (day of days; track day) {
              <bip-checkbox (checkedChange)="toggleDay(day, $event)" [checked]="openDays()[day - 1]" [label]="t('days.' + day)" [name]="'open-day-' + day" />
            }
          </fieldset>
          <bip-input [(value)]="times" class="w-56" hint="slots.times-hint" label="slots.times" name="slot-times" placeholder="09:00, 14:30" />
          <bip-input [(value)]="capacity" [min]="1" class="w-32" hint="slots.capacity-hint" label="slots.capacity" name="slot-capacity" type="number" />
          <button [disabled]="!canOpen()" [loading]="action.busy()" bipButton type="submit">{{ t('slots.open-button') }}</button>
          <p class="w-full text-xs text-muted">{{ t('slots.open-hint') }}</p>
        </form>

        @if (list.isLoading() && !list.hasValue()) {
          <bip-spinner class="py-4" label="common.loading" showLabel />
        } @else if (list.error()) {
          <bip-system-state (retry)="list.reload()" message="errors.unexpected" status="error" />
        } @else if (!list.value()?.length) {
          <p class="text-sm text-muted">{{ t('slots.none') }}</p>
        } @else {
          <ul class="divide-y divide-border-subtle">
            @for (slot of list.value() ?? []; track slot.id) {
              <li [class.opacity-60]="slot.cancelled_at" class="flex flex-wrap items-end gap-3 py-2 text-sm">
                <div class="mr-auto">
                  <p class="font-semibold">{{ when(slot.starts_at) }}</p>
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
        }
      }
    </section>
  `,
})
export class ActivitySlots {
  readonly activity = input.required<ActivityDetail>();

  protected readonly days = DAYS;
  protected readonly action = createAction();
  protected readonly option = signal<number | null>(null);
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
  private readonly parsedTimes = computed(() =>
    (this.times() ?? '')
      .split(/[\s,;]+/)
      .map((time) => time.trim())
      .filter(Boolean),
  );
  protected readonly canOpen = computed(
    () =>
      this.option() !== null &&
      !!this.from() &&
      !!this.to() &&
      this.openDays().some(Boolean) &&
      this.parsedTimes().length > 0 &&
      this.parsedTimes().every((time) => TIME.test(time)),
  );
  private readonly api = inject(StaffApi);
  protected readonly list = rxResource({
    params: () => {
      const option = this.option();
      const from = this.from();
      const to = this.to();
      return option !== null && from && to && from <= to ? { option, from, to } : undefined;
    },
    stream: ({ params }) => this.api.slots(params.option, params.from, params.to),
  });

  constructor() {
    // Première option et le mois à venir, dans le fuseau de l'activité.
    effect(() => {
      const activity = this.activity();
      untracked(() => {
        if (this.option() === null || !activity.options.some((o) => o.id === this.option())) {
          this.option.set(activity.options[0]?.id ?? null);
        }
        if (!this.from()) {
          const today = zonedDay(new Date().toISOString(), activity.city.timezone);
          this.from.set(today);
          this.to.set(addDays(today, 30));
        }
      });
    });
  }

  protected when(iso: string): string {
    return zonedDateTime(iso, this.activity().city.timezone);
  }

  protected toggleDay(day: number, checked: boolean): void {
    this.openDays.update((days) => days.map((value, index) => (index === day - 1 ? checked : value)));
  }

  protected setCapacity(id: number, capacity: number | null): void {
    this.capacities.update((all) => ({ ...all, [id]: capacity }));
  }

  protected open(): void {
    const option = this.option();
    if (option === null || !this.canOpen()) {
      return;
    }
    const days = DAYS.filter((day) => this.openDays()[day - 1]);
    this.message.set(null);
    this.action.run(this.api.openSlots(option, { from: this.from()!, to: this.to()!, days: [...days], times: this.parsedTimes(), capacity: this.capacity() }), ({ created }) => {
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
