import { of } from 'rxjs';
import { ActivityDetail } from '../../core/models';
import { button, get, renderPage, staffApiMock, type } from '../../../testing';
import { ActivityPage } from './activity';

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
});
