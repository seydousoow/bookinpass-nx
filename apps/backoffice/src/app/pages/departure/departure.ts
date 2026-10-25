import { Component, effect, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { form, FormField, FormRoot, maxLength, min, required, validate } from '@angular/forms/signals';
import { TranslocoDirective } from '@jsverse/transloco';
import { Observable } from 'rxjs';
import { Spinner, Badge, Button, Input, PhoneInput, Select, SystemState } from 'components';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { Session } from '../../core/session';
import { dakarDateTime, dakarTime } from '../../core/dakar';
import { DepartureDetail, INCIDENT_TYPES, IncidentType } from '../../core/models';
import { translatedOptions } from '../../core/options';
import { isValidPhone } from 'utils';

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
 * Un départ : passagers et contrôle, transport parti / arrivé, places (autre transport), bagages enregistrés au guichet, incidents.
 * Chaque action renvoie le départ à jour.
 */
@Component({
  selector: 'bo-departure',
  imports: [RouterLink, TranslocoDirective, FormField, FormRoot, Badge, Button, Input, PhoneInput, Select, Spinner, SystemState],
  templateUrl: './departure.html',
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
