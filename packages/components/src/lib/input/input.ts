import { booleanAttribute, Component, computed, inject, input, model, output } from '@angular/core';
// noinspection ES6PreferShortImport
import { Field } from '../field/field';
import { FormValueControl, ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { TranslocoService } from '@jsverse/transloco';
import { clsx } from 'clsx';

export type InputSize = 'sm' | 'md' | 'lg';

const sizesStyling = {
  sm: 'min-h-9 px-3 py-1.5 text-sm',
  md: 'min-h-11 px-3 py-2.5 text-sm',
  lg: 'min-h-12 px-4 py-3 text-base',
} satisfies Record<InputSize, string>;

@Component({
  selector: 'bip-input',
  imports: [Field],
  host: { '[class.hidden]': 'hidden()', '[class.block]': '!hidden()' },
  template: `
    <bip-field [errors]="errors()" [hideLabel]="hideLabel()" [hint]="hint()" [label]="label()" [name]="name()" [required]="required()" [showErrors]="touched() && invalid()">
      <div class="relative flex items-center">
        @if (prefix()) {
          <span class="pointer-events-none absolute left-3 flex items-center text-sm text-muted">{{ prefix() }}</span>
        }
        <input
          (blur)="touch.emit()"
          (input)="onInput($event)"
          [attr.aria-describedby]="describedBy()"
          [attr.aria-invalid]="touched() && invalid()"
          [attr.autocapitalize]="autocapitalize()"
          [attr.autocomplete]="autocomplete()"
          [attr.max]="max() ?? dateMax()"
          [attr.maxlength]="maxLength()"
          [attr.min]="min()"
          [attr.minlength]="minLength()"
          [attr.pattern]="patternAttribute()"
          [attr.step]="step()"
          [class]="controlClass()"
          [disabled]="disabled()"
          [id]="name()"
          [name]="name()"
          [placeholder]="_placeholder()"
          [readOnly]="readonly()"
          [required]="required()"
          [type]="type()"
          [value]="value() ?? ''" />
        @if (suffix()) {
          <span class="pointer-events-none absolute right-3 flex items-center text-sm text-muted">{{ suffix() }}</span>
        }
      </div>
    </bip-field>
  `,
})
export class Input<T = string> implements FormValueControl<T | null> {
  readonly label = input.required<string>();
  readonly hideLabel = input(false, { transform: booleanAttribute });

  readonly type = input<'text' | 'email' | 'tel' | 'number' | 'password' | 'search' | 'date' | 'time'>('text');
  /** Borne haute native — utile pour `type="date"` (ex. : pas de date de naissance future). */
  readonly dateMax = input<string>();
  /** Bornes natives (`number`, `date`, `time`) ; posées aussi par les validateurs `min`/`max` des formulaires signal. */
  readonly min = input<NonNullable<T> | undefined>();
  readonly max = input<NonNullable<T> | undefined>();
  readonly step = input<string | number>();
  /** Motif natif (`pattern="[a-z0-9._-]+"`, ou le validateur `pattern` d'un formulaire signal). */
  readonly pattern = input<readonly RegExp[], unknown>([], { transform: toPatterns });
  /** Clavier mobile : `none` pour un identifiant, `characters` pour un code. */
  readonly autocapitalize = input<'none' | 'sentences' | 'words' | 'characters'>();
  readonly placeholder = input<string>();
  readonly hint = input<string>();
  readonly prefix = input<string>();
  readonly suffix = input<string>();
  readonly size = input<InputSize>('md');
  readonly autocomplete = input<string>();

  readonly name = input('');
  readonly touched = input(false, { transform: booleanAttribute });
  readonly invalid = input(false, { transform: booleanAttribute });
  readonly dirty = input(false, { transform: booleanAttribute });
  readonly required = input(false, { transform: booleanAttribute });
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly touch = output<void>();
  readonly readonly = input(false, { transform: booleanAttribute });
  readonly maxLength = input<number | undefined>(undefined);
  readonly minLength = input<number | undefined>(undefined);
  readonly hidden = input(false, { transform: booleanAttribute });
  readonly value = model<T | null>(null);

  /** Un seul motif s'exprime nativement ; plusieurs restent vérifiés par le formulaire. */
  protected readonly patternAttribute = computed(() => (this.pattern().length === 1 ? this.pattern()[0].source : null));

  protected readonly describedBy = computed(() => {
    if (this.touched() && this.invalid()) return `${this.name()}-error`;
    if (this.hint()) return `${this.name()}-hint`;
    return null;
  });

  protected readonly controlClass = computed(() => {
    return clsx('bip-focusable w-full rounded-field border bg-surface-card text-ink transition-colors placeholder:text-muted/70', sizesStyling[this.size()], {
      'pl-9': this.prefix(),
      'pr-9': this.suffix(),
      'border-state-error focus-visible:ring-state-error': this.touched() && this.invalid(),
      'border-border-strong hover:border-brand-primary/60': !(this.touched() && this.invalid()),
      'cursor-not-allowed bg-surface-muted opacity-60': this.disabled(),
      'bg-surface-muted': this.readonly(),
    });
  });

  private readonly transloco = inject(TranslocoService);
  readonly _placeholder = computed(() => {
    const value = this.placeholder();
    return value && value.length > 0 ? this.transloco.translate(value) : '';
  });

  protected onInput(event: Event): void {
    const element = event.target as HTMLInputElement;
    // Champ numérique : la valeur remonte en nombre (« 50 », pas "50"), vide ou invalide : null.
    if (this.type() === 'number') {
      this.value.set((Number.isNaN(element.valueAsNumber) ? null : element.valueAsNumber) as T);
      return;
    }
    this.value.set(element.value as T);
  }
}

/** `pattern` accepte un motif écrit dans le gabarit, une RegExp, ou la liste fournie par un formulaire signal. */
function toPatterns(value: unknown): readonly RegExp[] {
  if (typeof value === 'string') {
    return value ? [new RegExp(value)] : [];
  }
  if (value instanceof RegExp) {
    return [value];
  }
  return Array.isArray(value) ? value.filter((item): item is RegExp => item instanceof RegExp) : [];
}
