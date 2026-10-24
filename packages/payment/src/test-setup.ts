import { TestBed } from '@angular/core/testing';
import { provideNgIconLoader } from '@ng-icons/core';
import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// L'application charge les icônes par HTTP (app.config.ts) ; en test, un SVG vide suffit et évite l'avertissement « No icon named … ».
beforeEach(() => {
  TestBed.configureTestingModule({ providers: [provideNgIconLoader(() => '<svg></svg>')] });
});
