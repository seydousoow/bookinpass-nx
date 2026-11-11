import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { provideIcons } from '@ng-icons/core';
import { heroCheckCircle } from '@ng-icons/heroicons/outline';
import { Button } from 'components/button/button';
import { Input } from 'components/input/input';
import { SystemState } from 'components/system-state/system-state';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { dakarDateTime } from '../../core/dakar';
import { ConfirmDialog, EmptyState, PageHeader, StatusBadge, Toasts } from '../../ui';

type RefundKind = 'transport' | 'activities';

/** Remboursement en cours de confirmation. */
interface Marking {
  readonly kind: RefundKind;
  readonly id: number;
  readonly reference: string;
  readonly amount: string;
  readonly customer: string;
}

/**
 * Remboursements (admin, manager), en deux onglets : paiements Wave / Orange Money reçus après la revente des places de
 * car, et remboursements d'activités payées par mobile money (annulation, geste commercial, paiement tardif). Le mobile
 * money ne s'annule pas : le client est remboursé à la main, puis le remboursement est noté ici (opérateur, référence),
 * après confirmation. L'historique montre les remboursements faits.
 */
@Component({
  selector: 'bo-refunds',
  imports: [RouterLink, TranslocoDirective, Button, Input, SystemState, ConfirmDialog, EmptyState, PageHeader, StatusBadge],
  providers: [provideIcons({ heroCheckCircle })],
  templateUrl: './refunds.html',
})
export class RefundsPage {
  protected readonly action = createAction();
  protected readonly kinds: readonly RefundKind[] = ['transport', 'activities'];
  protected readonly kind = signal<RefundKind>('transport');
  protected readonly view = signal<'pending' | 'history'>('pending');
  protected readonly dateTime = dakarDateTime;
  protected readonly marking = signal<Marking | null>(null);
  protected readonly note = signal<string | null>('');
  /** L'historique demande aussi les remboursements faits. */
  private readonly all = computed(() => this.view() === 'history');
  private readonly api = inject(StaffApi);
  protected readonly list = rxResource({
    params: () => this.all(),
    stream: ({ params }) => this.api.refunds(params),
  });
  /** Remboursements d'activités : mobile money à faire à la main, et (historique) ceux par carte. */
  protected readonly activityList = rxResource({
    params: () => this.all(),
    stream: ({ params }) => this.api.activityRefunds(params),
  });
  protected readonly transportRows = computed(() => (this.list.value() ?? []).filter((r) => (r.status === 'refunded') === this.all()));
  protected readonly activityRows = computed(() => (this.activityList.value() ?? []).filter((r) => (r.status === 'refunded') === this.all()));
  private readonly toasts = inject(Toasts);
  private readonly transloco = inject(TranslocoService);

  /** Remboursements encore à faire, pour le compteur de l'onglet. */
  protected pendingCount(kind: RefundKind): number {
    return kind === 'transport'
      ? (this.list.value() ?? []).filter((r) => r.status !== 'refunded').length
      : (this.activityList.value() ?? []).filter((r) => r.status !== 'refunded').length;
  }

  protected askMark(kind: RefundKind, id: number, reference: string, amount: string, customer: string): void {
    this.action.error.set(null);
    this.note.set('');
    this.marking.set({ kind, id, reference, amount, customer });
  }

  protected confirmMark(): void {
    const marking = this.marking();
    const note = this.note()?.trim();
    if (!marking || !note) {
      return;
    }
    const request = marking.kind === 'transport' ? this.api.markRefunded(marking.id, note) : this.api.markActivityRefunded(marking.id, note);
    this.action.run<unknown>(request, () => {
      this.marking.set(null);
      this.toasts.success(this.transloco.translate('refunds.marked', { reference: marking.reference }));
      if (marking.kind === 'transport') {
        this.list.reload();
      } else {
        this.activityList.reload();
      }
    });
  }

  protected retryActivity(id: number): void {
    this.action.run(this.api.retryActivityRefund(id), () => this.activityList.reload());
  }
}
