import { Route } from '@angular/router';
import { passwordGuard, roleGuard, signedInGuard } from './core/session';
import { StaffRole } from './core/models';

/** Rôles des sections réservées ; le menu de l'en-tête s'en sert aussi. */
export const MANAGERS: readonly StaffRole[] = ['admin', 'manager'];
export const CHIEFS: readonly StaffRole[] = ['admin', 'manager', 'station_chief'];

/** Pages du back-office ; réseau, remboursements, personnel et activités réservés aux responsables (admin, manager). */
export const appRoutes: Route[] = [
  { path: 'login', loadComponent: () => import('./pages/login/login').then((m) => m.LoginPage) },
  { path: 'password', canActivate: [passwordGuard], loadComponent: () => import('./pages/password/password').then((m) => m.PasswordPage) },
  {
    path: '',
    canActivate: [signedInGuard],
    loadComponent: () => import('./pages/shell/shell').then((m) => m.Shell),
    children: [
      { path: '', pathMatch: 'full', loadComponent: () => import('./pages/departures/departures').then((m) => m.DeparturesPage) },
      { path: 'departures/:id', loadComponent: () => import('./pages/departure/departure').then((m) => m.DeparturePage) },
      { path: 'scan', loadComponent: () => import('./pages/scan/scan').then((m) => m.ScanPage) },
      { path: 'luggage', canActivate: [roleGuard], data: { roles: CHIEFS }, loadComponent: () => import('./pages/luggage/luggage').then((m) => m.LuggagePage) },
      { path: 'incidents', loadComponent: () => import('./pages/incidents/incidents').then((m) => m.IncidentsPage) },
      { path: 'bookings', loadComponent: () => import('./pages/bookings/bookings').then((m) => m.BookingsPage) },
      { path: 'refunds', canActivate: [roleGuard], data: { roles: MANAGERS }, loadComponent: () => import('./pages/refunds/refunds').then((m) => m.RefundsPage) },
      { path: 'routes', canActivate: [roleGuard], data: { roles: MANAGERS }, loadComponent: () => import('./pages/routes/routes').then((m) => m.RoutesPage) },
      { path: 'staff', canActivate: [roleGuard], data: { roles: MANAGERS }, loadComponent: () => import('./pages/staff/staff').then((m) => m.StaffPage) },
      { path: 'activities', canActivate: [roleGuard], data: { roles: MANAGERS }, loadComponent: () => import('./pages/activities/activities').then((m) => m.ActivitiesPage) },
      { path: 'activities/:id', canActivate: [roleGuard], data: { roles: MANAGERS }, loadComponent: () => import('./pages/activity/activity').then((m) => m.ActivityPage) },
      {
        path: 'activity-bookings',
        canActivate: [roleGuard],
        data: { roles: MANAGERS },
        loadComponent: () => import('./pages/activity-bookings/activity-bookings').then((m) => m.ActivityBookingsPage),
      },
      {
        path: 'activity-bookings/:reference',
        canActivate: [roleGuard],
        data: { roles: MANAGERS },
        loadComponent: () => import('./pages/activity-booking/activity-booking').then((m) => m.ActivityBookingPage),
      },
      {
        path: 'activity-reviews',
        canActivate: [roleGuard],
        data: { roles: MANAGERS },
        loadComponent: () => import('./pages/activity-reviews/activity-reviews').then((m) => m.ActivityReviewsPage),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
