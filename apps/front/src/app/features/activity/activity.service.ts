import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { TranslocoService } from '@jsverse/transloco';
import { APP_CONFIG } from 'configs';
import { ICheckoutSession, IPayDunyaPayment, IPayDunyaStep, IPaymentMethods } from 'payment';
import {
  IActivityBooking,
  IActivityCard,
  IActivityDestination,
  IActivityDetail,
  IActivityReview,
  IActivityReviewForm,
  IActivitySearch,
  IActivitySlot,
  IPage,
  TActivityReviewSort,
} from 'models';

/** Places bloquées le temps du paiement, et la session Stripe à afficher. */
export interface IActivityHold {
  readonly reference: string;
  readonly hold_expires_at: string;
  readonly checkout: ICheckoutSession;
}

export interface IActivityHoldRequest {
  /** Choisi avant l'envoi et rejoué tel quel : un nouvel essai retrouve la même réservation. */
  readonly request_id: string;
  readonly slot_id: number;
  readonly adults: number;
  readonly children: number;
  readonly given_name: string;
  readonly family_name: string;
  readonly email: string;
  readonly phone: string;
  readonly return_path: string;
}

/** Activités : recherche, page, disponibilités, avis ; réservation payée, bon d'échange, annulation, avis du voyageur. */
@Injectable({ providedIn: 'root' })
export class ActivityService {
  private readonly http = inject(HttpClient);
  private readonly url = `${inject(APP_CONFIG).apiBaseUrl}/activities`;
  private readonly transloco = inject(TranslocoService);

  destinations(): Observable<IActivityDestination[]> {
    return this.http.get<IActivityDestination[]>(`${this.url}/destinations`);
  }

  search(search: IActivitySearch, size = 12): Observable<IPage<IActivityCard>> {
    const params: Record<string, string | number> = { page: search.page, size };
    if (search.city_id !== null) {
      params['city_id'] = search.city_id;
    }
    if (search.category) {
      params['category'] = search.category;
    }
    if (search.q.trim()) {
      params['q'] = search.q.trim();
    }
    return this.http.get<IPage<IActivityCard>>(this.url, { params });
  }

  detail(slug: string): Observable<IActivityDetail> {
    return this.http.get<IActivityDetail>(`${this.url}/${encodeURIComponent(slug)}`);
  }

  /** Dates (`YYYY-MM-DD`, fuseau de l'activité) d'un mois `YYYY-MM` où il reste assez de places. */
  dates(slug: string, month: string, participants: number): Observable<string[]> {
    return this.http.get<string[]>(`${this.url}/${encodeURIComponent(slug)}/dates`, { params: { month, participants } });
  }

  availability(slug: string, date: string, participants: number): Observable<IActivitySlot[]> {
    return this.http.get<IActivitySlot[]>(`${this.url}/${encodeURIComponent(slug)}/availability`, { params: { date, participants } });
  }

  reviews(slug: string, page: number, sort: TActivityReviewSort, rating: number, query: string, size = 5): Observable<IPage<IActivityReview>> {
    const params: Record<string, string | number> = { page, size, sort, rating };
    if (query.trim()) {
      params['q'] = query.trim();
    }
    return this.http.get<IPage<IActivityReview>>(`${this.url}/${encodeURIComponent(slug)}/reviews`, { params });
  }

  markHelpful(id: number): Observable<void> {
    return this.http.post<void>(`${this.url}/reviews/${id}/helpful`, null);
  }

  paymentMethods(): Observable<IPaymentMethods> {
    return this.http.get<IPaymentMethods>(`${this.url}/payment-methods`);
  }

  hold(request: IActivityHoldRequest): Observable<IActivityHold> {
    return this.http.post<IActivityHold>(`${this.url}/bookings`, { ...request, locale: this.transloco.getActiveLang() });
  }

  /** Paiement autorisé : places vendues, paiement encaissé, bon d'échange envoyé. Rejouable. */
  confirm(reference: string, checkoutSessionId: string): Observable<IActivityBooking> {
    return this.http.post<IActivityBooking>(`${this.url}/bookings/${encodeURIComponent(reference)}/confirmation`, {
      checkout_session_id: checkoutSessionId,
    });
  }

  /** Paiement PayDunya depuis notre page (corps JSON, HTTPS) ; la session de carte Stripe est fermée. */
  mobilePayment(reference: string, payment: IPayDunyaPayment, returnPath: string): Observable<IPayDunyaStep> {
    return this.http.post<IPayDunyaStep>(`${this.url}/bookings/${encodeURIComponent(reference)}/mobile-payment`, { ...payment, return_path: returnPath });
  }

  confirmMobile(reference: string): Observable<IActivityBooking> {
    return this.http.post<IActivityBooking>(`${this.url}/bookings/${encodeURIComponent(reference)}/mobile-payment/confirmation`, null);
  }

  booking(reference: string, lastName: string): Observable<IActivityBooking> {
    return this.http.get<IActivityBooking>(`${this.url}/bookings/${encodeURIComponent(reference)}`, { params: { last_name: lastName } });
  }

  cancel(reference: string, lastName: string): Observable<IActivityBooking> {
    return this.http.post<IActivityBooking>(`${this.url}/bookings/${encodeURIComponent(reference)}/cancellation`, { last_name: lastName });
  }

  review(reference: string, lastName: string, review: IActivityReviewForm): Observable<IActivityBooking> {
    return this.http.post<IActivityBooking>(`${this.url}/bookings/${encodeURIComponent(reference)}/review`, { ...review, last_name: lastName });
  }
}
