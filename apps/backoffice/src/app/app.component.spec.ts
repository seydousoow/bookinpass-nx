import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { AppComponent } from './app.component';

@Component({ template: `<p class="page">Départs</p>` })
class Page {}

describe('AppComponent', () => {
  it('affiche la page de la route courante', async () => {
    TestBed.configureTestingModule({ imports: [AppComponent], providers: [provideRouter([{ path: '', component: Page }])] });
    const fixture = TestBed.createComponent(AppComponent);
    await TestBed.inject(Router).navigateByUrl('/');
    await fixture.whenStable();
    expect((fixture.nativeElement as HTMLElement).querySelector('.page')?.textContent).toBe('Départs');
  });
});
