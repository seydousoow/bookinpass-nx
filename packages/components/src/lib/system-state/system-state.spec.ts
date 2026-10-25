import { Component, signal } from '@angular/core';
import { By } from '@angular/platform-browser';
import { NgIcon } from '@ng-icons/core';
import { AppError, appError, SystemStatus } from 'models';
import { render, translocoTesting } from '../../testing';
import { SystemState } from './system-state';

@Component({
  imports: [SystemState],
  template: `
    <bip-system-state [status]="status()" [error]="error()" [title]="title()" [skeletonCount]="2" (retry)="retries.set(retries() + 1)">
      <p class="content">Offres</p>
    </bip-system-state>
  `,
})
class Host {
  readonly status = signal<SystemStatus>('loading');
  readonly error = signal<AppError | null>(null);
  readonly title = signal<string | undefined>(undefined);
  readonly retries = signal(0);
}

describe('SystemState', () => {
  // Vraies traductions des composants : les textes par défaut doivent exister et s'afficher.
  const setup = async (status: SystemStatus) => {
    const view = await render(Host, [], translocoTesting('components'));
    view.host.status.set(status);
    await view.stable();
    return view;
  };

  it('affiche un squelette de la taille du contenu pendant le chargement', async () => {
    const { element } = await setup('loading');
    const skeleton = element.querySelector('[aria-busy="true"]')!;
    expect(skeleton.querySelectorAll('div')).toHaveLength(2);
    expect(element.querySelector('.content')).toBeNull();
  });

  it('projette le contenu en cas de succès', async () => {
    const { element } = await setup('success');
    expect(element.querySelector('.content')).not.toBeNull();
    expect(element.querySelector('[role="status"]')).toBeNull();
  });

  it('projette le contenu sous un avertissement en cas de succès partiel', async () => {
    const { element } = await setup('partial');
    expect(element.textContent).toContain('Confirmation partielle');
    expect(element.querySelector('.content')).not.toBeNull();
  });

  it('donne un titre et un message par défaut à chaque état', async () => {
    const { element } = await setup('empty');
    expect(element.textContent).toContain('Aucun résultat');
    expect(element.textContent).toContain('Élargissez les dates');
    expect(element.querySelector('bip-button')).toBeNull();
  });

  it('propose de réessayer après une erreur', async () => {
    const { element, host } = await setup('error');
    const button = element.querySelector<HTMLElement>('bip-button')!;
    expect(button.textContent?.trim()).toBe('Réessayer');
    button.click();
    expect(host.retries()).toBe(1);
  });

  it('dit ce qui s’est passé, ce qui reste enregistré et l’action possible', async () => {
    const { element, host, stable } = await setup('error');
    host.error.set(appError('payment', 'Le paiement a été refusé.', 'Votre panier est conservé.', { label: 'Changer de carte', kind: 'retry' }));
    host.title.set('Paiement refusé');
    await stable();
    expect(element.textContent).toContain('Paiement refusé');
    expect(element.textContent).toContain('Le paiement a été refusé.');
    expect(element.textContent).toContain('Votre panier est conservé.');
    expect(element.querySelector('bip-button')?.textContent?.trim()).toBe('Changer de carte');
  });

  it('teinte l’icône selon l’état', async () => {
    const { fixture, host, stable } = await setup('error');
    const color = () => (fixture.debugElement.query(By.directive(NgIcon)).componentInstance as NgIcon).color();
    expect(color()).toBe('var(--color-state-error)');

    host.status.set('expired');
    await stable();
    expect(color()).toBe('var(--color-state-warning)');

    host.status.set('empty');
    await stable();
    expect(color()).toBe('var(--color-muted)');
  });

  it('n’ajoute pas le message générique à un titre propre à la page', async () => {
    const { element, host, stable } = await setup('empty');
    host.title.set('departures.empty');
    await stable();
    expect(element.textContent).toContain('departures.empty');
    expect(element.textContent).not.toContain('Élargissez les dates');
    expect(element.querySelectorAll('[role="status"] p')).toHaveLength(1);
  });
});
