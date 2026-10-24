import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { provideNgIconLoader } from '@ng-icons/core';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
  beforeEach(async () => {
    // Les composants de la page traduisent leurs libellés et affichent des icônes, chargées par HTTP dans l'application.
    await TestBed.configureTestingModule({
      imports: [AppComponent, TranslocoTestingModule.forRoot({ langs: { fr: {} }, translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' } })],
      providers: [provideRouter([]), provideNgIconLoader(() => '<svg></svg>')],
    }).compileComponents();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(AppComponent);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Welcome front');
  });
});
