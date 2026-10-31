import { Component, inject, input, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Button } from 'components/button/button';
import { Checkbox } from 'components/checkbox/checkbox';
import { Input } from 'components/input/input';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { ActivityDetail, ActivityOption, ActivityOptionForm } from '../../core/models';

function draftOf(option: ActivityOption): ActivityOptionForm {
  return {
    title: option.title,
    description: option.description,
    price: Number(option.price),
    original_price: option.original_price === null ? null : Number(option.original_price),
    child_price: option.child_price === null ? null : Number(option.child_price),
    capacity: option.capacity,
    active: option.active,
  };
}

const EMPTY: ActivityOptionForm = { title: '', description: null, price: 0, original_price: null, child_price: null, capacity: 20, active: true };

/**
 * Options d'une activité : titre, prix adulte, prix enfant (vide = pas de tarif enfant), prix barré, places des
 * nouveaux créneaux, mise en vente. Les prix valent pour les réservations suivantes.
 */
@Component({
  selector: 'bo-activity-options',
  imports: [TranslocoDirective, Button, Checkbox, Input],
  template: `
    <section *transloco="let t" class="space-y-3 bo-card">
      <h2 class="font-bold">{{ t('options.title') }}</h2>
      <p class="text-xs text-muted">{{ t('options.hint', { currency: activity().currency }) }}</p>
      @if (action.error(); as code) {
        <p class="text-state-error" role="alert">{{ t('errors.' + code) }}</p>
      }
      @for (option of activity().options; track option.id) {
        @let d = draft(option);
        <form (submit)="$event.preventDefault(); save(option)" [class.opacity-60]="!d.active" class="grid items-end gap-2 border-t border-border-subtle pt-3 md:grid-cols-6">
          <bip-input (valueChange)="patch(option, { title: $event ?? '' })" [name]="'option-title-' + option.id" [value]="d.title" class="md:col-span-2" label="options.name" />
          <bip-input (valueChange)="patch(option, { price: $event ?? 0 })" [min]="1" [name]="'option-price-' + option.id" [value]="d.price" label="options.price" type="number" />
          <bip-input
            (valueChange)="patch(option, { original_price: $event })"
            [min]="1"
            [name]="'option-original-' + option.id"
            [value]="d.original_price"
            label="options.original-price"
            type="number" />
          <bip-input
            (valueChange)="patch(option, { child_price: $event })"
            [min]="0"
            [name]="'option-child-' + option.id"
            [value]="d.child_price"
            label="options.child-price"
            type="number" />
          <bip-input
            (valueChange)="patch(option, { capacity: $event ?? 1 })"
            [min]="1"
            [name]="'option-capacity-' + option.id"
            [value]="d.capacity"
            label="options.capacity"
            type="number" />
          <bip-input
            (valueChange)="patch(option, { description: $event })"
            [name]="'option-description-' + option.id"
            [value]="d.description"
            class="md:col-span-4"
            label="options.description" />
          <bip-checkbox
            (checkedChange)="patch(option, { active: $event })"
            [checked]="d.active"
            [label]="t('options.on-sale')"
            [name]="'option-active-' + option.id"
            class="flex min-h-11 items-center" />
          <button [disabled]="!d.title.trim() || d.price < 1" [loading]="action.busy()" bipButton type="submit" variant="outline">{{ t('common.save') }}</button>
        </form>
      } @empty {
        <p class="text-sm text-muted">{{ t('options.none') }}</p>
      }

      <form (submit)="$event.preventDefault(); add()" class="grid items-end gap-2 border-t border-border-subtle pt-3 md:grid-cols-6">
        <p class="font-semibold md:col-span-6">{{ t('options.new') }}</p>
        <bip-input (valueChange)="patchNew({ title: $event ?? '' })" [value]="next().title" class="md:col-span-2" label="options.name" name="new-option-title" />
        <bip-input (valueChange)="patchNew({ price: $event ?? 0 })" [min]="1" [value]="next().price" label="options.price" name="new-option-price" type="number" />
        <bip-input
          (valueChange)="patchNew({ original_price: $event })"
          [min]="1"
          [value]="next().original_price"
          label="options.original-price"
          name="new-option-original"
          type="number" />
        <bip-input (valueChange)="patchNew({ child_price: $event })" [min]="0" [value]="next().child_price" label="options.child-price" name="new-option-child" type="number" />
        <bip-input (valueChange)="patchNew({ capacity: $event ?? 1 })" [min]="1" [value]="next().capacity" label="options.capacity" name="new-option-capacity" type="number" />
        <bip-input (valueChange)="patchNew({ description: $event })" [value]="next().description" class="md:col-span-5" label="options.description" name="new-option-description" />
        <button [disabled]="!next().title.trim() || next().price < 1" [loading]="action.busy()" bipButton type="submit">{{ t('options.add') }}</button>
      </form>
    </section>
  `,
})
export class ActivityOptions {
  readonly activity = input.required<ActivityDetail>();
  /** Fiche à jour après une modification. */
  readonly changed = output<ActivityDetail>();

  protected readonly action = createAction();
  protected readonly next = signal<ActivityOptionForm>({ ...EMPTY });
  private readonly drafts = signal<Readonly<Record<number, ActivityOptionForm>>>({});
  private readonly api = inject(StaffApi);

  protected draft(option: ActivityOption): ActivityOptionForm {
    return this.drafts()[option.id] ?? draftOf(option);
  }

  protected patch(option: ActivityOption, patch: Partial<ActivityOptionForm>): void {
    this.drafts.update((all) => ({ ...all, [option.id]: { ...this.draft(option), ...patch } }));
  }

  protected patchNew(patch: Partial<ActivityOptionForm>): void {
    this.next.update((form) => ({ ...form, ...patch }));
  }

  protected save(option: ActivityOption): void {
    this.action.run(this.api.updateOption(option.id, this.draft(option)), (activity) => {
      this.drafts.update((all) => {
        const rest = { ...all };
        delete rest[option.id];
        return rest;
      });
      this.changed.emit(activity);
    });
  }

  protected add(): void {
    this.action.run(this.api.addOption(this.activity().id, this.next()), (activity) => {
      this.next.set({ ...EMPTY });
      this.changed.emit(activity);
    });
  }
}
