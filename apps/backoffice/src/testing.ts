import { Type } from '@angular/core';
import { By } from '@angular/platform-browser';
import { Select } from 'components/select/select';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { TranslocoTestingModule } from '@jsverse/transloco';
import { Observable, of } from 'rxjs';
import { StaffApi } from './app/core/api';
import { Departure, StaffRole, StaffUser, Station } from './app/core/models';
import { Session } from './app/core/session';

/** StaffApi factice : chaque méthode est un jest.fn ; par défaut, les listes sont vides et les actions réussissent. */
export type StaffApiMock = { [K in keyof StaffApi]: jest.Mock<ReturnType<StaffApi[K]>, Parameters<StaffApi[K]>> };

const LISTS: readonly (keyof StaffApi)[] = [
  'stations',
  'departures',
  'luggage',
  'incidents',
  'routes',
  'users',
  'searchBookings',
  'refunds',
  'cities',
  'activities',
  'slots',
  'activityRefunds',
];

export function staffApiMock(overrides: Partial<{ [K in keyof StaffApi]: StaffApi[K] }> = {}): StaffApiMock {
  const mock = {} as Record<string, jest.Mock>;
  for (const name of Object.getOwnPropertyNames(StaffApi.prototype)) {
    if (name === 'constructor') {
      continue;
    }
    const fallback = (): Observable<unknown> => of(LISTS.includes(name as keyof StaffApi) ? [] : {});
    mock[name] = jest.fn(overrides[name as keyof StaffApi] ?? fallback);
  }
  return mock as unknown as StaffApiMock;
}

export const STATIONS: Station[] = [
  { id: 1, code: 'DKR', name: 'Gare des Baux maraîchers', place: 'Dakar', address: null, phone: null },
  { id: 2, code: 'THS', name: 'Gare routière', place: 'Thiès', address: null, phone: null },
];

export function staffUser(role: StaffRole, over: Partial<StaffUser> = {}): StaffUser {
  return {
    id: 1,
    username: 'awa',
    full_name: 'Awa Diop',
    phone: null,
    role,
    station: role === 'station_chief' || role === 'inspector' ? STATIONS[0] : null,
    active: true,
    must_change_password: false,
    last_login_at: null,
    ...over,
  };
}

export function departure(over: Partial<Departure> = {}): Departure {
  return {
    id: 3,
    route_id: 9,
    route_code: 'DKR-THS',
    origin: STATIONS[0],
    destination: STATIONS[1],
    departs_at: '2026-10-25T07:00:00Z',
    last_departure_at: null,
    capacity: 50,
    sold: 12,
    held: 2,
    passengers: 12,
    scanned: 4,
    luggage: 0,
    open_incidents: 0,
    departed_at: null,
    arrived_at: null,
    ...over,
  };
}

/**
 * Monte une page du back-office : Transloco sans traductions (les libellés s'affichent sous leur clé), routeur,
 * StaffApi factice et membre connecté.
 */
export async function renderPage<T>(page: Type<T>, options: { user?: StaffUser | null; api?: StaffApiMock; inputs?: Record<string, unknown> } = {}) {
  const api = options.api ?? staffApiMock();
  await TestBed.configureTestingModule({
    imports: [page, TranslocoTestingModule.forRoot({ langs: { fr: {} }, translocoConfig: { availableLangs: ['fr'], defaultLang: 'fr' } })],
    providers: [provideRouter([]), { provide: StaffApi, useValue: api }],
  }).compileComponents();
  TestBed.inject(Session).set(options.user === undefined ? staffUser('admin') : options.user);
  const navigate = jest.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
  const fixture: ComponentFixture<T> = TestBed.createComponent(page);
  for (const [name, value] of Object.entries(options.inputs ?? {})) {
    fixture.componentRef.setInput(name, value);
  }
  await settle(fixture);
  const element: HTMLElement = fixture.nativeElement;
  return { fixture, element, api, navigate, component: fixture.componentInstance, stable: () => settle(fixture) };
}

/** Laisse passer les réponses factices (souscriptions, ressources) puis la détection de changements. */
export async function settle(fixture: ComponentFixture<unknown>): Promise<void> {
  await fixture.whenStable();
  await new Promise((resolve) => setTimeout(resolve));
  await fixture.whenStable();
}

/** Saisie dans un champ natif (bip-input, bip-phone-input…). */
export function type(field: HTMLInputElement, value: string): void {
  field.value = value;
  field.dispatchEvent(new Event('input'));
}

/** Bouton par sa clé de libellé (Transloco de test : le texte affiché est la clé). */
export function button(element: HTMLElement, label: string): HTMLButtonElement {
  const found = [...element.querySelectorAll<HTMLButtonElement>('button')].find((b) => b.textContent?.trim() === label);
  if (!found) {
    throw new Error(`Bouton « ${label} » introuvable`);
  }
  return found;
}

/** Choisit une valeur dans le n-ième bip-select de la page, comme un clic sur l'option (valueChange émis). */
export function pick(fixture: ComponentFixture<unknown>, index: number, value: unknown): void {
  const select = fixture.debugElement.queryAll(By.directive(Select))[index].componentInstance as Select<unknown>;
  select.value.set([value]);
}

/** Options affichées par le n-ième bip-select de la page. */
export function optionsOf(fixture: ComponentFixture<unknown>, index: number): readonly { value: unknown; label: string }[] {
  return (fixture.debugElement.queryAll(By.directive(Select))[index].componentInstance as Select<unknown>).options();
}

/** Élément de la page, ou une erreur explicite s'il manque (plutôt qu'une assertion non nulle). */
export function get<T extends Element = HTMLElement>(root: ParentNode, selector: string): T {
  const found = root.querySelector<T>(selector);
  if (!found) {
    throw new Error(`Élément « ${selector} » introuvable`);
  }
  return found;
}
