import { Component, input, model, output } from '@angular/core';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { TranslocoPipe } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroXMark } from '@ng-icons/heroicons/outline';
import { Overlay } from 'components/overlay/overlay';
import { lockScrollWhile } from 'components/scroll-lock/scroll-lock';

let nextId = 0;

/**
 * Panneau de détail à droite : consulter une fiche et agir dessus sans perdre la liste. Échap ou le voile le ferment ;
 * pied d'actions optionnel (`[drawerFooter]`).
 */
@Component({
  selector: 'bo-drawer',
  imports: [Overlay, CdkTrapFocus, NgIcon, TranslocoPipe],
  providers: [provideIcons({ heroXMark })],
  host: { '(document:keydown.escape)': 'onEscape()' },
  template: `
    @if (opened()) {
      <div class="fixed inset-0 z-50 flex justify-end" role="presentation">
        <bip-overlay (clicked)="close()" />
        <aside
          [attr.aria-labelledby]="id + '-title'"
          [cdkTrapFocusAutoCapture]="true"
          aria-modal="true"
          cdkTrapFocus
          class="bo-slide-in relative z-50 flex h-full w-full max-w-(--bo-drawer) flex-col bg-surface-card shadow-panel"
          role="dialog">
          <header class="flex items-start gap-3 border-b border-border-subtle px-5 py-4">
            <div class="min-w-0 flex-1">
              <h2 [id]="id + '-title'" class="text-lg font-semibold text-ink">{{ title() }}</h2>
              @if (subtitle()) {
                <p class="mt-0.5 text-sm text-muted">{{ subtitle() }}</p>
              }
            </div>
            <button
              (click)="close()"
              [attr.aria-label]="'common.close' | transloco"
              class="bip-focusable -mr-2 grid size-10 shrink-0 place-items-center rounded-button text-muted hover:bg-surface-muted hover:text-ink"
              type="button">
              <ng-icon aria-hidden="true" name="heroXMark" size="20" />
            </button>
          </header>
          <div class="flex-1 space-y-5 overflow-y-auto px-5 py-5"><ng-content /></div>
          <footer class="flex flex-wrap justify-end gap-2 border-t border-border-subtle px-5 py-3 empty:hidden"><ng-content select="[drawerFooter]" /></footer>
        </aside>
      </div>
    }
  `,
})
export class Drawer {
  readonly opened = model(false);
  readonly title = input.required<string>();
  readonly subtitle = input<string>();
  readonly closed = output<void>();
  protected readonly id = `bo-drawer-${++nextId}`;

  constructor() {
    lockScrollWhile(this.opened);
  }

  close(): void {
    this.opened.set(false);
    this.closed.emit();
  }

  protected onEscape(): void {
    if (this.opened()) {
      this.close();
    }
  }
}
