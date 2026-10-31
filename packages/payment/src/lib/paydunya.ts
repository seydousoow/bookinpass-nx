/** Moyen PayDunya proposé par le serveur (`GET …/payment-methods`). */
export interface IPayDunyaMethod {
  readonly id: string;
  /** Code ISO du pays du numéro ; absent pour la carte PayDunya. */
  readonly country: string | null;
  /** Indicatif imposé, sans `+` ; absent pour la carte PayDunya. */
  readonly dial_code: string | null;
  /** Code de paiement à saisir avec le numéro (Orange Money Côte d'Ivoire, Burkina Faso). */
  readonly otp: boolean;
}

/** Moyens de paiement d'une réservation : carte Stripe, moyens PayDunya. */
export interface IPaymentMethods {
  readonly card: boolean;
  readonly methods: readonly IPayDunyaMethod[];
}

/** Paiement saisi sur notre page, envoyé en JSON (HTTPS) au serveur, qui revérifie tout. */
export interface IPayDunyaPayment {
  readonly method: string;
  /** Numéro national, sans indicatif. */
  readonly phone: string | null;
  readonly otp: string | null;
}

/**
 * Suite du paiement : `redirect` (ouvrir `url`), `qr` (QR code à `url`, applications Orange Money / Max it), `otp`
 * (code accepté), `phone` (valider sur le téléphone). `status` : la réservation à la réponse.
 */
export interface IPayDunyaStep {
  readonly step: 'redirect' | 'qr' | 'otp' | 'phone';
  readonly url?: string;
  readonly om_url?: string;
  readonly maxit_url?: string;
  readonly status?: string;
}

/** Erreurs du serveur que le client corrige lui-même dans le formulaire. */
export const PAYDUNYA_FORM_ERRORS = ['invalid-phone', 'otp-required', 'payment-refused', 'too-many-attempts', 'unknown-payment-method'];

/**
 * Numéros nationaux de mobile par pays (même règle que le serveur, qui seul décide) ; Orange Money au Sénégal et en
 * Côte d'Ivoire n'accepte que ses puces.
 */
const MOBILE: Record<string, RegExp> = {
  SN: /^7[05678]\d{7}$/,
  CI: /^0[157]\d{8}$/,
  BF: /^[567]\d{7}$/,
  ML: /^[5-9]\d{7}$/,
};
const OPERATOR: Record<string, RegExp> = {
  'orange-money-senegal': /^7[78]\d{7}$/,
  'orange-money-ci': /^07\d{8}$/,
};

/** Numéro national nettoyé (espaces, points, tirets, indicatif du pays collé), ou `null` s'il ne convient pas. */
export function nationalNumber(method: IPayDunyaMethod, input: string): string | null {
  if (!method.country || !method.dial_code) {
    return null;
  }
  let digits = input.replace(/[\s.\-()]/g, '');
  if (digits.startsWith(`+${method.dial_code}`)) {
    digits = digits.slice(method.dial_code.length + 1);
  } else if (digits.startsWith(`00${method.dial_code}`)) {
    digits = digits.slice(method.dial_code.length + 2);
  }
  const ok = MOBILE[method.country]?.test(digits) && (OPERATOR[method.id]?.test(digits) ?? true);
  return ok ? digits : null;
}
