import { HttpErrorResponse } from '@angular/common/http';

/**
 * Code d'erreur stable renvoyé par l'API (`forbidden`, `capacity-too-low`…) dans le corps `{ code }`, à traduire par
 * l'application ; `network` sans réponse du serveur, `unexpected` pour tout le reste.
 */
export function apiErrorCode(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    return (error.error as { code?: string } | null)?.code ?? (error.status === 0 ? 'network' : 'unexpected');
  }
  return 'unexpected';
}
