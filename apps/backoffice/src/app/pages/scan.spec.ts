import { of } from 'rxjs';
import { TicketCheck } from '../core/models';
import { button, get, renderPage, staffApiMock, type } from '../../testing';
import { ScanPage, TICKET_CODE } from './scan';

const check = (status: TicketCheck['status']): TicketCheck => ({
  status,
  code: 'ABCDEFGH23',
  given_name: 'Awa',
  family_name: 'Diop',
  reference: 'BIP123',
  origin: 'Dakar',
  destination: 'Thiès',
  departs_at: '2026-10-25T07:00:00Z',
  last_departure_at: null,
  scanned_at: '2026-10-25T06:58:00Z',
  scanned_by: 'moussa',
});

describe('ScanPage', () => {
  it('reconnaît un code de billet (10 caractères, sans 0/O ni 1/I)', () => {
    expect(TICKET_CODE.test('ABCDEFGH23')).toBe(true);
    expect(TICKET_CODE.test('ABCDEFGH2')).toBe(false);
    expect(TICKET_CODE.test('ABCDEFGHI3')).toBe(false);
    expect(TICKET_CODE.test('ABCDEFGH10')).toBe(false);
  });

  it('valide un code tapé à la main, en majuscules', async () => {
    const api = staffApiMock({ scanTicket: () => of(check('scanned')) });
    const { element, stable } = await renderPage(ScanPage, { api });
    const field = get<HTMLInputElement>(element, 'input[name="code"]');
    type(field, 'abcdefgh2');
    await stable();
    expect(button(element, 'scan.check').hasAttribute('disabled')).toBe(true);

    type(field, 'abcdefgh23');
    await stable();
    button(element, 'scan.check').click();
    await stable();
    expect(api.scanTicket).toHaveBeenCalledWith('ABCDEFGH23');
    const verdict = get(element, '[aria-live="assertive"]');
    expect(verdict.textContent).toContain('scan.status.scanned');
    expect(verdict.className).toContain('bg-state-success');
    expect(field.value).toBe('');
  });

  it('signale un billet déjà contrôlé, avec qui et quand', async () => {
    const api = staffApiMock({ scanTicket: () => of(check('already_scanned')) });
    const { element, stable } = await renderPage(ScanPage, { api });
    type(get<HTMLInputElement>(element, 'input[name="code"]'), 'ABCDEFGH23');
    await stable();
    button(element, 'scan.check').click();
    await stable();
    const verdict = get(element, '[aria-live="assertive"]');
    expect(verdict.className).toContain('bg-state-warning');
    expect(verdict.textContent).toContain('scan.scanned-by');
  });

  it('indique un navigateur sans caméra', async () => {
    const { element, stable } = await renderPage(ScanPage);
    button(element, 'scan.start-camera').click();
    await stable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('scan.unsupported');
  });
});
