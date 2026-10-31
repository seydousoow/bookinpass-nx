import { ActivityDetail, ActivityForm, ItineraryStop } from '../../core/models';

/** Listes de textes de la fiche, saisies une ligne par élément. */
export const LIST_KEYS = ['highlights', 'includes', 'excludes', 'not_allowed', 'know_before'] as const;
export type ListKey = (typeof LIST_KEYS)[number];

export function emptyActivity(): ActivityForm {
  return {
    title: '',
    slug: '',
    city_id: null,
    category: 'tour',
    provider_name: '',
    summary: '',
    description: '',
    highlights: [],
    includes: [],
    excludes: [],
    not_allowed: [],
    know_before: [],
    itinerary: [],
    images: [],
    meeting_point: '',
    latitude: null,
    longitude: null,
    duration_min_minutes: 60,
    duration_max_minutes: null,
    free_cancellation_hours: 24,
    currency: 'XOF',
  };
}

/** Saisie à partir de la fiche enregistrée (copies modifiables). */
export function activityForm(activity: ActivityDetail): ActivityForm {
  return {
    title: activity.title,
    slug: activity.slug,
    city_id: activity.city.id,
    category: activity.category,
    provider_name: activity.provider_name,
    summary: activity.summary,
    description: activity.description,
    highlights: [...activity.highlights],
    includes: [...activity.includes],
    excludes: [...activity.excludes],
    not_allowed: [...activity.not_allowed],
    know_before: [...activity.know_before],
    itinerary: activity.itinerary.map((stop) => ({ ...stop })),
    images: activity.images.map((image) => ({ ...image })),
    meeting_point: activity.meeting_point,
    latitude: activity.latitude,
    longitude: activity.longitude,
    duration_min_minutes: activity.duration_min_minutes,
    duration_max_minutes: activity.duration_max_minutes,
    free_cancellation_hours: activity.free_cancellation_hours,
    currency: activity.currency,
  };
}

/** Lignes d'une zone de texte : une par élément, sans lignes vides. */
export function lines(text: string | null): string[] {
  return (text ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

export function emptyStop(): ItineraryStop {
  return { name: '', kind: 'visit', duration_minutes: null, optional: false, description: null };
}

/** Ce qui manque pour enregistrer la fiche (clés de traduction sous `activity.missing`). */
export function missing(form: ActivityForm): string[] {
  const checks: readonly [boolean, string][] = [
    [!form.title.trim(), 'title'],
    [form.city_id === null, 'city'],
    [!form.provider_name.trim(), 'provider'],
    [!form.summary.trim(), 'summary'],
    [!form.description.trim(), 'description'],
    [!form.meeting_point.trim(), 'meeting-point'],
    [!form.duration_min_minutes || form.duration_min_minutes < 1, 'duration'],
    [(form.latitude === null) !== (form.longitude === null), 'location'],
    [form.images.some((image) => !/^https:\/\/\S+$/.test(image.url.trim())), 'images'],
    [form.itinerary.some((stop) => !stop.name.trim()), 'itinerary'],
  ];
  return checks.filter(([failed]) => failed).map(([, key]) => key);
}

/** Corps envoyé : textes nettoyés, étapes et photos vides retirées. */
export function payload(form: ActivityForm): ActivityForm {
  return {
    ...form,
    title: form.title.trim(),
    slug: form.slug.trim(),
    provider_name: form.provider_name.trim(),
    summary: form.summary.trim(),
    description: form.description.trim(),
    meeting_point: form.meeting_point.trim(),
    itinerary: form.itinerary.map((stop) => ({ ...stop, name: stop.name.trim(), description: stop.description?.trim() || null })),
    images: form.images.map((image) => ({ url: image.url.trim(), alt: image.alt?.trim() || null })).filter((image) => image.url),
  };
}
