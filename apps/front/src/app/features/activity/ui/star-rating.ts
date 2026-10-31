import { Component, computed, input } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroStarSolid } from '@ng-icons/heroicons/solid';

/** Cinq étoiles remplies selon une note sur 5 (demi-étoiles comprises) ; purement visuel, la note est dite à côté. */
@Component({
  selector: 'bip-star-rating',
  imports: [NgIcon],
  providers: [provideIcons({ heroStarSolid })],
  host: { class: 'inline-flex items-center', 'aria-hidden': 'true' },
  template: `
    @for (fill of fills(); track $index) {
      <span [style.width]="size()" [style.height]="size()" class="relative inline-block">
        <ng-icon [size]="size()" class="absolute inset-0 text-border-strong" name="heroStarSolid" />
        <span [style.width.%]="fill" class="absolute inset-0 overflow-hidden">
          <ng-icon [size]="size()" class="text-ink" name="heroStarSolid" />
        </span>
      </span>
    }
  `,
})
export class StarRating {
  readonly rating = input.required<number>();
  readonly size = input('1rem');
  /** Remplissage de chaque étoile, en pourcentage (arrondi à la demi-étoile). */
  protected readonly fills = computed(() => {
    const rounded = Math.round(this.rating() * 2) / 2;
    return [0, 1, 2, 3, 4].map((i) => Math.max(0, Math.min(1, rounded - i)) * 100);
  });
}
