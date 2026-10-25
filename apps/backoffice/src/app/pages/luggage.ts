import { Component, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { NgTemplateOutlet } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { Badge } from 'components/badge/badge';
import { Button } from 'components/button/button';
import { Input } from 'components/input/input';
import { Select } from 'components/select/select';
import { Spinner } from 'components/spinner/spinner';
import { SystemState } from 'components/system-state/system-state';
import { createAction } from '../core/action';
import { StaffApi } from '../core/api';
import { Session } from '../core/session';
import { dakarDateTime, dakarToday } from '../core/dakar';
import { Luggage } from '../core/models';
import { injectStations, stationOptions } from '../core/stations';

/** Code d'étiquette d'un bagage : 8 caractères. */
const LUGGAGE_CODE_LENGTH = 8;

/** Bagages d'un jour (partant de la gare ou y arrivant) ; recherche par code d'étiquette et remise au destinataire. */
@Component({
  selector: 'bo-luggage',
  imports: [NgTemplateOutlet, TranslocoDirective, Badge, Button, Input, Select, Spinner, SystemState],
  template: `
    <section *transloco="let t" class="space-y-4">
      <div class="flex flex-wrap items-end gap-3">
        <h1 class="mr-auto text-xl font-bold">{{ t('luggage.title') }}</h1>
        <bip-input [(value)]="date" class="w-44" label="common.date" name="date" type="date" />
        @if (session.manager()) {
          <bip-select (valueChange)="station.set($event[0] ?? null)" [options]="stations()" [value]="[station()]" class="w-64" label="common.station" name="station" />
        }
      </div>

      <form (submit)="$event.preventDefault(); find()" class="bo-card flex flex-wrap items-end gap-2">
        <bip-input [(value)]="code" [maxLength]="8" autocapitalize="characters" class="flex-1" label="luggage.search" name="code" />
        <button [disabled]="searchCode().length !== codeLength" [loading]="action.busy()" bipButton type="submit" variant="outline">{{ t('luggage.find') }}</button>
      </form>
      @if (action.error(); as code) {
        <p class="text-state-error" role="alert">{{ t('errors.' + code) }}</p>
      }
      @if (found(); as l) {
        <div class="bo-card border-brand-primary">
          <ng-container *ngTemplateOutlet="item; context: { $implicit: l }" />
        </div>
      }

      @if (list.isLoading()) {
        <bip-spinner class="py-8" label="common.loading" showLabel />
      } @else if (list.error()) {
        <bip-system-state (retry)="list.reload()" message="errors.unexpected" status="error" />
      } @else if (!list.value()?.length) {
        <bip-system-state status="empty" title="luggage.empty" />
      } @else {
        <ul class="grid gap-2">
          @for (l of list.value(); track l.code) {
            <li class="bo-card"><ng-container *ngTemplateOutlet="item; context: { $implicit: l }" /></li>
          }
        </ul>
      }

      <ng-template #item let-l>
        <div class="flex flex-wrap items-start justify-between gap-3 text-sm">
          <div>
            <p>
              <span class="font-mono text-base font-bold">{{ l.code }}</span> · {{ l.origin }} → {{ l.destination }} · {{ dateTime(l.departs_at) }}
            </p>
            <p>
              {{ t('luggage.from') }} {{ l.sender_name }} ({{ l.sender_phone }}) — {{ t('luggage.to') }} {{ l.receiver_name }} (<a
                [href]="'tel:' + l.receiver_phone"
                class="underline"
                >{{ l.receiver_phone }}</a
              >)
            </p>
            <p class="text-muted">{{ l.weight_kg }} kg · {{ l.price }} {{ l.currency }}{{ l.description ? ' · ' + l.description : '' }}</p>
          </div>
          <div class="flex flex-col items-end gap-1">
            <bip-badge [tone]="l.status === 'delivered' ? 'success' : 'neutral'" size="sm">{{ t('luggage.status.' + l.status) }}</bip-badge>
            @if (l.delivered_at) {
              <p class="text-xs text-muted">{{ dateTime(l.delivered_at) }}</p>
            } @else {
              <button (clicked)="deliver(l)" [loading]="action.busy()" bipButton size="sm">{{ t('luggage.deliver') }}</button>
            }
          </div>
        </div>
      </ng-template>
    </section>
  `,
})
export class LuggagePage {
  protected readonly session = inject(Session);
  private readonly api = inject(StaffApi);
  protected readonly action = createAction();
  protected readonly codeLength = LUGGAGE_CODE_LENGTH;
  protected readonly date = signal<string | null>(dakarToday());
  protected readonly station = signal<number | null>(null);
  protected readonly stations = stationOptions(injectStations(), { all: true });
  protected readonly list = rxResource({
    params: () => ({ date: this.date() || dakarToday(), station: this.station() }),
    stream: ({ params }) => this.api.luggage(params.date, params.station),
  });
  protected readonly found = signal<Luggage | null>(null);
  protected readonly code = signal<string | null>('');
  protected readonly dateTime = dakarDateTime;

  protected searchCode(): string {
    return (this.code() ?? '').trim().toUpperCase();
  }

  protected find(): void {
    if (this.searchCode().length !== LUGGAGE_CODE_LENGTH) {
      return;
    }
    this.found.set(null);
    this.action.run(this.api.findLuggage(this.searchCode()), (item) => this.found.set(item));
  }

  protected deliver(item: Luggage): void {
    this.action.run(this.api.deliverLuggage(item.code), (delivered) => {
      if (this.found()?.code === delivered.code) {
        this.found.set(delivered);
      }
      this.list.reload();
    });
  }
}
