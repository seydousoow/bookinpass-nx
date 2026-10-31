import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { catchError, of } from 'rxjs';
import { TranslocoDirective } from '@jsverse/transloco';
import { Button, Input, Select } from 'components';
import { IActivitySearch, ISelectOption } from 'models';
import { ActivityService } from '../activity.service';
import { toActivityQueryParams } from '../activity-search-params';

/** Recherche d'activités : ville (celles qui ont des activités en vente) et texte libre ; ouvre `/activities/search`. */
@Component({
  selector: 'bip-activity-search-form',
  imports: [TranslocoDirective, Select, Input, Button],
  template: `
    <form (submit)="submit($event)" *transloco="let t; prefix: 'activity.search'" class="grid w-full grid-cols-1 gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end" novalidate>
      <bip-select [(value)]="city" [options]="cityOptions()" label="activity.search.city" name="activity-city" placeholder="activity.search.any-city" />
      <bip-input [(value)]="query" [placeholder]="t('query-placeholder')" label="activity.search.query" name="activity-query" type="search" />
      <button bipButton class="w-full md:w-auto" size="lg" type="submit" variant="accent">{{ t('submit') }}</button>
      @if (destinations() === null) {
        <p class="text-sm text-state-error md:col-span-3" role="alert">{{ t('destinations-failed') }}</p>
      }
    </form>
  `,
})
export class ActivitySearchForm {
  /** Critères à afficher (page de résultats). */
  readonly initial = input<IActivitySearch | null>(null);

  protected readonly destinations = toSignal(
    inject(ActivityService)
      .destinations()
      .pipe(catchError(() => of(null))),
    { initialValue: undefined },
  );
  protected readonly cityOptions = computed((): ISelectOption<number>[] =>
    (this.destinations() ?? []).map((d) => ({ label: d.city.name, value: d.city.id, hint: String(d.activities) })),
  );
  protected readonly city = signal<number[]>([]);
  protected readonly query = signal<string | null>('');
  private readonly router = inject(Router);

  constructor() {
    effect(() => {
      const initial = this.initial();
      if (initial) {
        untracked(() => {
          this.city.set(initial.city_id === null ? [] : [initial.city_id]);
          this.query.set(initial.q);
        });
      }
    });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const search: IActivitySearch = { city_id: this.city()[0] ?? null, category: this.initial()?.category ?? null, q: this.query() ?? '', page: 0 };
    void this.router.navigate(['/activities', 'search'], { queryParams: toActivityQueryParams(search) });
  }
}
