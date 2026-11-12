import { booleanAttribute, Component, input } from '@angular/core';
import { ValidationError, WithOptionalFieldTree } from '@angular/forms/signals';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroExclamationCircleSolid } from '@ng-icons/heroicons/solid';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'bip-field',
  host: { class: 'flex flex-col' },
  providers: [provideIcons({ heroExclamationCircleSolid })],
  template: `
    @if (label() && !hideLabel()) {
      <label [attr.for]="name()" class="mb-1 block text-xs font-semibold text-muted">
        {{ label() | transloco }}
        @if (required()) {
          <span aria-hidden="true" class="text-state-error">*</span>
        }
      </label>
    } @else if (label()) {
      <label [attr.for]="name()" class="sr-only">{{ label() | transloco }}</label>
    }

    <ng-content />

    @if (showErrors()) {
      <!-- Cible de l'aria-describedby des champs (\`<name>-error\`). -->
      <div [id]="name() + '-error'">
        @for (error of errors(); track $index) {
          <p class="flex items-center gap-1 text-xs text-state-error">
            <ng-icon color="red" name="heroExclamationCircleSolid" />
            <span>{{ error.message | transloco }}</span>
          </p>
        }
      </div>
    } @else if (hint() || counter()) {
      <!-- Le compteur est déjà formaté (ex. « 0/1000 ») : on ne le traduit pas. -->
      <p [id]="name() + '-hint'" class="text-xs text-muted">{{ hint() | transloco }}{{ hint() && counter() ? ' — ' : '' }}{{ counter() }}</p>
    }
  `,
  imports: [NgIcon, TranslocoPipe],
})
export class Field {
  readonly label = input.required<string>();
  readonly name = input.required<string>();
  readonly hint = input<string>();
  /** Texte affiché tel quel après l'aide (compteur de caractères, etc.). */
  readonly counter = input<string>();
  readonly errors = input<readonly WithOptionalFieldTree<ValidationError>[]>([]);
  readonly showErrors = input(false);

  readonly required = input(false, { transform: booleanAttribute });
  readonly hideLabel = input(false, { transform: booleanAttribute });
}
