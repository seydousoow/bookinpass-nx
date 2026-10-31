import { Component, computed, DestroyRef, effect, inject, input, signal, untracked, viewChild } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';
import { rxResource, takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { DOCUMENT, ViewportScroller } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { catchError, finalize, forkJoin, map, of } from 'rxjs';
import { TranslocoDirective } from '@jsverse/transloco';
import { Button, Spinner } from 'components';
import { DatePipe, MoneyPipe } from 'pipes';
import { loadContact, saveContact } from 'state';
import { IPayDunyaPayment, IPayDunyaStep, IPaymentAuthorisation, IPaymentMethods, PAYDUNYA_FORM_ERRORS, PayDunyaForm, PayDunyaStep, PaymentForm } from 'payment';
import { IActivityBooking } from 'models';
import { ActivityService, IActivityHold } from '../activity.service';
import { ActivityVoucher } from '../booking/activity-voucher';
import { ActivityPhoto } from '../ui/activity-photo';
import { ActivityContactForm } from './activity-contact-form';
import { ACTIVITY_STEPS, clearActivityDraft, IActivityContact, IActivityDraft, loadActivityDraft, saveActivityDraft, TActivityStep } from './activity-draft';

const RETURN_PATH = '/activities/book';
const MAX_PARTICIPANTS = 20;

/** Code d'erreur stable renvoyé par le serveur (`sold-out`, `hold-expired`…). */
const codeOf = (error: unknown): string | undefined => (error instanceof HttpErrorResponse ? (error.error as { code?: string } | null)?.code : undefined);

/**
 * Réservation d'un créneau d'activité, en trois étapes : coordonnées, paiement, bon d'échange.
 *
 * Passer au paiement bloque les places (36 minutes) et ouvre la session Stripe ; le paiement autorisé, la réservation
 * est confirmée (places vendues, paiement encaissé, bon d'échange par e-mail). Le brouillon de l'onglet garde la saisie
 * et la demande en cours : un rechargement ou le retour d'un moyen à redirection reprennent la même réservation.
 */
@Component({
  selector: 'bip-activity-booking',
  imports: [TranslocoDirective, RouterLink, Button, Spinner, DatePipe, MoneyPipe, PaymentForm, PayDunyaForm, PayDunyaStep, ActivityVoucher, ActivityPhoto, ActivityContactForm],
  templateUrl: './activity-booking.html',
  host: { class: 'mx-auto block w-full max-w-3xl px-2 py-4' },
})
export class ActivityBooking {
  readonly activity = input<string>();
  readonly slot = input<string>();
  readonly date = input<string>();
  readonly adults = input<string>();
  readonly children = input<string>();
  /** Retour de PayDunya : référence de la réservation, et `cancelled=1` si le client a abandonné. */
  readonly mobile = input<string>();
  readonly cancelled = input<string>();

  protected readonly steps = ACTIVITY_STEPS;
  protected readonly step = signal<TActivityStep>('details');
  protected readonly stepIndex = computed(() => ACTIVITY_STEPS.indexOf(this.step()));
  protected readonly contact = signal<IActivityContact>({ given_name: '', family_name: '', email: '', phone: '' });
  protected readonly incomplete = signal(false);
  protected readonly hold = signal<IActivityHold | null>(null);
  protected readonly holding = signal(false);
  /** Clé de traduction (sous `activity.pay`) de l'échec du blocage des places. */
  protected readonly holdError = signal<string | null>(null);
  protected readonly confirming = signal(false);
  protected readonly confirmError = signal<string | null>(null);
  protected readonly booking = signal<IActivityBooking | null>(null);
  protected readonly mobileState = signal<'idle' | 'redirecting' | 'checking' | 'pending' | 'cancelled' | 'failed'>('idle');
  /** Suite du paiement PayDunya (QR code, validation sur le téléphone), affichée pendant l'attente. */
  protected readonly mobileNext = signal<IPayDunyaStep | null>(null);
  /** Erreur que le client corrige dans le formulaire PayDunya (numéro, code…). */
  protected readonly mobileError = signal<string | null>(null);
  private readonly draft = signal<IActivityDraft | null>(null);
  /** Créneau choisi : celui de l'URL, sinon celui du brouillon (retour de Stripe ou de PayDunya). */
  protected readonly choice = computed(() => {
    const draft = this.draft();
    const activity = this.activity() ?? draft?.activity;
    const slot = Number(this.slot() ?? draft?.slot);
    const date = this.date() ?? draft?.date;
    const adults = Number(this.adults() ?? draft?.adults ?? 1);
    const children = Number(this.children() ?? draft?.children ?? 0);
    const count = adults + children;
    if (!activity || !Number.isInteger(slot) || !date || !Number.isInteger(adults) || !Number.isInteger(children) || adults < 0 || children < 0) {
      return null;
    }
    return count >= 1 && count <= MAX_PARTICIPANTS ? { activity, slot, date, adults, children } : null;
  });
  private readonly api = inject(ActivityService);
  protected readonly methods = toSignal(this.api.paymentMethods().pipe(catchError(() => of({ card: true, methods: [] }))), {
    initialValue: { card: true, methods: [] } as IPaymentMethods,
  });
  /** L'activité et le créneau relus : titre, option, prix, places encore disponibles. */
  private readonly lookup = rxResource({
    params: () => this.choice() ?? undefined,
    stream: ({ params }) =>
      forkJoin({
        activity: this.api.detail(params.activity),
        slots: this.api.availability(params.activity, params.date, params.adults + params.children),
      }).pipe(
        map(({ activity, slots }) => {
          const slot = slots.find((s) => s.slot_id === params.slot) ?? null;
          const option = slot ? (activity.options.find((o) => o.id === slot.option_id) ?? null) : null;
          return { activity, slot, option };
        }),
      ),
  });
  protected readonly loading = this.lookup.isLoading;
  protected readonly failed = computed(() => this.lookup.status() === 'error');
  protected readonly offer = computed(() => (this.lookup.hasValue() ? this.lookup.value() : null));
  protected readonly total = computed(() => {
    const offer = this.offer();
    const choice = this.choice();
    if (!offer?.option || !choice) {
      return null;
    }
    return Number(offer.option.price) * choice.adults + Number(offer.option.child_price ?? 0) * choice.children;
  });
  /** Mobile money : PayDunya n'encaisse que des francs CFA. */
  protected readonly mobileMoney = computed(() => this.methods().methods.length > 0 && this.offer()?.activity.currency === 'XOF');
  private readonly contactForm = viewChild(ActivityContactForm);
  private readonly mobileReference = signal<string | null>(null);
  private readonly reference = computed(() => this.hold()?.reference ?? this.mobileReference());
  private mobileChecks = 0;

  private requestId: string = crypto.randomUUID();
  private readonly router = inject(Router);
  private readonly scroller = inject(ViewportScroller);
  private readonly destroyRef = inject(DestroyRef);
  private readonly document = inject(DOCUMENT);

  constructor() {
    const draft = loadActivityDraft();
    const saved = loadContact();
    effect(() => {
      const choice = this.choice();
      if (!choice) {
        return;
      }
      untracked(() => {
        // Même créneau que le brouillon : sa saisie et sa demande reprennent ; sinon tout recommence.
        const same = draft && draft.slot === choice.slot && draft.adults === choice.adults && draft.children === choice.children;
        this.contact.set(same ? draft.contact : { given_name: '', family_name: '', email: saved?.email ?? '', phone: saved?.phone ?? '' });
        if (same) {
          this.requestId = draft.requestId;
          if (draft.reference && this.mobile() === draft.reference) {
            this.mobileReference.set(draft.reference);
            this.goTo('pay');
            this.checkMobile(this.cancelled() === '1');
          } else if (draft.reference) {
            this.goTo('pay');
            this.placeHold();
          }
        }
      });
    });
    this.draft.set(draft);
    effect(() => {
      const choice = this.choice();
      if (choice && !this.booking()) {
        saveActivityDraft({ ...choice, requestId: this.requestId, contact: this.contact(), reference: this.reference() });
      }
    });
    effect(() => {
      const { email, phone } = this.contact();
      if (email || phone) {
        saveContact({ email, phone });
      }
    });
    this.destroyRef.onDestroy(() => {
      if (this.booking()) {
        clearActivityDraft();
      }
    });
  }

  protected toPayment(): void {
    if (!this.contactForm()?.check()) {
      this.incomplete.set(true);
      return;
    }
    this.incomplete.set(false);
    this.goTo('pay');
    this.placeHold();
  }

  /** Retour aux coordonnées : une nouvelle demande sera faite. */
  protected backToDetails(): void {
    this.hold.set(null);
    this.mobileReference.set(null);
    this.mobileState.set('idle');
    this.mobileNext.set(null);
    this.mobileError.set(null);
    this.holdError.set(null);
    this.requestId = crypto.randomUUID();
    this.goTo('details');
  }

  protected placeHold(): void {
    const choice = this.choice();
    if (!choice) {
      return;
    }
    const contact = this.contact();
    this.holding.set(true);
    this.holdError.set(null);
    this.api
      .hold({
        request_id: this.requestId,
        slot_id: choice.slot,
        adults: choice.adults,
        children: choice.children,
        given_name: contact.given_name.trim(),
        family_name: contact.family_name.trim(),
        email: contact.email.trim(),
        phone: contact.phone,
        return_path: RETURN_PATH,
      })
      .pipe(
        finalize(() => this.holding.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (hold) => this.hold.set(hold),
        error: (error: unknown) => {
          const code = codeOf(error);
          if (code === 'hold-expired') {
            this.requestId = crypto.randomUUID();
          }
          const known = ['sold-out', 'slot-closed', 'slot-not-found', 'children-not-offered', 'hold-expired', 'payments-unavailable'];
          this.holdError.set(`pay.errors.${known.includes(code ?? '') ? code : 'failed'}`);
        },
      });
  }

  protected onAuthorised(authorisation: IPaymentAuthorisation): void {
    const hold = this.hold();
    if (!hold) {
      return;
    }
    this.confirming.set(true);
    this.confirmError.set(null);
    this.api
      .confirm(hold.reference, authorisation.checkoutSessionId)
      .pipe(
        finalize(() => this.confirming.set(false)),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (booking) => this.done(booking),
        error: (error: unknown) => this.confirmError.set(codeOf(error) === 'sold-out' ? 'pay.errors.sold-out-paid' : 'pay.errors.confirm-failed'),
      });
  }

  protected retryConfirmation(): void {
    const hold = this.hold();
    if (hold) {
      this.onAuthorised({ checkoutSessionId: hold.checkout.checkout_session_id });
    }
  }

  /**
   * Paiement PayDunya saisi sur notre page : le serveur ferme la session de carte, crée la facture et la paie. Selon
   * le moyen : lien à ouvrir (Wave, carte PayDunya), QR code Orange Money, ou validation sur le téléphone ; la
   * réservation est ensuite relue jusqu'au paiement.
   */
  protected payMobile(payment: IPayDunyaPayment): void {
    const reference = this.reference();
    if (!reference) {
      return;
    }
    this.mobileState.set('redirecting');
    this.mobileError.set(null);
    this.confirmError.set(null);
    this.api
      .mobilePayment(reference, payment, RETURN_PATH)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (next) => {
          if (next.step === 'redirect' && next.url) {
            this.document.location.assign(next.url);
            return;
          }
          this.mobileNext.set(next);
          this.mobileChecks = 0;
          this.checkMobile();
        },
        error: (error: unknown) => {
          const code = codeOf(error);
          if (PAYDUNYA_FORM_ERRORS.includes(code ?? '')) {
            this.mobileState.set('idle');
            this.mobileError.set(code ?? null);
            return;
          }
          this.mobileState.set('failed');
          this.confirmError.set(code === 'hold-expired' || code === 'already-paid' ? `pay.errors.${code}` : 'pay.errors.mobile-failed');
        },
      });
  }

  /** Autre essai après un abandon : le formulaire PayDunya revient. */
  protected retryMobile(): void {
    this.mobileNext.set(null);
    this.mobileState.set('idle');
  }

  /** Retour de PayDunya : en attente de validation sur le téléphone, nouvelle lecture toutes les 4 secondes, 3 minutes au plus. */
  protected checkMobile(cancelled = false): void {
    const reference = this.reference();
    if (!reference) {
      return;
    }
    this.mobileState.set('checking');
    this.api
      .confirmMobile(reference)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (booking) => {
          if (booking.status === 'confirmed') {
            this.mobileState.set('idle');
            this.done(booking);
          } else if (booking.status === 'released' || booking.status === 'cancelled') {
            this.mobileState.set('failed');
            this.confirmError.set('pay.errors.hold-expired');
          } else if (cancelled) {
            this.mobileState.set('cancelled');
          } else if (++this.mobileChecks <= 45) {
            this.mobileState.set('pending');
            setTimeout(() => this.mobileState() === 'pending' && this.checkMobile(), 4000);
          } else {
            this.mobileState.set('pending');
          }
        },
        error: () => {
          this.mobileState.set('failed');
          this.confirmError.set('pay.errors.mobile-failed');
        },
      });
  }

  protected backToActivity(): void {
    const choice = this.choice();
    clearActivityDraft();
    void this.router.navigate(choice ? ['/activities', choice.activity] : ['/activities']);
  }

  protected retry(): void {
    this.lookup.reload();
  }

  private done(booking: IActivityBooking): void {
    this.booking.set(booking);
    clearActivityDraft();
    this.goTo('done');
  }

  private goTo(step: TActivityStep): void {
    this.step.set(step);
    this.scroller.scrollToPosition([0, 0]);
  }
}
