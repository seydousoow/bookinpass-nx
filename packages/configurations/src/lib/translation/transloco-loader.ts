import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Translation, TranslocoLoader } from '@jsverse/transloco';
import { catchError, forkJoin, map, of } from 'rxjs';

/**
 * Traductions d'une langue : celles de la bibliothèque components (`/i18n/components/{lang}.json`, libellés internes
 * des composants partagés), puis celles de l'application (`/i18n/{lang}.json`), qui l'emportent en cas de clé commune.
 * Chaque application copie les fichiers de components dans ses ressources (`project.json`, `assets`).
 */
@Injectable({ providedIn: 'root' })
export class HttpTranslocoLoader implements TranslocoLoader {
  private readonly http = inject(HttpClient);

  getTranslation(lang: string) {
    // Sans les libellés des composants, l'application reste utilisable : seules leurs clés s'afficheraient brutes.
    const components = this.http.get<Translation>(`/i18n/components/${lang}.json`).pipe(catchError(() => of({})));
    const app = this.http.get<Translation>(`/i18n/${lang}.json`);
    return forkJoin([components, app]).pipe(map(([shared, own]) => mergeTranslations(shared, own)));
  }
}

/** Fusion profonde : les branches communes (`common`, `nav`…) sont réunies, une valeur de `override` remplace celle de `base`. */
export function mergeTranslations(base: Translation, override: Translation): Translation {
  const merged: Translation = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const current = merged[key];
    merged[key] = isBranch(current) && isBranch(value) ? mergeTranslations(current, value) : value;
  }
  return merged;
}

function isBranch(value: unknown): value is Translation {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
