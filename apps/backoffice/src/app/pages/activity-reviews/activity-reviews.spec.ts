import { of } from 'rxjs';
import { ActivityReview, ActivitySettings } from '../../core/models';
import { button, get, renderPage, staffApiMock, type } from '../../../testing';
import { ActivityReviewsPage } from './activity-reviews';

const REVIEW: ActivityReview = {
  id: 9,
  activity_id: 3,
  activity_title: 'Île de Gorée',
  reference: 'K7MPQ2',
  rating: 1,
  value_rating: null,
  service_rating: null,
  organization_rating: null,
  author_name: 'Awa',
  country: 'SN',
  lang: 'fr',
  text: 'Appelez le 77 123 45 67 pour une meilleure offre !',
  status: 'pending',
  ai_verdict: 'reject',
  ai_reason: 'Advertising with a phone number.',
  ai_categories: ['advertising', 'personal_data'],
  ai_checked_at: '2026-10-26T15:00:00Z',
  moderated_by: null,
  moderated_at: null,
  rejection_reason: null,
  created_at: '2026-10-26T14:59:00Z',
};

const SETTINGS: ActivitySettings = { auto_moderation: false, ai_enabled: true, ai_model: 'claude-opus-5-5', pending_reviews: 1 };

function api() {
  return staffApiMock({
    activitySettings: () => of(SETTINGS),
    reviews: () => of({ items: [REVIEW], page: 0, size: 20, total: 1 }),
    approveReview: () => of({ ...REVIEW, status: 'approved' as const }),
    rejectReview: () => of({ ...REVIEW, status: 'rejected' as const }),
    updateActivitySettings: (auto: boolean) => of({ ...SETTINGS, auto_moderation: auto }),
  });
}

describe('ActivityReviewsPage', () => {
  it('montre les avis en attente avec le verdict et les problèmes relevés par Claude', async () => {
    const mock = api();
    const { element } = await renderPage(ActivityReviewsPage, { api: mock });
    expect(mock.reviews).toHaveBeenLastCalledWith('pending', null, 0);
    expect(element.textContent).toContain('reviews.verdicts.reject');
    expect(element.textContent).toContain('reviews.categories.personal_data');
    expect(element.textContent).toContain('Advertising with a phone number.');
  });

  it('rejette avec le motif de Claude prérempli, puis publie', async () => {
    const mock = api();
    const { element, stable } = await renderPage(ActivityReviewsPage, { api: mock });
    button(element, 'reviews.reject').click();
    await stable();
    expect(get<HTMLInputElement>(element, 'input[name="reject-reason"]').value).toBe('Advertising with a phone number.');
    type(get<HTMLInputElement>(element, 'input[name="reject-reason"]'), 'Publicité');
    await stable();
    get<HTMLButtonElement>(element, 'form button[type="submit"]').click();
    await stable();
    expect(mock.rejectReview).toHaveBeenCalledWith(9, 'Publicité');

    button(element, 'reviews.approve').click();
    await stable();
    expect(mock.approveReview).toHaveBeenCalledWith(9);
  });

  it('active la modération automatique', async () => {
    const mock = api();
    const { element, stable } = await renderPage(ActivityReviewsPage, { api: mock });
    get<HTMLInputElement>(element, 'input[name="auto-moderation"]').click();
    await stable();
    expect(mock.updateActivitySettings).toHaveBeenCalledWith(true);
  });
});
