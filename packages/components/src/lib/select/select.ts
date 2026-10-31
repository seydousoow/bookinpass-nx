import { afterRenderEffect, booleanAttribute, Component, computed, input, model, output, signal, viewChild } from '@angular/core';
import { Combobox, ComboboxPopup, ComboboxWidget } from '@angular/aria/combobox';
import { Listbox, Option } from '@angular/aria/listbox';
import { ISelectOption } from 'models';
import { Field } from '../field/field';
import { FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { CdkConnectedOverlay } from '@angular/cdk/overlay';
import { TranslocoPipe } from '@jsverse/transloco';
import { heroCheckSolid, heroChevronDownSolid } from '@ng-icons/heroicons/solid';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { clsx } from 'clsx';

@Component({
  selector: 'bip-select',
  imports: [Field, Combobox, ComboboxPopup, ComboboxWidget, Listbox, Option, CdkConnectedOverlay, TranslocoPipe, NgIcon],
  host: { class: 'block' },
  templateUrl: './select.html',
  providers: [provideIcons({ heroCheckSolid, heroChevronDownSolid })],
})
export class Select<T = string> implements FormValueControl<T[]> {
  readonly options = input.required<readonly ISelectOption<T>[]>();
  readonly label = input.required<string>();
  readonly hideLabel = input(false, { transform: booleanAttribute });

  /** Clé de traduction, traduite au rendu : suit le changement de langue. */
  readonly placeholder = input('common.select');
  readonly hint = input<string>();
  readonly multiple = input(false, { transform: booleanAttribute });
  public open = signal(false);

  readonly name = input('');
  readonly touched = input(false);
  readonly invalid = input(false);
  readonly dirty = input(false);
  readonly required = input(false);
  readonly disabled = input(false);
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly showErrors = computed(() => this.touched() && this.invalid());
  readonly touch = output<void>();

  readonly value = model<T[]>([]);

  readonly displayValue = computed(() =>
    this.options()
      .filter((o) => this.value().includes(o.value))
      .map((o) => o.label)
      .join(', '),
  );

  private readonly listBox = viewChild(Listbox);

  constructor() {
    afterRenderEffect(() => {
      this.listBox()?.scrollActiveItemIntoView();
    });
  }

  protected triggerClass(): string {
    return clsx('bip-focusable flex min-h-11 w-full items-center gap-2 rounded-field border bg-surface-card px-3 py-2 text-left transition-colors', {
      'border-state-error': this.touched() && this.invalid(),
      'border-brand-primary': !(this.touched() && this.invalid()) && this.open(),
      'border-border-strong hover:border-brand-primary/60': !(this.touched() && this.invalid()) && !this.open(),
      'cursor-not-allowed bg-surface-muted opacity-60': this.disabled(),
      'cursor-pointer': !this.disabled(),
    });
  }

  protected optionClass(active: boolean): string {
    return clsx('flex min-h-11 items-center gap-2 px-3 py-2.5 text-sm', active ? 'bg-brand-soft text-brand-dark' : 'hover:bg-brand-soft/60');
  }

  protected onCommit(): void {
    if (!this.multiple()) {
      this.open.set(false);
    }
  }
}
