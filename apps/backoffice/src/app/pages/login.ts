import { Component, inject, signal } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { Router } from '@angular/router';
import { form, FormField, FormRoot, required } from '@angular/forms/signals';
import { TranslocoDirective } from '@jsverse/transloco';
import { Button } from 'components/button/button';
import { Card } from 'components/card/card';
import { Input } from 'components/input/input';
import { createAction } from '../core/action';
import { StaffApi } from '../core/api';
import { Session } from '../core/session';

/** Connexion du personnel : identifiant et mot de passe ; 5 échecs de suite bloquent le compte 15 minutes. */
@Component({
  selector: 'bo-login',
  imports: [NgOptimizedImage, TranslocoDirective, FormField, FormRoot, Button, Card, Input],
  template: `
    <main *transloco="let t" class="flex min-h-screen items-center justify-center p-4">
      <bip-card class="w-full max-w-sm" padding="lg">
        <form [formRoot]="loginForm" class="space-y-4" novalidate>
          <img alt="Book In Pass" class="h-12 w-auto" height="512" ngSrc="/images/bip-transparent-logo.png" priority width="2112" />
          <div>
            <h1 class="text-xl font-bold">{{ t('app.title') }}</h1>
            <p class="text-sm text-muted">{{ t('login.subtitle') }}</p>
          </div>
          <bip-input [formField]="loginForm.username" autocapitalize="none" autocomplete="username" label="login.username" />
          <bip-input [formField]="loginForm.password" autocomplete="current-password" label="login.password" type="password" />
          @if (action.error(); as code) {
            <p class="text-sm text-state-error" role="alert">{{ t('errors.' + code) }}</p>
          }
          <button [loading]="action.busy()" bipButton block loadingLabel="login.submit" type="submit">{{ t('login.submit') }}</button>
        </form>
      </bip-card>
    </main>
  `,
})
export class LoginPage {
  protected readonly action = createAction();
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

  private submit(): void {
    if (this.action.busy()) {
      return;
    }
    const { username, password } = this.credentials();
    this.action.run(this.api.login(username.trim(), password), (user) => {
      this.session.set(user);
      // Le mot de passe ne reste pas en mémoire après la connexion.
      this.credentials.set({ username: user.username, password: '' });
      void this.router.navigate([user.must_change_password ? '/password' : '/']);
    });
  }
}
