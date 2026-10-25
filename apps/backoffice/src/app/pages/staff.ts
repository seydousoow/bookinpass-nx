import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { form, FormField, FormRoot, maxLength, minLength, pattern, required, validate } from '@angular/forms/signals';
import { TranslocoDirective } from '@jsverse/transloco';
import { Observable } from 'rxjs';
import { Badge } from 'components/badge/badge';
import { Button } from 'components/button/button';
import { Checkbox } from 'components/checkbox/checkbox';
import { Input } from 'components/input/input';
import { isValidPhone, PhoneInput } from 'components/phone-input/phone-input';
import { Select } from 'components/select/select';
import { Spinner } from 'components/spinner/spinner';
import { SystemState } from 'components/system-state/system-state';
import { createAction } from '../core/action';
import { StaffApi } from '../core/api';
import { Session } from '../core/session';
import { temporaryPassword } from '../core/password';
import { dakarDateTime } from '../core/dakar';
import { StaffRole, StaffUser } from '../core/models';
import { translatedOptions } from '../core/options';
import { injectStations, stationOptions } from '../core/stations';

const ROLES: readonly StaffRole[] = ['admin', 'manager', 'station_chief', 'inspector'];
/** Rôles qu'un manager peut donner : ceux d'une gare. */
const STATION_ROLES: readonly StaffRole[] = ['station_chief', 'inspector'];

interface UserDraft {
  readonly full_name: string;
  readonly phone: string;
  readonly role: StaffRole;
  readonly station_id: number | null;
  readonly active: boolean;
}

/** Un chef de gare ou un contrôleur travaille dans une gare. */
export function needsStation(role: StaffRole): boolean {
  return STATION_ROLES.includes(role);
}

function userDraft(user: StaffUser): UserDraft {
  return { full_name: user.full_name, phone: user.phone ?? '', role: user.role, station_id: user.station?.id ?? null, active: user.active };
}

/**
 * Personnel : création (mot de passe provisoire à transmettre de vive voix), rôle, gare, désactivation, nouveau mot
 * de passe provisoire. Un manager ne gère que chefs de gare et contrôleurs.
 */
@Component({
  selector: 'bo-staff',
  imports: [TranslocoDirective, FormField, FormRoot, Badge, Button, Checkbox, Input, PhoneInput, Select, Spinner, SystemState],
  template: `
    <section *transloco="let t" class="space-y-4">
      <h1 class="text-xl font-bold">{{ t('staff.title') }}</h1>
      @if (action.error(); as code) {
        <p class="text-state-error" role="alert">{{ t('errors.' + code) }}</p>
      }
      @if (issued(); as p) {
        <p class="rounded-card bg-state-warning-soft p-3 text-sm" role="status">
          {{ t('staff.issued', { username: p.username }) }} <span class="font-mono text-base font-bold">{{ p.password }}</span>
        </p>
      }

      <form [formRoot]="createForm" class="bo-card grid gap-3 sm:grid-cols-2 lg:grid-cols-3" novalidate>
        <h2 class="font-bold sm:col-span-2 lg:col-span-3">{{ t('staff.new') }}</h2>
        <bip-input [formField]="createForm.username" autocapitalize="none" autocomplete="off" label="staff.username" />
        <bip-input [formField]="createForm.full_name" label="staff.full-name" />
        <bip-phone-input [formField]="createForm.phone" label="staff.phone" />
        <bip-select (valueChange)="newRole.set($event[0] ?? 'inspector')" [options]="roleOptions()" [value]="[newRole()]" label="staff.role" name="role" />
        @if (needsStation(newRole())) {
          <bip-select
            (valueChange)="newStation.set($event[0] ?? null)"
            [options]="stations()"
            [value]="newStation() === null ? [] : [newStation()!]"
            label="common.station"
            name="station" />
        }
        <div class="flex items-end">
          <button [loading]="action.busy()" bipButton type="submit">{{ t('staff.create') }}</button>
        </div>
      </form>

      @if (list.isLoading() && !list.hasValue()) {
        <bip-spinner class="py-8" label="common.loading" showLabel />
      } @else if (list.error()) {
        <bip-system-state (retry)="list.reload()" message="errors.unexpected" status="error" />
      }
      <ul class="grid gap-2">
        @for (u of list.value() ?? []; track u.id) {
          <li [class.opacity-60]="!u.active" class="bo-card space-y-3">
            <p class="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span class="flex flex-wrap items-center gap-2">
                <span class="font-semibold">{{ u.full_name }}</span> · <span class="font-mono">{{ u.username }}</span>
                @if (u.must_change_password) {
                  <bip-badge size="sm" tone="warning">{{ t('staff.temporary') }}</bip-badge>
                }
              </span>
              <span class="text-muted">{{ u.last_login_at ? t('staff.last-login', { time: dateTime(u.last_login_at) }) : t('staff.never') }}</span>
            </p>
            @if (u.id !== session.user()?.id) {
              @let draft = edit(u);
              <div class="flex flex-wrap items-end gap-3">
                <bip-input (valueChange)="patch(u, { full_name: $event ?? '' })" [name]="'name-' + u.id" [value]="draft.full_name" label="staff.full-name" />
                <bip-input (valueChange)="patch(u, { phone: $event ?? '' })" [name]="'phone-' + u.id" [value]="draft.phone" class="w-44" label="staff.phone" type="tel" />
                <bip-select
                  (valueChange)="patch(u, { role: $event[0] ?? draft.role })"
                  [name]="'role-' + u.id"
                  [options]="roleOptions()"
                  [value]="[draft.role]"
                  class="w-52"
                  label="staff.role" />
                @if (needsStation(draft.role)) {
                  <bip-select
                    (valueChange)="patch(u, { station_id: $event[0] ?? null })"
                    [name]="'station-' + u.id"
                    [options]="stations()"
                    [value]="draft.station_id === null ? [] : [draft.station_id]"
                    class="w-64"
                    label="common.station" />
                }
                <bip-checkbox
                  (checkedChange)="patch(u, { active: $event })"
                  [checked]="draft.active"
                  [label]="t('staff.active')"
                  [name]="'active-' + u.id"
                  class="flex min-h-11 items-center" />
                <button (clicked)="save(u)" [loading]="action.busy()" bipButton variant="outline">{{ t('common.save') }}</button>
                <button (clicked)="reset(u)" [loading]="action.busy()" bipButton variant="outline">{{ t('staff.reset') }}</button>
              </div>
            } @else {
              <p class="text-xs text-muted">{{ t('roles.' + u.role) }} · {{ t('staff.yourself') }}</p>
            }
          </li>
        }
      </ul>
    </section>
  `,
})
export class StaffPage {
  protected readonly session = inject(Session);
  protected readonly action = createAction();
  protected readonly needsStation = needsStation;
  protected readonly stations = stationOptions(injectStations());
  /** Rôles proposés : un manager ne donne que ceux d'une gare. */
  protected readonly roleOptions = translatedOptions(
    ROLES,
    'roles.',
    computed(() => (this.session.has('admin') ? ROLES : STATION_ROLES)),
  );
  /** Dernier mot de passe provisoire donné : affiché une seule fois, à transmettre à la personne. */
  protected readonly issued = signal<{ username: string; password: string } | null>(null);
  protected readonly dateTime = dakarDateTime;
  protected readonly newRole = signal<StaffRole>('inspector');
  protected readonly newStation = signal<number | null>(null);
  private readonly api = inject(StaffApi);
  protected readonly list = rxResource({ stream: () => this.api.users() });
  private readonly newUser = signal({ username: '', full_name: '', phone: '' });
  protected readonly createForm = form(
    this.newUser,
    (path) => {
      required(path.username, { message: 'common.required-field' });
      minLength(path.username, 3, { message: 'errors.username-required' });
      maxLength(path.username, 50);
      pattern(path.username, /^[a-z0-9._-]+$/, { message: 'staff.username-format' });
      required(path.full_name, { message: 'common.required-field' });
      validate(path.phone, ({ value }) => (!value() || isValidPhone(value()) ? null : { kind: 'phone', message: 'staff.phone-invalid' }));
    },
    {
      name: 'staff',
      submission: {
        action: () => {
          this.create();
          return Promise.resolve(null);
        },
        ignoreValidators: 'none',
        onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );

  /** Brouillons d'édition par compte, créés à la première saisie. */
  private readonly drafts = signal<Readonly<Record<number, UserDraft>>>({});

  protected edit(user: StaffUser): UserDraft {
    return this.drafts()[user.id] ?? userDraft(user);
  }

  protected patch(user: StaffUser, change: Partial<UserDraft>): void {
    this.drafts.update((all) => ({ ...all, [user.id]: { ...this.edit(user), ...change } }));
  }

  protected save(user: StaffUser): void {
    const draft = this.edit(user);
    const station = needsStation(draft.role) ? draft.station_id : null;
    if (needsStation(draft.role) && station === null) {
      this.action.error.set('station-required');
      return;
    }
    this.run(this.api.updateUser(user.id, { full_name: draft.full_name.trim(), phone: draft.phone.trim() || null, role: draft.role, station_id: station, active: draft.active }));
  }

  protected reset(user: StaffUser): void {
    const password = temporaryPassword();
    this.run(this.api.resetPassword(user.id, password), () => this.issued.set({ username: user.username, password }));
  }

  private create(): void {
    const role = this.newRole();
    const station = needsStation(role) ? this.newStation() : null;
    if (needsStation(role) && station === null) {
      this.action.error.set('station-required');
      return;
    }
    const { username, full_name, phone } = this.newUser();
    const login = username.trim().toLowerCase();
    const password = temporaryPassword();
    this.run(this.api.createUser({ username: login, full_name: full_name.trim(), phone: phone || null, role, station_id: station, temporary_password: password }), () => {
      this.issued.set({ username: login, password });
      this.newUser.set({ username: '', full_name: '', phone: '' });
      this.createForm().reset();
    });
  }

  /** Après chaque modification, le compte est relu du serveur : son brouillon repart de cette version. */
  private run(request: Observable<StaffUser>, done?: () => void): void {
    this.action.run(request, (user) => {
      this.drafts.update((all) => {
        const rest = { ...all };
        delete rest[user.id];
        return rest;
      });
      done?.();
      this.list.reload();
    });
  }
}
