import { Component, computed, input, model } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroChevronLeft, heroChevronRight } from '@ng-icons/heroicons/outline';
import { clsx } from 'clsx';
import { paginateElements } from 'utils';

@Component({
  selector: 'bip-pagination',
  imports: [TranslocoDirective, NgIcon],
  providers: [provideIcons({ heroChevronLeft, heroChevronRight })],
  host: { class: 'block' },
  template: `
    @if (pageCount() > 1) {
      <nav *transloco="let t" [attr.aria-label]="t('common.pagination.label')" class="flex flex-wrap items-center justify-between gap-2">
        <p aria-live="polite" class="text-xs text-muted">{{ t('common.pagination.summary', { from: from(), to: to(), total: total() }) }}</p>
        <ul class="flex items-center gap-1">
          <li>
            <button (click)="navigate(page() - 1)" [class]="arrowClass" [disabled]="page() === 1" type="button">
              <span class="sr-only">{{ t('common.pagination.previous') }}</span>
              <ng-icon aria-hidden="true" name="heroChevronLeft" />
            </button>
          </li>
          @for (item of items(); track $index) {
            <li>
              @if (item === 'gap') {
                <span aria-hidden="true" class="px-1 text-sm text-muted">…</span>
              } @else {
                <button
                  (click)="navigate(item)"
                  [attr.aria-current]="item === page() ? 'page' : null"
                  [attr.aria-label]="t('common.pagination.page', { page: item })"
                  [class]="pageClass(item === page())"
                  type="button">
                  {{ item }}
                </button>
              }
            </li>
          }
          <li>
            <button (click)="navigate(page() + 1)" [class]="arrowClass" [disabled]="page() === pageCount()" type="button">
              <span class="sr-only">{{ t('common.pagination.next') }}</span>
              <ng-icon aria-hidden="true" name="heroChevronRight" />
            </button>
          </li>
        </ul>
      </nav>
    }
  `,
})
export class Pagination {
  /** Page courante, à partir de 1. */
  readonly page = model(1);
  /** Nombre total d'éléments de la liste. */
  readonly total = input.required<number>();
  readonly pageSize = input(15);

  protected readonly pageCount = computed(() => Math.max(1, Math.ceil(this.total() / this.pageSize())));
  protected readonly items = computed(() => paginateElements(this.page(), this.pageCount()));
  protected readonly from = computed(() => (this.page() - 1) * this.pageSize() + 1);
  protected readonly to = computed(() => Math.min(this.total(), this.page() * this.pageSize()));

  protected readonly arrowClass = clsx(
    'bip-focusable flex size-9 items-center justify-center rounded-button text-ink hover:bg-brand-soft disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent',
  );

  protected pageClass(current: boolean): string {
    return clsx('bip-focusable flex size-9 items-center justify-center rounded-button text-sm font-semibold', {
      'bg-brand-primary text-onbrand': current,
      'text-ink hover:bg-brand-soft': !current,
    });
  }

  protected navigate(page: number): void {
    if (page >= 1 && page <= this.pageCount() && page !== this.page()) {
      this.page.set(page);
    }
  }
}
