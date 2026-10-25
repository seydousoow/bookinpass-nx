import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { APP_CONFIG } from 'configs/configs/app-config.token';
import {
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
}
