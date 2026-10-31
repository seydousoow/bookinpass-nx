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
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { Session } from '../../core/session';
import { dakarDateTime, dakarToday } from '../../core/dakar';
import { Luggage } from '../../core/models';
import { injectStations, stationOptions } from '../../core/stations';

/** Code d'étiquette d'un bagage : 8 caractères. */
const LUGGAGE_CODE_LENGTH = 8;

/** Bagages d'un jour (partant de la gare ou y arrivant) ; recherche par code d'étiquette et remise au destinataire. */
@Component({
  selector: 'bo-luggage',
  imports: [NgTemplateOutlet, TranslocoDirective, Badge, Button, Input, Select, Spinner, SystemState],
  templateUrl: './luggage.html',
})
export class LuggagePage {
  protected readonly session = inject(Session);
  protected readonly action = createAction();
  protected readonly codeLength = LUGGAGE_CODE_LENGTH;
  protected readonly date = signal<string | null>(dakarToday());
  protected readonly station = signal<number | null>(null);
  protected readonly stations = stationOptions(injectStations(), { all: true });
  protected readonly found = signal<Luggage | null>(null);
  protected readonly code = signal<string | null>('');
  protected readonly dateTime = dakarDateTime;
  private readonly api = inject(StaffApi);
  protected readonly list = rxResource({
    params: () => ({ date: this.date() || dakarToday(), station: this.station() }),
    stream: ({ params }) => this.api.luggage(params.date, params.station),
  });

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
