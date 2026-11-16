import { Component, computed, inject, input, model, signal } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroGlobeEuropeAfricaSolid, heroMapPinSolid, heroXMarkSolid } from '@ng-icons/heroicons/solid';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { catchError, debounceTime, distinctUntilChanged, map, of, switchMap } from 'rxjs';
import { Spinner } from 'components';
import { IActivityPlace } from 'models';
import { ActivityService } from '../activity.service';

/** Lieu choisi : une ville (ses activités et 100 km autour) ou un pays (toutes ses activités). */
export type TActivityPlaceValue =
  { readonly kind: 'city'; readonly id: number; readonly label: string } | { readonly kind: 'country'; readonly code: string; readonly label: string };

const MIN_LENGTH = 2;

/** Nom d'un pays (code ISO) dans la langue du site ; le code si le navigateur ne le connaît pas. */
export function countryName(code: string, lang: string): string {
  try {
    return new Intl.DisplayNames([lang], { type: 'region' }).of(code) ?? code;
  } catch {
    return code;
  }
}

function keyOf(place: IActivityPlace): string {
  return place.kind === 'city' ? `city:${place.city?.id}` : `country:${place.country_code}`;
}

function valueOf(place: IActivityPlace): TActivityPlaceValue {
  return place.kind === 'city' && place.city
    ? { kind: 'city', id: place.city.id, label: `${place.city.name}, ${place.country_name}` }
    : { kind: 'country', code: place.country_code, label: place.country_name };
}

/**
 * Saisie d'une ville ou d'un pays, avec suggestions tapées au fil de l'eau : pays et villes qui ont des activités
 * (une ville compte celles à moins de 100 km). Sans saisie, les destinations les plus fournies.
 */
@Component({
  selector: 'bip-activity-place-field',
  imports: [TranslocoDirective, Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option, NgIcon, Spinner],
  providers: [provideIcons({ heroMapPinSolid, heroGlobeEuropeAfricaSolid, heroXMarkSolid })],
  host: { class: 'block' },
  template: `
    <div *transloco="let t; prefix: 'activity.search'" class="relative">
      <label [for]="name()" class="mb-1 block text-xs font-semibold text-muted">{{ t('city') }}</label>
      <div
        [class]="opened() ? 'border-brand-primary' : 'border-border-strong hover:border-brand-primary/60'"
        class="flex min-h-11 items-center gap-2 rounded-field border bg-surface-card px-3 py-2 focus-within:ring-2 focus-within:ring-brand-primary focus-within:ring-offset-2">
        <ng-icon class="shrink-0" color="var(--color-muted)" name="heroMapPinSolid" />
        <input
          #combobox="ngCombobox"
          (expandedChange)="opened.set($event)"
          (input)="typed()"
          [(value)]="query"
          [expanded]="opened()"
          [id]="name()"
          [name]="name()"
          [placeholder]="t('place-placeholder')"
          autocomplete="off"
          class="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-muted/70 focus:outline-none"
          ngCombobox
          type="text" />
        @if (loading()) {
          <bip-spinner class="text-brand-primary" size="xs" />
        } @else if (query()) {
          <button (click)="clear()" class="bip-focusable flex text-muted" type="button">
            <span class="sr-only">{{ t('clear-place') }}</span>
            <ng-icon aria-hidden="true" name="heroXMarkSolid" size="1rem" />
          </button>
        }
      </div>

      <ng-template [combobox]="combobox" ngComboboxPopup popupType="listbox">
        <div class="absolute top-full left-0 z-30 mt-1 w-full min-w-72 overflow-hidden rounded-panel border border-border-subtle bg-surface-card shadow-panel">
          <ul
            #listbox="ngListbox"
            (valueChange)="pick($event)"
            [activeDescendant]="listbox.activeDescendant()"
            [value]="selectedKeys()"
            class="max-h-80 overflow-y-auto py-1 focus:outline-none"
            ngComboboxWidget
            ngListbox
            selectionMode="explicit">
            @for (place of suggestions(); track key(place)) {
              <li
                #opt="ngOption"
                [class]="opt.active() ? 'bg-brand-soft' : 'hover:bg-brand-soft/60'"
                [label]="label(place)"
                [value]="key(place)"
                class="flex min-h-11 w-full cursor-pointer items-center gap-3 px-3 py-2"
                ngOption>
                <ng-icon [name]="place.kind === 'country' ? 'heroGlobeEuropeAfricaSolid' : 'heroMapPinSolid'" aria-hidden="true" class="shrink-0 text-muted" />
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-semibold">{{ place.kind === 'city' ? place.city?.name : place.country_name }}</span>
                  <span class="block truncate text-xs text-muted">
                    {{ place.kind === 'city' ? t('place-city', { country: place.country_name }) : t('place-country') }}
                  </span>
                </span>
                <span class="shrink-0 text-xs text-muted">{{ t('count', { count: place.activities }) }}</span>
              </li>
            } @empty {
              <li class="px-3 py-4 text-center text-sm text-muted">
                {{ query().trim().length < minLength ? t('place-min', { count: minLength }) : t('place-none', { value: query() }) }}
              </li>
            }
          </ul>
        </div>
      </ng-template>
    </div>
  `,
})
export class ActivityPlaceField {
  readonly name = input('activity-place');
  /** Lieu choisi ; `null` : partout. */
  readonly value = model<TActivityPlaceValue | null>(null);

  protected readonly minLength = MIN_LENGTH;
  protected readonly query = model('');
  protected readonly opened = signal(false);
  private readonly api = inject(ActivityService);
  private readonly transloco = inject(TranslocoService);

  /** Sans saisie : les destinations les plus fournies, sous la forme de lieux. */
  private readonly destinations = rxResource({
    params: () => this.transloco.activeLang(),
    stream: () =>
      this.api.destinations().pipe(
        map((list) =>
          list.map((d): IActivityPlace => ({
            kind: 'city',
            city: d.city,
            country_code: d.city.country_code,
            country_name: countryName(d.city.country_code, this.transloco.getActiveLang()),
            activities: d.activities,
          })),
        ),
        catchError(() => of([] as IActivityPlace[])),
      ),
  });
  private readonly found = toSignal(
    toObservable(this.query).pipe(
      map((q) => q.trim()),
      debounceTime(200),
      distinctUntilChanged(),
      switchMap((q) => (q.length < MIN_LENGTH ? of(null) : this.api.places(q).pipe(catchError(() => of([] as IActivityPlace[]))))),
    ),
    { initialValue: null },
  );
  protected readonly loading = computed(() => this.query().trim().length >= MIN_LENGTH && this.found() === null);
  protected readonly suggestions = computed((): readonly IActivityPlace[] => {
    if (this.query().trim().length < MIN_LENGTH || this.value()) {
      return this.query().trim() && !this.value() ? [] : (this.destinations.value() ?? []).slice(0, 8);
    }
    return this.found() ?? [];
  });
  protected readonly selectedKeys = computed(() => {
    const value = this.value();
    return value ? [value.kind === 'city' ? `city:${value.id}` : `country:${value.code}`] : [];
  });

  /** Lieu affiché (critères venus de l'URL). */
  show(value: TActivityPlaceValue | null): void {
    this.value.set(value);
    this.query.set(value?.label ?? '');
  }

  /** Premier lieu proposé pour la saisie en cours, si rien n'a été choisi (« dakar » puis Entrée). */
  firstSuggestion(): TActivityPlaceValue | null {
    const first = this.query().trim().length >= MIN_LENGTH ? (this.found() ?? [])[0] : undefined;
    return first ? valueOf(first) : null;
  }

  protected key(place: IActivityPlace): string {
    return keyOf(place);
  }

  protected label(place: IActivityPlace): string {
    return place.kind === 'city' ? (place.city?.name ?? '') : place.country_name;
  }

  /** Saisie modifiée : le lieu choisi ne vaut plus. */
  protected typed(): void {
    if (this.value()) {
      this.value.set(null);
    }
  }

  protected pick(keys: string[]): void {
    const key = keys[0];
    const place = [...(this.found() ?? []), ...(this.destinations.value() ?? [])].find((p) => keyOf(p) === key);
    if (!place) {
      return;
    }
    const value = valueOf(place);
    this.value.set(value);
    this.query.set(value.label);
    this.opened.set(false);
  }

  protected clear(): void {
    this.show(null);
  }
}
