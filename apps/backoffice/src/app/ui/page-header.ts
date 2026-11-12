import { Component, input } from '@angular/core';

/**
 * En-tête de page : titre, sous-titre court, action principale à droite (`[actions]`). Les filtres viennent en dessous
 * (contenu par défaut), sans concurrencer le titre.
 */
@Component({
  selector: 'bo-page-header',
  host: { class: 'block space-y-4' },
  template: `
    <div class="flex flex-wrap items-start gap-x-4 gap-y-3">
      <div class="min-w-0 flex-1">
        <ng-content select="[eyebrow]" />
        <h1 class="text-2xl font-semibold tracking-tight text-ink">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="mt-1 max-w-3xl text-sm text-muted">{{ subtitle() }}</p>
        }
      </div>
      <div class="flex flex-wrap items-center gap-2 max-sm:w-full max-sm:*:flex-1">
        <ng-content select="[actions]" />
      </div>
    </div>
    <ng-content />
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
}
