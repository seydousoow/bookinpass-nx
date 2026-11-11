import { Component, DestroyRef, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { Router } from '@angular/router';
import { form, FormField, FormRoot, required } from '@angular/forms/signals';
import { TranslocoDirective } from '@jsverse/transloco';
import { Button } from 'components/button/button';
import { Input } from 'components/input/input';
import { Spinner } from 'components/spinner/spinner';
import { catchError, map, Observable, of, Subscription, timeout, timer } from 'rxjs';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { StaffUser } from '../../core/models';
import { Session, SESSION_CHECK_MS } from '../../core/session';
import { AuthLayout } from '../auth-layout/auth-layout';

/** État du serveur vu par la page : en cours de vérification, joignable, injoignable. */
export type ServerState = 'checking' | 'online' | 'offline';
/** Serveur injoignable : nouvel essai toutes les 15 secondes. */
export const SERVER_RETRY_MS = 15_000;

/** Moment de la journée à Dakar (GMT), pour l'accueil. */
export function greeting(now = new Date()): 'morning' | 'afternoon' | 'evening' {
  const hour = now.getUTCHours();
  return hour < 12 ? 'morning' : hour < 18 ? 'afternoon' : 'evening';
}

/**
 * Réponse de `/auth/me` traduite en état du serveur : 200 = joignable et session ouverte, 401 (ou autre refus) =
 * joignable sans session, erreur réseau, erreur 5xx ou délai dépassé = injoignable.
 */
export function serverState(me: Observable<StaffUser>): Observable<{ status: Exclude<ServerState, 'checking'>; user: StaffUser | null }> {
  return me.pipe(
    timeout(SESSION_CHECK_MS),
    map((user) => ({ status: 'online' as const, user: user?.id ? user : null })),
    catchError((error: unknown) =>
      of({ status: error instanceof HttpErrorResponse && error.status > 0 && error.status < 500 ? ('online' as const) : ('offline' as const), user: null }),
    ),
  );
}

/**
 * Connexion du personnel : identifiant et mot de passe ; 5 échecs de suite bloquent le compte 15 minutes. La page
 * s'affiche tout de suite, même serveur arrêté : la vérification du serveur (et d'une session déjà ouverte) se fait en
 * arrière-plan, avec un indicateur, et reprend seule tant que le serveur ne répond pas.
 */
@Component({
  selector: 'bo-login',
  imports: [TranslocoDirective, FormField, FormRoot, Button, Input, Spinner, AuthLayout],
  templateUrl: './login.html',
})
export class LoginPage {
  protected readonly action = createAction();
  protected readonly server = signal<ServerState>('checking');
  protected readonly greeting = greeting();
  private readonly api = inject(StaffApi);
  private readonly session = inject(Session);
  private readonly router = inject(Router);
  private readonly credentials = signal({ username: '', password: '' });
  protected readonly loginForm = form(
    this.credentials,
    (path) => {
      required(path.username, { message: 'common.required-field' });
      required(path.password, { message: 'common.required-field' });
    },
    {
      name: 'login',
      submission: {
        action: () => {
          this.submit();
          return Promise.resolve(null);
        },
        ignoreValidators: 'none',
        onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );
  private probe: Subscription | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.probe?.unsubscribe());
    this.checkServer();
  }

  /** Vérifie le serveur ; session encore ouverte : on entre directement. Injoignable : nouvel essai plus tard. */
  protected checkServer(): void {
    this.probe?.unsubscribe();
    this.server.set('checking');
    this.probe = serverState(this.api.me()).subscribe((state) => {
      if (state.user) {
        this.enter(state.user);
        return;
      }
      this.server.set(state.status);
      if (state.status === 'offline') {
        this.probe = timer(SERVER_RETRY_MS).subscribe(() => this.checkServer());
      }
    });
  }

  private submit(): void {
    if (this.action.busy()) {
      return;
    }
    const { username, password } = this.credentials();
    this.action.run(this.api.login(username.trim(), password), (user) => {
      // Le mot de passe ne reste pas en mémoire après la connexion.
      this.credentials.set({ username: user.username, password: '' });
      this.enter(user);
    });
  }

  private enter(user: StaffUser): void {
    this.probe?.unsubscribe();
    this.session.set(user);
    void this.router.navigate([user.must_change_password ? '/password' : '/']);
  }
}
