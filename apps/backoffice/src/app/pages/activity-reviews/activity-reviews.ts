import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroChatBubbleLeftRight, heroSparkles, heroUser } from '@ng-icons/heroicons/outline';
import { BadgeTone } from 'components/badge/badge';
import { Button } from 'components/button/button';
import { Checkbox } from 'components/checkbox/checkbox';
import { Input } from 'components/input/input';
import { Pagination } from 'components/pagination/pagination';
import { Select } from 'components/select/select';
import { SystemState } from 'components/system-state/system-state';
import { ISelectOption } from 'models';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { dakarDateTime } from '../../core/dakar';
import { ActivityReview, REVIEW_STATUSES, ReviewStatus } from '../../core/models';
import { EmptyState, PageHeader, StatusBadge } from '../../ui';

const PAGE_SIZE = 20;
const VERDICT_TONES: Readonly<Record<string, BadgeTone>> = { approve: 'success', reject: 'error', review: 'warning' };
function initialStatus(wanted: string | null): ReviewStatus {
  return REVIEW_STATUSES.includes(wanted as ReviewStatus) ? (wanted as ReviewStatus) : 'pending';
}

const STATUS_TONES: Readonly<Record<ReviewStatus, BadgeTone>> = { pending: 'warning', approved: 'success', rejected: 'error' };

/**
 * Avis des voyageurs (admin, manager) : file des avis en attente avec l'avis de Claude (verdict, motif, problèmes
 * relevés), publication ou rejet, nouvel avis de Claude ; réglage de la modération automatique.
 */
@Component({
  selector: 'bo-activity-reviews',
  imports: [TranslocoDirective, NgIcon, Button, Checkbox, Input, Pagination, Select, SystemState, EmptyState, PageHeader, StatusBadge],
  providers: [provideIcons({ heroChatBubbleLeftRight, heroSparkles, heroUser })],
  templateUrl: './activity-reviews.html',
})
export class ActivityReviewsPage {
  /** `?activity=` : avis d'une seule activité (lien depuis sa fiche). */
  readonly activity = input<string>();

  /** Onglets : les statuts, puis tous (`''`). */
  protected readonly tabs: readonly (ReviewStatus | '')[] = [...REVIEW_STATUSES, ''];
  protected readonly verdictTones = VERDICT_TONES;
  protected readonly statusTones = STATUS_TONES;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly dateTime = dakarDateTime;
  protected readonly action = createAction();
  /** File choisie à l'arrivée par `?status=approved` (lien depuis l'accueil), sinon les avis en attente. */
  protected readonly status = signal<ReviewStatus | ''>(initialStatus(inject(ActivatedRoute).snapshot.queryParamMap.get('status')));
  protected readonly page = signal(1);
  protected readonly rejecting = signal<number | null>(null);
  protected readonly reason = signal<string | null>('');
  protected readonly activityId = computed(() => {
    const id = Number(this.activity());
    return Number.isInteger(id) && id > 0 ? id : null;
  });
  private readonly api = inject(StaffApi);
  protected readonly settings = rxResource({ stream: () => this.api.activitySettings() });
  protected readonly list = rxResource({
    params: () => ({ status: this.status(), activity: this.activityId(), page: this.page() - 1 }),
    stream: ({ params }) => this.api.reviews(params.status, params.activity, params.page),
  });
  private readonly router = inject(Router);
  private readonly activities = rxResource({ stream: () => this.api.activities() });
  protected readonly activityOptions = computed((): ISelectOption<number>[] => (this.activities.value() ?? []).map((a) => ({ value: a.id, label: a.title })));

  protected show(status: ReviewStatus | ''): void {
    this.status.set(status);
    this.page.set(1);
  }

  protected chooseActivity(id: number | null): void {
    this.page.set(1);
    void this.router.navigate([], { queryParams: { activity: id ?? undefined } });
  }

  protected toggleAuto(enabled: boolean): void {
    this.action.run(this.api.updateActivitySettings(enabled), (settings) => this.settings.set(settings));
  }

  protected approve(review: ActivityReview): void {
    this.action.run(this.api.approveReview(review.id), () => this.after());
  }

  protected reject(review: ActivityReview): void {
    const reason = this.reason()?.trim();
    if (!reason) {
      return;
    }
    this.action.run(this.api.rejectReview(review.id, reason), () => {
      this.rejecting.set(null);
      this.after();
    });
  }

  protected moderate(review: ActivityReview): void {
    this.action.run(this.api.moderateReview(review.id), () => this.after());
  }

  private after(): void {
    this.list.reload();
    this.settings.reload();
  }
}
