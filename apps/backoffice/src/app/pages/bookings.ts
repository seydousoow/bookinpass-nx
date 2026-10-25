import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Badge } from 'components/badge/badge';
import { Button } from 'components/button/button';
import { Input } from 'components/input/input';
import { SystemState } from 'components/system-state/system-state';
import { createAction } from '../core/action';
import { StaffApi } from '../core/api';
import { Session } from '../core/session';
import { dakarDateTime, dakarTime } from '../core/dakar';
import { DeskBooking } from '../core/models';

/** Recherche : 2 caractères au moins, comme le serveur. */
const MIN_QUERY = 2;

/**
 * Guichet : retrouver la réservation d'un voyageur (référence, téléphone ou nom), voir ses billets et son paiement,
 * renvoyer l'e-mail des billets (chef de gare, responsable).
 */
@Component({
  selector: 'bo-bookings',
  imports: [RouterLink, TranslocoDirective, Badge, Button, Input, SystemState],
  template: `
    <section *transloco="let t" class="space-y-4">
      <h1 class="text-xl font-bold">{{ t('bookings.title') }}</h1>
      <form (submit)="$event.preventDefault(); search()" class="bo-card flex flex-wrap items-end gap-2">
        <bip-input [(value)]="query" [maxLength]="50" autocomplete="off" class="min-w-64 flex-1" label="bookings.query" name="q" type="search" />
        <button [disabled]="trimmed().length < minQuery" [loading]="action.busy()" bipButton type="submit">{{ t('bookings.search') }}</button>
      </form>
      @if (action.error(); as code) {
        <p class="text-state-error" role="alert">{{ t('errors.' + code) }}</p>
      }
      @if (notice(); as text) {
        <p class="rounded-card bg-state-success-soft p-3 text-sm text-state-success" role="status">{{ text }}</p>
      }
      @if (results(); as list) {
        @if (!list.length) {
          <bip-system-state status="empty" title="bookings.none" />
        }
        <ul class="grid gap-2">
          @for (b of list; track b.reference) {
            <li class="bo-card space-y-2 text-sm">
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p>
                    <span class="font-mono text-base font-bold">{{ b.reference }}</span> · {{ b.origin }} → {{ b.destination }}
                  </p>
                  <a [routerLink]="['/departures', b.departure_id]" class="text-brand-primary underline">{{ dateTime(b.departs_at) }}</a>
                  <p class="text-muted">
                    {{ b.email }} · <a [href]="'tel:' + b.phone" class="underline">{{ b.phone }}</a>
                  </p>
                </div>
                <div class="flex flex-col items-end gap-1">
                  <bip-badge [tone]="b.status === 'confirmed' ? 'success' : 'warning'" size="sm">{{ t('bookings.status.' + b.status) }}</bip-badge>
                  <p>{{ b.total }} {{ b.currency }}</p>
                  @if (b.payment_method) {
                    <p class="text-xs text-muted">{{ t('bookings.method.' + b.payment_method) }} · {{ t('bookings.payment.' + b.payment_status) }}</p>
                  }
                </div>
              </div>
              <ul class="border-t border-border-subtle pt-2">
                @for (ticket of b.tickets; track $index) {
                  <li class="flex flex-wrap justify-between gap-2">
                    <span>{{ ticket.given_name }} {{ ticket.family_name }}</span>
                    <span class="font-mono">{{ ticket.code ?? '—' }}</span>
                    <span [class.text-state-success]="ticket.scanned_at">{{ ticket.scanned_at ? '✓ ' + time(ticket.scanned_at) : t('bookings.not-scanned') }}</span>
                  </li>
                }
              </ul>
              @if (session.chief() && b.status === 'confirmed') {
                <button (clicked)="resend(b)" [loading]="action.busy()" bipButton size="sm" variant="outline">{{ t('bookings.resend') }}</button>
              }
            </li>
          }
        </ul>
      }
    </section>
  `,
})
export class BookingsPage {
  protected readonly session = inject(Session);
  private readonly api = inject(StaffApi);
  protected readonly action = createAction();
  protected readonly minQuery = MIN_QUERY;
  protected readonly query = signal<string | null>('');
  protected readonly results = signal<DeskBooking[] | null>(null);
  protected readonly notice = signal<string | null>(null);
  protected readonly dateTime = dakarDateTime;
  protected readonly time = dakarTime;

  protected trimmed(): string {
    return (this.query() ?? '').trim();
  }

  protected search(): void {
    if (this.trimmed().length < MIN_QUERY) {
      return;
    }
    this.notice.set(null);
    this.action.run(this.api.searchBookings(this.trimmed()), (list) => this.results.set(list));
  }

  protected resend(booking: DeskBooking): void {
    this.notice.set(null);
    this.action.run(this.api.resendTickets(booking.reference), () => this.notice.set(`${booking.reference} → ${booking.email}`));
  }
}
