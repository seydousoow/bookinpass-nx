import { Component, computed, inject, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { TranslocoLocaleService } from '@jsverse/transloco-locale';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroStarSolid } from '@ng-icons/heroicons/solid';
import { Button, Select, Textarea } from 'components';
import { COUNTRY_CODES, IActivityReviewForm, ISelectOption } from 'models';
import { countryName } from '../activity-format';

const MIN_TEXT = 20;
const MAX_TEXT = 3000;

/** Notes à donner : générale (obligatoire), puis rapport qualité-prix, accueil et organisation (facultatives). */
type TRatingKey = 'rating' | 'value_rating' | 'service_rating' | 'organization_rating';

/** Avis du voyageur après l'activité : notes, pays (facultatif) et texte ; publié après modération. */
@Component({
  selector: 'bip-activity-review-form',
  imports: [TranslocoDirective, NgIcon, Button, Select, Textarea],
  providers: [provideIcons({ heroStarSolid })],
  host: { class: 'block' },
  template: `
    <form (submit)="submit($event)" *transloco="let t; prefix: 'activity.review-form'" class="space-y-4 rounded-card border border-border-subtle bg-surface-card p-4" novalidate>
      <h2 class="text-xl font-bold">{{ t('title') }}</h2>
      <p class="text-sm text-muted">{{ t('subtitle') }}</p>
      @for (key of keys; track key) {
        <fieldset>
          <legend class="text-sm font-semibold">{{ t('ratings.' + key) }}{{ key === 'rating' ? ' *' : '' }}</legend>
          <div class="mt-1 flex gap-1">
            @for (star of stars; track star) {
              <button
                (click)="rate(key, star)"
                [attr.aria-label]="t('star', { count: star })"
                [attr.aria-pressed]="value()[key] === star"
                class="bip-focusable rounded-button p-1"
                type="button">
                <ng-icon [class]="(value()[key] ?? 0) >= star ? 'text-brand-accent' : 'text-border-strong'" name="heroStarSolid" size="1.75rem" />
              </button>
            }
          </div>
        </fieldset>
      }
      @if (attempted() && !value().rating) {
        <p class="text-sm text-state-error" role="alert">{{ t('rating-required') }}</p>
      }
      <bip-select
        (valueChange)="patch({ country: $event[0] ?? null })"
        [options]="countries()"
        [value]="value().country ? [value().country!] : []"
        hint="activity.review-form.country-hint"
        label="activity.review-form.country"
        name="review-country" />
      <bip-textarea
        (valueChange)="patch({ text: $event })"
        [invalid]="attempted() && !textValid()"
        [maxLength]="maxText"
        [touched]="attempted()"
        [value]="value().text"
        hint="activity.review-form.text-hint"
        label="activity.review-form.text"
        name="review-text" />
      @if (attempted() && !textValid()) {
        <p class="text-sm text-state-error" role="alert">{{ t('text-length', { min: minText }) }}</p>
      }
      <button [loading]="sending()" bipButton type="submit" variant="primary">{{ t('submit') }}</button>
    </form>
  `,
})
export class ActivityReviewFormComponent {
  readonly submitted = output<IActivityReviewForm>();

  protected readonly keys: readonly TRatingKey[] = ['rating', 'value_rating', 'service_rating', 'organization_rating'];
  protected readonly stars = [1, 2, 3, 4, 5];
  protected readonly minText = MIN_TEXT;
  protected readonly maxText = MAX_TEXT;
  protected readonly value = signal<IActivityReviewForm>({ rating: 0, value_rating: null, service_rating: null, organization_rating: null, country: null, text: '' });
  protected readonly attempted = signal(false);
  readonly sending = signal(false);
  protected readonly textValid = computed(() => this.value().text.trim().length >= MIN_TEXT);
  private readonly locale = inject(TranslocoLocaleService);
  protected readonly countries = computed((): ISelectOption[] => {
    const locale = this.locale.getLocale();
    return COUNTRY_CODES.map((code) => ({ value: code, label: countryName(code, locale) })).sort((a, b) => a.label.localeCompare(b.label, locale));
  });

  protected rate(key: TRatingKey, star: number): void {
    // Re-cliquer une note facultative l'efface.
    const next = key !== 'rating' && this.value()[key] === star ? null : star;
    this.patch({ [key]: next } as Partial<IActivityReviewForm>);
  }

  protected patch(patch: Partial<IActivityReviewForm>): void {
    this.value.update((value) => ({ ...value, ...patch }));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.attempted.set(true);
    if (this.value().rating && this.textValid()) {
      this.submitted.emit({ ...this.value(), text: this.value().text.trim() });
    }
  }
}
