import { Component, computed, DestroyRef, inject, input, signal, viewChild } from '@angular/core';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { rxResource, takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { finalize } from 'rxjs';
import { TranslocoDirective } from '@jsverse/transloco';
import { Button, Input, Modal, Spinner } from 'components';
import { DatePipe, MoneyPipe } from 'pipes';
import { IActivityBooking, IActivityReviewForm } from 'models';
import { ActivityService } from '../activity.service';
import { ActivityReviewFormComponent } from './activity-review-form';
import { ActivityVoucher } from './activity-voucher';

/** Code d'erreur stable renvoyé par le serveur. */
const codeOf = (error: unknown): string | undefined => (error instanceof HttpErrorResponse ? (error.error as { code?: string } | null)?.code : undefined);

/**
 * Réservation d'activité, ouverte depuis l'e-mail (`/activities/booking?n=REF&l=Nom`) ou en saisissant la référence et
 * le nom de famille : bon d'échange, annulation gratuite dans le délai, avis après l'activité.
 */
@Component({
  selector: 'bip-activity-booking-lookup',
  imports: [TranslocoDirective, Button, Input, Modal, Spinner, DatePipe, MoneyPipe, ActivityVoucher, ActivityReviewFormComponent],
  template: `
    <div *transloco="let t; prefix: 'activity.lookup'" class="mx-auto max-w-2xl space-y-4 px-2 py-6">
      <h1 class="text-xl font-bold">{{ t('title') }}</h1>
      @if (lookup()) {
        @if (result.isLoading() && !booking()) {
          <div class="flex justify-center py-16"><bip-spinner showLabel /></div>
        } @else if (booking(); as b) {
          <bip-activity-voucher [booking]="b" />

          @if (b.cancellable) {
            <div class="flex flex-wrap items-center justify-between gap-3 rounded-card border border-border-subtle bg-surface-card p-4">
              <p class="text-sm">
                {{ t('cancel-until', { until: (b.cancellable_until | bipDate: { dateStyle: 'full', timeStyle: 'short', timeZone: b.activity.city.timezone }) }) }}
              </p>
              <bip-button (clicked)="confirmCancel.set(true)" variant="outline">{{ t('cancel') }}</bip-button>
            </div>
          } @else if (b.status === 'confirmed' && !b.can_review && !b.reviewed) {
            <p class="text-sm text-muted">{{ b.cancellable_until ? t('cancel-closed') : t('non-refundable') }}</p>
          }
          @if (b.status === 'cancelled' && b.cancel_reason) {
            <p class="text-sm">{{ t('cancel-reason', { reason: b.cancel_reason }) }}</p>
          }
          @if (actionError(); as error) {
            <p class="text-sm text-state-error" role="alert">{{ t('errors.' + error) }}</p>
          }

          @if (b.can_review) {
            <bip-activity-review-form (submitted)="sendReview($event)" />
          } @else if (b.reviewed) {
            <p class="rounded-card bg-state-success-soft p-3 text-sm text-state-success" role="status">{{ t(justReviewed() ? 'review-sent' : 'reviewed') }}</p>
          }

          <bip-modal [(opened)]="confirmCancel" [title]="t('cancel-title')">
            <p class="text-sm">{{ t('cancel-confirm', { amount: (b.total | bipMoney: b.currency) }) }}</p>
            <div class="flex justify-end gap-2" modalFooter>
              <bip-button (clicked)="confirmCancel.set(false)" variant="ghost">{{ t('keep') }}</bip-button>
              <bip-button (clicked)="cancel(b)" [loading]="busy()" variant="primary">{{ t('cancel') }}</bip-button>
            </div>
          </bip-modal>
        } @else {
          <p class="text-sm text-state-error" role="alert">{{ t(notFound() ? 'not-found' : 'failed') }}</p>
        }
      }
      @if (!booking()) {
        <form (submit)="open($event)" class="grid gap-4 rounded-card border border-border-subtle bg-surface-card p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end" novalidate>
          <bip-input [(value)]="reference" autocomplete="off" label="activity.lookup.reference" name="reference" />
          <bip-input [(value)]="lastName" autocomplete="family-name" label="activity.lookup.last-name" name="last-name" />
          <button [disabled]="!reference()?.trim() || !lastName()?.trim()" bipButton type="submit" variant="primary">{{ t('submit') }}</button>
        </form>
      }
    </div>
  `,
})
export class ActivityBookingLookup {
  /** Référence (`n`) et nom de famille (`l`) dans l'URL, comme pour les vols et le car. */
  readonly n = input<string>();
  readonly l = input<string>();

  protected readonly reference = signal<string | null>(null);
  protected readonly lastName = signal<string | null>(null);
  protected readonly confirmCancel = signal(false);
  protected readonly busy = signal(false);
  protected readonly actionError = signal<string | null>(null);
  protected readonly justReviewed = signal(false);
  /** Réservation à jour après une annulation ou un avis, sans recharger. */
  private readonly updated = signal<IActivityBooking | null>(null);
  protected readonly lookup = computed(() => (this.n() && this.l() ? { reference: this.n()!, lastName: this.l()! } : null));
  private readonly api = inject(ActivityService);
  protected readonly result = rxResource({
    params: () => this.lookup() ?? undefined,
    stream: ({ params }) => this.api.booking(params.reference, params.lastName),
  });
  protected readonly booking = computed(() => this.updated() ?? (this.result.hasValue() ? this.result.value() : null));
  protected readonly notFound = computed(() => {
    const error = this.result.error();
    return error instanceof HttpErrorResponse && error.status === HttpStatusCode.NotFound;
  });
  private readonly reviewForm = viewChild(ActivityReviewFormComponent);
  private readonly router = inject(Router);
  private readonly destroyRef = inject(DestroyRef);

  protected open(event: Event): void {
    event.preventDefault();
    const reference = this.reference()?.trim();
    const lastName = this.lastName()?.trim();
    if (reference && lastName) {
      this.updated.set(null);
      void this.router.navigate([], { queryParams: { n: reference.toUpperCase(), l: lastName } });
    }
  }

  protected cancel(booking: IActivityBooking): void {
    this.busy.set(true);
    this.actionError.set(null);
    this.api
      .cancel(booking.reference, this.l() ?? booking.family_name)
      .pipe(
        finalize(() => this.busy.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (cancelled) => {
          this.updated.set(cancelled);
          this.confirmCancel.set(false);
        },
        error: (error: unknown) => {
          this.confirmCancel.set(false);
          this.actionError.set(codeOf(error) === 'not-cancellable' ? 'not-cancellable' : 'cancel-failed');
        },
      });
  }

  protected sendReview(review: IActivityReviewForm): void {
    const booking = this.booking();
    const form = this.reviewForm();
    if (!booking) {
      return;
    }
    form?.sending.set(true);
    this.actionError.set(null);
    this.api
      .review(booking.reference, this.l() ?? booking.family_name, review)
      .pipe(
        finalize(() => form?.sending.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (reviewed) => {
          this.justReviewed.set(true);
          this.updated.set(reviewed);
        },
        error: (error: unknown) => {
          const code = codeOf(error);
          this.actionError.set(code === 'already-reviewed' || code === 'review-not-allowed' ? code : 'review-failed');
        },
      });
  }
}
