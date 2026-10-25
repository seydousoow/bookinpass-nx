import { signal } from '@angular/core';
import { finalize, Observable } from 'rxjs';
import { apiErrorCode } from 'utils';

/**
 * Action d'une page envoyée à l'API : une seule à la fois (`busy`), et le code d'erreur de la dernière (`error`),
 * traduit par la page (`errors.<code>`).
 */
export function createAction() {
  const busy = signal(false);
  const error = signal<string | null>(null);

  function run<T>(action: Observable<T>, done?: (value: T) => void): void {
    busy.set(true);
    error.set(null);
    action.pipe(finalize(() => busy.set(false))).subscribe({
      next: (value) => done?.(value),
      error: (failure: unknown) => error.set(apiErrorCode(failure)),
    });
  }

  return { busy: busy.asReadonly(), error, run };
}
