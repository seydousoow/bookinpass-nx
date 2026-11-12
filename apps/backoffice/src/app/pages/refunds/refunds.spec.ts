import { of } from 'rxjs';
import { ActivityRefund, Refund } from '../../core/models';
import { button, get, renderPage, staffApiMock, type } from '../../../testing';
import { RefundsPage } from './refunds';

const REFUND: Refund = {
  id: 5,
  reference: 'BIP123',
  passengers: 'Awa Diop',
  email: 'awa@example.sn',
  phone: '+221771234567',
  origin: 'Dakar',
  destination: 'Thiès',
  departs_at: '2026-10-25T07:00:00Z',
  amount: '3500',
  currency: 'XOF',
  provider: 'wave',
  invoice_token: 'inv_1',
  receipt_url: null,
  paid_at: '2026-10-25T06:00:00Z',
  status: 'refund_needed',
  refunded_at: null,
  refunded_by: null,
  refund_note: null,
};

const ACTIVITY_REFUND = {
  id: 7,
  reference: 'ACT9',
  activity_title: 'Gorée',
  customer: 'Moussa',
  status: 'pending',
  method: 'mobile_money',
  amount: '9000',
  currency: 'XOF',
} as ActivityRefund;

describe('RefundsPage', () => {
  it('montre les remboursements à faire, puis l’historique', async () => {
    const api = staffApiMock({ refunds: () => of([REFUND, { ...REFUND, id: 6, reference: 'BIP999', status: 'refunded' as const }]) });
    const { element, stable } = await renderPage(RefundsPage, { api });
    expect(api.refunds).toHaveBeenLastCalledWith(false);
    expect(element.textContent).toContain('BIP123');
    button(element, 'refunds.view.history').click();
    await stable();
    expect(api.refunds).toHaveBeenLastCalledWith(true);
    expect(element.textContent).toContain('BIP999');
    expect(element.textContent).not.toContain('BIP123');
  });

  it('note un remboursement fait, avec sa référence, après confirmation', async () => {
    const api = staffApiMock({ refunds: () => of([REFUND]), markRefunded: () => of({ ...REFUND, status: 'refunded' as const }) });
    const { element, stable } = await renderPage(RefundsPage, { api });
    button(element, 'refunds.mark').click();
    await stable();
    expect(button(element, 'refunds.confirm').hasAttribute('disabled')).toBe(true);
    type(get<HTMLInputElement>(element, 'input[name="refund-note"]'), ' Wave TX 42 ');
    await stable();
    button(element, 'refunds.confirm').click();
    await stable();
    expect(api.markRefunded).toHaveBeenCalledWith(5, 'Wave TX 42');
    expect(api.refunds).toHaveBeenCalledTimes(2);
    expect(element.querySelector('input[name="refund-note"]')).toBeNull();
  });

  it('sépare les remboursements d’activités dans leur onglet', async () => {
    const api = staffApiMock({ refunds: () => of([REFUND]), activityRefunds: () => of([ACTIVITY_REFUND]), markActivityRefunded: () => of(ACTIVITY_REFUND) });
    const { element, stable } = await renderPage(RefundsPage, { api });
    expect(element.textContent).not.toContain('ACT9');
    element.querySelectorAll<HTMLButtonElement>('[role="tab"]')[1].click();
    await stable();
    expect(element.textContent).toContain('ACT9');
    button(element, 'refunds.mark').click();
    await stable();
    type(get<HTMLInputElement>(element, 'input[name="refund-note"]'), 'OM 77');
    await stable();
    button(element, 'refunds.confirm').click();
    await stable();
    expect(api.markActivityRefunded).toHaveBeenCalledWith(7, 'OM 77');
  });
});
