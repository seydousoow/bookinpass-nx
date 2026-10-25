import { booleanAttribute, Component, computed, effect, input, model, output } from '@angular/core';
import { ISelectOption } from 'models';
import { FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { translate, TranslocoDirective } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroExclamationCircleSolid } from '@ng-icons/heroicons/solid';
import { clsx } from 'clsx';

@Component({
  selector: 'bip-radio-group',
  host: { class: 'block' },
  templateUrl: './radio-group.html',
  imports: [NgIcon, TranslocoDirective],
  providers: [provideIcons({ heroExclamationCircleSolid })],
})
export class RadioGroup<T = string> implements FormValueControl<T | null> {
  readonly options = input.required<readonly ISelectOption<T>[]>();
  readonly label = input.required<string>();
  readonly hideLabel = input(false, { transform: booleanAttribute });
  readonly appearance = input<'list' | 'segmented'>('list');

  readonly name = input('');
  readonly touched = input(false);
  readonly invalid = input(false);
  readonly dirty = input(false);
  readonly required = input(false);
  readonly disabled = input(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly value = model<T | null>(null);
  readonly showError = computed(() => this.touched() && this.invalid());

  readonly touch = output<void>();

  constructor() {
    effect(() => {
      const options = this.options();
      if (options.length == 0) {
        throw new Error(translate('common.radio.no-option'));
      }
      if (options.length < 2) {
        throw new Error(translate('common.radio.min-option'));
      }
    });
  }

  protected radioId(index: number): string {
    const groupName = this.name();
    return `${groupName || 'radio'}-${index}`;
  }

  protected select(value: T): void {
    this.value.update((old) => (this.disabled() ? old : value));
  }

  protected segmentClass(selected: boolean, itemDisabled: boolean): string {
    return clsx(
      'relative flex min-h-9 items-center justify-center rounded-button px-4 text-sm font-semibold transition-colors duration-300 ease-out',
      'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-primary has-[:focus-visible]:ring-offset-1',
      selected ? 'bg-brand-primary text-onbrand' : 'text-muted hover:bg-brand-soft hover:text-brand-primary',
      {
        'pointer-events-none cursor-not-allowed opacity-50': itemDisabled || this.disabled(),
        'cursor-pointer': !itemDisabled && !this.disabled(),
      },
    );
  }
}
