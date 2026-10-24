import { EnvironmentProviders, Provider, Type } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TranslocoTestingModule } from '@jsverse/transloco';

/** Transloco sans traductions : chaque libellé s'affiche sous sa clé, ce que vérifient les specs. */
export const translocoTesting = () => TranslocoTestingModule.forRoot({ langs: { fr: {} }, translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' } });

/** Monte un composant hôte de test, rendu et stabilisé (mode zoneless). */
export async function render<T>(host: Type<T>, providers: (Provider | EnvironmentProviders)[] = []) {
  await TestBed.configureTestingModule({ imports: [host, translocoTesting()], providers }).compileComponents();
  const fixture: ComponentFixture<T> = TestBed.createComponent(host);
  await fixture.whenStable();
  const element: HTMLElement = fixture.nativeElement;
  const stable = () => fixture.whenStable();
  return { fixture, element, host: fixture.componentInstance, stable };
}
