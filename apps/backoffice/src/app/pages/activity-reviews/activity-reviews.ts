import { Component, computed, inject, input, signal } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { TranslocoDirective } from '@jsverse/transloco';
import { Badge, BadgeTone } from 'components/badge/badge';
import { Button } from 'components/button/button';
import { Checkbox } from 'components/checkbox/checkbox';
import { Input } from 'components/input/input';
import { Pagination } from 'components/pagination/pagination';
import { Select } from 'components/select/select';
import { Spinner } from 'components/spinner/spinner';
import { SystemState } from 'components/system-state/system-state';
import { ISelectOption } from 'models';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { dakarDateTime } from '../../core/dakar';
import { ActivityReview, REVIEW_STATUSES, ReviewStatus } from '../../core/models';

const PAGE_SIZE = 20;
const VERDICT_TONES: Readonly<Record<string, BadgeTone>> = { approve: 'success', reject: 'error', review: 'warning' };
const STATUS_TONES: Readonly<Record<ReviewStatus, BadgeTone>> = { pending: 'warning', approved: 'success', rejected: 'error' };

/**
 * Avis des voyageurs (admin, manager) : file des avis en attente avec l'avis de Claude (verdict, motif, problèmes
 * relevés), publication ou rejet, nouvel avis de Claude ; réglage de la modération automatique.
 */
@Component({
  selector: 'bo-activity-reviews',
  imports: [TranslocoDirective, Badge, Button, Checkbox, Input, Pagination, Select, Spinner, SystemState],
  templateUrl: './activity-reviews.html',
})
export class ActivityReviewsPage {
  /** `?activity=` : avis d'une seule activité (lien depuis sa fiche). */
  readonly activity = input<string>();

  protected readonly statuses = REVIEW_STATUSES;
  protected readonly verdictTones = VERDICT_TONES;
  protected readonly statusTones = STATUS_TONES;
  protected readonly pageSize = PAGE_SIZE;
  protected readonly dateTime = dakarDateTime;
  protected readonly action = createAction();
  protected readonly status = signal<ReviewStatus | ''>('pending');
  protected readonly page = signal(1);
  protected readonly rejecting = signal<number | null>(null);
  protected readonly reason = signal<string | null>('');
  protected readonly activityId = computed(() => {
    const id = Number(this.activity());
    return Number.isInteger(id) && id > 0 ? id : null;
  });
  private readonly api = inject(StaffApi);
  private readonly router = inject(Router);
  protected readonly settings = rxResource({ stream: () => this.api.activitySettings() });
  private readonly activities = rxResource({ stream: () => this.api.activities() });
  protected readonly activityOptions = computed((): ISelectOption<number>[] => (this.activities.value() ?? []).map((a) => ({ value: a.id, label: a.title })));
  protected readonly list = rxResource({
    params: () => ({ status: this.status(), activity: this.activityId(), page: this.page() - 1 }),
    stream: ({ params }) => this.api.reviews(params.status, params.activity, params.page),
  });

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
