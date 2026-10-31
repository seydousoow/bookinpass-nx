import { Component, computed, inject } from '@angular/core';
import { rxResource, toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { TranslocoDirective } from '@jsverse/transloco';
import { Button, Pagination, Spinner } from 'components';
import { ACTIVITY_CATEGORIES, IActivitySearch, TActivityCategory } from 'models';
import { ActivityService } from '../activity.service';
import { fromActivityQueryParams, toActivityQueryParams } from '../activity-search-params';
import { ActivitySearchForm } from '../search-form/activity-search-form';
import { ActivityCardComponent } from '../ui/activity-card';

const PAGE_SIZE = 12;

/** Résultats d'une recherche d'activités : critères dans l'URL, filtre par catégorie, cartes paginées. */
@Component({
  selector: 'bip-activity-search',
  imports: [TranslocoDirective, Button, Pagination, Spinner, ActivitySearchForm, ActivityCardComponent],
  template: `
    <div *transloco="let t; prefix: 'activity.search'" class="mx-auto max-w-7xl px-4 py-6">
      <div class="mb-4 rounded-card border border-border-subtle bg-surface-card p-4">
        <bip-activity-search-form [initial]="search()" />
      </div>

      <div [attr.aria-label]="t('categories')" class="mb-4 flex gap-2 overflow-x-auto pb-1" role="group">
        <button (click)="filter(null)" [attr.aria-pressed]="!search().category" [class]="chip(!search().category)" type="button">{{ t('all') }}</button>
        @for (category of categories; track category) {
          <button (click)="filter(category)" [attr.aria-pressed]="search().category === category" [class]="chip(search().category === category)" type="button">
            {{ t('category.' + category) }}
          </button>
        }
      </div>

      @if (results.isLoading() && !results.hasValue()) {
        <div class="flex justify-center py-16"><bip-spinner showLabel /></div>
      } @else if (results.error()) {
        <div class="flex flex-col items-center gap-4 py-16 text-center" role="alert">
          <p class="text-lg font-semibold">{{ t('failed') }}</p>
          <bip-button (clicked)="results.reload()" variant="primary">{{ t('retry') }}</bip-button>
        </div>
      } @else if (results.value(); as page) {
        <p class="mb-3 text-sm text-muted" role="status">{{ t('count', { count: page.total }) }}</p>
        @if (page.items.length) {
          <ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            @for (activity of page.items; track activity.id) {
              <li><bip-activity-card [activity]="activity" /></li>
            }
          </ul>
          @if (page.total > pageSize) {
            <bip-pagination (pageChange)="goTo($event)" [page]="page.page + 1" [pageSize]="pageSize" [total]="page.total" class="mt-6 block" />
          }
        } @else {
          <div class="py-16 text-center">
            <p class="text-lg font-semibold">{{ t('empty-title') }}</p>
            <p class="text-sm text-muted">{{ t('empty-message') }}</p>
          </div>
        }
      }
    </div>
  `,
})
export class ActivitySearch {
  protected readonly categories = ACTIVITY_CATEGORIES;
  protected readonly pageSize = PAGE_SIZE;
  private readonly router = inject(Router);
  protected readonly search = toSignal(inject(ActivatedRoute).queryParams.pipe(map(fromActivityQueryParams)), {
    initialValue: fromActivityQueryParams({}),
  });
  private readonly api = inject(ActivityService);
  protected readonly results = rxResource({
    params: () => this.search(),
    stream: ({ params }) => this.api.search(params, PAGE_SIZE),
  });
  protected readonly empty = computed(() => this.results.value()?.total === 0);

  protected filter(category: TActivityCategory | null): void {
    this.navigate({ ...this.search(), category, page: 0 });
  }

  protected goTo(page: number): void {
    this.navigate({ ...this.search(), page: page - 1 });
  }

  protected chip(active: boolean): string {
    return (
      'bip-focusable rounded-pill shrink-0 border px-4 py-2 text-sm font-semibold ' +
      (active ? 'border-brand-primary bg-brand-primary text-onbrand' : 'border-border-subtle bg-surface-card hover:bg-surface-muted')
    );
  }

  private navigate(search: IActivitySearch): void {
    void this.router.navigate([], { queryParams: toActivityQueryParams(search) });
  }
}
