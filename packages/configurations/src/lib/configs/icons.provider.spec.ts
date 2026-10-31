import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { NgIcon } from '@ng-icons/core';
import { provideAppIcons } from './icons.provider';

@Component({ imports: [NgIcon], template: `<ng-icon name="spinner" />` })
class Host {}

describe('provideAppIcons', () => {
  it('charge une icône à la demande depuis /svg', async () => {
    TestBed.configureTestingModule({ imports: [Host], providers: [provideHttpClient(), provideHttpClientTesting(), provideAppIcons()] });
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();

    TestBed.inject(HttpTestingController).expectOne('/svg/spinner.svg').flush('<svg data-test="spinner"></svg>');
    // L'icône est insérée au tour suivant, une fois la réponse reçue.
    await new Promise((resolve) => setTimeout(resolve));
    await fixture.whenStable();

    expect((fixture.nativeElement as HTMLElement).querySelector('ng-icon')?.innerHTML).toContain('data-test="spinner"');
    expect((fixture.nativeElement as HTMLElement).querySelector('ng-icon')?.getAttribute('style')).toContain('1.2rem');
  });
});
