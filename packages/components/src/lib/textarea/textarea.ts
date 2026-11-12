import { booleanAttribute, Component, computed, input, model, output } from '@angular/core';
import { FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { Field } from '../field/field';
import { clsx } from 'clsx';

@Component({
  selector: 'bip-textarea',
  imports: [Field],
  host: { class: 'block' },
  template: `
    <bip-field [errors]="errors()" [counter]="counter()" [hint]="hint()" [label]="label()" [name]="name()" [required]="required()" [showErrors]="touched() && invalid()">
      <textarea
        (blur)="touch.emit()"
        (input)="onInput($event)"
        [attr.aria-invalid]="touched() && invalid()"
        [attr.maxlength]="maxLength()"
        [class]="controlClass()"
        [disabled]="disabled()"
        [id]="name()"
        [maxLength]="maxLength()"
        [minLength]="minLength()"
        [name]="name()"
        [placeholder]="placeholder()"
        [required]="required()"
        [rows]="rows()"
        [value]="value()"></textarea>
    </bip-field>
  `,
})
export class Textarea implements FormValueControl<string> {
  readonly label = input.required<string>();
  readonly placeholder = input('');
  readonly hint = input<string>();
  readonly rows = input(4);

  readonly name = input('');
  readonly touched = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly touch = output<void>();
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly minLength = input<number | undefined>(undefined);
  readonly maxLength = input<number | undefined>(1000);
  readonly hidden = input(false, { transform: booleanAttribute });
  readonly value = model<string>('');
  protected readonly controlClass = computed(() =>
    clsx(
      'bip-focusable w-full resize-y rounded-field border bg-surface-card px-3 py-2.5 text-sm text-ink transition-colors',
      this.touched() && this.invalid() ? 'border-state-error focus-visible:ring-state-error' : 'border-border-strong hover:border-brand-primary/60',
    ),
  );
  protected readonly counter = computed(() => {
    const max = this.maxLength();
    return max ? `${this.value().length}/${max}` : undefined;
  });

  protected onInput(event: Event): void {
    const next = (event.target as HTMLTextAreaElement).value;
    this.value.set(next);
  }
}
