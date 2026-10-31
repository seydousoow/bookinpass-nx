import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONFIG } from 'configs/configs/app-config.token';
import {
  ActivityBooking,
  ActivityBookingDetail,
  ActivityCity,
  ActivityDetail,
  ActivityForm,
  ActivityOptionForm,
  ActivityRefund,
  ActivityReview,
  ActivitySettings,
  ActivitySlot,
  ActivitySlotsForm,
  ActivityStatus,
  ActivitySummary,
  Page,
  Departure,
  DepartureDetail,
  DeskBooking,
  Incident,
  IncidentType,
  Luggage,
  LuggageForm,
  Network,
  Refund,
  Route,
  StaffUser,
  StaffUserForm,
  Station,
  TicketCheck,
} from './models';

/** Paramètres de filtre : la gare n'est envoyée que si elle est choisie. */
function withStation(params: Record<string, string>, stationId: number | null): Record<string, string> {
  return stationId === null ? params : { ...params, station_id: String(stationId) };
}

/** Appels du back-office (`/staff/**`). Le cookie de session accompagne chaque requête (intercepteur). */
@Injectable({ providedIn: 'root' })
export class StaffApi {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(APP_CONFIG).apiBaseUrl}/staff`;

  me(): Observable<StaffUser> {
    return this.http.get<StaffUser>(`${this.url}/auth/me`);
  }

  login(username: string, password: string): Observable<StaffUser> {
    return this.http.post<StaffUser>(`${this.url}/auth/login`, { username, password });
  }

  logout(): Observable<void> {
    return this.http.post<void>(`${this.url}/auth/logout`, null);
  }

  changePassword(current: string, next: string): Observable<StaffUser> {
    return this.http.post<StaffUser>(`${this.url}/auth/password`, { current_password: current, new_password: next });
  }

  stations(): Observable<Station[]> {
    return this.http.get<Station[]>(`${this.url}/stations`);
  }

  departures(date: string, stationId: number | null): Observable<Departure[]> {
    return this.http.get<Departure[]>(`${this.url}/departures`, { params: withStation({ date }, stationId) });
  }

  departure(id: number): Observable<DepartureDetail> {
    return this.http.get<DepartureDetail>(`${this.url}/departures/${id}`);
  }

  markDeparted(id: number): Observable<DepartureDetail> {
    return this.http.post<DepartureDetail>(`${this.url}/departures/${id}/departed`, null);
  }

  markArrived(id: number): Observable<DepartureDetail> {
    return this.http.post<DepartureDetail>(`${this.url}/departures/${id}/arrived`, null);
  }

  resize(id: number, capacity: number): Observable<DepartureDetail> {
    return this.http.patch<DepartureDetail>(`${this.url}/departures/${id}`, { capacity });
  }

  scanTicket(code: string): Observable<TicketCheck> {
    return this.http.post<TicketCheck>(`${this.url}/tickets/${encodeURIComponent(code)}/scan`, null);
  }

  registerLuggage(departureId: number, form: LuggageForm): Observable<Luggage> {
    return this.http.post<Luggage>(`${this.url}/departures/${departureId}/luggage`, form);
  }

  luggage(date: string, stationId: number | null): Observable<Luggage[]> {
    return this.http.get<Luggage[]>(`${this.url}/luggage`, { params: withStation({ date }, stationId) });
  }

  findLuggage(code: string): Observable<Luggage> {
    return this.http.get<Luggage>(`${this.url}/luggage/${encodeURIComponent(code)}`);
  }

  deliverLuggage(code: string): Observable<Luggage> {
    return this.http.post<Luggage>(`${this.url}/luggage/${encodeURIComponent(code)}/delivered`, null);
  }

  incidents(open: boolean, stationId: number | null): Observable<Incident[]> {
    return this.http.get<Incident[]>(`${this.url}/incidents`, { params: withStation({ open: String(open) }, stationId) });
  }

  reportIncident(report: { departure_id: number | null; route_id: number | null; type: IncidentType; description: string }): Observable<Incident> {
    return this.http.post<Incident>(`${this.url}/incidents`, report);
  }

  resolveIncident(id: number, resolution: string): Observable<Incident> {
    return this.http.post<Incident>(`${this.url}/incidents/${id}/resolve`, { resolution });
  }

  routes(): Observable<Route[]> {
    return this.http.get<Route[]>(`${this.url}/routes`);
  }

  createRoute(route: { origin_station_id: number; destination_station_id: number; network: Network; price: number; capacity: number }): Observable<Route> {
    return this.http.post<Route>(`${this.url}/routes`, route);
  }

  updateRoute(id: number, route: { price: number; capacity: number; active: boolean }): Observable<Route> {
    return this.http.patch<Route>(`${this.url}/routes/${id}`, route);
  }

  addSchedule(routeId: number, schedule: { days: number[]; departs_at: string; last_departure: string | null }): Observable<Route> {
    return this.http.post<Route>(`${this.url}/routes/${routeId}/schedules`, schedule);
  }

  deleteSchedule(id: number): Observable<Route> {
    return this.http.delete<Route>(`${this.url}/schedules/${id}`);
  }

  users(): Observable<StaffUser[]> {
    return this.http.get<StaffUser[]>(`${this.url}/users`);
  }

  createUser(form: StaffUserForm): Observable<StaffUser> {
    return this.http.post<StaffUser>(`${this.url}/users`, form);
  }

  updateUser(id: number, form: StaffUserForm): Observable<StaffUser> {
    return this.http.patch<StaffUser>(`${this.url}/users/${id}`, form);
  }

  resetPassword(id: number, temporaryPassword: string): Observable<StaffUser> {
    return this.http.post<StaffUser>(`${this.url}/users/${id}/password`, { temporary_password: temporaryPassword });
  }

  /** Guichet : référence, téléphone ou nom de famille d'un passager. */
  searchBookings(query: string): Observable<DeskBooking[]> {
    return this.http.get<DeskBooking[]>(`${this.url}/bookings`, { params: { q: query } });
  }

  resendTickets(reference: string): Observable<DeskBooking> {
    return this.http.post<DeskBooking>(`${this.url}/bookings/${encodeURIComponent(reference)}/resend`, null);
  }

  refunds(all: boolean): Observable<Refund[]> {
    return this.http.get<Refund[]>(`${this.url}/refunds`, { params: { all: String(all) } });
  }

  markRefunded(id: number, note: string): Observable<Refund> {
    return this.http.post<Refund>(`${this.url}/refunds/${id}/refunded`, { note });
  }

  /** Villes GeoNames (2 lettres au moins), pour placer une activité. */
  cities(query: string): Observable<{ city: ActivityCity; population: number }[]> {
    return this.http.get<{ city: ActivityCity; population: number }[]>(`${this.url}/cities`, { params: { q: query } });
  }

  activities(): Observable<ActivitySummary[]> {
    return this.http.get<ActivitySummary[]>(`${this.url}/activities`);
  }

  activity(id: number): Observable<ActivityDetail> {
    return this.http.get<ActivityDetail>(`${this.url}/activities/${id}`);
  }

  createActivity(form: ActivityForm): Observable<ActivityDetail> {
    return this.http.post<ActivityDetail>(`${this.url}/activities`, form);
  }

  updateActivity(id: number, form: ActivityForm): Observable<ActivityDetail> {
    return this.http.put<ActivityDetail>(`${this.url}/activities/${id}`, form);
  }

  activityStatus(id: number, status: ActivityStatus): Observable<ActivityDetail> {
    return this.http.post<ActivityDetail>(`${this.url}/activities/${id}/status`, { status });
  }

  addOption(activityId: number, form: ActivityOptionForm): Observable<ActivityDetail> {
    return this.http.post<ActivityDetail>(`${this.url}/activities/${activityId}/options`, form);
  }

  updateOption(id: number, form: ActivityOptionForm): Observable<ActivityDetail> {
    return this.http.put<ActivityDetail>(`${this.url}/activity-options/${id}`, form);
  }

  /** Créneaux d'une option, du jour `from` au jour `to` (3 mois au plus). */
  slots(optionId: number, from: string, to: string): Observable<ActivitySlot[]> {
    return this.http.get<ActivitySlot[]>(`${this.url}/activity-options/${optionId}/slots`, { params: { from, to } });
  }

  openSlots(optionId: number, form: ActivitySlotsForm): Observable<{ created: number }> {
    return this.http.post<{ created: number }>(`${this.url}/activity-options/${optionId}/slots`, form);
  }

  resizeSlot(id: number, capacity: number): Observable<ActivitySlot> {
    return this.http.patch<ActivitySlot>(`${this.url}/activity-slots/${id}`, { capacity });
  }

  deleteSlot(id: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/activity-slots/${id}`);
  }

  /** Créneau annulé : chaque réservation payée est annulée et remboursée en entier. */
  cancelSlot(id: number, reason: string): Observable<{ cancelled: number }> {
    return this.http.post<{ cancelled: number }>(`${this.url}/activity-slots/${id}/cancel`, { reason });
  }

  summarizeReviews(activityId: number): Observable<ActivityDetail> {
    return this.http.post<ActivityDetail>(`${this.url}/activities/${activityId}/review-summary`, null);
  }

  activityBookings(filter: { q: string; status: string; activity_id: number | null; from: string; to: string; page: number }): Observable<Page<ActivityBooking>> {
    const params: Record<string, string | number> = { page: filter.page, size: 25 };
    for (const key of ['q', 'status', 'from', 'to'] as const) {
      if (filter[key]) {
        params[key] = filter[key];
      }
    }
    if (filter.activity_id !== null) {
      params['activity_id'] = filter.activity_id;
    }
    return this.http.get<Page<ActivityBooking>>(`${this.url}/activity-bookings`, { params });
  }

  activityBooking(reference: string): Observable<ActivityBookingDetail> {
    return this.http.get<ActivityBookingDetail>(`${this.url}/activity-bookings/${encodeURIComponent(reference)}`);
  }

  cancelActivityBooking(reference: string, reason: string, refundAmount: number): Observable<ActivityBookingDetail> {
    return this.http.post<ActivityBookingDetail>(`${this.url}/activity-bookings/${encodeURIComponent(reference)}/cancel`, {
      reason,
      refund_amount: refundAmount,
    });
  }

  refundActivityBooking(reference: string, amount: number, reason: string): Observable<ActivityBookingDetail> {
    return this.http.post<ActivityBookingDetail>(`${this.url}/activity-bookings/${encodeURIComponent(reference)}/refunds`, { amount, reason });
  }

  activityRefunds(all: boolean): Observable<ActivityRefund[]> {
    return this.http.get<ActivityRefund[]>(`${this.url}/activity-refunds`, { params: { all: String(all) } });
  }

  markActivityRefunded(id: number, note: string): Observable<ActivityRefund> {
    return this.http.post<ActivityRefund>(`${this.url}/activity-refunds/${id}/refunded`, { note });
  }

  retryActivityRefund(id: number): Observable<void> {
    return this.http.post<void>(`${this.url}/activity-refunds/${id}/retry`, null);
  }

  reviews(status: string, activityId: number | null, page: number): Observable<Page<ActivityReview>> {
    const params: Record<string, string | number> = { status, page, size: 20 };
    if (activityId !== null) {
      params['activity_id'] = activityId;
    }
    return this.http.get<Page<ActivityReview>>(`${this.url}/activity-reviews`, { params });
  }

  approveReview(id: number): Observable<ActivityReview> {
    return this.http.post<ActivityReview>(`${this.url}/activity-reviews/${id}/approve`, null);
  }

  rejectReview(id: number, reason: string): Observable<ActivityReview> {
    return this.http.post<ActivityReview>(`${this.url}/activity-reviews/${id}/reject`, { reason });
  }

  /** Nouvel avis de Claude sur un avis en attente. */
  moderateReview(id: number): Observable<ActivityReview> {
    return this.http.post<ActivityReview>(`${this.url}/activity-reviews/${id}/moderate`, null);
  }

  activitySettings(): Observable<ActivitySettings> {
    return this.http.get<ActivitySettings>(`${this.url}/activity-settings`);
  }

  updateActivitySettings(autoModeration: boolean): Observable<ActivitySettings> {
    return this.http.put<ActivitySettings>(`${this.url}/activity-settings`, { auto_moderation: autoModeration });
  }
}
