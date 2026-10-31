import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRouteSnapshot, provideRouter, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { APP_CONFIG } from 'configs/configs/app-config.token';
import { StaffUser } from './models';
import { credentialsInterceptor, passwordGuard, roleGuard, Session, signedInGuard, signedOutInterceptor } from './session';

const user = (over: Partial<StaffUser> = {}): StaffUser => ({
  id: 1,
  username: 'awa',
  full_name: 'Awa Diop',
  phone: null,
  role: 'station_chief',
  station: null,
  active: true,
  must_change_password: false,
  last_login_at: null,
  ...over,
});

describe('Session', () => {
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([credentialsInterceptor, signedOutInterceptor])),
        provideHttpClientTesting(),
        { provide: APP_CONFIG, useValue: { production: false, apiBaseUrl: '/api' } },
      ],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  const guard = (fn: typeof signedInGuard, data: Record<string, unknown> = {}) =>
    TestBed.runInInjectionContext(() => fn({ data } as unknown as ActivatedRouteSnapshot, {} as RouterStateSnapshot)) as Promise<boolean | UrlTree> | boolean | UrlTree;

  it('lit la session une seule fois', async () => {
    const session = TestBed.inject(Session);
    const first = session.load();
    http.expectOne('/api/staff/auth/me').flush(user());
    expect(await first).toEqual(user());
    expect(await session.load()).toEqual(user());
  });

  it('se considère déconnectée si la lecture échoue', async () => {
    const loaded = TestBed.inject(Session).load();
    http.expectOne('/api/staff/auth/me').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(await loaded).toBeNull();
  });

  it('dérive les droits du rôle', () => {
    const session = TestBed.inject(Session);
    session.set(user({ role: 'manager' }));
    expect(session.manager()).toBe(true);
    expect(session.chief()).toBe(true);
    session.set(user({ role: 'station_chief' }));
    expect(session.manager()).toBe(false);
    expect(session.chief()).toBe(true);
    session.set(user({ role: 'inspector' }));
    expect(session.chief()).toBe(false);
    expect(session.has('inspector', 'admin')).toBe(true);
  });

  it('envoie le cookie de session avec chaque appel', () => {
    TestBed.inject(HttpClient).get('/api/staff/stations').subscribe();
    expect(http.expectOne('/api/staff/stations').request.withCredentials).toBe(true);
  });

  it('renvoie à la connexion sur une session expirée, sauf pendant la connexion elle-même', () => {
    const router = TestBed.inject(Router);
    const navigate = jest.spyOn(router, 'navigate').mockResolvedValue(true);
    const session = TestBed.inject(Session);
    session.set(user());
    const client = TestBed.inject(HttpClient);

    client.post('/api/staff/auth/login', {}).subscribe({ error: () => undefined });
    http.expectOne('/api/staff/auth/login').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(navigate).not.toHaveBeenCalled();

    client.get('/api/staff/departures').subscribe({ error: () => undefined });
    http.expectOne('/api/staff/departures').flush(null, { status: 401, statusText: 'Unauthorized' });
    expect(navigate).toHaveBeenCalledWith(['/login']);
    expect(session.user()).toBeNull();
  });

  describe('gardes', () => {
    const url = (result: unknown) => (result instanceof UrlTree ? result.toString() : result);

    it('signedInGuard : connexion, puis mot de passe provisoire à changer', async () => {
      const session = TestBed.inject(Session);
      session.set(null);
      expect(url(await guard(signedInGuard))).toBe('/login');
      session.set(user({ must_change_password: true }));
      expect(url(await guard(signedInGuard))).toBe('/password');
      session.set(user());
      expect(await guard(signedInGuard)).toBe(true);
    });

    it('passwordGuard : il suffit d’être connecté', async () => {
      const session = TestBed.inject(Session);
      session.set(null);
      expect(url(await guard(passwordGuard))).toBe('/login');
      session.set(user({ must_change_password: true }));
      expect(await guard(passwordGuard)).toBe(true);
    });

    it('roleGuard : réservé aux rôles de la route', () => {
      TestBed.inject(Session).set(user({ role: 'inspector' }));
      expect(url(guard(roleGuard, { roles: ['admin', 'manager'] }))).toBe('/');
      expect(guard(roleGuard, { roles: ['inspector'] })).toBe(true);
    });
  });
});
