import { booleanAttribute, Component, input, model, output } from '@angular/core';
import { Button, ButtonVariant } from 'components/button/button';
import { Modal } from 'components/modal/modal';

/**
 * Confirmation d'une action engageante (remboursement noté, archivage…) : un texte, éventuellement un champ
 * (`<ng-content>`), puis « Annuler » / le bouton d'action. Le voile ne ferme pas : la décision est explicite.
 */
@Component({
  selector: 'bo-confirm',
  imports: [Modal, Button],
  template: `
    <bip-modal [(opened)]="opened" [backdropDismissible]="false" [title]="title()" size="sm">
      @if (message()) {
        <p class="text-sm text-ink">{{ message() }}</p>
      }
      <div class="mt-3 empty:hidden"><ng-content /></div>
      <ng-container modalFooter>
        <button (clicked)="opened.set(false)" bipButton type="button" variant="outline">{{ cancelLabel() }}</button>
        <button (clicked)="confirmed.emit()" [disabled]="disabled()" [loading]="busy()" [variant]="variant()" bipButton type="button">{{ confirmLabel() }}</button>
      </ng-container>
    </bip-modal>
  `,
})
export class ConfirmDialog {
  readonly opened = model(false);
  readonly title = input.required<string>();
  readonly message = input<string>();
  readonly confirmLabel = input.required<string>();
  readonly cancelLabel = input.required<string>();
  readonly variant = input<ButtonVariant>('primary');
  readonly busy = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly confirmed = output<void>();
}
