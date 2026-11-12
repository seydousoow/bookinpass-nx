import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon } from '@ng-icons/core';
import { clsx } from 'clsx';

export type StatTone = 'brand' | 'warning' | 'error' | 'success' | 'neutral';

const ICON_TONES: Readonly<Record<StatTone, string>> = {
  brand: 'bg-brand-soft text-brand-primary',
  warning: 'bg-state-warning-soft text-state-warning',
  error: 'bg-state-error-soft text-state-error',
  success: 'bg-state-success-soft text-state-success',
  neutral: 'bg-surface-muted text-muted',
};

/**
 * Indicateur chiffré : icône, valeur, libellé, et la page qui le traite (`link`). La valeur `null` (pas encore chargée,
 * ou indisponible) s'affiche « – » : jamais un chiffre inventé.
 */
@Component({
  selector: 'bo-stat-card',
  imports: [RouterLink, NgIcon],
  host: { class: 'block' },
  template: `
    @if (link()) {
      <a [queryParams]="queryParams()" [routerLink]="link()" [class]="boxClass">
        <span [class]="iconClass()"><ng-icon [name]="icon()" aria-hidden="true" size="20" /></span>
        <span class="min-w-0">
          <span class="block text-2xl font-semibold text-ink tabular-nums">{{ value() ?? '–' }}</span>
          <span class="block text-sm text-muted">{{ label() }}</span>
        </span>
      </a>
    } @else {
      <div [class]="boxClass">
        <span [class]="iconClass()"><ng-icon [name]="icon()" aria-hidden="true" size="20" /></span>
        <span class="min-w-0">
          <span class="block text-2xl font-semibold text-ink tabular-nums">{{ value() ?? '–' }}</span>
          <span class="block text-sm text-muted">{{ label() }}</span>
        </span>
      </div>
    }
  `,
})
export class StatCard {
  readonly label = input.required<string>();
  readonly value = input<number | string | null>(null);
  readonly icon = input.required<string>();
  readonly tone = input<StatTone>('brand');
  readonly link = input<string>();
  readonly queryParams = input<Record<string, string>>();

  protected readonly boxClass =
    'bip-focusable flex h-full items-center gap-3 rounded-card border border-border-subtle bg-surface-card p-4 transition-colors hover:border-brand-primary/40';
  protected readonly iconClass = computed(() => clsx('grid size-10 shrink-0 place-items-center rounded-button', ICON_TONES[this.tone()]));
}
