import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { TranslocoService, TranslocoTestingModule } from '@jsverse/transloco';
import { ISelectOption } from 'models';
import { render } from '../../testing';
import { Select } from './select';

@Component({
  imports: [Select],
  template: `<bip-select
    [(value)]="cabins"
    [options]="options"
    [multiple]="multiple()"
    [touched]="touched()"
    [invalid]="invalid()"
    [errors]="errors"
    label="search.cabin"
    name="cabin"
  />`,
})
class Host {
  readonly cabins = signal<string[]>([]);
  readonly multiple = signal(false);
  readonly touched = signal(false);
  readonly invalid = signal(false);
  readonly errors = [{ kind: 'required', message: 'form.required' }];
  readonly options: readonly ISelectOption<string>[] = [
    { value: 'economy', label: 'Économie' },
    { value: 'business', label: 'Affaires' },
  ];
}

describe('Select', () => {
  const setup = async () => {
    const view = await render(Host);
    const select = view.fixture.debugElement.query(By.directive(Select)).componentInstance as Select;
    const trigger = () => view.element.querySelector('[ngCombobox]')!;
    return { ...view, select, trigger };
  };

  it('affiche le texte d’attente sans valeur', async () => {
    const { trigger } = await setup();
    expect(trigger().textContent?.trim()).toBe('common.select');
  });

  it('traduit le texte d’attente dans la langue active', async () => {
    await TestBed.configureTestingModule({
      imports: [
        Host,
        TranslocoTestingModule.forRoot({
          langs: { fr: { common: { select: 'Choisir' } }, en: { common: { select: 'Select' } } },
          // Comme l'application (provideI18n) : les vues suivent le changement de langue.
          translocoConfig: { availableLangs: ['fr', 'en'], defaultLang: 'fr', reRenderOnLangChange: true },
          preloadLangs: true,
        }),
      ],
    }).compileComponents();
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    const trigger = () => (fixture.nativeElement as HTMLElement).querySelector('[ngCombobox]')!;
    expect(trigger().textContent?.trim()).toBe('Choisir');

    TestBed.inject(TranslocoService).setActiveLang('en');
    await fixture.whenStable();
    expect(trigger().textContent?.trim()).toBe('Select');
  });

  it('affiche les libellés des valeurs choisies', async () => {
    const { host, stable, trigger } = await setup();
    host.cabins.set(['economy', 'business']);
    await stable();
    expect(trigger().textContent?.trim()).toBe('Économie, Affaires');
  });

  it('se referme après un choix simple, reste ouvert en choix multiple', async () => {
    const { select, host, stable } = await setup();
    const commit = () => (select as unknown as { onCommit(): void }).onCommit();

    select.open.set(true);
    commit();
    expect(select.open()).toBe(false);

    host.multiple.set(true);
    await stable();
    select.open.set(true);
    commit();
    expect(select.open()).toBe(true);
  });

  it('affiche les erreurs une fois touché et invalide', async () => {
    const { element, host, stable, trigger } = await setup();
    host.touched.set(true);
    host.invalid.set(true);
    await stable();
    expect(element.textContent).toContain('form.required');
    expect(trigger().className).toContain('border-state-error');
  });
});
