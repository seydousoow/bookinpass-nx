import { Component, inject, Injectable, signal } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroCheckCircle, heroExclamationCircle, heroXMark } from '@ng-icons/heroicons/outline';

export interface Toast {
  readonly id: number;
  readonly text: string;
  readonly tone: 'success' | 'error';
}

/** Durée d'affichage d'un message. */
const TOAST_MS = 5000;

/** Messages éphémères (« Enregistré », « E-mail renvoyé ») ; les erreurs bloquantes restent aussi dans la page. */
@Injectable({ providedIn: 'root' })
export class Toasts {
  private readonly items = signal<readonly Toast[]>([]);
  readonly list = this.items.asReadonly();
  private next = 0;

  success(text: string): void {
    this.push(text, 'success');
  }

  error(text: string): void {
    this.push(text, 'error');
  }

  dismiss(id: number): void {
    this.items.update((all) => all.filter((toast) => toast.id !== id));
  }

  private push(text: string, tone: Toast['tone']): void {
    const id = ++this.next;
    this.items.update((all) => [...all, { id, text, tone }]);
    setTimeout(() => this.dismiss(id), TOAST_MS);
  }
}

/** Zone des messages, en bas à droite de l'écran (annoncée aux lecteurs d'écran). */
@Component({
  selector: 'bo-toasts',
  imports: [NgIcon, TranslocoPipe],
  providers: [provideIcons({ heroCheckCircle, heroExclamationCircle, heroXMark })],
  host: { class: 'pointer-events-none fixed right-4 bottom-4 z-[60] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2', 'aria-live': 'polite' },
  template: `
    @for (toast of toasts.list(); track toast.id) {
      <div class="bo-fade-in pointer-events-auto flex items-start gap-3 rounded-card border border-border-subtle bg-surface-card p-3 text-sm shadow-panel" role="status">
        <ng-icon
          [class]="toast.tone === 'success' ? 'text-state-success' : 'text-state-error'"
          [name]="toast.tone === 'success' ? 'heroCheckCircle' : 'heroExclamationCircle'"
          aria-hidden="true"
          size="20" />
        <p class="min-w-0 flex-1 text-ink">{{ toast.text }}</p>
        <button (click)="toasts.dismiss(toast.id)" class="bip-focusable -m-1 grid size-7 place-items-center rounded-button text-muted hover:text-ink" type="button">
          <span class="sr-only">{{ 'common.close' | transloco }}</span>
          <ng-icon aria-hidden="true" name="heroXMark" size="16" />
        </button>
      </div>
    }
  `,
})
export class ToastOutlet {
  protected readonly toasts = inject(Toasts);
}
