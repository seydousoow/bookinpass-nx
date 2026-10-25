const KEY = 'bo.lang';

export type BackofficeLang = 'fr' | 'en';

/** Langue choisie sur cet appareil (français par défaut) ; stockage bloqué : français. */
export function savedLang(): BackofficeLang {
  try {
    return localStorage.getItem(KEY) === 'en' ? 'en' : 'fr';
  } catch {
    return 'fr';
  }
}

export function saveLang(lang: BackofficeLang): void {
  try {
    localStorage.setItem(KEY, lang);
  } catch {
    // Stockage bloqué : la langue vaut pour la session seulement.
  }
}
