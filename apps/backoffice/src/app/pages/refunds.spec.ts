import { of } from 'rxjs';
import { Refund } from '../core/models';
import { button, renderPage, staffApiMock, type, get } from '../../testing';
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

describe('RefundsPage', () => {
  it('montre les remboursements à faire, puis tous', async () => {
    const api = staffApiMock({ refunds: () => of([REFUND]) });
    const { element, stable } = await renderPage(RefundsPage, { api });
    expect(api.refunds).toHaveBeenLastCalledWith(false);
    get<HTMLInputElement>(element, 'input[type="checkbox"]').click();
    await stable();
    expect(api.refunds).toHaveBeenLastCalledWith(true);
  });

  it('note un remboursement fait, avec sa référence', async () => {
    const api = staffApiMock({ refunds: () => of([REFUND]), markRefunded: () => of({ ...REFUND, status: 'refunded' as const }) });
    const { element, stable } = await renderPage(RefundsPage, { api });
    expect(button(element, 'refunds.mark').hasAttribute('disabled')).toBe(true);
    type(get<HTMLInputElement>(element, 'input[name="note-5"]'), ' Wave TX 42 ');
    await stable();
    button(element, 'refunds.mark').click();
    await stable();
    expect(api.markRefunded).toHaveBeenCalledWith(5, 'Wave TX 42');
    expect(api.refunds).toHaveBeenCalledTimes(2);
  });
});
