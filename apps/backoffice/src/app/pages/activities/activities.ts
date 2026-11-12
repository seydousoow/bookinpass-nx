import { Component, computed, inject, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroExclamationTriangle, heroMagnifyingGlass, heroMap, heroPhoto, heroPlus } from '@ng-icons/heroicons/outline';
import { BadgeTone } from 'components/badge/badge';
import { Button } from 'components/button/button';
import { Input } from 'components/input/input';
import { SystemState } from 'components/system-state/system-state';
import { StaffApi } from '../../core/api';
import { slotsEndingSoon } from '../../core/activity-alerts';
import { dakarDateTime } from '../../core/dakar';
import { ACTIVITY_STATUSES, ActivityStatus } from '../../core/models';
import { EmptyState, FilterToolbar, PageHeader, StatusBadge } from '../../ui';

export const STATUS_TONES: Readonly<Record<ActivityStatus, BadgeTone>> = { draft: 'neutral', published: 'success', archived: 'warning' };

/**
 * Activités (admin, manager) : toutes les fiches, filtrées par statut ou par texte ; création d'une fiche. Chaque fiche
 * montre ses réservations à venir, et une alerte si ses créneaux s'arrêtent dans moins d'un mois.
 */
@Component({
  selector: 'bo-activities',
  imports: [RouterLink, TranslocoDirective, NgIcon, Button, Input, SystemState, EmptyState, FilterToolbar, PageHeader, StatusBadge],
  providers: [provideIcons({ heroExclamationTriangle, heroMagnifyingGlass, heroMap, heroPhoto, heroPlus })],
  templateUrl: './activities.html',
})
export class ActivitiesPage {
  protected readonly statuses = ACTIVITY_STATUSES;
  protected readonly tones = STATUS_TONES;
  protected readonly dateTime = dakarDateTime;
  protected readonly endingSoon = slotsEndingSoon;
  protected readonly status = signal<ActivityStatus | null>(null);
  protected readonly query = signal<string | null>('');
  /** Nombre de fiches par statut, pour les filtres. */
  protected readonly counts = computed(() => {
    const all = this.list.value() ?? [];
    return { all: all.length, ...Object.fromEntries(ACTIVITY_STATUSES.map((s) => [s, all.filter((a) => a.status === s).length])) } as Record<ActivityStatus | 'all', number>;
  });
  private readonly api = inject(StaffApi);
  protected readonly list = rxResource({ stream: () => this.api.activities() });
  protected readonly shown = computed(() => {
    const text = (this.query() ?? '').trim().toLowerCase();
    const status = this.status();
    return (this.list.value() ?? []).filter((a) => (!status || a.status === status) && (!text || a.title.toLowerCase().includes(text) || a.city.name.toLowerCase().includes(text)));
  });
  private readonly router = inject(Router);

  protected open(id: number): void {
    void this.router.navigate(['/activities', id]);
  }
}
