import { Component, input } from '@angular/core';

/** Groupe de champs d'un formulaire : titre, explication courte, puis les champs en grille responsive. */
@Component({
  selector: 'bo-form-section',
  host: { class: 'block border-t border-border-subtle pt-5 first:border-t-0 first:pt-0' },
  template: `
    <div class="mb-4">
      <h3 class="text-base font-semibold text-ink">{{ title() }}</h3>
      @if (description()) {
        <p class="mt-0.5 text-sm text-muted">{{ description() }}</p>
      }
    </div>
    <div [class]="'grid gap-4 ' + columns()"><ng-content /></div>
  `,
})
export class FormSection {
  readonly title = input.required<string>();
  readonly description = input<string>();
  /** Colonnes de la grille (classes Tailwind). */
  readonly columns = input('md:grid-cols-2');
}
