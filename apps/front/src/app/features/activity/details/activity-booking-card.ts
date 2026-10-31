import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { forkJoin, map } from 'rxjs';
import { TranslocoDirective } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroMinus, heroPlus, heroUserGroup } from '@ng-icons/heroicons/outline';
import { Button, DatePicker, Dropdown, Spinner } from 'components';
import { DatePipe, MoneyPipe } from 'pipes';
import { IActivityDetail, IActivityOption, IActivitySlot, IDateRangeValue, IsoDate } from 'models';
import { ActivityService } from '../activity.service';
import { dayIn, lastDayOf, monthsFrom, unavailableDays } from './availability-calendar';

/** Dates proposées : ce mois-ci et les deux suivants. */
const MONTHS = 3;
const MAX_PARTICIPANTS = 20;

interface IOptionSlots {
  readonly option: IActivityOption;
  readonly slots: readonly IActivitySlot[];
  /** Prix pour tous les participants. */
  readonly total: number;
}

/**
 * Carte de réservation : participants, date (seules celles qui ont de la place sont ouvertes), puis les options et
 * leurs horaires ce jour-là. Le créneau choisi ouvre `/activities/book`.
 */
@Component({
  selector: 'bip-activity-booking-card',
  imports: [TranslocoDirective, NgIcon, Button, DatePicker, Dropdown, Spinner, DatePipe, MoneyPipe],
  providers: [provideIcons({ heroMinus, heroPlus, heroUserGroup })],
  host: { class: 'block' },
  template: `
    <section
      *transloco="let t; prefix: 'activity.book-card'"
      [attr.aria-label]="t('label')"
      class="space-y-3 rounded-panel border border-border-subtle bg-surface-card p-5 shadow-md">
      @if (activity().price_from; as price) {
        <p class="text-sm">
          {{ t('from') }}
          @if (activity().original_price; as original) {
            <s class="font-semibold">{{ original | bipMoney: activity().currency }}</s>
          }
        </p>
        <p>
          <span [class.text-state-error]="activity().original_price" class="text-2xl font-bold">{{ price | bipMoney: activity().currency }}</span>
          <span class="text-sm"> {{ t('per-person') }}</span>
        </p>
      } @else {
        <p class="text-sm text-muted">{{ t('not-on-sale') }}</p>
      }

      <bip-dropdown
        [(opened)]="participantsOpen"
        [error]="false"
        [label]="t('participants')"
        [value]="t('participants-value', { adults: adults(), children: children() })"
        name="activity-participants">
        <div class="space-y-3 p-3">
          @for (row of rows(); track row.key) {
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-sm font-semibold">{{ t(row.key) }}</p>
                @if (row.key === 'children') {
                  <p class="text-xs text-muted">{{ t('children-hint') }}</p>
                }
              </div>
              <div class="flex items-center gap-2">
                <button
                  (click)="change(row.key, -1)"
                  [attr.aria-label]="t('less', { who: t(row.key) })"
                  [disabled]="row.value <= row.min"
                  class="bip-focusable flex size-9 items-center justify-center rounded-pill border border-border-strong disabled:opacity-40"
                  type="button">
                  <ng-icon name="heroMinus" />
                </button>
                <span aria-live="polite" class="w-6 text-center font-semibold">{{ row.value }}</span>
                <button
                  (click)="change(row.key, 1)"
                  [attr.aria-label]="t('more', { who: t(row.key) })"
                  [disabled]="participants() >= maxParticipants"
                  class="bip-focusable flex size-9 items-center justify-center rounded-pill border border-border-strong disabled:opacity-40"
                  type="button">
                  <ng-icon name="heroPlus" />
                </button>
              </div>
            </div>
          }
        </div>
      </bip-dropdown>

      <bip-date-picker
        [(value)]="date"
        [label]="t('date')"
        [maxDate]="maxDate()"
        [minDate]="today()"
        [placeholder]="t('date-placeholder')"
        [unavailable]="unavailable()"
        mode="single" />
      @if (dates.error()) {
        <p class="text-xs text-state-error" role="alert">{{ t('dates-failed') }}</p>
      } @else if (dates.hasValue() && !dates.value().length) {
        <p class="text-xs text-muted" role="status">{{ t('no-dates') }}</p>
      }

      <button (clicked)="check()" [disabled]="!date().start || !activity().options.length" bipButton class="w-full" size="lg" type="button" variant="accent">
        {{ t('check') }}
      </button>

      @if (checked()) {
        <div aria-live="polite" class="space-y-3 pt-2">
          @if (slots.isLoading()) {
            <div class="flex justify-center py-4"><bip-spinner label="activity.book-card.loading" showLabel size="sm" /></div>
          } @else if (slots.error()) {
            <p class="text-sm text-state-error" role="alert">{{ t('slots-failed') }}</p>
          } @else if (!offers().length) {
            <p class="text-sm" role="status">{{ t('no-slots') }}</p>
          } @else {
            <p class="text-sm font-semibold">{{ checked() | bipDate: { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' } }}</p>
            @for (offer of offers(); track offer.option.id) {
              <div class="rounded-card border border-border-subtle p-3">
                <p class="font-semibold">{{ offer.option.title }}</p>
                @if (offer.option.description) {
                  <p class="text-xs text-muted">{{ offer.option.description }}</p>
                }
                <p class="mt-1 text-sm">{{ t('total', { total: (offer.total | bipMoney: activity().currency), count: participants() }) }}</p>
                <div [attr.aria-label]="t('times')" class="mt-2 flex flex-wrap gap-2" role="group">
                  @for (slot of offer.slots; track slot.slot_id) {
                    <button
                      (click)="selected.set(slot)"
                      [attr.aria-pressed]="selected()?.slot_id === slot.slot_id"
                      [disabled]="!slot.available"
                      [class]="selected()?.slot_id === slot.slot_id ? 'border-brand-primary bg-brand-primary text-onbrand' : 'border-border-strong'"
                      class="bip-focusable rounded-pill border px-3 py-1.5 text-sm font-semibold disabled:line-through disabled:opacity-40"
                      type="button">
                      {{ slot.starts_at | bipDate: { hour: '2-digit', minute: '2-digit', timeZone: activity().city.timezone } }}
                    </button>
                  }
                </div>
                @if (selectedIn(offer) && selected(); as slot) {
                  @if (slot.remaining <= 5) {
                    <p class="mt-2 text-xs text-state-warning">{{ t('few-left', { count: slot.remaining }) }}</p>
                  }
                  <bip-button (clicked)="book(slot)" class="mt-3 block" size="md" variant="primary">{{ t('book') }}</bip-button>
                }
              </div>
            }
            <p class="text-xs text-muted">{{ t('time-zone', { zone: activity().city.timezone }) }}</p>
          }
        </div>
      }
    </section>
  `,
})
export class ActivityBookingCard {
  readonly activity = input.required<IActivityDetail>();

  protected readonly maxParticipants = MAX_PARTICIPANTS;
  protected readonly adults = signal(1);
  protected readonly children = signal(0);
  protected readonly participants = computed(() => this.adults() + this.children());
  protected readonly participantsOpen = signal(false);
  protected readonly date = signal<IDateRangeValue>({ start: null, end: null });
  /** Date dont les créneaux sont affichés (après « Vérifier les disponibilités »). */
  protected readonly checked = signal<IsoDate | null>(null);
  protected readonly selected = signal<IActivitySlot | null>(null);
  protected readonly today = computed(() => dayIn(this.activity().city.timezone));
  private readonly months = computed(() => monthsFrom(this.today(), MONTHS));
  protected readonly maxDate = computed(() => lastDayOf(this.months()[MONTHS - 1]));
  /** Le tarif enfant n'existe que si une option en a un. */
  protected readonly childrenOffered = computed(() => this.activity().options.some((o) => o.child_price !== null));
  protected readonly rows = computed(() => [
    { key: 'adults' as const, value: this.adults(), min: this.childrenOffered() ? 0 : 1 },
    ...(this.childrenOffered() ? [{ key: 'children' as const, value: this.children(), min: 0 }] : []),
  ]);
  private readonly api = inject(ActivityService);
  private readonly router = inject(Router);

  protected readonly dates = rxResource({
    params: () => ({ slug: this.activity().slug, months: this.months(), participants: this.participants() }),
    stream: ({ params }) => forkJoin(params.months.map((month) => this.api.dates(params.slug, month, params.participants))).pipe(map((all) => all.flat())),
  });
  protected readonly unavailable = computed(() => (this.dates.hasValue() ? unavailableDays(this.today(), this.maxDate(), new Set(this.dates.value())) : []));
  protected readonly slots = rxResource({
    params: () => {
      const day = this.checked();
      return day ? { slug: this.activity().slug, day, participants: this.participants() } : undefined;
    },
    stream: ({ params }) => this.api.availability(params.slug, params.day, params.participants),
  });
  /** Créneaux du jour regroupés par option, dans l'ordre des options. */
  protected readonly offers = computed((): IOptionSlots[] => {
    const slots = this.slots.hasValue() ? this.slots.value() : [];
    return this.activity()
      .options.map((option) => ({
        option,
        slots: slots.filter((s) => s.option_id === option.id),
        total: Number(option.price) * this.adults() + Number(option.child_price ?? 0) * this.children(),
      }))
      .filter((offer) => offer.slots.length && (this.children() === 0 || offer.option.child_price !== null));
  });

  constructor() {
    // Autres participants ou autre date : le créneau choisi n'est plus valable.
    effect(() => {
      this.participants();
      this.date();
      untracked(() => this.selected.set(null));
    });
    effect(() => {
      const start = this.date().start;
      untracked(() => {
        if (this.checked() && start !== this.checked()) {
          this.checked.set(start);
        }
      });
    });
  }

  protected change(who: 'adults' | 'children', step: number): void {
    const target = who === 'adults' ? this.adults : this.children;
    const next = target() + step;
    const other = who === 'adults' ? this.children() : this.adults();
    if (next < 0 || next + other > MAX_PARTICIPANTS || next + other < 1) {
      return;
    }
    target.set(next);
  }

  protected check(): void {
    this.checked.set(this.date().start);
  }

  protected selectedIn(offer: IOptionSlots): boolean {
    return offer.slots.some((s) => s.slot_id === this.selected()?.slot_id);
  }

  protected book(slot: IActivitySlot): void {
    void this.router.navigate(['/activities', 'book'], {
      queryParams: { activity: this.activity().slug, slot: slot.slot_id, date: this.checked(), adults: this.adults(), children: this.children() },
    });
  }
}
