import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslocoDirective } from '@jsverse/transloco';
import { Badge } from 'components/badge/badge';
import { Button } from 'components/button/button';
import { Checkbox } from 'components/checkbox/checkbox';
import { Input } from 'components/input/input';
import { Spinner } from 'components/spinner/spinner';
import { SystemState } from 'components/system-state/system-state';
import { createAction } from '../core/action';
import { StaffApi } from '../core/api';
import { dakarDateTime } from '../core/dakar';

/**
 * Remboursements (admin, manager) : paiements Wave / Orange Money reçus après la revente des places. Le mobile money ne
 * s'annule pas : le client est remboursé à la main, puis le remboursement est noté ici (opérateur, référence).
 */
@Component({
  selector: 'bo-refunds',
  imports: [TranslocoDirective, Badge, Button, Checkbox, Input, Spinner, SystemState],
  template: `
    <section *transloco="let t" class="space-y-4">
      <div class="flex flex-wrap items-end gap-3">
        <h1 class="mr-auto text-xl font-bold">{{ t('refunds.title') }}</h1>
        <bip-checkbox [(checked)]="all" [label]="t('refunds.show-done')" class="flex min-h-11 items-center" name="show-done" />
      </div>
      <p class="text-xs text-muted">{{ t('refunds.hint') }}</p>
      @if (action.error(); as code) {
        <p class="text-state-error" role="alert">{{ t('errors.' + code) }}</p>
      }
      @if (list.isLoading() && !list.hasValue()) {
        <bip-spinner class="py-8" label="common.loading" showLabel />
      } @else if (list.error()) {
        <bip-system-state (retry)="list.reload()" message="errors.unexpected" status="error" />
      } @else if (!list.value()?.length) {
        <bip-system-state status="empty" title="refunds.none" />
      }
      <ul class="grid gap-2">
        @for (r of list.value() ?? []; track r.id) {
          <li [class.opacity-70]="r.status === 'refunded'" class="bo-card space-y-2 text-sm">
            <div class="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p>
                  <span class="font-mono text-base font-bold">{{ r.reference }}</span> · {{ r.origin }} → {{ r.destination }} · {{ dateTime(r.departs_at) }}
                </p>
                <p>{{ r.passengers }}</p>
                <p class="text-muted">
                  {{ r.email }} · <a [href]="'tel:' + r.phone" class="underline">{{ r.phone }}</a>
                </p>
              </div>
              <div class="text-right">
                <p class="text-lg font-bold">{{ r.amount }} {{ r.currency }}</p>
                <p class="text-xs text-muted">{{ t('refunds.paid-at', { time: dateTime(r.paid_at) }) }}</p>
                @if (r.receipt_url) {
                  <a [href]="r.receipt_url" class="text-xs text-brand-primary underline" rel="noopener" target="_blank">{{ t('refunds.receipt') }}</a>
                }
                <p class="font-mono text-xs text-muted">{{ r.provider }} · {{ r.invoice_token }}</p>
              </div>
            </div>
            @if (r.status === 'refunded') {
              <p class="flex flex-wrap items-center gap-2">
                <bip-badge size="sm" tone="success">✓ {{ t('refunds.done', { time: dateTime(r.refunded_at), name: r.refunded_by }) }}</bip-badge>
                <span>{{ r.refund_note }}</span>
              </p>
            } @else {
              <form (submit)="$event.preventDefault(); markRefunded(r.id)" class="flex flex-wrap items-end gap-2 border-t border-border-subtle pt-2">
                <bip-input
                  (valueChange)="setNote(r.id, $event)"
                  [maxLength]="500"
                  [name]="'note-' + r.id"
                  [value]="notes()[r.id] ?? ''"
                  class="min-w-64 flex-1"
                  hideLabel
                  label="refunds.note"
                  placeholder="refunds.note" />
                <button [disabled]="!notes()[r.id]?.trim()" [loading]="action.busy()" bipButton type="submit">{{ t('refunds.mark') }}</button>
              </form>
            }
          </li>
        }
      </ul>
    </section>
  `,
})
export class RefundsPage {
  private readonly api = inject(StaffApi);
  protected readonly action = createAction();
  protected readonly all = signal(false);
  protected readonly list = rxResource({
    params: () => this.all(),
    stream: ({ params }) => this.api.refunds(params),
  });
  /** Note de remboursement en cours de saisie, par paiement. */
  protected readonly notes = signal<Readonly<Record<number, string>>>({});
  protected readonly dateTime = dakarDateTime;

  protected setNote(id: number, text: string | null): void {
    this.notes.update((all) => ({ ...all, [id]: text ?? '' }));
  }

  protected markRefunded(id: number): void {
    const note = this.notes()[id]?.trim();
    if (!note) {
      return;
    }
    this.action.run(this.api.markRefunded(id, note), () => {
      this.setNote(id, '');
      this.list.reload();
    });
  }
}
