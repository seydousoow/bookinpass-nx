import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationCancel, NavigationEnd, NavigationError, NavigationStart, Router, RouterOutlet } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Spinner } from 'components/spinner/spinner';

/**
 * Racine : la page de la route courante. Pendant une navigation (chargement d'une page, lecture de la session), une
 * barre défile en haut de l'écran ; au tout premier chargement, rien n'est encore affiché : un écran d'attente le
 * remplace, plutôt qu'une page blanche.
 */
@Component({
  selector: 'bo-root',
  imports: [RouterOutlet, TranslocoDirective, Spinner],
  template: `
    @if (navigating()) {
      <div aria-hidden="true" class="fixed inset-x-0 top-0 z-50 h-1 overflow-hidden bg-brand-soft">
        <div class="bo-progress h-full w-1/3 bg-brand-primary"></div>
      </div>
    }
    @if (navigating() && !shown()) {
      <div *transloco="let t" class="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
        <img alt="Book In Pass" class="h-12 w-auto" src="/images/bip-transparent-logo.png" />
        <bip-spinner label="app.loading" showLabel />
      </div>
    }
    <router-outlet />
  `,
})
export class AppComponent {
  protected readonly navigating = signal(false);
  /** Une page a déjà été affichée. */
  protected readonly shown = signal(false);

  constructor() {
    inject(Router)
      .events.pipe(takeUntilDestroyed())
      .subscribe((event) => {
        if (event instanceof NavigationStart) {
          this.navigating.set(true);
        } else if (event instanceof NavigationEnd || event instanceof NavigationCancel || event instanceof NavigationError) {
          this.navigating.set(false);
          this.shown.set(true);
        }
      });
  }
}
