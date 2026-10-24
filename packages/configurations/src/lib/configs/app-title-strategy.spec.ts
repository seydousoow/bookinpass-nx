import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { Title } from '@angular/platform-browser';
import { provideRouter, Router, TitleStrategy } from '@angular/router';
import { AppTitleStrategy } from './app-title-strategy';

@Component({ template: '' })
class Page {}

describe('AppTitleStrategy', () => {
  let router: Router;
  let title: Title;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'flights', children: [{ path: 'search', component: Page }] },
          { path: 'about', component: Page, title: 'À propos | Book In Pass' },
          { path: 'home', component: Page },
        ]),
        { provide: TitleStrategy, useClass: AppTitleStrategy },
      ],
    });
    router = TestBed.inject(Router);
    title = TestBed.inject(Title);
  });

  it('résume un aller simple dans le titre', async () => {
    await router.navigateByUrl('/flights/search?o=DSS&d=CDG&from=2026-12-20');
    expect(title.getTitle()).toBe('DSS → CDG, 20/12 | Book In Pass');
  });

  it('résume un aller-retour dans le titre', async () => {
    await router.navigateByUrl('/flights/search?o=DSS&d=CDG&from=2026-12-20&to=2027-01-05');
    expect(title.getTitle()).toBe('DSS → CDG, 20/12 - 5/1 | Book In Pass');
  });

  it('se replie sur le titre par défaut si la recherche est incomplète', async () => {
    await router.navigateByUrl('/flights/search?o=DSS');
    expect(title.getTitle()).toBe('Book In Pass — Vols, séjours et activités');
  });

  it('utilise le titre déclaré par la route', async () => {
    await router.navigateByUrl('/about');
    expect(title.getTitle()).toBe('À propos | Book In Pass');
  });

  it('affiche le titre par défaut sans titre de route', async () => {
    await router.navigateByUrl('/home');
    expect(title.getTitle()).toBe('Book In Pass — Vols, séjours et activités');
  });
});
