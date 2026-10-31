import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroCalendarDays, heroMapPin, heroUserGroup } from '@ng-icons/heroicons/outline';
import { DatePipe, MoneyPipe } from 'pipes';
import { IActivityBooking } from 'models';
import { ActivityPhoto } from '../ui/activity-photo';

/** Bon d'échange : référence, activité, option, date et heure (fuseau de l'activité), rendez-vous, participants, montant. */
@Component({
  selector: 'bip-activity-voucher',
  imports: [TranslocoDirective, RouterLink, NgIcon, DatePipe, MoneyPipe, ActivityPhoto],
  providers: [provideIcons({ heroCalendarDays, heroMapPin, heroUserGroup })],
  host: { class: 'block' },
  template: `
    <section *transloco="let t; prefix: 'activity.voucher'" class="overflow-hidden rounded-card border border-border-subtle bg-surface-card">
      <div [class]="statusClass()" class="px-4 py-3 text-sm font-semibold" role="status">{{ t('status.' + booking().status) }}</div>
      <div class="grid gap-4 p-4 sm:grid-cols-[10rem_1fr]">
        <bip-activity-photo [alt]="booking().activity.title" [url]="booking().activity.image?.url" class="aspect-[4/3] w-full rounded-card" />
        <div class="space-y-2">
          <p class="text-xs text-muted">{{ t('reference') }}</p>
          <p class="font-mono text-2xl font-bold tracking-widest text-brand-primary">{{ booking().reference }}</p>
          <a [routerLink]="['/activities', booking().activity.slug]" class="block text-lg font-bold hover:underline">{{ booking().activity.title }}</a>
          <p class="text-sm">{{ booking().option_title }}</p>
          <p class="flex items-start gap-2 text-sm">
            <ng-icon aria-hidden="true" class="mt-0.5 shrink-0" name="heroCalendarDays" />
            <span class="first-letter:uppercase">{{ booking().starts_at | bipDate: when() }}</span>
          </p>
          <p class="flex items-start gap-2 text-sm">
            <ng-icon aria-hidden="true" class="mt-0.5 shrink-0" name="heroMapPin" />
            <span>{{ booking().activity.meeting_point }}, {{ booking().activity.city.name }}</span>
          </p>
          <p class="flex items-start gap-2 text-sm">
            <ng-icon aria-hidden="true" class="mt-0.5 shrink-0" name="heroUserGroup" />
            <span>{{ t('participants', { adults: booking().adults, children: booking().children }) }} · {{ booking().given_name }} {{ booking().family_name }}</span>
          </p>
          <p class="pt-2 font-semibold">{{ t('total', { total: (booking().total | bipMoney: booking().currency) }) }}</p>
          @if (booking().refunded !== '0') {
            <p class="text-sm text-state-success">{{ t('refunded', { amount: (booking().refunded | bipMoney: booking().currency) }) }}</p>
          }
          <p class="text-xs text-muted">{{ t('provider', { name: booking().activity.provider_name }) }}</p>
        </div>
      </div>
      @if (booking().status === 'confirmed') {
        <p class="border-t border-border-subtle px-4 py-3 text-xs text-muted">{{ t('present') }}</p>
      }
    </section>
  `,
})
export class ActivityVoucher {
  readonly booking = input.required<IActivityBooking>();
  protected readonly when = computed((): Intl.DateTimeFormatOptions => ({
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: this.booking().activity.city.timezone,
  }));
  protected readonly statusClass = computed(() => {
    switch (this.booking().status) {
      case 'confirmed':
        return 'bg-state-success-soft text-state-success';
      case 'cancelled':
        return 'bg-state-error-soft text-state-error';
      default:
        return 'bg-state-warning-soft';
    }
  });
}
