import { of } from 'rxjs';
import { StaffUser } from '../core/models';
import { button, optionsOf, pick, renderPage, staffApiMock, STATIONS, staffUser, type, get } from '../../testing';
import { needsStation, StaffPage } from './staff';

const COLLEAGUE: StaffUser = { ...staffUser('inspector'), id: 2, username: 'moussa', full_name: 'Moussa Fall' };

describe('StaffPage', () => {
  const open = (user = staffUser('admin'), overrides: Parameters<typeof staffApiMock>[0] = {}) => {
    const api = staffApiMock({ stations: () => of(STATIONS), users: () => of([user, COLLEAGUE]), ...overrides });
    return renderPage(StaffPage, { api, user });
  };

  it('rattache à une gare les seuls chefs de gare et contrôleurs', () => {
    expect(needsStation('inspector')).toBe(true);
    expect(needsStation('station_chief')).toBe(true);
    expect(needsStation('manager')).toBe(false);
  });

  it('propose tous les rôles à un administrateur', async () => {
    const admin = await open(staffUser('admin'));
    expect(optionsOf(admin.fixture, 0).map((o) => o.value)).toEqual(['admin', 'manager', 'station_chief', 'inspector']);
  });

  it('ne laisse un manager donner que les rôles de gare', async () => {
    const manager = await open(staffUser('manager'));
    expect(optionsOf(manager.fixture, 0).map((o) => o.value)).toEqual(['station_chief', 'inspector']);
  });

  it('crée un compte avec un mot de passe provisoire affiché une fois', async () => {
    const created = { ...COLLEAGUE, id: 3, username: 'fatou' };
    const { element, fixture, stable, api } = await open(staffUser('admin'), { createUser: () => of(created) });
    const form = get(element, 'form');
    const [username, fullName] = [...form.querySelectorAll<HTMLInputElement>('bip-input input')];
    type(username, 'Fatou.Sow');
    type(fullName, 'Fatou Sow');
    await stable();
    button(element, 'staff.create').click();
    await stable();
    // Le motif refuse les majuscules : rien n'est envoyé.
    expect(api.createUser).not.toHaveBeenCalled();
    expect(element.textContent).toContain('staff.username-format');

    type(username, 'fatou.sow');
    await stable();
    // Rôle contrôleur par défaut : la gare est obligatoire (sélecteur 1).
    button(element, 'staff.create').click();
    await stable();
    expect(element.querySelector('[role="alert"]')?.textContent).toContain('errors.station-required');

    pick(fixture, 1, 2);
    await stable();
    button(element, 'staff.create').click();
    await stable();
    expect(api.createUser).toHaveBeenCalledWith(
      expect.objectContaining({
        username: 'fatou.sow',
        full_name: 'Fatou Sow',
        phone: null,
        role: 'inspector',
        station_id: 2,
        temporary_password: expect.stringMatching(/^[A-Za-z2-9]{12}$/),
      }),
    );
    expect(element.querySelector('[role="status"]')?.textContent).toContain('staff.issued');
  });

  it('modifie un collègue mais pas son propre compte', async () => {
    const { element, stable, api } = await open(staffUser('admin'), { updateUser: () => of(COLLEAGUE) });
    expect(element.textContent).toContain('staff.yourself');
    type(get<HTMLInputElement>(element, 'input[name="name-2"]'), ' Moussa Fall Ndiaye ');
    get<HTMLInputElement>(element, 'input[name="active-2"]').click();
    await stable();
    button(element, 'common.save').click();
    await stable();
    expect(api.updateUser).toHaveBeenCalledWith(2, { full_name: 'Moussa Fall Ndiaye', phone: null, role: 'inspector', station_id: 1, active: false });
  });

  it('donne un nouveau mot de passe provisoire', async () => {
    const { element, stable, api } = await open(staffUser('admin'), { resetPassword: () => of(COLLEAGUE) });
    button(element, 'staff.reset').click();
    await stable();
    expect(api.resetPassword).toHaveBeenCalledWith(2, expect.stringMatching(/^[A-Za-z2-9]{12}$/));
    expect(element.querySelector('[role="status"]')?.textContent).toContain('staff.issued');
  });
});
