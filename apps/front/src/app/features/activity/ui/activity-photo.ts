import { Component, input, signal } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroPhoto } from '@ng-icons/heroicons/outline';

/** Photo d'activité recadrée sur son conteneur ; sans photo (ou si elle ne charge pas), un aplat avec une icône. */
@Component({
  selector: 'bip-activity-photo',
  imports: [NgIcon],
  providers: [provideIcons({ heroPhoto })],
  host: { class: 'bg-surface-muted relative block overflow-hidden' },
  template: `
    @if (url() && !failed()) {
      <img (error)="failed.set(true)" [alt]="alt()" [src]="url()" class="absolute inset-0 size-full object-cover" decoding="async" [attr.loading]="eager() ? null : 'lazy'" />
    } @else {
      <span aria-hidden="true" class="absolute inset-0 flex items-center justify-center text-muted">
        <ng-icon name="heroPhoto" size="2rem" />
      </span>
    }
  `,
})
export class ActivityPhoto {
  readonly url = input<string | null | undefined>(null);
  readonly alt = input<string | null | undefined>('');
  /** Image du haut de page : chargée tout de suite. */
  readonly eager = input(false);
  protected readonly failed = signal(false);
}
