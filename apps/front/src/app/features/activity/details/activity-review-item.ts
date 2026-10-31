import { Component, computed, inject, input, output } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TranslocoLocaleService } from '@jsverse/transloco-locale';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroHandThumbUp } from '@ng-icons/heroicons/outline';
import { heroHandThumbUpSolid } from '@ng-icons/heroicons/solid';
import { DatePipe } from 'pipes';
import { IActivityReview } from 'models';
import { countryName } from '../activity-format';
import { StarRating } from '../ui/star-rating';

/** Couleurs des pastilles d'initiale, choisies par le prénom (toujours la même pour un même auteur). */
const AVATAR_COLORS = ['bg-brand-dark', 'bg-brand-primary', 'bg-state-success', 'bg-state-error', 'bg-state-info', 'bg-state-warning'];

/** Un avis publié : note, auteur et pays, date, « Réservation vérifiée », texte, « Utile ». */
@Component({
  selector: 'bip-activity-review-item',
  imports: [TranslocoDirective, NgIcon, DatePipe, StarRating],
  providers: [provideIcons({ heroHandThumbUp, heroHandThumbUpSolid })],
  host: { class: 'block' },
  template: `
    <article *transloco="let t; prefix: 'activity.reviews'" [class.rounded-card]="boxed()" [class.border]="boxed()" [class.p-4]="boxed()" class="border-border-subtle">
      <p class="flex items-center gap-2 text-sm">
        <bip-star-rating [rating]="review().rating" size="0.875rem" />
        <span class="font-semibold">{{ review().rating }}</span>
        <span class="sr-only">{{ t('stars', { rating: review().rating }) }}</span>
      </p>
      <div class="mt-2 flex items-center gap-3">
        <span [class]="avatar()" aria-hidden="true" class="flex size-10 shrink-0 items-center justify-center rounded-full text-lg font-bold text-onbrand">
          {{ review().author_name.charAt(0).toUpperCase() }}
        </span>
        <div>
          <p class="font-semibold">{{ review().author_name }}{{ country() ? ' – ' + country() : '' }}</p>
          <p class="text-sm text-muted">{{ review().created_at | bipDate: { dateStyle: 'long' } }} · {{ t('verified') }}</p>
        </div>
      </div>
      <p [class.line-clamp-4]="boxed()" class="mt-3 whitespace-pre-line">{{ review().text }}</p>
      @if (!boxed()) {
        <div class="mt-3 flex items-center justify-end gap-2 text-sm text-muted">
          <span>{{ t('helpful') }}</span>
          <button
            (click)="helpful.emit(review())"
            [attr.aria-label]="t('helpful-button', { count: review().helpful_count })"
            [attr.aria-pressed]="voted()"
            [disabled]="voted()"
            class="bip-focusable flex min-h-9 items-center gap-1 rounded-pill px-2 hover:bg-surface-muted"
            type="button">
            <ng-icon [name]="voted() ? 'heroHandThumbUpSolid' : 'heroHandThumbUp'" size="1.125rem" />
            @if (review().helpful_count) {
              <span>{{ review().helpful_count }}</span>
            }
          </button>
        </div>
      }
    </article>
  `,
})
export class ActivityReviewItem {
  readonly review = input.required<IActivityReview>();
  /** Carte encadrée (« Ce que les voyageurs ont aimé ») : texte coupé, sans bouton « Utile ». */
  readonly boxed = input(false);
  readonly voted = input(false);
  readonly helpful = output<IActivityReview>();

  private readonly locale = inject(TranslocoLocaleService);
  protected readonly country = computed(() => countryName(this.review().country, this.locale.getLocale()));
  protected readonly avatar = computed(() => {
    const name = this.review().author_name;
    const hash = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0);
    return AVATAR_COLORS[hash % AVATAR_COLORS.length];
  });
}
