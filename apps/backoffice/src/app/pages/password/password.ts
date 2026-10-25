import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { form, FormField, FormRoot, minLength, required, validate } from '@angular/forms/signals';
import { TranslocoDirective } from '@jsverse/transloco';
import { Button } from 'components/button/button';
import { Card } from 'components/card/card';
import { Input } from 'components/input/input';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { Session } from '../../core/session';

/** Règle du serveur pour un mot de passe : une lettre et un chiffre au moins (la longueur est vérifiée à part). */
const LETTER_AND_DIGIT = /^(?=.*\p{L})(?=.*\d)/u;

/** Nouveau mot de passe : obligatoire après un mot de passe provisoire, possible à tout moment. */
@Component({
  selector: 'bo-password',
  imports: [TranslocoDirective, FormField, FormRoot, Button, Card, Input],
  templateUrl: './password.html',
})
export class PasswordPage {
  protected readonly session = inject(Session);
  protected readonly action = createAction();
  private readonly api = inject(StaffApi);
  private readonly router = inject(Router);
  private readonly value = signal({ current: '', next: '', confirm: '' });
  protected readonly passwordForm = form(
    this.value,
    (path) => {
      required(path.current, { message: 'common.required-field' });
      required(path.next, { message: 'common.required-field' });
      minLength(path.next, 10, { message: 'errors.weak-password' });
      validate(path.next, ({ value }) => (!value() || LETTER_AND_DIGIT.test(value()) ? null : { kind: 'weak-password', message: 'errors.weak-password' }));
      validate(path.confirm, ({ value, valueOf }) => (value() === valueOf(path.next) ? null : { kind: 'password-mismatch', message: 'errors.password-mismatch' }));
    },
    {
      name: 'password',
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
    const { current, next } = this.value();
    this.action.run(this.api.changePassword(current, next), (user) => {
      this.session.set(user);
      this.value.set({ current: '', next: '', confirm: '' });
      void this.router.navigate(['/']);
    });
  }
}
