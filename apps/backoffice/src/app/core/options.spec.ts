import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { translatedOptions } from './options';

describe('translatedOptions', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [
        TranslocoTestingModule.forRoot({
          langs: { fr: { roles: { admin: 'Administrateur', inspector: 'Contrôleur' } }, en: { roles: { admin: 'Administrator', inspector: 'Inspector' } } },
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' },
          preloadLangs: true,
        }),
      ],
    });
  });

  it('libelle chaque valeur dans la langue active', () => {
    const options = TestBed.runInInjectionContext(() => translatedOptions(['admin', 'inspector'] as const, 'roles.'));
    expect(options()).toEqual([
      { value: 'admin', label: 'Administrateur' },
      { value: 'inspector', label: 'Contrôleur' },
    ]);
    TestBed.inject(TranslocoService).setActiveLang('en');
    expect(options().map((o) => o.label)).toEqual(['Administrator', 'Inspector']);
  });

  it('ne propose que les valeurs permises', () => {
    const shown = signal<readonly ('admin' | 'inspector')[]>(['inspector']);
    const options = TestBed.runInInjectionContext(() => translatedOptions(['admin', 'inspector'] as const, 'roles.', shown));
    expect(options().map((o) => o.value)).toEqual(['inspector']);
    shown.set(['admin', 'inspector']);
    expect(options().map((o) => o.value)).toEqual(['admin', 'inspector']);
  });
});
