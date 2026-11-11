import { Component, input, model } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroCheck, heroExclamationTriangle } from '@ng-icons/heroicons/outline';

export interface StepItem {
  /** Clé de traduction. */
  readonly label: string;
  /** Étape avec des champs à corriger. */
  readonly invalid?: boolean;
  readonly done?: boolean;
}

/** Progression d'un parcours en étapes ; chaque étape reste accessible d'un clic. */
@Component({
  selector: 'bo-stepper',
  imports: [NgIcon, TranslocoPipe],
  providers: [provideIcons({ heroCheck, heroExclamationTriangle })],
  host: { class: 'block' },
  template: `
    <ol class="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
      @for (step of steps(); track $index; let i = $index) {
        <li>
          <button
            (click)="current.set(i)"
            [attr.aria-current]="current() === i ? 'step' : null"
            [class]="
              current() === i
                ? 'border-brand-primary bg-brand-soft text-brand-primary'
                : step.invalid
                  ? 'border-state-error/40 bg-surface-card text-state-error'
                  : 'border-border-subtle bg-surface-card text-muted hover:border-brand-primary/40 hover:text-ink'
            "
            class="bip-focusable flex w-full items-center gap-3 rounded-card border px-3 py-2.5 text-left transition-colors"
            type="button">
            <span
              [class]="
                current() === i
                  ? 'bg-brand-primary text-onbrand'
                  : step.invalid
                    ? 'bg-state-error-soft text-state-error'
                    : step.done
                      ? 'bg-state-success-soft text-state-success'
                      : 'bg-surface-muted text-muted'
              "
              class="grid size-7 shrink-0 place-items-center rounded-full text-xs font-semibold">
              @if (step.invalid && current() !== i) {
                <ng-icon aria-hidden="true" name="heroExclamationTriangle" size="16" />
              } @else if (step.done && current() !== i) {
                <ng-icon aria-hidden="true" name="heroCheck" size="16" />
              } @else {
                {{ i + 1 }}
              }
            </span>
            <span class="min-w-0 text-sm font-semibold">{{ step.label | transloco }}</span>
          </button>
        </li>
      }
    </ol>
  `,
})
export class Stepper {
  readonly steps = input.required<readonly StepItem[]>();
  readonly current = model(0);
}
