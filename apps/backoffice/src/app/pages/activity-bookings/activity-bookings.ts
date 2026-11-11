import { Component, computed, inject, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';
import { TranslocoDirective } from '@jsverse/transloco';
import { provideIcons } from '@ng-icons/core';
import { heroCalendarDays } from '@ng-icons/heroicons/outline';
import { BadgeTone } from 'components/badge/badge';
import { Button } from 'components/button/button';
import { Input } from 'components/input/input';
import { Pagination } from 'components/pagination/pagination';
import { Select } from 'components/select/select';
import { SystemState } from 'components/system-state/system-state';
import { ISelectOption } from 'models';
import { StaffApi } from '../../core/api';
import { ACTIVITY_BOOKING_STATUSES, ActivityBookingStatus } from '../../core/models';
import { translatedOptions } from '../../core/options';
import { zonedDateTime } from '../../core/zone';
import { EmptyState, FilterToolbar, PageHeader, StatusBadge } from '../../ui';

export const BOOKING_TONES: Readonly<Record<ActivityBookingStatus, BadgeTone>> = {
  held: 'warning',
  confirmed: 'success',
  released: 'neutral',
  cancelled: 'error',
};

const PAGE_SIZE = 25;

/**
 * Réservations d'activités (admin, manager) : toutes, filtrées par texte (référence, e-mail, téléphone, nom), statut,
 * activité et période du créneau (jours UTC, l'heure de Dakar). Une ligne ouvre le détail (annulation, remboursement).
 */
@Component({
  selector: 'bo-activity-bookings',
  imports: [RouterLink, TranslocoDirective, Button, Input, Pagination, Select, SystemState, EmptyState, FilterToolbar, PageHeader, StatusBadge],
  providers: [provideIcons({ heroCalendarDays })],
  templateUrl: './activity-bookings.html',
})
export class ActivityBookingsPage {
  protected readonly tones = BOOKING_TONES;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly when = zonedDateTime;
  protected readonly statusOptions = translatedOptions(ACTIVITY_BOOKING_STATUSES, 'activity-bookings.statuses.');
  protected readonly query = signal<string | null>('');
  protected readonly status = signal<ActivityBookingStatus | null>(null);
  protected readonly activityId = signal<number | null>(null);
  protected readonly from = signal<string | null>(null);
  protected readonly to = signal<string | null>(null);
  protected readonly page = signal(1);
  private readonly api = inject(StaffApi);
  private readonly activities = rxResource({ stream: () => this.api.activities() });
  protected readonly activityOptions = computed((): ISelectOption<number>[] => (this.activities.value() ?? []).map((a) => ({ value: a.id, label: a.title })));
  /** La saisie du texte attend une pause avant d'interroger le serveur. */
  private readonly text = toSignal(toObservable(this.query).pipe(debounceTime(300)), { initialValue: '' });
  protected readonly list = rxResource({
    params: () => ({
      q: (this.text() ?? '').trim(),
      status: this.status() ?? '',
      activity_id: this.activityId(),
      from: this.from() ?? '',
      to: this.to() ?? '',
      page: this.page() - 1,
    }),
    stream: ({ params }) => this.api.activityBookings(params),
  });

  protected readonly activeFilters = computed(
    () => Number(!!this.query()?.trim()) + Number(this.status() !== null) + Number(this.activityId() !== null) + Number(!!this.from()) + Number(!!this.to()),
  );
  private readonly router = inject(Router);

  protected open(reference: string): void {
    void this.router.navigate(['/activity-bookings', reference]);
  }

  protected resetFilters(): void {
    this.query.set('');
    this.status.set(null);
    this.activityId.set(null);
    this.from.set(null);
    this.to.set(null);
    this.page.set(1);
  }

  /** Un autre filtre ramène à la première page. */
  protected filter<T>(target: { set(value: T): void }, value: T): void {
    target.set(value);
    this.page.set(1);
  }
}
