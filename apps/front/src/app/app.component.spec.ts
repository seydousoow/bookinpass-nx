import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { provideNgIconLoader } from '@ng-icons/core';
import { CurrencyStore } from 'state';
import { AppComponent } from './app.component';

jest.mock('@vercel/speed-insights', () => ({ injectSpeedInsights: jest.fn() }));

describe('AppComponent', () => {
  const setup = async () => {
    const currencyStore = {
      selected: signal('XOF'),
      currencies: signal([
        { code: 'XOF', label: 'franc CFA' },
        { code: 'EUR', label: 'euro' },
      ]),
      select: jest.fn(),
    };
    await TestBed.configureTestingModule({
      imports: [
        AppComponent,
        TranslocoTestingModule.forRoot({ langs: { fr: {}, en: {} }, translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr' } }),
      ],
      providers: [provideRouter([]), provideNgIconLoader(() => '<svg></svg>'), { provide: CurrencyStore, useValue: currencyStore }],
    }).compileComponents();
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    return { fixture, element: fixture.nativeElement as HTMLElement, currencyStore, stable: () => fixture.whenStable() };
  };

  it('encadre les pages entre l’en-tête et le pied de page', async () => {
    const { element } = await setup();
    expect(element.querySelector('bip-header')).not.toBeNull();
    expect(element.querySelector('main router-outlet')).not.toBeNull();
    expect(element.querySelector('bip-footer')).not.toBeNull();
  });

  it('liste les rubriques, le tourisme encore désactivé', async () => {
    const { element } = await setup();
    const nav = element.querySelector('nav')!;
    expect(nav.querySelector('a[href="/flight"]')?.textContent?.trim()).toBe('nav.flights');
    expect(nav.querySelector('[aria-disabled="true"]')?.textContent?.trim()).toBe('nav.tourism');
  });

  it('change de langue', async () => {
    const { element, stable } = await setup();
    const transloco = TestBed.inject(TranslocoService);
    const english = [...element.querySelectorAll<HTMLButtonElement>('button[aria-pressed]')].find((b) => b.textContent?.trim() === 'en')!;
    english.click();
    await stable();
    expect(transloco.getActiveLang()).toBe('en');
  });

  it('confie le changement de devise au store', async () => {
    const { fixture, currencyStore } = await setup();
    const header = fixture.debugElement.query((de) => de.name === 'bip-header');
    header.triggerEventHandler('currentCurrencyChange', 'EUR');
    expect(currencyStore.select).toHaveBeenCalledWith('EUR');
  });
});
