/**
 * Activités touristiques (`/activities`). Heures en UTC ; chaque activité donne le fuseau IANA de sa ville
 * (`city.timezone`) : afficher ses créneaux avec `timeZone: city.timezone`. Montants décimaux en `currency`.
 */
export const ACTIVITY_CATEGORIES = ['tour', 'cruise', 'excursion', 'museum', 'outdoor', 'food', 'culture', 'water', 'other'] as const;
export type TActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export interface IActivityCity {
  readonly id: number;
  readonly name: string;
  readonly country_code: string;
  readonly timezone: string;
}

export interface IActivityImage {
  readonly url: string;
  readonly alt: string | null;
}

export type TItineraryStopKind = 'sightseeing' | 'visit' | 'transfer' | 'meal' | 'free_time' | 'other';

export interface IActivityItineraryStop {
  readonly name: string;
  readonly kind: TItineraryStopKind;
  readonly duration_minutes: number | null;
  readonly optional: boolean;
  readonly description: string | null;
}

/** Une page de résultats ; `page` commence à 0. */
export interface IPage<T> {
  readonly items: readonly T[];
  readonly page: number;
  readonly size: number;
  readonly total: number;
}

/** Activité dans une liste (recherche, « Vous aimerez aussi »). */
export interface IActivityCard {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly city: IActivityCity;
  readonly category: TActivityCategory;
  readonly image: IActivityImage | null;
  readonly duration_min_minutes: number;
  readonly duration_max_minutes: number | null;
  /** Moyenne sur 5 ; `null` sans avis. */
  readonly rating: number | null;
  readonly review_count: number;
  /** Prix adulte le plus bas ; `null` sans option en vente. */
  readonly price_from: string | null;
  readonly original_price: string | null;
  readonly currency: string;
  readonly free_cancellation: boolean;
}

export interface IActivityDestination {
  readonly city: IActivityCity;
  readonly activities: number;
}

export interface IActivityRating {
  readonly average: number | null;
  readonly count: number;
  /** Nombre d'avis par note : indice 0 = 1 étoile … indice 4 = 5 étoiles. */
  readonly distribution: readonly number[];
  readonly value: number | null;
  readonly service: number | null;
  readonly organization: number | null;
}

export interface IActivityReview {
  readonly id: number;
  readonly rating: number;
  readonly author_name: string;
  /** ISO 3166-1 alpha-2. */
  readonly country: string | null;
  readonly lang: string;
  readonly text: string;
  readonly created_at: string;
  readonly helpful_count: number;
}

export interface IActivityOption {
  readonly id: number;
  readonly title: string;
  readonly description: string | null;
  readonly price: string;
  readonly original_price: string | null;
  /** `null` : pas de tarif enfant (adultes seulement). */
  readonly child_price: string | null;
}

export interface IActivityDetail {
  readonly id: number;
  readonly slug: string;
  readonly title: string;
  readonly city: IActivityCity;
  readonly category: TActivityCategory;
  readonly provider_name: string;
  readonly summary: string;
  readonly description: string;
  readonly highlights: readonly string[];
  readonly includes: readonly string[];
  readonly excludes: readonly string[];
  readonly not_allowed: readonly string[];
  readonly know_before: readonly string[];
  readonly itinerary: readonly IActivityItineraryStop[];
  readonly images: readonly IActivityImage[];
  readonly meeting_point: string;
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly duration_min_minutes: number;
  readonly duration_max_minutes: number | null;
  /** Annulation gratuite jusqu'à N heures avant ; `null` : non remboursable. */
  readonly free_cancellation_hours: number | null;
  readonly currency: string;
  readonly options: readonly IActivityOption[];
  readonly price_from: string | null;
  readonly original_price: string | null;
  readonly rating: IActivityRating;
  /** « Ce qu'en disent les voyageurs », écrit par une IA ; `null` tant qu'il n'existe pas. */
  readonly review_summary: string | null;
  readonly review_summary_count: number | null;
  readonly featured_reviews: readonly IActivityReview[];
  readonly related: readonly IActivityCard[];
}

/** Créneau d'une option à une date. */
export interface IActivitySlot {
  readonly slot_id: number;
  readonly option_id: number;
  readonly starts_at: string;
  readonly remaining: number;
  /** Assez de places pour les participants demandés, et encore réservable. */
  readonly available: boolean;
}

export type TActivityReviewSort = 'recent' | 'rating_high' | 'rating_low' | 'helpful';

export interface IActivitySearch {
  readonly city_id: number | null;
  readonly category: TActivityCategory | null;
  readonly q: string;
  readonly page: number;
}

export interface IActivityParticipants {
  readonly adults: number;
  readonly children: number;
}

export type TActivityBookingStatus = 'held' | 'confirmed' | 'released' | 'cancelled';

/** Réservation vue par le voyageur : bon d'échange, annulation, avis. */
export interface IActivityBooking {
  readonly reference: string;
  readonly status: TActivityBookingStatus;
  readonly activity: {
    readonly slug: string;
    readonly title: string;
    readonly image: IActivityImage | null;
    readonly city: IActivityCity;
    readonly meeting_point: string;
    readonly provider_name: string;
  };
  readonly option_title: string;
  readonly starts_at: string;
  readonly adults: number;
  readonly children: number;
  readonly adult_price: string;
  readonly child_price: string | null;
  readonly total: string;
  readonly currency: string;
  readonly given_name: string;
  readonly family_name: string;
  readonly email: string;
  /** Fin de l'annulation gratuite ; `null` si non remboursable. */
  readonly cancellable_until: string | null;
  readonly cancellable: boolean;
  /** Déjà remboursé ou en cours ; « 0 » sinon. */
  readonly refunded: string;
  readonly cancel_reason: string | null;
  readonly can_review: boolean;
  readonly reviewed: boolean;
}

export interface IActivityReviewForm {
  rating: number;
  value_rating: number | null;
  service_rating: number | null;
  organization_rating: number | null;
  country: string | null;
  text: string;
}
