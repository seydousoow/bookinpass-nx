import { booleanAttribute, Component, input } from '@angular/core';
import { NgIcon } from '@ng-icons/core';

/**
 * État vide utile : petite icône, ce qui se passe, et l'action possible (`<ng-content>`) quand il y en a une. L'icône
 * doit être fournie par la page (`provideIcons`).
 */
@Component({
  selector: 'bo-empty',
  imports: [NgIcon],
  host: { class: 'flex flex-col items-center gap-2 px-4 text-center', '[class.py-10]': '!compact()', '[class.py-5]': 'compact()', role: 'status' },
  template: `
    <span class="mb-1 grid size-11 place-items-center rounded-full bg-brand-soft text-brand-primary">
      <ng-icon [name]="icon()" aria-hidden="true" size="22" />
    </span>
    <p class="text-sm font-semibold text-ink">{{ title() }}</p>
    @if (message()) {
      <p class="max-w-md text-sm text-muted">{{ message() }}</p>
    }
    <div class="mt-2 flex flex-wrap justify-center gap-2 empty:hidden"><ng-content /></div>
  `,
})
export class EmptyState {
  readonly icon = input('heroInbox');
  readonly title = input.required<string>();
  readonly message = input<string>();
  /** Dans une carte : moins d'espace. */
  readonly compact = input(false, { transform: booleanAttribute });
}
