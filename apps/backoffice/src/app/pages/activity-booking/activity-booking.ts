import { Component, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Badge } from 'components/badge/badge';
import { Button } from 'components/button/button';
import { Input } from 'components/input/input';
import { Spinner } from 'components/spinner/spinner';
import { SystemState } from 'components/system-state/system-state';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { ActivityBookingDetail } from '../../core/models';
import { zonedDateTime } from '../../core/zone';
import { dakarDateTime } from '../../core/dakar';
import { BOOKING_TONES } from '../activity-bookings/activity-bookings';

/**
 * Une réservation d'activité : client, créneau, paiement et remboursements. Un responsable peut l'annuler (places
 * rendues, montant choisi remboursé, client prévenu), rembourser sans annuler (geste commercial), ou retenter un
 * remboursement par carte échoué. Carte : remboursée par Stripe ; mobile money : à faire à la main (Remboursements).
 */
@Component({
  selector: 'bo-activity-booking',
  imports: [RouterLink, TranslocoDirective, Badge, Button, Input, Spinner, SystemState],
  templateUrl: './activity-booking.html',
})
export class ActivityBookingPage {
  readonly reference = input.required<string>();

  protected readonly tones = BOOKING_TONES;
  protected readonly when = zonedDateTime;
  protected readonly dateTime = dakarDateTime;
  protected readonly action = createAction();
  protected readonly mode = signal<'cancel' | 'refund' | null>(null);
  protected readonly reason = signal<string | null>('');
  protected readonly amount = signal<number | null>(null);
  private readonly api = inject(StaffApi);
  protected readonly detail = rxResource({
    params: () => this.reference(),
    stream: ({ params }) => this.api.activityBooking(params),
  });

  constructor() {
    // Montant proposé : tout ce qui reste remboursable.
    effect(() => {
      const detail = this.detail.value();
      if (detail) {
        this.amount.set(Number(detail.refundable));
      }
    });
  }

  protected start(mode: 'cancel' | 'refund'): void {
    this.mode.set(mode);
    this.reason.set('');
    this.amount.set(Number(this.detail.value()?.refundable ?? 0));
  }

  protected submit(detail: ActivityBookingDetail): void {
    const reason = this.reason()?.trim();
    const amount = this.amount() ?? 0;
    if (!reason || amount < 0 || amount > Number(detail.refundable)) {
      return;
    }
    const reference = detail.booking.reference;
    const request = this.mode() === 'cancel' ? this.api.cancelActivityBooking(reference, reason, amount) : this.api.refundActivityBooking(reference, amount, reason);
    this.action.run(request, (updated) => {
      this.mode.set(null);
      this.detail.set(updated);
    });
  }

  protected retry(id: number): void {
    this.action.run(this.api.retryActivityRefund(id), () => this.detail.reload());
  }
}
