import { booleanAttribute, Component, computed, effect, input, output, signal } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';
import { Button, Input, RadioGroup } from 'components';
import { ISelectOption } from 'models';
import { IPayDunyaMethod, IPayDunyaPayment, IPayDunyaStep, nationalNumber } from '../paydunya';

/** Moyens hors pays (carte PayDunya) regroupés sous ce code. */
const WORLDWIDE = 'WW';

/**
 * Paiement PayDunya sur notre page : pays, moyen, numéro national derrière l'indicatif imposé, code de paiement si le
 * moyen en demande un. Le formulaire vérifie le numéro pour guider le client ; le serveur revérifie tout et transmet à
 * PayDunya. Rien n'est conservé dans le navigateur.
 *
 * Usage : `<bip-paydunya-form [methods]="methods" [busy]="sending" [error]="key" (pay)="send($event)"/>` ; la suite
 * (lien, QR code, validation sur le téléphone) s'affiche avec `<bip-paydunya-step [step]="next"/>`.
 */
@Component({
  selector: 'bip-paydunya-form',
  imports: [TranslocoDirective, Button, Input, RadioGroup],
  host: { class: 'block' },
  templateUrl: './paydunya-form.html',
})
export class PayDunyaForm {
  readonly methods = input.required<readonly IPayDunyaMethod[]>();
  readonly busy = input(false, { transform: booleanAttribute });
  /** Clé de traduction d'une erreur du serveur (sous `payment.paydunya.errors`). */
  readonly error = input<string | null>(null);
  readonly pay = output<IPayDunyaPayment>();

  protected readonly countries = computed((): readonly ISelectOption<string>[] =>
    [...new Set(this.methods().map((m) => m.country ?? WORLDWIDE))].map((c) => ({ value: c, label: `payment.paydunya.countries.${c}` })),
  );
  protected readonly country = signal<string | null>(null);
  protected readonly ofCountry = computed(() => this.methods().filter((m) => (m.country ?? WORLDWIDE) === this.country()));
  protected readonly methodOptions = computed((): readonly ISelectOption<string>[] => this.ofCountry().map((m) => ({ value: m.id, label: `payment.paydunya.methods.${m.id}` })));
  protected readonly methodId = signal<string | null>(null);
  protected readonly method = computed(() => this.ofCountry().find((m) => m.id === this.methodId()) ?? null);
  protected readonly phone = signal<string | null>('');
  protected readonly otp = signal<string | null>('');
  protected readonly submitted = signal(false);
  protected readonly national = computed(() => {
    const method = this.method();
    return method?.country ? nationalNumber(method, this.phone() ?? '') : null;
  });
  protected readonly phoneInvalid = computed(() => !!this.method()?.country && this.national() === null);
  protected readonly otpInvalid = computed(() => !!this.method()?.otp && !/^\d{4,8}$/.test(this.otp() ?? ''));

  constructor() {
    // Un seul choix possible : choisi d'office.
    effect(() => {
      const countries = this.countries();
      if (!countries.some((c) => c.value === this.country())) {
        this.country.set(countries.length === 1 ? countries[0].value : null);
      }
    });
    effect(() => {
      const methods = this.ofCountry();
      if (!methods.some((m) => m.id === this.methodId())) {
        this.methodId.set(methods.length === 1 ? methods[0].id : null);
      }
    });
  }

  protected submit(): void {
    const method = this.method();
    this.submitted.set(true);
    if (!method || this.phoneInvalid() || this.otpInvalid()) {
      return;
    }
    this.pay.emit({ method: method.id, phone: this.national(), otp: method.otp ? this.otp() : null });
  }
}

/** Suite d'un paiement PayDunya : liens Orange Money / Max it et QR code, ou validation à faire sur le téléphone. */
@Component({
  selector: 'bip-paydunya-step',
  imports: [TranslocoDirective],
  host: { class: 'block' },
  template: `
    <div *transloco="let t; prefix: 'payment.paydunya'" class="space-y-2">
      @if (step().step === 'qr') {
        <p class="text-sm">{{ t('next.qr') }}</p>
        <div class="flex flex-wrap gap-2">
          @if (step().om_url; as om) {
            <a [href]="om" class="rounded-button bg-brand-primary px-4 py-2 text-sm font-semibold text-onbrand" rel="noopener">{{ t('next.open-om') }}</a>
          }
          @if (step().maxit_url; as maxit) {
            <a [href]="maxit" class="rounded-button border border-border-strong px-4 py-2 text-sm font-semibold" rel="noopener">{{ t('next.open-maxit') }}</a>
          }
          @if (step().url; as qr) {
            <a [href]="qr" class="rounded-button border border-border-strong px-4 py-2 text-sm font-semibold" rel="noopener" target="_blank">{{ t('next.show-qr') }}</a>
          }
        </div>
      } @else if (step().step === 'phone') {
        <p class="text-sm">{{ t('next.phone') }}</p>
      }
    </div>
  `,
})
export class PayDunyaStep {
  readonly step = input.required<IPayDunyaStep>();
}
