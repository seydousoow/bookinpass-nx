// noinspection ES6PreferShortImport

import { Component, computed, input, output } from '@angular/core';
import { AppError, SystemStatus } from 'models';
import { Button } from '../button/button';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroExclamationCircleSolid } from '@ng-icons/heroicons/solid';
import { TranslocoPipe } from '@jsverse/transloco';

/** États qui ont un titre et un message par défaut (`common.system-state.<état>`). */
const DEFAULT_TEXTS = new Set(['idle', 'empty', 'expired', 'error', 'offline']);

/**
 * Rendu des huit états du cahier §11. Deux règles portées ici, pas ailleurs :
 *  - le squelette a la MÊME taille que le contenu qu'il remplace (sinon CLS) ;
 *  - un message d'erreur dit ce qui s'est passé, ce qui reste enregistré et
 *    l'action possible ; jamais la couleur seule.
 *
 * `title` et `message` sont des clés de traduction ; les textes d'une `AppError` sont affichés tels quels.
 */
@Component({
  selector: 'bip-system-state',
  imports: [Button, NgIcon, TranslocoPipe],
  host: { class: 'block' },
  providers: [provideIcons({ heroExclamationCircleSolid })],
  template: `
    <!-- Un seul <ng-content> : Angular ne projette que dans le dernier, un second laisserait l'état « success » vide. -->
    @if (status() === 'success' || status() === 'partial') {
      @if (status() === 'partial') {
        <div class="mb-3 rounded-card border border-state-warning bg-state-warning-soft p-3">
          <p class="text-sm font-semibold text-ink">{{ title() || 'common.system-state.partial.title' | transloco }}</p>
          <p class="mt-1 text-sm text-ink/80">{{ message() ?? '' | transloco }}</p>
        </div>
      }
      <ng-content />
    } @else {
      @switch (status()) {
        @case ('loading') {
          <div [attr.aria-busy]="true" aria-live="polite" class="animate-pulse space-y-3">
            <span class="sr-only">{{ 'common.loading-in-progress' | transloco }}</span>
            @for (line of skeletonLines(); track $index) {
              <div [style.height.px]="skeletonHeight()" class="rounded-card bg-border-subtle"></div>
            }
          </div>
        }
        @default {
          <div [class]="panelClass()" role="status">
            <ng-icon name="heroExclamationCircleSolid" aria-hidden="true" [color]="iconClass()" />
            <div class="min-w-0 flex-1">
              <p class="text-sm font-semibold text-ink">{{ resolvedTitle() | transloco }}</p>
              <p class="mt-1 text-sm text-muted">{{ error()?.what ?? (resolvedMessage() | transloco) }}</p>
              @if (error()?.preserved; as preserved) {
                <p class="mt-1.5 text-xs text-muted italic">{{ preserved }}</p>
              }
            </div>
            @if (actionLabel()) {
              <bip-button (clicked)="retry.emit()" size="sm" variant="outline">{{ error()?.action?.label ?? (actionLabel() ?? '' | transloco) }}</bip-button>
            }
          </div>
        }
      }
    }
  `,
})
export class SystemState {
  readonly status = input.required<SystemStatus>();
  readonly title = input<string>();
  readonly message = input<string>();
  readonly error = input<AppError | null>(null);
  /** Le squelette doit imiter le contenu remplacé : nombre et hauteur des blocs. */
  readonly skeletonCount = input(3);
  readonly skeletonHeight = input(96);
  readonly retry = output<void>();

  protected readonly skeletonLines = computed(() => Array.from({ length: this.skeletonCount() }, (_, i) => i));

  /** Clé du titre : celle reçue, ou celle de l'état. */
  protected readonly resolvedTitle = computed(() => this.title() || (DEFAULT_TEXTS.has(this.status()) ? `common.system-state.${this.status()}.title` : ''));

  /** Clé du message (le texte d'une `AppError` passe avant, dans le gabarit). */
  protected readonly resolvedMessage = computed(() => this.message() || (DEFAULT_TEXTS.has(this.status()) ? `common.system-state.${this.status()}.message` : ''));

  /** Clé de l'action par défaut ; celle d'une `AppError` passe avant, dans le gabarit. */
  protected readonly actionLabel = computed(() => (this.error()?.action.label || this.status() === 'error' || this.status() === 'expired' ? 'common.system-state.retry' : null));

  protected panelClass(): string {
    const tones: Record<string, string> = {
      idle: 'border-border-subtle bg-surface-card text-muted',
      empty: 'border-border-subtle bg-surface-card',
      expired: 'border-state-warning/40 bg-state-warning-soft',
      error: 'border-state-error/40 bg-state-error-soft',
      offline: 'border-border-strong bg-surface-muted',
    };
    return `flex items-start gap-3 rounded-card border p-4 ${tones[this.status()] ?? 'border-border-subtle bg-surface-card'}`;
  }

  protected iconClass(): string {
    const tones: Record<string, string> = {
      expired: '--color-state-warning',
      error: '--color-state-error',
      offline: '--color-muted',
    };
    return `var(${tones[this.status()] ?? '--color-muted'})`;
  }
}
