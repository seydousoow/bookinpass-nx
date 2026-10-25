import { EnvironmentProviders, Provider, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Translation, TranslocoTestingModule } from '@jsverse/transloco';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Libellés internes des composants (`packages/components/i18n`), tels que les applications les chargent. */
export function componentTranslations(lang: 'fr' | 'en'): Translation {
  return JSON.parse(readFileSync(join(__dirname, '..', 'i18n', `${lang}.json`), 'utf8')) as Translation;
}

/**
 * Transloco des specs. Par défaut sans traductions : chaque libellé s'affiche sous sa clé, ce que vérifient les specs.
 * Avec `'components'` : les vraies traductions françaises des composants.
 */
export const translocoTesting = (translations: 'keys' | 'components' = 'keys') =>
  TranslocoTestingModule.forRoot({
    langs: { fr: translations === 'components' ? componentTranslations('fr') : {} },
    translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' },
  });

/** Monte un composant hôte de test, rendu et stabilisé (mode zoneless). */
export async function render<T>(host: Type<T>, providers: (Provider | EnvironmentProviders)[] = [], transloco = translocoTesting()) {
  await TestBed.configureTestingModule({ imports: [host, transloco], providers }).compileComponents();
  const fixture: ComponentFixture<T> = TestBed.createComponent(host);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const stable = () => fixture.whenStable();
  return { fixture, element, host: fixture.componentInstance, stable };
}
