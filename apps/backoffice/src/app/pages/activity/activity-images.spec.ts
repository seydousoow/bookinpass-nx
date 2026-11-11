import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { HttpErrorResponse } from '@angular/common/http';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { of, throwError } from 'rxjs';
import { StaffApi } from '../../core/api';
import { ActivityImage } from '../../core/models';
import { button, get, settle, staffApiMock, StaffApiMock, type } from '../../../testing';
import { ActivityImages, MAX_IMAGE_BYTES } from './activity-images';

@Component({
  imports: [ActivityImages],
  template: `<bo-activity-images (imagesChange)="images.set($event)" [images]="images()" />`,
})
class Host {
  readonly images = signal<ActivityImage[]>([{ url: 'https://cdn.getyourguide.com/a.jpg', alt: 'Gorée' }]);
}

async function render(api: StaffApiMock) {
  await TestBed.configureTestingModule({
    imports: [Host, TranslocoTestingModule.forRoot({ langs: { fr: {} }, translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' } })],
    providers: [{ provide: StaffApi, useValue: api }],
  }).compileComponents();
  const fixture = TestBed.createComponent(Host);
  await settle(fixture);
  return { fixture, element: fixture.nativeElement as HTMLElement, stable: () => settle(fixture) };
}

function drop(element: HTMLElement, files: File[]): void {
  const input = get<HTMLInputElement>(element, 'input[type="file"]');
  Object.defineProperty(input, 'files', { value: files, configurable: true });
  input.dispatchEvent(new Event('change'));
}

describe('ActivityImages', () => {
  it('envoie les fichiers choisis et ajoute leurs adresses du CDN', async () => {
    let n = 0;
    const api = staffApiMock({ uploadImage: () => of({ url: `https://cdn.bookinpass.com/activities/${++n}.jpg` }) });
    const { fixture, element, stable } = await render(api);
    drop(element, [new File(['a'], 'a.jpg', { type: 'image/jpeg' }), new File(['b'], 'b.png', { type: 'image/png' })]);
    await stable();
    expect(api.uploadImage).toHaveBeenCalledTimes(2);
    expect(fixture.componentInstance.images().map((i) => i.url)).toEqual([
      'https://cdn.getyourguide.com/a.jpg',
      'https://cdn.bookinpass.com/activities/1.jpg',
      'https://cdn.bookinpass.com/activities/2.jpg',
    ]);
  });

  it('refuse sur l’appareil un fichier qui n’est pas une image ou trop lourd', async () => {
    const api = staffApiMock();
    const { element, stable } = await render(api);
    drop(element, [new File(['x'], 'notes.pdf', { type: 'application/pdf' })]);
    await stable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('errors.invalid-image');
    const big = new File(['x'], 'big.jpg', { type: 'image/jpeg' });
    Object.defineProperty(big, 'size', { value: MAX_IMAGE_BYTES + 1 });
    drop(element, [big]);
    await stable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('errors.image-too-large');
    expect(api.uploadImage).not.toHaveBeenCalled();
  });

  it('importe une photo par son adresse ou en base64', async () => {
    const api = staffApiMock({ importImage: () => of({ url: 'https://cdn.bookinpass.com/activities/x.webp' }) });
    const { fixture, element, stable } = await render(api);
    button(element, 'activity.image.sources.url').click();
    await stable();
    type(get<HTMLInputElement>(element, 'input[name="image-url"]'), 'https://example.com/goree.webp');
    await stable();
    button(element, 'activity.image.import').click();
    await stable();
    expect(api.importImage).toHaveBeenCalledWith({ url: 'https://example.com/goree.webp' });

    button(element, 'activity.image.sources.base64').click();
    await stable();
    const area = get<HTMLTextAreaElement>(element, 'textarea[name="image-base64"]');
    area.value = 'data:image/png;base64,iVBORw0KGgo=';
    area.dispatchEvent(new Event('input'));
    await stable();
    button(element, 'activity.image.import').click();
    await stable();
    expect(api.importImage).toHaveBeenLastCalledWith({ data: 'data:image/png;base64,iVBORw0KGgo=' });
    expect(fixture.componentInstance.images()).toHaveLength(3);
  });

  it('copie chez nous une photo liée à un autre site, et affiche l’erreur du serveur', async () => {
    let fail = true;
    const api = staffApiMock({
      importImage: () =>
        fail ? throwError(() => new HttpErrorResponse({ status: 400, error: { code: 'image-download-failed' } })) : of({ url: 'https://cdn.bookinpass.com/activities/a.jpg' }),
    });
    const { fixture, element, stable } = await render(api);
    button(element, 'activity.image.rehost').click();
    await stable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('errors.image-download-failed');
    fail = false;
    button(element, 'activity.image.rehost').click();
    await stable();
    expect(fixture.componentInstance.images()).toEqual([{ url: 'https://cdn.bookinpass.com/activities/a.jpg', alt: 'Gorée' }]);
  });

  it('supprime de S3 une photo déposée ici puis retirée, pas une photo déjà là', async () => {
    const api = staffApiMock({ uploadImage: () => of({ url: 'https://cdn.bookinpass.com/activities/new.jpg' }), deleteImage: () => of(undefined) });
    const { fixture, element, stable } = await render(api);
    drop(element, [new File(['a'], 'a.jpg', { type: 'image/jpeg' })]);
    await stable();

    const removeButtons = () => [...element.querySelectorAll('button')].filter((b) => b.textContent?.trim() === 'activity.remove');
    removeButtons()[1].click();
    await stable();
    expect(api.deleteImage).toHaveBeenCalledWith('https://cdn.bookinpass.com/activities/new.jpg');

    removeButtons()[0].click();
    await stable();
    expect(api.deleteImage).toHaveBeenCalledTimes(1);
    expect(fixture.componentInstance.images()).toEqual([]);
  });
});
