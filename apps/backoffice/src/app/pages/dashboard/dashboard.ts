import { Component, computed, inject } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroBanknotes, heroCalendarDays, heroChatBubbleLeftRight, heroCheckCircle, heroChevronRight, heroExclamationTriangle, heroSparkles } from '@ng-icons/heroicons/outline';
import { BadgeTone } from 'components/badge/badge';
import { SystemState } from 'components/system-state/system-state';
import { slotsEndingSoon } from '../../core/activity-alerts';
import { StaffApi } from '../../core/api';
import { dakarDateTime } from '../../core/dakar';
import { ActivityRefund, Incident } from '../../core/models';
import { Session } from '../../core/session';
import { ScanPage } from '../scan/scan';
import { EmptyState, PageHeader, StatCard, StatusBadge } from '../../ui';

/** Avis en attente montrés sur l'accueil ; les autres sont sur la page de modération. */
const PENDING_REVIEWS_SHOWN = 5;
/** Derniers incidents clos montrés. */
const RESOLVED_INCIDENTS = 10;

/** Remboursement à suivre, de car ou d'activité, pour une seule liste. */
export interface RefundRow {
  readonly key: string;
  readonly reference: string;
  readonly label: string;
  readonly customer: string;
  readonly amount: string;
  readonly currency: string;
  /** Clé de traduction sous `dashboard.refund-states`. */
  readonly state: 'requested' | 'in-progress' | 'failed' | 'to-refund';
  readonly at: string | null;
  readonly link: string;
}

const REFUND_TONES: Readonly<Record<RefundRow['state'], BadgeTone>> = { requested: 'info', 'in-progress': 'warning', failed: 'error', 'to-refund': 'warning' };

/** Incident en cours (départ passé ou sans départ) ou prévu (départ à venir). */
export function incidentTiming(incident: Incident, now = Date.now()): 'ongoing' | 'expected' {
  return incident.departs_at && Date.parse(incident.departs_at) > now ? 'expected' : 'ongoing';
}

function activityRefundState(refund: ActivityRefund): RefundRow['state'] {
  if (refund.status === 'failed') {
    return 'failed';
  }
  return refund.requested_by === null ? 'requested' : 'in-progress';
}

/**
 * Accueil du back-office : le contrôle des billets (`#control`), les incidents en cours, prévus et les derniers clos ;
 * pour les responsables, les avis à modérer (et ceux publiés par Claude), les remboursements à suivre et les activités
 * dont les créneaux s'arrêtent dans moins d'un mois.
 */
@Component({
  selector: 'bo-dashboard',
  imports: [RouterLink, TranslocoDirective, NgIcon, SystemState, ScanPage, EmptyState, PageHeader, StatCard, StatusBadge],
  providers: [provideIcons({ heroBanknotes, heroCalendarDays, heroChatBubbleLeftRight, heroCheckCircle, heroChevronRight, heroExclamationTriangle, heroSparkles })],
  templateUrl: './dashboard.html',
})
export class DashboardPage {
  protected readonly session = inject(Session);
  protected readonly dateTime = dakarDateTime;
  protected readonly timing = incidentTiming;
  protected readonly refundTones = REFUND_TONES;
  protected readonly ongoing = computed(() => (this.openIncidents.value() ?? []).filter((i) => incidentTiming(i) === 'ongoing'));
  protected readonly expected = computed(() => (this.openIncidents.value() ?? []).filter((i) => incidentTiming(i) === 'expected'));
  protected readonly shownReviews = computed(() => (this.pendingReviews.value()?.items ?? []).slice(0, PENDING_REVIEWS_SHOWN));
  private readonly api = inject(StaffApi);
  protected readonly openIncidents = rxResource({ stream: () => this.api.incidents(true, null) });
  protected readonly resolvedIncidents = rxResource({ stream: () => this.api.resolvedIncidents(RESOLVED_INCIDENTS, null) });
  private readonly manager = computed(() => this.session.manager());
  protected readonly settings = rxResource({
    params: () => this.manager() || undefined,
    stream: () => this.api.activitySettings(),
  });
  protected readonly pendingReviews = rxResource({
    params: () => this.manager() || undefined,
    stream: () => this.api.reviews('pending', null, 0),
  });
  private readonly busRefunds = rxResource({
    params: () => this.manager() || undefined,
    stream: () => this.api.refunds(false),
  });
  private readonly activityRefunds = rxResource({
    params: () => this.manager() || undefined,
    stream: () => this.api.activityRefunds(false),
  });
  protected readonly refundsLoading = computed(() => this.busRefunds.isLoading() || this.activityRefunds.isLoading());
  protected readonly refundsError = computed(() => !!this.busRefunds.error() || !!this.activityRefunds.error());
  /** Remboursements à faire ou en cours, les plus anciens d'abord. */
  protected readonly refunds = computed((): RefundRow[] => {
    const bus = (this.busRefunds.value() ?? [])
      .filter((r) => r.status === 'refund_needed')
      .map((r): RefundRow => ({
        key: `bus-${r.id}`,
        reference: r.reference,
        label: `${r.origin} → ${r.destination}`,
        customer: r.passengers,
        amount: r.amount,
        currency: r.currency,
        state: 'to-refund',
        at: r.paid_at,
        link: '/refunds',
      }));
    const activities = (this.activityRefunds.value() ?? [])
      .filter((r) => r.status !== 'refunded')
      .map((r): RefundRow => ({
        key: `activity-${r.id}`,
        reference: r.reference,
        label: r.activity_title,
        customer: r.customer,
        amount: r.amount,
        currency: r.currency,
        state: activityRefundState(r),
        at: r.created_at,
        link: `/activity-bookings/${r.reference}`,
      }));
    return [...bus, ...activities].sort((a, b) => (a.at ?? '').localeCompare(b.at ?? ''));
  });

  private readonly activities = rxResource({
    params: () => this.manager() || undefined,
    stream: () => this.api.activities(),
  });
  protected readonly activitiesLoading = computed(() => this.activities.isLoading());
  protected readonly activitiesError = computed(() => !!this.activities.error());
  /** Activités publiées dont les créneaux s'arrêtent dans moins d'un mois : la plus pressée d'abord. */
  protected readonly endingActivities = computed(() =>
    (this.activities.value() ?? []).filter((a) => slotsEndingSoon(a)).sort((a, b) => (a.last_slot_at ?? '').localeCompare(b.last_slot_at ?? '')),
  );

  protected reloadRefunds(): void {
    this.busRefunds.reload();
    this.activityRefunds.reload();
  }

  protected reloadActivities(): void {
    this.activities.reload();
  }
}
