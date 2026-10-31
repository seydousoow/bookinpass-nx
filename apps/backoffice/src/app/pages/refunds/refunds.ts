import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslocoDirective } from '@jsverse/transloco';
import { Badge } from 'components/badge/badge';
import { Button } from 'components/button/button';
import { Checkbox } from 'components/checkbox/checkbox';
import { Input } from 'components/input/input';
import { Spinner } from 'components/spinner/spinner';
import { SystemState } from 'components/system-state/system-state';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { dakarDateTime } from '../../core/dakar';

/**
 * Remboursements (admin, manager) : paiements Wave / Orange Money reçus après la revente des places. Le mobile money ne
 * s'annule pas : le client est remboursé à la main, puis le remboursement est noté ici (opérateur, référence).
 */
@Component({
  selector: 'bo-refunds',
  imports: [TranslocoDirective, Badge, Button, Checkbox, Input, Spinner, SystemState],
  templateUrl: './refunds.html',
})
export class RefundsPage {
  protected readonly action = createAction();
  protected readonly all = signal(false);
  /** Note de remboursement en cours de saisie, par paiement. */
  protected readonly notes = signal<Readonly<Record<number, string>>>({});
  protected readonly dateTime = dakarDateTime;
  private readonly api = inject(StaffApi);
  protected readonly list = rxResource({
    params: () => this.all(),
    stream: ({ params }) => this.api.refunds(params),
  });

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
