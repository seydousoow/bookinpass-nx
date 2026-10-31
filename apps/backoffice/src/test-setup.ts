import { TestBed } from '@angular/core/testing';
import { provideNgIconLoader } from '@ng-icons/core';
import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// jsdom n'implémente pas scrollIntoView, appelé par les listes des sélecteurs pour l'option active.
Element.prototype.scrollIntoView = () => undefined;

// L'application charge ses icônes par HTTP (/svg) ; en test, un SVG vide suffit.
beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideNgIconLoader(() => '<svg></svg>')] });
});
