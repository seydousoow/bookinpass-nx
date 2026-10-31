export const ACTIVITY_STEPS = ['details', 'pay', 'done'] as const;
export type TActivityStep = (typeof ACTIVITY_STEPS)[number];

export interface IActivityContact {
  given_name: string;
  family_name: string;
  email: string;
  phone: string;
}

/**
 * Réservation d'activité en cours, relue après un rechargement ou au retour d'un moyen de paiement à redirection
 * (l'URL de retour ne garde pas le créneau choisi). `sessionStorage` : propre à l'onglet, effacé à sa fermeture.
 * `requestId` est rejoué tel quel : la même demande retrouve les mêmes places et la même session de paiement.
 */
export interface IActivityDraft {
  readonly activity: string;
  readonly slot: number;
  readonly date: string;
  readonly adults: number;
  readonly children: number;
  readonly requestId: string;
  readonly contact: IActivityContact;
  /** Réservation dont les places sont bloquées. */
  readonly reference: string | null;
}

const KEY = 'bip.activity-checkout';

export function loadActivityDraft(): IActivityDraft | null {
  try {
    const raw = sessionStorage.getItem(KEY);
    const draft = raw ? (JSON.parse(raw) as Partial<IActivityDraft>) : null;
    if (!draft?.activity || !draft.slot || !draft.requestId || !draft.contact) {
      return null;
    }
    return draft as IActivityDraft;
  } catch {
    return null;
  }
}

export function saveActivityDraft(draft: IActivityDraft): void {
  try {
    sessionStorage.setItem(KEY, JSON.stringify(draft));
  } catch {
    // Stockage plein ou bloqué : la page marche sans, on perd juste la reprise.
  }
}

export function clearActivityDraft(): void {
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    // Stockage bloqué : rien à effacer.
  }
}
