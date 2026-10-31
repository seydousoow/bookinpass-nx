import { of } from 'rxjs';
import { button, renderPage, staffApiMock, staffUser, type } from '../../../testing';
import { PasswordPage } from './password';

describe('PasswordPage', () => {
  const fill = (element: HTMLElement, current: string, next: string, confirm: string) => {
    const [a, b, c] = [...element.querySelectorAll<HTMLInputElement>('input')];
    type(a, current);
    type(b, next);
    type(c, confirm);
  };

  it('signale un mot de passe provisoire à changer', async () => {
    const { element } = await renderPage(PasswordPage, { user: staffUser('inspector', { must_change_password: true }) });
    expect(element.textContent).toContain('password.required');
  });

  it('refuse une confirmation différente sans appeler le serveur', async () => {
    const { element, stable, api } = await renderPage(PasswordPage);
    fill(element, 'ancien', 'nouveau-mot-2026', 'nouveau-mot-2027');
    button(element, 'password.submit').click();
    await stable();
    expect(api.changePassword).not.toHaveBeenCalled();
    expect(element.textContent).toContain('errors.password-mismatch');
  });

  it('applique la règle du serveur : 10 caractères, une lettre et un chiffre', async () => {
    const { element, stable, api } = await renderPage(PasswordPage);
    fill(element, 'ancien', 'sanschiffre', 'sanschiffre');
    button(element, 'password.submit').click();
    await stable();
    expect(api.changePassword).not.toHaveBeenCalled();
    expect(element.textContent).toContain('errors.weak-password');
  });

  it('change le mot de passe puis ouvre les départs', async () => {
    const api = staffApiMock({ changePassword: () => of(staffUser('inspector')) });
    const { element, stable, navigate } = await renderPage(PasswordPage, { api });
    fill(element, 'ancien', 'nouveau-mot-2026', 'nouveau-mot-2026');
    button(element, 'password.submit').click();
    await stable();
    expect(api.changePassword).toHaveBeenCalledWith('ancien', 'nouveau-mot-2026');
    expect(navigate).toHaveBeenCalledWith(['/']);
  });
});
