import { Component, computed, DestroyRef, effect, inject, input, signal, untracked } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { debounceTime, finalize, Subject } from 'rxjs';
import { TranslocoDirective, translateSignal } from '@jsverse/transloco';
import { TranslocoLocaleService } from '@jsverse/transloco-locale';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroSparkles } from '@ng-icons/heroicons/outline';
import { Button, Input, Select, Spinner } from 'components';
import { IActivityDetail, IActivityReview, ISelectOption, TActivityReviewSort } from 'models';
import { ActivityService } from '../activity.service';
import { ratingLabel } from '../activity-format';
import { StarRating } from '../ui/star-rating';
import { ActivityReviewItem } from './activity-review-item';

const PAGE_SIZE = 5;
const SORTS: readonly TActivityReviewSort[] = ['recent', 'rating_high', 'rating_low', 'helpful'];
const VOTES_KEY = 'bip.activity-review-votes';

/**
 * Avis clients : note générale, notes détaillées et répartition par étoile, résumé écrit par une IA, puis les avis
 * publiés (recherche, tri, filtre par note, cinq de plus à chaque « Voir plus d'avis »).
 */
@Component({
  selector: 'bip-activity-reviews',
  imports: [TranslocoDirective, NgIcon, Button, Input, Select, Spinner, StarRating, ActivityReviewItem],
  providers: [provideIcons({ heroSparkles })],
  host: { class: 'block' },
  template: `
    <section *transloco="let t; prefix: 'activity.reviews'" aria-labelledby="activity-reviews-title" class="grid gap-8 lg:grid-cols-[18rem_1fr]">
      <div>
        <h2 class="text-2xl font-bold" id="activity-reviews-title">{{ t('title') }}</h2>
        @if (rating().count) {
          <p class="mt-4 font-semibold">{{ t('overall') }}</p>
          <div class="mt-2 flex flex-col items-center gap-2 text-center">
            <p>
              <span class="text-4xl font-bold">{{ average() }}</span
              ><span class="text-lg text-muted">/5</span>
            </p>
            <bip-star-rating [rating]="rating().average ?? 0" size="2rem" />
            <p class="text-muted">{{ t('based-on', { count: rating().count }) }}</p>
          </div>
          @if (details().length) {
            <p class="mt-6 font-semibold">{{ t('summary') }}</p>
            <dl class="mt-2 space-y-2">
              @for (row of details(); track row.key) {
                <div class="grid grid-cols-[1fr_6rem_2.5rem] items-center gap-2 text-sm">
                  <dt>{{ t('detail.' + row.key) }}</dt>
                  <dd class="h-2 overflow-hidden rounded-full bg-surface-muted"><span [style.width.%]="row.value * 20" class="block h-full bg-ink"></span></dd>
                  <dd class="text-right">{{ format(row.value) }}/5</dd>
                </div>
              }
            </dl>
          }
          <p class="mt-6 font-semibold">{{ t('by-stars') }}</p>
          <div class="mt-2 space-y-1">
            @for (star of [5, 4, 3, 2, 1]; track star) {
              <button
                (click)="toggleRating(star)"
                [attr.aria-pressed]="ratingFilter() === star"
                [disabled]="!rating().distribution[star - 1]"
                class="bip-focusable grid w-full grid-cols-[3rem_1fr_2.5rem] items-center gap-2 rounded-button px-1 py-0.5 text-left text-sm hover:bg-surface-muted disabled:opacity-50"
                type="button">
                <span>{{ t('stars-short', { count: star }) }}</span>
                <span class="h-2 overflow-hidden rounded-full bg-surface-muted"><span [style.width.%]="share(star)" class="block h-full bg-ink"></span></span>
                <span class="text-right text-muted">{{ rating().distribution[star - 1] }}</span>
              </button>
            }
          </div>
        } @else {
          <p class="mt-4 text-muted">{{ t('none') }}</p>
        }
      </div>

      <div class="space-y-4">
        @if (activity().review_summary; as summary) {
          <div class="rounded-panel border border-border-subtle bg-surface-muted p-5">
            <p class="flex items-center gap-2 font-semibold"><ng-icon aria-hidden="true" name="heroSparkles" /> {{ t('ai-title') }}</p>
            <p class="mt-3">{{ summary }}</p>
            <p class="mt-3 text-xs text-muted">{{ t('ai-note', { count: activity().review_summary_count ?? 0 }) }}</p>
          </div>
        }
        @if (rating().count) {
          <div class="grid gap-3 sm:grid-cols-[1fr_12rem] sm:items-end">
            <bip-input
              (valueChange)="search($event ?? '')"
              [placeholder]="t('search-placeholder')"
              [value]="query()"
              label="activity.reviews.search"
              name="review-search"
              type="search" />
            <bip-select (valueChange)="changeSort($event[0])" [options]="sortOptions()" [value]="[sort()]" label="activity.reviews.sort" name="review-sort" />
          </div>
          @if (ratingFilter()) {
            <p class="text-sm">
              {{ t('filtered', { count: ratingFilter() }) }}
              <button (click)="toggleRating(ratingFilter())" class="font-semibold underline" type="button">{{ t('clear-filter') }}</button>
            </p>
          }
          <div class="divide-y divide-border-subtle">
            @for (review of reviews(); track review.id) {
              <bip-activity-review-item (helpful)="markHelpful($event)" [review]="review" [voted]="votes().has(review.id)" class="py-5" />
            } @empty {
              @if (!loading() && !failed()) {
                <p class="py-4 text-sm text-muted">{{ t('no-match') }}</p>
              }
            }
          </div>
          @if (loading()) {
            <bip-spinner class="block text-center" label="activity.reviews.loading" size="sm" />
          } @else if (failed()) {
            <p class="text-sm text-state-error" role="alert">
              {{ t('failed') }}
              <button (click)="load()" class="font-semibold underline" type="button">{{ t('retry') }}</button>
            </p>
          } @else if (reviews().length < total()) {
            <div class="flex justify-center">
              <bip-button (clicked)="load()" variant="outline">{{ t('more') }}</bip-button>
            </div>
          }
        }
      </div>
    </section>
  `,
})
export class ActivityReviews {
  readonly activity = input.required<IActivityDetail>();

  protected readonly rating = computed(() => this.activity().rating);
  protected readonly reviews = signal<readonly IActivityReview[]>([]);
  protected readonly total = signal(0);
  protected readonly loading = signal(false);
  protected readonly failed = signal(false);
  protected readonly query = signal('');
  protected readonly sort = signal<TActivityReviewSort>('recent');
  protected readonly ratingFilter = signal(0);
  /** Avis déjà jugés utiles depuis ce navigateur. */
  protected readonly votes = signal<ReadonlySet<number>>(loadVotes());
  private readonly sortLabels = SORTS.map((value) => ({ value, label: translateSignal(`activity.reviews.sorts.${value}`) }));
  protected readonly sortOptions = computed((): ISelectOption<TActivityReviewSort>[] => this.sortLabels.map(({ value, label }) => ({ value, label: label() })));
  protected readonly details = computed(() =>
    (['value', 'service', 'organization'] as const)
      .map((key) => ({ key, value: this.rating()[key] }))
      .filter((row): row is { key: 'value' | 'service' | 'organization'; value: number } => row.value !== null),
  );

  private readonly criteria = computed(() => ({ slug: this.activity().slug, sort: this.sort(), rating: this.ratingFilter(), query: this.query() }));
  private page = 0;
  private readonly searches = new Subject<string>();
  private readonly api = inject(ActivityService);
  private readonly locale = inject(TranslocoLocaleService);
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    // Autre activité, tri, note ou recherche : la liste repart de la première page.
    effect(() => {
      const criteria = this.criteria();
      untracked(() => this.restart(criteria));
    });
    this.searches.pipe(debounceTime(300), takeUntilDestroyed()).subscribe((text) => this.query.set(text));
  }

  protected average(): string {
    return ratingLabel(this.rating().average, this.locale.getLocale());
  }

  protected format(value: number): string {
    return ratingLabel(value, this.locale.getLocale());
  }

  protected share(star: number): number {
    const count = this.rating().count;
    return count ? (this.rating().distribution[star - 1] / count) * 100 : 0;
  }

  protected search(text: string): void {
    this.searches.next(text);
  }

  protected changeSort(sort: TActivityReviewSort | undefined): void {
    this.sort.set(sort ?? 'recent');
  }

  protected toggleRating(star: number): void {
    this.ratingFilter.update((current) => (current === star ? 0 : star));
  }

  protected load(): void {
    const { slug, sort, rating, query } = this.criteria();
    this.loading.set(true);
    this.failed.set(false);
    this.api
      .reviews(slug, this.page, sort, rating, query, PAGE_SIZE)
      .pipe(
        finalize(() => this.loading.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (page) => {
          this.reviews.update((all) => [...all, ...page.items]);
          this.total.set(page.total);
          this.page++;
        },
        error: () => this.failed.set(true),
      });
  }

  protected markHelpful(review: IActivityReview): void {
    if (this.votes().has(review.id)) {
      return;
    }
    const votes = new Set(this.votes()).add(review.id);
    this.votes.set(votes);
    saveVotes(votes);
    this.reviews.update((all) => all.map((r) => (r.id === review.id ? { ...r, helpful_count: r.helpful_count + 1 } : r)));
    this.api
      .markHelpful(review.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({ error: () => undefined });
  }

  private restart(criteria: { slug: string }): void {
    this.page = 0;
    this.reviews.set([]);
    this.total.set(0);
    if (criteria.slug && this.rating().count) {
      this.load();
    }
  }
}

function loadVotes(): ReadonlySet<number> {
  try {
    return new Set(JSON.parse(localStorage.getItem(VOTES_KEY) ?? '[]') as number[]);
  } catch {
    return new Set();
  }
}

function saveVotes(votes: ReadonlySet<number>): void {
  try {
    localStorage.setItem(VOTES_KEY, JSON.stringify([...votes].slice(-500)));
  } catch {
    // Stockage bloqué : le vote compte quand même, il ne sera juste pas retenu.
  }
}
