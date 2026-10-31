import { Component, computed, model } from '@angular/core';
import { email, form, FormField, maxLength, pattern, required, validate } from '@angular/forms/signals';
import { TranslocoDirective } from '@jsverse/transloco';
import { Input, PhoneInput } from 'components';
import { isValidPhone } from 'utils/phone-number.utils';
import { IActivityContact } from './activity-draft';

/** Lettres (accents compris), espaces, apostrophes et traits d'union. */
const NAME_PATTERN = /^[\p{L}' -]+$/u;

/** Voyageur principal (nom donné au prestataire) et coordonnées où envoyer le bon d'échange. */
@Component({
  selector: 'bip-activity-contact-form',
  imports: [TranslocoDirective, Input, PhoneInput, FormField],
  host: { class: 'block' },
  template: `
    <form *transloco="let t; prefix: 'activity.contact'" novalidate>
      <h2 class="text-xl font-bold">{{ t('title') }}</h2>
      <p class="mt-1 text-xs text-muted">{{ t('subtitle') }}</p>
      <div class="mt-4 grid grid-cols-1 gap-4 rounded-card border border-border-subtle bg-surface-card p-4 md:grid-cols-2">
        <bip-input [formField]="contactForm.given_name" autocomplete="given-name" label="activity.contact.given-name" />
        <bip-input [formField]="contactForm.family_name" autocomplete="family-name" label="activity.contact.family-name" />
        <bip-input [formField]="contactForm.email" autocomplete="email" hint="activity.contact.email-hint" label="activity.contact.email" type="email" />
        <bip-phone-input [formField]="contactForm.phone" hint="activity.contact.phone-hint" label="activity.contact.phone" />
      </div>
    </form>
  `,
})
export class ActivityContactForm {
  readonly value = model.required<IActivityContact>();

  protected readonly contactForm = form(
    this.value,
    (path) => {
      for (const name of [path.given_name, path.family_name]) {
        required(name, { message: 'common.required-field' });
        pattern(name, NAME_PATTERN, { message: 'activity.contact.errors.name' });
        maxLength(name, 50, { message: 'activity.contact.errors.name-length' });
      }
      required(path.email, { message: 'common.required-field' });
      email(path.email, { message: 'activity.contact.errors.email' });
      required(path.phone, { message: 'common.required-field' });
      validate(path.phone, ({ value }) => (!value() || isValidPhone(value()) ? null : { kind: 'phone', message: 'activity.contact.errors.phone' }));
    },
    { name: 'activity-contact' },
  );

  readonly valid = computed(() => this.contactForm().valid());

  /** Affiche toutes les erreurs ; `true` si la saisie est complète. */
  check(): boolean {
    this.contactForm().markAsTouched();
    return this.contactForm().valid();
  }
}
