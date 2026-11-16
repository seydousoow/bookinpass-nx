import { of } from 'rxjs';
import { ActivityDetail, ActivityTranslation, ActivityTranslationContent } from '../../core/models';
import { button, get, renderPage, staffApiMock, type } from '../../../testing';
import { ActivityTranslationEditor } from './activity-translation';

const ACTIVITY = { ref: 'GKRE2345', lang: 'fr', images: [], translations: [{ lang: 'en', status: 'proposed' }] } as unknown as ActivityDetail;

const SOURCE: ActivityTranslationContent = {
  title: 'Île de Gorée',
  summary: 'Traversée et visite.',
  description: 'La Maison des Esclaves.',
  highlights: ['Maison des Esclaves'],
  includes: [],
  excludes: [],
  not_allowed: [],
  to_bring: [],
  know_before: [],
  itinerary: [{ name: 'Maison des Esclaves', description: '' }],
  meeting_point: 'Embarcadère',
  image_alts: [],
  options: [{ id: 'opt1', title: 'Visite guidée', description: '' }],
};

const PROPOSAL: ActivityTranslationContent = {
  ...SOURCE,
  title: 'Gorée Island',
  summary: 'Crossing and tour.',
  description: 'The House of Slaves.',
  highlights: ['House of Slaves'],
  itinerary: [{ name: 'House of Slaves', description: '' }],
  meeting_point: 'Ferry terminal',
  options: [{ id: 'opt1', title: 'Guided tour', description: '' }],
};

function translation(over: Partial<ActivityTranslation> = {}): ActivityTranslation {
  return {
    lang: 'en',
    source_lang: 'fr',
    status: 'proposed',
    source: SOURCE,
    content: null,
    proposal: PROPOSAL,
    applied_at: null,
    applied_by: null,
    proposed_at: '2026-11-15T10:00:00Z',
    ai_error: null,
    ...over,
  };
}

describe('ActivityTranslationEditor', () => {
  it('préremplit la proposition de Claude à côté de la source, puis l’applique corrigée', async () => {
    const api = staffApiMock({
      translation: () => of(translation()),
      applyTranslation: () => of(translation({ status: 'applied', content: PROPOSAL, proposal: null })),
    });
    const { element, stable } = await renderPage(ActivityTranslationEditor, { api, inputs: { activity: ACTIVITY, lang: 'en' } });

    expect(api.translation).toHaveBeenCalledWith('GKRE2345', 'en');
    expect(element.textContent).toContain('Île de Gorée');
    expect(get<HTMLInputElement>(element, 'input[name="tr-title"]').value).toBe('Gorée Island');

    type(get<HTMLInputElement>(element, 'input[name="tr-title"]'), ' Gorée Island: guided tour ');
    await stable();
    button(element, 'activity.translation.apply').click();
    await stable();

    expect(api.applyTranslation).toHaveBeenCalledWith(
      'GKRE2345',
      'en',
      expect.objectContaining({ title: 'Gorée Island: guided tour', options: [{ id: 'opt1', title: 'Guided tour', description: '' }] }),
    );
  });

  it('demande une traduction à Claude quand il n’y en a pas encore', async () => {
    const api = staffApiMock({
      translation: () => of(translation({ status: 'none', proposal: null })),
      proposeTranslation: () => of(translation()),
    });
    const { element, stable } = await renderPage(ActivityTranslationEditor, { api, inputs: { activity: ACTIVITY, lang: 'en' } });

    expect(get<HTMLInputElement>(element, 'input[name="tr-title"]').value).toBe('');
    button(element, 'activity.translation.translate').click();
    await stable();

    expect(api.proposeTranslation).toHaveBeenCalledWith('GKRE2345', 'en');
    expect(get<HTMLInputElement>(element, 'input[name="tr-title"]').value).toBe('Gorée Island');
  });
});
