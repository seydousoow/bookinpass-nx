import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { TranslocoDirective } from '@jsverse/transloco';

/** Carte OpenStreetMap centrée sur un point (sans clé d'API), et lien vers la carte complète. */
@Component({
  selector: 'bip-activity-map',
  imports: [TranslocoDirective],
  host: { class: 'block' },
  template: `
    <ng-container *transloco="let t; prefix: 'activity.map'">
      <iframe
        [src]="embed()"
        [title]="t('title', { place: label() })"
        class="h-64 w-full rounded-card border border-border-subtle"
        loading="lazy"
        referrerpolicy="no-referrer"></iframe>
      <a [href]="link()" class="mt-1 inline-block text-sm font-semibold underline" rel="noopener" target="_blank">{{ t('open') }}</a>
    </ng-container>
  `,
})
export class ActivityMap {
  readonly latitude = input.required<number>();
  readonly longitude = input.required<number>();
  readonly label = input('');
  private readonly sanitizer = inject(DomSanitizer);

  protected readonly embed = computed(() => {
    const lat = this.latitude();
    const lon = this.longitude();
    const bbox = [lon - 0.012, lat - 0.007, lon + 0.012, lat + 0.007].map((n) => n.toFixed(5)).join(',');
    // Adresse construite ici à partir de deux nombres : sûre pour un iframe.
    return this.sanitizer.bypassSecurityTrustResourceUrl(`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)},${lon.toFixed(5)}`);
  });
  protected readonly link = computed(
    () =>
      `https://www.openstreetmap.org/?mlat=${this.latitude().toFixed(5)}&mlon=${this.longitude().toFixed(5)}#map=16/${this.latitude().toFixed(5)}/${this.longitude().toFixed(5)}`,
  );
}
