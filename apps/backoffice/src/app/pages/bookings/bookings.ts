import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroEnvelope, heroMagnifyingGlass, heroTicket } from '@ng-icons/heroicons/outline';
import { BadgeTone } from 'components/badge/badge';
import { Button } from 'components/button/button';
import { Input } from 'components/input/input';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { Session } from '../../core/session';
import { dakarDateTime, dakarTime } from '../../core/dakar';
import { DeskBooking } from '../../core/models';
import { Drawer, EmptyState, PageHeader, StatusBadge } from '../../ui';

const TONES: Readonly<Record<DeskBooking['status'], BadgeTone>> = { confirmed: 'success', held: 'warning', released: 'neutral' };

/** Recherche : 2 caractères au moins, comme le serveur. */
const MIN_QUERY = 2;

/**
 * Guichet : retrouver la réservation d'un voyageur (référence, téléphone ou nom), voir ses billets et son paiement,
 * renvoyer l'e-mail des billets (chef de gare, responsable).
 */
@Component({
  selector: 'bo-bookings',
  imports: [RouterLink, TranslocoDirective, NgIcon, Button, Input, Drawer, EmptyState, PageHeader, StatusBadge],
  providers: [provideIcons({ heroEnvelope, heroMagnifyingGlass, heroTicket })],
  templateUrl: './bookings.html',
})
export class BookingsPage {
  protected readonly session = inject(Session);
  protected readonly action = createAction();
  protected readonly minQuery = MIN_QUERY;
  protected readonly query = signal<string | null>('');
  protected readonly results = signal<DeskBooking[] | null>(null);
  protected readonly notice = signal<string | null>(null);
  /** Réservation ouverte dans le tiroir. */
  protected readonly selected = signal<DeskBooking | null>(null);
  protected readonly tones = TONES;
  protected readonly dateTime = dakarDateTime;
  protected readonly time = dakarTime;
  private readonly api = inject(StaffApi);

  protected trimmed(): string {
    return (this.query() ?? '').trim();
  }

  /** Premier voyageur de la réservation, pour la liste. */
  protected lead(booking: DeskBooking): string {
    const first = booking.tickets[0];
    return first ? `${first.given_name} ${first.family_name}` : booking.email;
  }

  protected search(): void {
    if (this.trimmed().length < MIN_QUERY) {
      return;
    }
    this.notice.set(null);
    this.action.run(this.api.searchBookings(this.trimmed()), (list) => {
      this.results.set(list);
      // Une seule réponse : on l'ouvre directement.
      this.selected.set(list.length === 1 ? list[0] : null);
    });
  }

  protected resend(booking: DeskBooking): void {
    this.notice.set(null);
    this.action.run(this.api.resendTickets(booking.reference), () => this.notice.set(`${booking.reference} → ${booking.email}`));
  }
}
