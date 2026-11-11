import { Component, inject, input, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Button } from 'components/button/button';
import { Input } from 'components/input/input';
import { Textarea } from 'components/textarea/textarea';
import { from, Observable } from 'rxjs';
import { concatMap, finalize, toArray } from 'rxjs/operators';
import { apiErrorCode } from 'utils';
import { StaffApi } from '../../core/api';
import { ActivityImage } from '../../core/models';

/** Taille maximale d'une photo, comme le serveur (`bookinpass.images.max-size`). */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'];

type Source = 'file' | 'base64' | 'url';

/**
 * Photos d'une activité : chaque photo est déposée dans S3 et servie par le CDN, qu'elle vienne de l'appareil (choix ou
 * glisser-déposer), d'un texte base64 ou d'une adresse (téléchargée par le serveur). Une photo encore liée à un autre
 * site peut être copiée chez nous. La première est l'image principale.
 *
 * Une photo déposée ici puis retirée est supprimée de S3 tout de suite (le serveur la garde si une fiche enregistrée
 * l'emploie) ; une photo déposée mais jamais enregistrée (page quittée) est supprimée par le serveur au bout d'un jour.
 */
@Component({
  selector: 'bo-activity-images',
  imports: [TranslocoDirective, Button, Input, Textarea],
  host: { class: 'block' },
  template: `
    <fieldset *transloco="let t" class="space-y-3 border-t border-border-subtle pt-3">
      <legend class="font-semibold">{{ t('activity.images') }}</legend>
      <p class="text-xs text-muted">{{ t('activity.images-hint') }}</p>

      @if (images().length) {
        <ul class="grid gap-2">
          @for (image of images(); track image.url + $index; let i = $index, first = $first, last = $last) {
            <li class="grid items-center gap-3 rounded-card border border-border-subtle p-2 md:grid-cols-[6rem_1fr_auto]">
              <span class="relative block aspect-[4/3] w-24 overflow-hidden rounded-card bg-surface-muted">
                <img [alt]="image.alt ?? ''" [src]="image.url" class="size-full object-cover" loading="lazy" />
                @if (first) {
                  <span class="absolute top-1 left-1 rounded-pill bg-brand-primary px-2 text-[10px] font-semibold text-onbrand">{{ t('activity.image.main') }}</span>
                }
              </span>
              <div class="min-w-0 space-y-1">
                <a [href]="image.url" class="block truncate text-xs text-brand-primary underline" rel="noopener" target="_blank">{{ image.url }}</a>
                <bip-input (valueChange)="patch(i, { alt: $event })" [name]="'image-alt-' + i" [value]="image.alt" label="activity.image.alt" />
              </div>
              <span class="flex flex-wrap items-center gap-1">
                <button (clicked)="rehost(i)" [loading]="busy() === 'rehost-' + i" bipButton size="sm" type="button" variant="ghost">
                  {{ t('activity.image.rehost') }}
                </button>
                <button
                  (click)="move(i, -1)"
                  [attr.aria-label]="t('activity.up')"
                  [disabled]="first"
                  class="bip-focusable size-11 rounded-button border border-border-subtle disabled:opacity-40"
                  type="button">
                  ↑
                </button>
                <button
                  (click)="move(i, 1)"
                  [attr.aria-label]="t('activity.down')"
                  [disabled]="last"
                  class="bip-focusable size-11 rounded-button border border-border-subtle disabled:opacity-40"
                  type="button">
                  ↓
                </button>
                <button (clicked)="remove(i)" bipButton size="sm" type="button" variant="ghost">{{ t('activity.remove') }}</button>
              </span>
            </li>
          }
        </ul>
      }

      <div class="space-y-3 rounded-card bg-surface-muted p-3">
        <p class="text-sm font-semibold">{{ t('activity.image.add') }}</p>
        <div [attr.aria-label]="t('activity.image.source')" class="flex flex-wrap gap-2" role="group">
          @for (s of sources; track s) {
            <button
              (click)="source.set(s)"
              [attr.aria-pressed]="source() === s"
              [class]="source() === s ? 'border-brand-primary bg-surface-card text-brand-dark' : 'border-border-subtle'"
              class="bip-focusable min-h-11 rounded-pill border px-4 text-sm font-semibold"
              type="button">
              {{ t('activity.image.sources.' + s) }}
            </button>
          }
        </div>

        @switch (source()) {
          @case ('file') {
            <label
              (dragleave)="dragging.set(false)"
              (dragover)="$event.preventDefault(); dragging.set(true)"
              (drop)="$event.preventDefault(); dragging.set(false); uploadFiles($event.dataTransfer?.files ?? null)"
              [class.border-brand-primary]="dragging()"
              class="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-card border-2 border-dashed border-border-subtle bg-surface-card p-4 text-center text-sm">
              <span class="font-semibold">{{ t(busy() === 'file' ? 'activity.image.uploading' : 'activity.image.drop') }}</span>
              <span class="text-xs text-muted">{{ t('activity.image.formats') }}</span>
              <input #picker (change)="uploadFiles(picker.files); picker.value = ''" [disabled]="!!busy()" accept="image/*" class="sr-only" multiple type="file" />
            </label>
          }
          @case ('base64') {
            <form (submit)="$event.preventDefault(); importBase64()" class="space-y-2">
              <bip-textarea [(value)]="base64" [maxLength]="14000000" [rows]="4" hint="activity.image.base64-hint" label="activity.image.base64" name="image-base64" />
              <button [disabled]="!base64().trim()" [loading]="busy() === 'base64'" bipButton size="sm" type="submit">{{ t('activity.image.import') }}</button>
            </form>
          }
          @case ('url') {
            <form (submit)="$event.preventDefault(); importUrl()" class="flex flex-wrap items-end gap-2">
              <bip-input [(value)]="url" class="min-w-64 flex-1" hint="activity.image.url-hint" label="activity.image.url" name="image-url" />
              <button [disabled]="!validUrl()" [loading]="busy() === 'url'" bipButton size="sm" type="submit">{{ t('activity.image.import') }}</button>
            </form>
          }
        }
        @if (error(); as code) {
          <p class="text-sm text-state-error" role="alert">{{ t('errors.' + code) }}</p>
        }
      </div>
    </fieldset>
  `,
})
export class ActivityImages {
  readonly images = input.required<readonly ActivityImage[]>();
  readonly imagesChange = output<ActivityImage[]>();

  protected readonly sources: readonly Source[] = ['file', 'base64', 'url'];
  protected readonly source = signal<Source>('file');
  protected readonly base64 = signal('');
  protected readonly url = signal<string | null>('');
  protected readonly dragging = signal(false);
  /** Envoi en cours : `file`, `base64`, `url` ou `rehost-<indice>`. */
  protected readonly busy = signal<string | null>(null);
  protected readonly error = signal<string | null>(null);
  private readonly api = inject(StaffApi);
  /** Photos déposées depuis cette page. */
  private readonly uploaded = new Set<string>();

  protected validUrl(): boolean {
    return /^https:\/\/\S+$/.test((this.url() ?? '').trim());
  }

  protected patch(index: number, patch: Partial<ActivityImage>): void {
    this.imagesChange.emit(this.images().map((image, i) => (i === index ? { ...image, ...patch } : image)));
  }

  protected remove(index: number): void {
    const url = this.images()[index]?.url;
    this.imagesChange.emit(this.images().filter((_, i) => i !== index));
    if (url && this.uploaded.delete(url)) {
      // Au mieux : un échec laisse la photo à la tâche de nettoyage du serveur.
      this.api.deleteImage(url).subscribe({ error: () => undefined });
    }
  }

  /** La première photo est l'image principale : la remonter ou la descendre change l'ordre. */
  protected move(index: number, step: -1 | 1): void {
    const images = [...this.images()];
    const target = index + step;
    if (target < 0 || target >= images.length) {
      return;
    }
    [images[index], images[target]] = [images[target], images[index]];
    this.imagesChange.emit(images);
  }

  /** Fichiers choisis ou déposés, envoyés un par un ; les fichiers refusés à l'appareil ne partent pas. */
  protected uploadFiles(list: FileList | null): void {
    const files = [...(list ?? [])];
    if (!files.length || this.busy()) {
      return;
    }
    const refused = files.find((file) => !IMAGE_TYPES.includes(file.type) || file.size > MAX_IMAGE_BYTES);
    if (refused) {
      this.error.set(refused.size > MAX_IMAGE_BYTES ? 'image-too-large' : 'invalid-image');
      return;
    }
    this.send(
      'file',
      from(files).pipe(
        concatMap((file) => this.api.uploadImage(file)),
        toArray(),
      ),
      (uploaded) => this.add(uploaded.map(({ url }) => url)),
    );
  }

  protected importBase64(): void {
    const data = this.base64().trim();
    if (data) {
      this.send('base64', this.api.importImage({ data }), ({ url }) => {
        this.base64.set('');
        this.add([url]);
      });
    }
  }

  protected importUrl(): void {
    const address = (this.url() ?? '').trim();
    if (this.validUrl()) {
      this.send('url', this.api.importImage({ url: address }), ({ url }) => {
        this.url.set('');
        this.add([url]);
      });
    }
  }

  /** Photo liée à un autre site : copiée dans S3, son adresse devient celle du CDN (inchangée si elle y est déjà). */
  protected rehost(index: number): void {
    const image = this.images()[index];
    this.send(`rehost-${index}`, this.api.importImage({ url: image.url }), ({ url }) => {
      if (url !== image.url) {
        this.uploaded.add(url);
      }
      this.patch(index, { url });
    });
  }

  private add(urls: string[]): void {
    urls.forEach((url) => this.uploaded.add(url));
    this.imagesChange.emit([...this.images(), ...urls.map((url) => ({ url, alt: null }))]);
  }

  private send<T>(what: string, call: Observable<T>, done: (value: T) => void): void {
    if (this.busy()) {
      return;
    }
    this.busy.set(what);
    this.error.set(null);
    call.pipe(finalize(() => this.busy.set(null))).subscribe({ next: done, error: (failure: unknown) => this.error.set(apiErrorCode(failure)) });
  }
}
