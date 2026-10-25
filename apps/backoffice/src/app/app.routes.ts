import { Route } from '@angular/router';
import { passwordGuard, roleGuard, signedInGuard } from './core/session';
import { StaffRole } from './core/models';

/** Rôles des sections réservées ; le menu de l'en-tête s'en sert aussi. */
export const MANAGERS: readonly StaffRole[] = ['admin', 'manager'];
export const CHIEFS: readonly StaffRole[] = ['admin', 'manager', 'station_chief'];

/** Pages du back-office ; réseau, remboursements et personnel réservés aux responsables (admin, manager). */
export const appRoutes: Route[] = [
  { path: 'login', loadComponent: () => import('./pages/login').then((m) => m.LoginPage) },
  { path: 'password', canActivate: [passwordGuard], loadComponent: () => import('./pages/password').then((m) => m.PasswordPage) },
  {
    path: '',
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./pages/departures/departures').then((m) => m.DeparturesPage) },
      { path: 'departures/:id', loadComponent: () => import('./pages/departure/departure').then((m) => m.DeparturePage) },
      { path: 'scan', loadComponent: () => import('./pages/scan').then((m) => m.ScanPage) },
      { path: 'luggage', canActivate: [roleGuard], data: { roles: CHIEFS }, loadComponent: () => import('./pages/luggage').then((m) => m.LuggagePage) },
      { path: 'incidents', loadComponent: () => import('./pages/incidents').then((m) => m.IncidentsPage) },
      { path: 'bookings', loadComponent: () => import('./pages/bookings').then((m) => m.BookingsPage) },
      { path: 'refunds', canActivate: [roleGuard], data: { roles: MANAGERS }, loadComponent: () => import('./pages/refunds').then((m) => m.RefundsPage) },
      { path: 'routes', canActivate: [roleGuard], data: { roles: MANAGERS }, loadComponent: () => import('./pages/routes').then((m) => m.RoutesPage) },
      { path: 'staff', canActivate: [roleGuard], data: { roles: MANAGERS }, loadComponent: () => import('./pages/staff').then((m) => m.StaffPage) },
    ],
  },
  { path: '**', redirectTo: '' },
];
