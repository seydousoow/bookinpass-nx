import { Component, inject, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TranslocoLocaleService } from '@jsverse/transloco-locale';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroStarSolid } from '@ng-icons/heroicons/solid';
import { MoneyPipe } from 'pipes';
import { IActivityCard } from 'models';
import { activityDuration, ratingLabel } from '../activity-format';
import { ActivityPhoto } from './activity-photo';

/** Carte d'une activité : photo, ville, titre, durée, note et prix « à partir de » (prix barré s'il y a une réduction). */
@Component({
  selector: 'bip-activity-card',
  imports: [RouterLink, TranslocoDirective, NgIcon, MoneyPipe, ActivityPhoto],
  providers: [provideIcons({ heroStarSolid })],
  host: { class: 'block h-full' },
  template: `
    <a
      *transloco="let t; prefix: 'activity.card'"
      [routerLink]="['/activities', activity().slug]"
      class="bip-focusable flex h-full flex-col overflow-hidden rounded-card border border-border-subtle bg-surface-card transition-shadow hover:shadow-md">
      <bip-activity-photo [alt]="activity().image?.alt ?? activity().title" [url]="activity().image?.url" class="aspect-[3/2] w-full" />
      <div class="flex flex-1 flex-col gap-1 p-4">
        <p class="text-xs font-semibold tracking-wide text-muted uppercase">{{ activity().city.name }}</p>
        <h3 class="line-clamp-3 text-lg leading-snug font-bold">{{ activity().title }}</h3>
        <p class="text-sm text-muted">
          {{ duration() }}
          @if (activity().free_cancellation) {
            · {{ t('free-cancellation') }}
          }
        </p>
        <div class="mt-auto flex items-end justify-between gap-2 pt-3">
          @if (activity().rating !== null) {
            <p class="flex items-center gap-1 text-sm">
              <span class="font-semibold">{{ rating() }}</span>
              <ng-icon aria-hidden="true" name="heroStarSolid" size="0.875rem" />
              <span class="text-muted">({{ activity().review_count }})</span>
              <span class="sr-only">{{ t('rating', { rating: rating(), count: activity().review_count }) }}</span>
            </p>
          } @else {
            <span></span>
          }
          @if (activity().price_from; as price) {
            <p class="text-right text-sm">
              {{ t('from') }}
              @if (activity().original_price; as original) {
                <s class="text-muted">{{ original | bipMoney: activity().currency }}</s>
              }
              <span [class.text-state-error]="activity().original_price" class="text-lg font-bold">{{ price | bipMoney: activity().currency }}</span>
            </p>
          }
        </div>
      </div>
    </a>
  `,
})
export class ActivityCardComponent {
  readonly activity = input.required<IActivityCard>();
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(TranslocoLocaleService);

  protected duration(): string {
    return activityDuration(this.activity(), (key, params) => this.transloco.translate(key, params));
  }

  protected rating(): string {
    return ratingLabel(this.activity().rating, this.locale.getLocale());
  }
}
