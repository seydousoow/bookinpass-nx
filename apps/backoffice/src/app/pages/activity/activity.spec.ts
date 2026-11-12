import { of } from 'rxjs';
import { ActivityDetail } from '../../core/models';
import { button, get, renderPage, staffApiMock, type } from '../../../testing';
import { ActivityPage, problemStep } from './activity';

describe('ActivityPage', () => {
  it('liste ce qui manque, puis crée la fiche dans la ville choisie', async () => {
    const city = { id: 2253354, name: 'Dakar', country_code: 'SN', timezone: 'Africa/Dakar' };
    const api = staffApiMock({
      cities: () => of([{ city, population: 2_476_400 }]),
      createActivity: () => of({ id: 7 } as ActivityDetail),
    });
    const { element, stable, navigate } = await renderPage(ActivityPage, { api, inputs: { id: 'new' } });

    button(element, 'activity.create').click();
    await stable();
    expect(element.textContent).toContain('activity.missing.city');
    expect(api.createActivity).not.toHaveBeenCalled();

    type(get<HTMLInputElement>(element, 'input[name="title"]'), 'Île de Gorée');
    type(get<HTMLInputElement>(element, 'input[name="city-search"]'), 'dak');
    await new Promise((resolve) => setTimeout(resolve, 300));
    await stable();
    [...element.querySelectorAll('button')].find((b) => b.textContent?.includes('Dakar'))!.click();
    await stable();
    type(get<HTMLInputElement>(element, 'input[name="provider"]'), 'Gorée Tours');
    type(get<HTMLTextAreaElement>(element, 'textarea[name="summary"]') as unknown as HTMLInputElement, 'Traversée et visite.');
    type(get<HTMLTextAreaElement>(element, 'textarea[name="description"]') as unknown as HTMLInputElement, 'La Maison des Esclaves.');
    type(get<HTMLTextAreaElement>(element, 'textarea[name="highlights"]') as unknown as HTMLInputElement, 'Maison des Esclaves\n\nCastel');
    type(get<HTMLInputElement>(element, 'input[name="meeting-point"]'), 'Embarcadère');
    await stable();
    button(element, 'activity.create').click();
    await stable();

    expect(api.createActivity).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Île de Gorée', city_id: 2253354, highlights: ['Maison des Esclaves', 'Castel'], free_cancellation_hours: 24 }),
    );
    expect(navigate).toHaveBeenCalledWith(['/activities', 7]);
  });

  it('mène à l’étape à corriger quand celle affichée est complète', async () => {
    const { element, stable } = await renderPage(ActivityPage, { inputs: { id: 'new' } });
    const current = () => element.querySelector('[aria-current="step"]')?.textContent?.trim();
    expect(current()).toContain('activity.steps.general');
    element.querySelectorAll<HTMLButtonElement>('bo-stepper button')[3].click();
    await stable();
    button(element, 'activity.create').click();
    await stable();
    // Rien à corriger à l'étape « conditions » : retour à la première étape à compléter.
    expect(current()).toContain('activity.steps.general');
    expect(element.querySelector('bo-stepper li:nth-child(2) button')?.className).toContain('text-state-error');
  });

  it('range chaque problème à son étape', () => {
    expect(['title', 'images', 'location', 'duration'].map(problemStep)).toEqual([0, 1, 1, 2]);
  });
});
