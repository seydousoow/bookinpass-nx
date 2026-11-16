import { Component, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { Router } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Button, Input } from 'components';
import { IActivitySearch } from 'models';
import { ActivityService } from '../activity.service';
import { toActivityQueryParams } from '../activity-search-params';
import { ActivityPlaceField, countryName, TActivityPlaceValue } from './activity-place-field';

/**
 * Recherche d'activités, sans dates : lieu tapé au clavier (ville et 100 km autour, ou pays) et texte libre ; ouvre
 * `/activities/search`.
 */
@Component({
  selector: 'bip-activity-search-form',
  imports: [TranslocoDirective, Input, Button, ActivityPlaceField],
  template: `
    <form (submit)="submit($event)" *transloco="let t; prefix: 'activity.search'" class="grid w-full grid-cols-1 gap-3 md:grid-cols-[1fr_2fr_auto] md:items-end" novalidate>
      <bip-activity-place-field [(value)]="place" />
      <bip-input [(value)]="query" [placeholder]="t('query-placeholder')" label="activity.search.query" name="activity-query" type="search" />
      <button bipButton class="w-full md:w-auto" size="lg" type="submit" variant="accent">{{ t('submit') }}</button>
    </form>
  `,
})
export class ActivitySearchForm {
  /** Critères à afficher (page de résultats). */
  readonly initial = input<IActivitySearch | null>(null);

  protected readonly place = signal<TActivityPlaceValue | null>(null);
  protected readonly query = signal<string | null>('');
  private readonly field = viewChild.required(ActivityPlaceField);
  private readonly router = inject(Router);
  private readonly api = inject(ActivityService);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    effect(() => {
      const initial = this.initial();
      if (initial) {
        untracked(() => {
          this.query.set(initial.q);
          this.restore(initial);
        });
      }
    });
  }

  protected submit(event: Event): void {
    event.preventDefault();
    const place = this.place() ?? this.field().firstSuggestion();
    const search: IActivitySearch = {
      city_id: place?.kind === 'city' ? place.id : null,
      country: place?.kind === 'country' ? place.code : null,
      category: this.initial()?.category ?? null,
      q: this.query() ?? '',
      page: 0,
    };
    void this.router.navigate(['/activities', 'search'], { queryParams: toActivityQueryParams(search) });
  }

  /** Lieu de l'URL : nom du pays par le navigateur, nom de la ville par l'API (GeoNames). */
  private restore(initial: IActivitySearch): void {
    const current = this.place();
    if (initial.city_id !== null) {
      if (current?.kind === 'city' && current.id === initial.city_id) {
        return;
      }
      const id = initial.city_id;
      this.api.city(id).subscribe({
        next: (city) => this.field().show({ kind: 'city', id, label: `${city.name}, ${countryName(city.countryCode, this.transloco.getActiveLang())}` }),
        error: () => this.field().show(null),
      });
    } else if (initial.country) {
      this.field().show({ kind: 'country', code: initial.country, label: countryName(initial.country, this.transloco.getActiveLang()) });
    } else {
      this.field().show(null);
    }
  }
}
