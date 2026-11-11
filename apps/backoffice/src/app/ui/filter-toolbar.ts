import { Component, input, output } from '@angular/core';

/**
 * Barre de filtres compacte : les champs en ligne (en colonne sur mobile), le nombre de filtres actifs et
 * « Réinitialiser » quand il y en a.
 */
@Component({
  selector: 'bo-filter-toolbar',
  host: { class: 'block' },
  template: `
    <div class="flex flex-col gap-3 rounded-card border border-border-subtle bg-surface-card p-3 sm:flex-row sm:flex-wrap sm:items-end">
      <ng-content />
      @if (active() > 0) {
        <button (click)="cleared.emit()" class="min-h-11 bo-link px-2 sm:ml-auto" type="button">{{ resetLabel() }} ({{ active() }})</button>
      }
    </div>
  `,
})
export class FilterToolbar {
  /** Filtres différents de leur valeur par défaut. */
  readonly active = input(0);
  readonly resetLabel = input('');
  readonly cleared = output<void>();
}
