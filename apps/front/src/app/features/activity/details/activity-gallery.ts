import { Component, computed, input, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroPhoto } from '@ng-icons/heroicons/outline';
import { Modal } from 'components';
import { IActivityImage } from 'models';
import { ActivityPhoto } from '../ui/activity-photo';

/** Grande photo et quatre vignettes ; « Tout voir » ouvre toutes les photos. */
@Component({
  selector: 'bip-activity-gallery',
  imports: [TranslocoDirective, NgIcon, Modal, ActivityPhoto],
  providers: [provideIcons({ heroPhoto })],
  host: { class: 'block' },
  template: `
    <ng-container *transloco="let t; prefix: 'activity.gallery'">
      <div [class.md:grid-cols-4]="thumbnails().length" [class.md:grid-rows-2]="thumbnails().length" class="grid h-64 gap-2 md:h-[28rem]">
        <button
          (click)="open(0)"
          [attr.aria-label]="t('open', { index: 1 })"
          [class.md:col-span-2]="thumbnails().length"
          [class.md:row-span-2]="thumbnails().length"
          class="bip-focusable overflow-hidden rounded-card"
          type="button">
          <bip-activity-photo [alt]="images()[0].alt ?? title()" [eager]="true" [url]="images()[0].url" class="size-full" />
        </button>
        @for (image of thumbnails(); track image.url; let i = $index, last = $last) {
          <button (click)="open(i + 1)" [attr.aria-label]="t('open', { index: i + 2 })" class="bip-focusable relative hidden overflow-hidden rounded-card md:block" type="button">
            <bip-activity-photo [alt]="image.alt ?? title()" [url]="image.url" class="size-full" />
            @if (last && images().length > 5) {
              <span class="absolute right-3 bottom-3 flex items-center gap-1 rounded-pill bg-ink/70 px-3 py-1.5 text-sm font-semibold text-onbrand">
                <ng-icon aria-hidden="true" name="heroPhoto" /> {{ t('all', { count: images().length }) }}
              </span>
            }
          </button>
        }
      </div>
      <button (click)="open(0)" class="mt-2 text-sm font-semibold underline md:hidden" type="button">{{ t('all', { count: images().length }) }}</button>

      <bip-modal [(opened)]="opened" [title]="title()" showFooter="false" size="lg">
        <div class="space-y-3">
          @for (image of images(); track image.url; let i = $index) {
            <figure [id]="'activity-photo-' + i">
              <img [alt]="image.alt ?? title()" [src]="image.url" class="w-full rounded-card" loading="lazy" />
              @if (image.alt) {
                <figcaption class="mt-1 text-sm text-muted">{{ image.alt }}</figcaption>
              }
            </figure>
          }
        </div>
      </bip-modal>
    </ng-container>
  `,
})
export class ActivityGallery {
  readonly images = input.required<readonly IActivityImage[]>();
  readonly title = input.required<string>();
  protected readonly opened = signal(false);
  protected readonly thumbnails = computed(() => this.images().slice(1, 5));

  protected open(index: number): void {
    this.opened.set(true);
    // La fenêtre s'ouvre d'abord ; la photo cliquée est ensuite amenée à l'écran.
    setTimeout(() => document.getElementById(`activity-photo-${index}`)?.scrollIntoView({ block: 'start' }));
  }
}
