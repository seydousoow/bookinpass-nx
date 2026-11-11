import { Component, computed, input } from '@angular/core';
import { BadgeTone } from 'components/badge/badge';
import { clsx } from 'clsx';

const TONES: Readonly<Record<BadgeTone, string>> = {
  neutral: 'bg-surface-muted text-muted border-border-subtle',
  brand: 'bg-brand-soft text-brand-primary border-brand-primary/20',
  accent: 'bg-brand-accent/10 text-ink border-brand-accent/40',
  success: 'bg-state-success-soft text-state-success border-state-success/20',
  warning: 'bg-state-warning-soft text-state-warning border-state-warning/25',
  error: 'bg-state-error-soft text-state-error border-state-error/20',
  info: 'bg-state-info-soft text-state-info border-state-info/20',
};

/** Statut : pastille de couleur ET libellé (jamais la couleur seule). */
@Component({
  selector: 'bo-status',
  host: { '[class]': 'hostClass()' },
  template: `<span aria-hidden="true" class="size-1.5 shrink-0 rounded-full bg-current"></span><ng-content />`,
})
export class StatusBadge {
  readonly tone = input<BadgeTone>('neutral');
  protected readonly hostClass = computed(() =>
    clsx('inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-xs font-semibold whitespace-nowrap', TONES[this.tone()]),
  );
}
