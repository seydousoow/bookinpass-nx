import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Badge, BadgeTone } from 'components/badge/badge';
import { Button } from 'components/button/button';
import { Input } from 'components/input/input';
import { Spinner } from 'components/spinner/spinner';
import { SystemState } from 'components/system-state/system-state';
import { StaffApi } from '../../core/api';
import { dakarDateTime } from '../../core/dakar';
import { ACTIVITY_STATUSES, ActivityStatus } from '../../core/models';

export const STATUS_TONES: Readonly<Record<ActivityStatus, BadgeTone>> = { draft: 'neutral', published: 'success', archived: 'warning' };

/** Activités (admin, manager) : toutes les fiches, filtrées par statut ou par texte ; création d'une fiche. */
@Component({
  selector: 'bo-activities',
  imports: [RouterLink, TranslocoDirective, Badge, Button, Input, Spinner, SystemState],
  templateUrl: './activities.html',
})
export class ActivitiesPage {
  protected readonly statuses = ACTIVITY_STATUSES;
  protected readonly tones = STATUS_TONES;
  protected readonly dateTime = dakarDateTime;
  protected readonly status = signal<ActivityStatus | null>(null);
  protected readonly query = signal<string | null>('');
  private readonly api = inject(StaffApi);
  protected readonly list = rxResource({ stream: () => this.api.activities() });
  protected readonly shown = computed(() => {
    const text = (this.query() ?? '').trim().toLowerCase();
    const status = this.status();
    return (this.list.value() ?? []).filter((a) => (!status || a.status === status) && (!text || a.title.toLowerCase().includes(text) || a.city.name.toLowerCase().includes(text)));
  });
}
