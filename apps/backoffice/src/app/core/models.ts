/**
 * Contrat de l'API du personnel (`/staff/**`). Propre au back-office : il ne partage pas les modèles du site (le
 * transport en bus côté voyageurs évoluera séparément). Heures en UTC, soit l'heure de Dakar (GMT toute l'année).
 */
export type StaffRole = 'admin' | 'manager' | 'station_chief' | 'inspector';

export interface Station {
  readonly id: number;
  readonly code: string;
  readonly name: string;
  /** Ville (ou aéroport) de la gare. */
  readonly place: string;
  readonly address: string | null;
  readonly phone: string | null;
}

export interface StaffUser {
  readonly id: number;
  readonly username: string;
  readonly full_name: string;
  readonly phone: string | null;
  readonly role: StaffRole;
  readonly station: Station | null;
  readonly active: boolean;
  readonly must_change_password: boolean;
  readonly last_login_at: string | null;
}

export interface Departure {
  readonly id: number;
  readonly route_id: number;
  readonly route_code: string;
  readonly origin: Station;
  readonly destination: Station;
  readonly departs_at: string;
  readonly last_departure_at: string | null;
  /** `null` : service continu, places non comptées. */
  readonly capacity: number | null;
  readonly sold: number;
  readonly held: number;
  readonly passengers: number;
  readonly scanned: number;
  readonly luggage: number;
  readonly open_incidents: number;
  readonly departed_at: string | null;
  readonly arrived_at: string | null;
}

export interface Passenger {
  readonly code: string;
  readonly given_name: string;
  readonly family_name: string;
  readonly reference: string;
  readonly phone: string;
  readonly scanned_at: string | null;
  readonly scanned_by: string | null;
}

export interface Luggage {
  readonly code: string;
  readonly departure_id: number;
  readonly origin: string;
  readonly destination: string;
  readonly departs_at: string;
  readonly sender_name: string;
  readonly sender_phone: string;
  readonly sender_id_number: string | null;
  readonly receiver_name: string;
  readonly receiver_phone: string;
  readonly description: string | null;
  readonly weight_kg: string;
  readonly price: string;
  readonly currency: string;
  readonly status: 'registered' | 'delivered';
  readonly registered_by: string;
  readonly created_at: string;
  readonly delivered_at: string | null;
}

export const INCIDENT_TYPES = ['delay', 'breakdown', 'accident', 'passenger', 'luggage', 'other'] as const;
export type IncidentType = (typeof INCIDENT_TYPES)[number];

export interface Incident {
  readonly id: number;
  readonly route_code: string;
  readonly origin: string;
  readonly destination: string;
  readonly departure_id: number | null;
  readonly departs_at: string | null;
  readonly type: IncidentType;
  readonly description: string;
  readonly reported_by: string;
  readonly reported_at: string;
  readonly resolved_at: string | null;
  readonly resolution: string | null;
}

export interface DepartureDetail {
  readonly departure: Departure;
  readonly passengers: readonly Passenger[];
  readonly luggage: readonly Luggage[];
  readonly incidents: readonly Incident[];
}

export type TicketStatus = 'valid' | 'scanned' | 'already_scanned' | 'not_paid' | 'wrong_day' | 'other_station' | 'unknown';

export interface TicketCheck {
  readonly status: TicketStatus;
  readonly code: string;
  readonly given_name: string | null;
  readonly family_name: string | null;
  readonly reference: string | null;
  readonly origin: string | null;
  readonly destination: string | null;
  readonly departs_at: string | null;
  readonly last_departure_at: string | null;
  readonly scanned_at: string | null;
  readonly scanned_by: string | null;
}

export interface Schedule {
  readonly id: number;
  /** 1 = lundi … 7 = dimanche. */
  readonly day_of_week: number;
  /** « 07:00 », heure de Dakar. */
  readonly departs_at: string;
  readonly last_departure: string | null;
}

export const NETWORKS = ['interurban', 'international', 'airport'] as const;
export type Network = (typeof NETWORKS)[number];

export interface Route {
  readonly id: number;
  readonly code: string;
  readonly network: Network;
  readonly origin: Station;
  readonly destination: Station;
  readonly price: string;
  readonly fee: string;
  readonly currency: string;
  readonly capacity: number;
  readonly active: boolean;
  readonly schedules: readonly Schedule[];
}

export interface DeskBooking {
  readonly reference: string;
  readonly status: 'held' | 'confirmed' | 'released';
  readonly origin: string;
  readonly destination: string;
  readonly departure_id: number;
  readonly departs_at: string;
  readonly email: string;
  readonly phone: string;
  readonly total: string;
  readonly currency: string;
  /** `card`, `mobile_money`, ou `null` : pas encore payée. */
  readonly payment_method: 'card' | 'mobile_money' | null;
  readonly payment_status: string | null;
  readonly created_at: string;
  readonly confirmed_at: string | null;
  readonly tickets: readonly { given_name: string; family_name: string; code: string | null; scanned_at: string | null }[];
}

/** Paiement mobile reçu après la revente des places : à rembourser à la main. */
export interface Refund {
  readonly id: number;
  readonly reference: string;
  readonly passengers: string;
  readonly email: string;
  readonly phone: string;
  readonly origin: string;
  readonly destination: string;
  readonly departs_at: string;
  readonly amount: string;
  readonly currency: string;
  readonly provider: string;
  readonly invoice_token: string;
  readonly receipt_url: string | null;
  readonly paid_at: string | null;
  readonly status: 'refund_needed' | 'refunded';
  readonly refunded_at: string | null;
  readonly refunded_by: string | null;
  readonly refund_note: string | null;
}

/** Saisie d'un membre du personnel (création ou mise à jour). */
export interface StaffUserForm {
  username?: string;
  full_name: string;
  phone: string | null;
  role: StaffRole;
  station_id: number | null;
  temporary_password?: string;
  active?: boolean;
}

/** Bagage enregistré au guichet sur un départ. */
export interface LuggageForm {
  sender_name: string;
  sender_phone: string;
  sender_id_number: string | null;
  receiver_name: string;
  receiver_phone: string;
  description: string | null;
  weight_kg: number;
  price: number;
}

/* Activités touristiques (`/staff/activities`, `/staff/activity-*`). Heures en UTC ; une activité donne le fuseau de sa
   ville (`city.timezone`). Montants décimaux en `currency`. */

export const ACTIVITY_STATUSES = ['draft', 'published', 'archived'] as const;
export type ActivityStatus = (typeof ACTIVITY_STATUSES)[number];
export const ACTIVITY_CATEGORIES = ['tour', 'cruise', 'excursion', 'museum', 'outdoor', 'food', 'culture', 'water', 'other'] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];
export const STOP_KINDS = ['sightseeing', 'visit', 'transfer', 'meal', 'free_time', 'other'] as const;
export type StopKind = (typeof STOP_KINDS)[number];

export interface ActivityCity {
  readonly id: number;
  readonly name: string;
  readonly country_code: string;
  readonly timezone: string;
}

export interface ActivityImage {
  url: string;
  alt: string | null;
}

export interface ItineraryStop {
  name: string;
  kind: StopKind;
  duration_minutes: number | null;
  optional: boolean;
  description: string | null;
}

export interface ActivityRating {
  readonly average: number | null;
  readonly count: number;
  /** Indice 0 = 1 étoile … indice 4 = 5 étoiles. */
  readonly distribution: readonly number[];
  readonly value: number | null;
  readonly service: number | null;
  readonly organization: number | null;
}

export interface ActivitySummary {
  readonly id: number;
  readonly slug: string;
  readonly status: ActivityStatus;
  readonly title: string;
  readonly city: ActivityCity;
  readonly category: ActivityCategory;
  readonly image: ActivityImage | null;
  readonly options: number;
  readonly rating: number | null;
  readonly review_count: number;
  readonly published_at: string | null;
  readonly updated_at: string;
}

export interface ActivityOption {
  readonly id: number;
  readonly title: string;
  readonly description: string | null;
  readonly price: string;
  readonly original_price: string | null;
  /** `null` : pas de tarif enfant. */
  readonly child_price: string | null;
  readonly capacity: number;
  readonly active: boolean;
}

/** Contenu modifiable d'une fiche (création et modification). */
export interface ActivityForm {
  title: string;
  /** Vide : tirée du titre. */
  slug: string;
  city_id: number | null;
  category: ActivityCategory;
  provider_name: string;
  summary: string;
  description: string;
  highlights: string[];
  includes: string[];
  excludes: string[];
  not_allowed: string[];
  know_before: string[];
  itinerary: ItineraryStop[];
  images: ActivityImage[];
  meeting_point: string;
  latitude: number | null;
  longitude: number | null;
  duration_min_minutes: number | null;
  duration_max_minutes: number | null;
  /** `null` : non remboursable. */
  free_cancellation_hours: number | null;
  currency: string;
}

export interface ActivityDetail extends Omit<ActivityForm, 'city_id' | 'slug'> {
  readonly id: number;
  readonly slug: string;
  readonly status: ActivityStatus;
  readonly city: ActivityCity;
  readonly options: readonly ActivityOption[];
  readonly rating: ActivityRating;
  /** Résumé des avis par Claude (en français). */
  readonly review_summary: string | null;
  readonly review_summary_count: number | null;
  readonly review_summary_at: string | null;
  readonly published_at: string | null;
}

export interface ActivityOptionForm {
  title: string;
  description: string | null;
  price: number;
  original_price: number | null;
  child_price: number | null;
  capacity: number;
  active: boolean;
}

export interface ActivitySlot {
  readonly id: number;
  readonly option_id: number;
  readonly starts_at: string;
  readonly capacity: number;
  readonly sold: number;
  readonly held: number;
  readonly cancelled_at: string | null;
  readonly cancel_reason: string | null;
}

export interface ActivitySlotsForm {
  from: string;
  to: string;
  /** 1 = lundi … 7 = dimanche. */
  days: number[];
  /** « 09:30 », heure locale de la ville. */
  times: string[];
  /** `null` : celle de l'option. */
  capacity: number | null;
}

export interface Page<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly total: number;
}

export const ACTIVITY_BOOKING_STATUSES = ['held', 'confirmed', 'released', 'cancelled'] as const;
export type ActivityBookingStatus = (typeof ACTIVITY_BOOKING_STATUSES)[number];

export interface ActivityBooking {
  readonly reference: string;
  readonly status: ActivityBookingStatus;
  readonly activity_id: number;
  readonly activity_title: string;
  readonly option_title: string;
  readonly starts_at: string;
  readonly timezone: string;
  readonly given_name: string;
  readonly family_name: string;
  readonly email: string;
  readonly phone: string;
  readonly adults: number;
  readonly children: number;
  readonly total: string;
  readonly currency: string;
  readonly payment_method: 'card' | 'mobile_money' | null;
  readonly payment_status: string | null;
  /** Remboursé ou en cours ; « 0 » sinon. */
  readonly refunded: string;
  readonly created_at: string;
}

export interface ActivityRefund {
  readonly id: number;
  readonly reference: string;
  readonly activity_title: string;
  readonly starts_at: string;
  readonly customer: string;
  readonly email: string;
  readonly phone: string;
  readonly method: 'card' | 'mobile_money';
  readonly amount: string;
  readonly currency: string;
  readonly status: 'pending' | 'refunded' | 'failed';
  readonly reason: string;
  readonly failure_reason: string | null;
  /** `null` : demandé par le client. */
  readonly requested_by: string | null;
  readonly refunded_by: string | null;
  readonly note: string | null;
  readonly created_at: string;
  readonly refunded_at: string | null;
}

export interface ActivityBookingDetail {
  readonly booking: ActivityBooking;
  readonly slot_id: number;
  readonly option_id: number;
  readonly lang: string;
  readonly adult_price: string;
  readonly child_price: string | null;
  readonly hold_expires_at: string;
  readonly confirmed_at: string | null;
  readonly released_at: string | null;
  readonly cancelled_at: string | null;
  readonly cancelled_by: string | null;
  readonly cancel_reason: string | null;
  readonly payment: {
    readonly method: 'card' | 'mobile_money';
    readonly status: string;
    readonly card_brand: string | null;
    readonly card_last4: string | null;
    readonly receipt_url: string | null;
    /** PaymentIntent Stripe ou jeton de facture PayDunya. */
    readonly reference: string | null;
  } | null;
  readonly refunds: readonly ActivityRefund[];
  /** Encore remboursable (payé moins remboursé). */
  readonly refundable: string;
  readonly review: { readonly id: number; readonly status: ReviewStatus; readonly rating: number } | null;
}

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export interface ActivityReview {
  readonly id: number;
  readonly activity_id: number;
  readonly activity_title: string;
  readonly reference: string;
  readonly rating: number;
  readonly value_rating: number | null;
  readonly service_rating: number | null;
  readonly organization_rating: number | null;
  readonly author_name: string;
  readonly country: string | null;
  readonly lang: string;
  readonly text: string;
  readonly status: ReviewStatus;
  /** Avis de Claude ; `null` s'il n'a pas encore lu l'avis. */
  readonly ai_verdict: 'approve' | 'reject' | 'review' | null;
  readonly ai_reason: string | null;
  readonly ai_categories: readonly string[];
  readonly ai_checked_at: string | null;
  /** `null` : décision automatique. */
  readonly moderated_by: string | null;
  readonly moderated_at: string | null;
  readonly rejection_reason: string | null;
  readonly created_at: string;
}

export interface ActivitySettings {
  readonly auto_moderation: boolean;
  readonly ai_enabled: boolean;
  readonly ai_model: string;
  readonly pending_reviews: number;
}
