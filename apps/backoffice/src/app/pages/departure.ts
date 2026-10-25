import { Component, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { form, FormField, FormRoot, maxLength, min, required, validate } from '@angular/forms/signals';
import { TranslocoDirective } from '@jsverse/transloco';
import { Observable } from 'rxjs';
import { Badge } from 'components/badge/badge';
import { Button } from 'components/button/button';
import { Input } from 'components/input/input';
import { isValidPhone, PhoneInput } from 'components/phone-input/phone-input';
import { Select } from 'components/select/select';
import { Spinner } from 'components/spinner/spinner';
import { SystemState } from 'components/system-state/system-state';
import { createAction } from '../core/action';
import { StaffApi } from '../core/api';
import { Session } from '../core/session';
import { dakarDateTime, dakarTime } from '../core/dakar';
import { DepartureDetail, INCIDENT_TYPES, IncidentType } from '../core/models';
import { translatedOptions } from '../core/options';

interface LuggageDraft {
  sender_name: string;
  sender_phone: string;
  sender_id_number: string;
  receiver_name: string;
  receiver_phone: string;
  description: string;
  weight_kg: number | null;
  price: number | null;
}

const EMPTY_LUGGAGE: LuggageDraft = {
  sender_name: '',
  sender_phone: '',
  sender_id_number: '',
  receiver_name: '',
  receiver_phone: '',
  description: '',
  weight_kg: 1,
  price: 0,
};

/**
 * Un départ : passagers et contrôle, car parti / arrivé, places (autre car), bagages enregistrés au guichet, incidents.
 * Chaque action renvoie le départ à jour.
 */
@Component({
  selector: 'bo-departure',
  imports: [RouterLink, TranslocoDirective, FormField, FormRoot, Badge, Button, Input, PhoneInput, Select, Spinner, SystemState],
  template: `
    <section *transloco="let t" class="space-y-4">
      <a class="bip-focusable rounded-button text-sm font-semibold text-brand-primary" routerLink="/">← {{ t('departure.back') }}</a>
      @if (detail.isLoading() && !detail.hasValue()) {
        <bip-spinner class="py-8" label="common.loading" showLabel />
      } @else if (detail.error()) {
        <bip-system-state (retry)="detail.reload()" message="errors.departure-not-found" status="error" />
      } @else if (detail.value(); as v) {
        @let d = v.departure;
        <div class="bo-card flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="text-xl font-bold">{{ d.origin.place }} → {{ d.destination.place }}</h1>
            <p>
              {{ dateTime(d.departs_at) }}
              @if (d.last_departure_at) {
                <span class="text-sm text-muted">({{ t('departures.until', { time: time(d.last_departure_at) }) }})</span>
              }
            </p>
            <p class="text-sm text-muted">{{ d.origin.name }} → {{ d.destination.name }}</p>
            <p class="mt-2 text-sm">
              {{ t('departures.passengers', { scanned: d.scanned, total: d.passengers }) }} ·
              {{ d.capacity === null ? t('departures.continuous') : t('departures.seats', { sold: d.sold, held: d.held, capacity: d.capacity }) }}
            </p>
            @if (d.departed_at) {
              <p class="text-sm">{{ t('departure.departed-at', { time: dateTime(d.departed_at) }) }}</p>
            }
            @if (d.arrived_at) {
              <p class="text-sm">{{ t('departure.arrived-at', { time: dateTime(d.arrived_at) }) }}</p>
            }
          </div>
          <div class="flex flex-wrap items-end gap-2">
            @if (session.chief() && !d.departed_at) {
              <button (clicked)="act(api.markDeparted(d.id))" [loading]="action.busy()" bipButton>{{ t('departure.mark-departed') }}</button>
            }
            @if (session.chief() && d.departed_at && !d.arrived_at) {
              <button (clicked)="act(api.markArrived(d.id))" [loading]="action.busy()" bipButton>{{ t('departure.mark-arrived') }}</button>
            }
            @if (session.manager() && d.capacity !== null) {
              <bip-input [(value)]="capacity" [min]="1" [step]="1" class="w-28" label="departure.capacity" name="capacity" type="number" />
              <button (clicked)="resize(d.id)" [disabled]="(capacity() ?? 0) < 1" [loading]="action.busy()" bipButton variant="outline">{{ t('common.save') }}</button>
            }
          </div>
        </div>
        @if (action.error(); as code) {
          <p class="text-state-error" role="alert">{{ t('errors.' + code) }}</p>
        }

        <section class="bo-card">
          <h2 class="mb-2 font-bold">{{ t('departure.passengers', { count: v.passengers.length }) }}</h2>
          @if (!v.passengers.length) {
            <p class="text-sm text-muted">{{ t('departure.no-passengers') }}</p>
          } @else {
            <div class="overflow-x-auto">
              <!-- Cellules espacées et sur une ligne : sur téléphone, le tableau défile plutôt que de coller les colonnes. -->
              <table class="w-full text-left text-sm whitespace-nowrap [&_td]:py-2 [&_td]:pr-4 [&_th]:py-2 [&_th]:pr-4">
                <thead class="text-xs text-muted">
                  <tr>
                    <th class="py-2" scope="col">{{ t('departure.name') }}</th>
                    <th scope="col">{{ t('departure.ticket') }}</th>
                    <th scope="col">{{ t('departure.booking') }}</th>
                    <th scope="col">{{ t('departure.phone') }}</th>
                    <th scope="col">{{ t('departure.check') }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of v.passengers; track p.code) {
                    <tr class="border-t border-border-subtle">
                      <td class="py-2 font-semibold">{{ p.family_name }} {{ p.given_name }}</td>
                      <td class="font-mono">{{ p.code }}</td>
                      <td class="font-mono">{{ p.reference }}</td>
                      <td>
                        <a [href]="'tel:' + p.phone" class="underline">{{ p.phone }}</a>
                      </td>
                      <td>
                        @if (p.scanned_at) {
                          <span class="font-semibold text-state-success">✓ {{ time(p.scanned_at) }}</span>
                          <span class="text-xs text-muted"> {{ p.scanned_by }}</span>
                        } @else {
                          <span class="text-muted">—</span>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        @if (session.chief()) {
          <section class="bo-card space-y-3">
            <h2 class="font-bold">{{ t('departure.luggage', { count: v.luggage.length }) }}</h2>
            @for (l of v.luggage; track l.code) {
              <div class="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle pt-2 text-sm">
                <span
                  ><span class="font-mono font-bold">{{ l.code }}</span> · {{ l.weight_kg }} kg · {{ l.price }} {{ l.currency }}</span
                >
                <span>{{ l.sender_name }} → {{ l.receiver_name }} ({{ l.receiver_phone }})</span>
                <bip-badge [tone]="l.status === 'delivered' ? 'success' : 'neutral'" size="sm">{{ t('luggage.status.' + l.status) }}</bip-badge>
              </div>
            }
            @if (!d.departed_at) {
              <form [formRoot]="luggageForm" class="grid gap-3 border-t border-border-subtle pt-3 sm:grid-cols-2 lg:grid-cols-4" novalidate>
                <bip-input [formField]="luggageForm.sender_name" label="luggage.sender" />
                <bip-phone-input [formField]="luggageForm.sender_phone" label="luggage.sender-phone" />
                <bip-input [formField]="luggageForm.sender_id_number" label="luggage.sender-id" />
                <bip-input [formField]="luggageForm.description" label="luggage.description" />
                <bip-input [formField]="luggageForm.receiver_name" label="luggage.receiver" />
                <bip-phone-input [formField]="luggageForm.receiver_phone" label="luggage.receiver-phone" />
                <bip-input [formField]="luggageForm.weight_kg" [step]="0.1" label="luggage.weight" suffix="kg" type="number" />
                <bip-input [formField]="luggageForm.price" [step]="1" label="luggage.price" suffix="F CFA" type="number" />
                <div class="flex flex-wrap items-center gap-3 sm:col-span-2 lg:col-span-4">
                  <button [loading]="action.busy()" bipButton type="submit">{{ t('luggage.register') }}</button>
                  @if (lastLuggage(); as code) {
                    <span class="text-sm" role="status"
                      >{{ t('luggage.label-code') }} <span class="font-mono text-lg font-bold">{{ code }}</span></span
                    >
                  }
                </div>
              </form>
            }
          </section>
        }

        <section class="bo-card space-y-3">
          <h2 class="font-bold">{{ t('departure.incidents', { count: v.incidents.length }) }}</h2>
          @for (i of v.incidents; track i.id) {
            <div class="border-t border-border-subtle pt-2 text-sm">
              <p>
                <span class="font-semibold">{{ t('incidents.types.' + i.type) }}</span> · {{ dateTime(i.reported_at) }} · {{ i.reported_by }}
              </p>
              <p>{{ i.description }}</p>
              @if (i.resolved_at) {
                <p class="text-state-success">✓ {{ i.resolution }}</p>
              }
            </div>
          }
          <form (submit)="$event.preventDefault(); report(d.id)" class="flex flex-wrap items-end gap-3 border-t border-border-subtle pt-3">
            <bip-select
              (valueChange)="incidentType.set($event[0] ?? 'delay')"
              [options]="incidentTypes()"
              [value]="[incidentType()]"
              class="w-56"
              label="incidents.type"
              name="incident-type" />
            <bip-input [(value)]="incidentText" [maxLength]="1000" class="min-w-64 flex-1" label="incidents.description" name="incident-text" />
            <button [disabled]="!incidentText()?.trim()" [loading]="action.busy()" bipButton type="submit" variant="outline">{{ t('incidents.report') }}</button>
          </form>
        </section>
      }
    </section>
  `,
})
export class DeparturePage {
  readonly id = input.required<string>();
  protected readonly session = inject(Session);
  protected readonly api = inject(StaffApi);
  protected readonly action = createAction();
  protected readonly detail = rxResource({
    params: () => Number(this.id()),
    stream: ({ params }) => this.api.departure(params),
  });
  protected readonly lastLuggage = signal<string | null>(null);
  protected readonly capacity = signal<number | null>(null);
  protected readonly incidentTypes = translatedOptions(INCIDENT_TYPES, 'incidents.types.');
  protected readonly incidentType = signal<IncidentType>('delay');
  protected readonly incidentText = signal<string | null>('');
  protected readonly time = dakarTime;
  protected readonly dateTime = dakarDateTime;

  private readonly luggage = signal<LuggageDraft>({ ...EMPTY_LUGGAGE });
  protected readonly luggageForm = form(
    this.luggage,
    (path) => {
      required(path.sender_name, { message: 'common.required-field' });
      required(path.receiver_name, { message: 'common.required-field' });
      for (const phone of [path.sender_phone, path.receiver_phone]) {
        required(phone, { message: 'common.required-field' });
        validate(phone, ({ value }) => (!value() || isValidPhone(value()) ? null : { kind: 'phone', message: 'luggage.phone-invalid' }));
      }
      maxLength(path.description, 200);
      required(path.weight_kg, { message: 'common.required-field' });
      min(path.weight_kg, 0.1);
      required(path.price, { message: 'common.required-field' });
      min(path.price, 0);
    },
    {
      name: 'luggage',
      submission: {
        action: () => {
          this.registerLuggage();
          return Promise.resolve(null);
        },
        ignoreValidators: 'none',
        onInvalid: (field) => field().errorSummary()[0]?.fieldTree().focusBoundControl(),
      },
    },
  );

  constructor() {
    // Champ des places prérempli avec celles du départ chargé.
    effect(() => {
      const capacity = this.detail.value()?.departure.capacity;
      if (capacity !== undefined && capacity !== null) {
        this.capacity.set(capacity);
      }
    });
  }

  protected act(request: Observable<DepartureDetail>): void {
    this.action.run(request, (detail) => this.detail.set(detail));
  }

  protected resize(departureId: number): void {
    const capacity = this.capacity();
    if (capacity && capacity >= 1) {
      this.act(this.api.resize(departureId, capacity));
    }
  }

  protected report(departureId: number): void {
    const description = this.incidentText()?.trim();
    if (!description || this.action.busy()) {
      return;
    }
    this.action.run(this.api.reportIncident({ departure_id: departureId, route_id: null, type: this.incidentType(), description }), () => {
      this.incidentText.set('');
      this.detail.reload();
    });
  }

  private registerLuggage(): void {
    const departureId = this.detail.value()?.departure.id;
    if (departureId === undefined || this.action.busy()) {
      return;
    }
    const draft = this.luggage();
    this.action.run(
      this.api.registerLuggage(departureId, {
        sender_name: draft.sender_name.trim(),
        sender_phone: draft.sender_phone,
        sender_id_number: draft.sender_id_number.trim() || null,
        receiver_name: draft.receiver_name.trim(),
        receiver_phone: draft.receiver_phone,
        description: draft.description.trim() || null,
        weight_kg: draft.weight_kg ?? 0,
        price: draft.price ?? 0,
      }),
      (item) => {
        this.lastLuggage.set(item.code);
        this.luggage.set({ ...EMPTY_LUGGAGE });
        this.detail.reload();
      },
    );
  }
}
