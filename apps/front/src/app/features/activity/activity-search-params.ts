import { Params } from '@angular/router';
import { ACTIVITY_CATEGORIES, IActivitySearch, TActivityCategory } from 'models';

/**
 * Critères de recherche d'activités dans l'URL de `/activities/search` : `city` (identifiant GeoNames : la ville et
 * 100 km autour) ou `country` (code ISO), `category`,
 * `q` (texte), `page` (à partir de 1 dans l'URL, de 0 pour l'API). Valeur invalide : ignorée.
 */
export function fromActivityQueryParams(params: Params): IActivitySearch {
  const city = Number(params['city']);
  const country = typeof params['country'] === 'string' ? params['country'].toUpperCase() : '';
  const category = params['category'] as TActivityCategory;
  const page = Number(params['page']);
  return {
    city_id: Number.isInteger(city) && city > 0 ? city : null,
    country: /^[A-Z]{2}$/.test(country) ? country : null,
    category: ACTIVITY_CATEGORIES.includes(category) ? category : null,
    q: typeof params['q'] === 'string' ? params['q'].slice(0, 100) : '',
    page: Number.isInteger(page) && page > 1 ? page - 1 : 0,
  };
}

export function toActivityQueryParams(search: IActivitySearch): Params {
  return {
    city: search.city_id ?? undefined,
    country: search.city_id === null ? (search.country ?? undefined) : undefined,
    category: search.category ?? undefined,
    q: search.q.trim() || undefined,
    page: search.page > 0 ? search.page + 1 : undefined,
  };
}
