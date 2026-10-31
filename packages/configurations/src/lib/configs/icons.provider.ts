import { EnvironmentProviders, inject, makeEnvironmentProviders } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { provideNgIconLoader, provideNgIconsConfig, withCaching } from '@ng-icons/core';

/**
 * Icônes des applications : taille par défaut et chargement à la demande des SVG servis par l'application
 * (`/svg/{nom}.svg` : pictogrammes du site, drapeaux `country-flag-icons`). Les icônes heroicons des composants sont,
 * elles, déclarées par chaque composant (`provideIcons`).
 */
export function provideAppIcons(): EnvironmentProviders {
  return makeEnvironmentProviders([
    provideNgIconsConfig({ size: '1.2rem' }),
    provideNgIconLoader((name) => inject(HttpClient).get(`/svg/${name}.svg`, { responseType: 'text' }), withCaching()),
  ]);
}
