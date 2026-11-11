import { HttpErrorResponse } from '@angular/common/http';
import { of, throwError } from 'rxjs';
import { Session } from '../../core/session';
import { TestBed } from '@angular/core/testing';
import { button, renderPage, staffApiMock, staffUser, type } from '../../../testing';
import { LoginPage } from './login';

describe('LoginPage', () => {
  afterEach(() => jest.useRealTimers());

  const fields = (element: HTMLElement) => [...element.querySelectorAll<HTMLInputElement>('input')];

  it('connecte le membre et ouvre les départs', async () => {
    const api = staffApiMock({ login: () => of(staffUser('inspector')) });
    const { element, stable, navigate } = await renderPage(LoginPage, { user: null, api });
    const [username, password] = fields(element);
    type(username, ' awa ');
    type(password, 'secret-123');
    // Comme dans le navigateur : un rendu entre la frappe et la soumission.
    await stable();
    button(element, 'login.submit').click();
    await stable();

    expect(api.login).toHaveBeenCalledWith('awa', 'secret-123');
    expect(TestBed.inject(Session).user()?.role).toBe('inspector');
    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(password.value).toBe('');
  });

  it('envoie vers le changement de mot de passe après un mot de passe provisoire', async () => {
    const api = staffApiMock({ login: () => of(staffUser('inspector', { must_change_password: true })) });
    const { element, stable, navigate } = await renderPage(LoginPage, { user: null, api });
    const [username, password] = fields(element);
    type(username, 'awa');
    type(password, 'Provisoire23');
    button(element, 'login.submit').click();
    await stable();
    expect(navigate).toHaveBeenCalledWith(['/password']);
  });

  it('n’appelle pas le serveur sans identifiant ni mot de passe', async () => {
    const { element, stable, api } = await renderPage(LoginPage, { user: null });
    button(element, 'login.submit').click();
    await stable();
    expect(api.login).not.toHaveBeenCalled();
    expect(element.textContent).toContain('common.required-field');
  });

  it('affiche l’erreur renvoyée par le serveur', async () => {
    const api = staffApiMock({ login: () => throwError(() => new HttpErrorResponse({ status: 401, error: { code: 'invalid-credentials' } })) });
    const { element, stable } = await renderPage(LoginPage, { user: null, api });
    const [username, password] = fields(element);
    type(username, 'awa');
    type(password, 'faux');
    button(element, 'login.submit').click();
    await stable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('errors.invalid-credentials');
  });

  it('s’affiche même serveur injoignable, le signale et réessaie', async () => {
    let calls = 0;
    const api = staffApiMock({
      me: () => (++calls === 1 ? throwError(() => new HttpErrorResponse({ status: 0 })) : throwError(() => new HttpErrorResponse({ status: 401 }))),
    });
    const { element, stable } = await renderPage(LoginPage, { user: null, api });
    expect(element.querySelector('input[autocomplete="username"]')).not.toBeNull();
    expect(element.querySelector('[role="status"]')?.textContent).toContain('login.server.offline');

    button(element, 'login.server.retry').click();
    await stable();
    expect(api.me).toHaveBeenCalledTimes(2);
    expect(element.querySelector('[role="status"]')?.textContent).toContain('login.server.online');
  });

  it('entre directement si la session est encore ouverte', async () => {
    const api = staffApiMock({ me: () => of(staffUser('manager')) });
    const { navigate } = await renderPage(LoginPage, { user: null, api });
    expect(navigate).toHaveBeenCalledWith(['/']);
    expect(TestBed.inject(Session).user()?.role).toBe('manager');
  });
});
