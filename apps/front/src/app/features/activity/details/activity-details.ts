import { Component, computed, inject, input, signal } from '@angular/core';
import { HttpErrorResponse, HttpStatusCode } from '@angular/common/http';
import { rxResource } from '@angular/core/rxjs-interop';
import { DOCUMENT } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { RouterLink } from '@angular/router';
import { tap } from 'rxjs';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { TranslocoLocaleService } from '@jsverse/transloco-locale';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroStarSolid } from '@ng-icons/heroicons/solid';
import {
  heroArrowUpTray,
  heroCalendarDays,
  heroCheck,
  heroChevronLeft,
  heroChevronRight,
  heroClock,
  heroInformationCircle,
  heroMapPin,
  heroXMark,
} from '@ng-icons/heroicons/outline';
import { Button, Spinner } from 'components';
import { IActivityDetail } from 'models';
import { ActivityService } from '../activity.service';
import { activityDuration, ratingLabel } from '../activity-format';
import { ActivityCardComponent } from '../ui/activity-card';
import { ActivityBookingCard } from './activity-booking-card';
import { ActivityGallery } from './activity-gallery';
import { ActivityMap } from './activity-map';
import { ActivityReviewItem } from './activity-review-item';
import { ActivityReviews } from './activity-reviews';

/** Au-delà, une liste d'informations importantes est repliée derrière « Voir plus ». */
const FOLDED_ITEMS = 4;

/**
 * Page d'une activité (`/activities/:slug`) : photos, résumé, conditions, avis mis en avant, points forts,
 * description, itinéraire, inclus, lieu, informations importantes, activités proches et avis ; la carte de réservation
 * reste visible à droite sur grand écran.
 */
@Component({
  selector: 'bip-activity-details',
  imports: [TranslocoDirective, RouterLink, NgIcon, Button, Spinner, ActivityGallery, ActivityBookingCard, ActivityMap, ActivityReviewItem, ActivityReviews, ActivityCardComponent],
  providers: [
    provideIcons({ heroArrowUpTray, heroCalendarDays, heroCheck, heroChevronLeft, heroChevronRight, heroClock, heroInformationCircle, heroMapPin, heroStarSolid, heroXMark }),
  ],
  templateUrl: './activity-details.html',
})
export class ActivityDetails {
  readonly slug = input.required<string>();

  protected readonly folded = FOLDED_ITEMS;
  protected readonly descriptionOpen = signal(false);
  protected readonly infoOpen = signal(false);
  protected readonly shared = signal(false);
  private readonly api = inject(ActivityService);
  private readonly title = inject(Title);
  private readonly transloco = inject(TranslocoService);
  private readonly locale = inject(TranslocoLocaleService);
  private readonly document = inject(DOCUMENT);

  protected readonly activity = rxResource({
    params: () => this.slug(),
    stream: ({ params }) => this.api.detail(params).pipe(tap((activity) => this.title.setTitle(`${activity.title} — Book In Pass`))),
  });
  protected readonly notFound = computed(() => {
    const error = this.activity.error();
    return error instanceof HttpErrorResponse && error.status === HttpStatusCode.NotFound;
  });

  protected duration(activity: IActivityDetail): string {
    return activityDuration(activity, (key, params) => this.transloco.translate(key, params));
  }

  protected rating(activity: IActivityDetail): string {
    return ratingLabel(activity.rating.average, this.locale.getLocale());
  }

  protected scrollTo(id: string): void {
    this.document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  /** Partage natif (mobile), sinon le lien est copié. */
  protected async share(activity: IActivityDetail): Promise<void> {
    const url = this.document.location.href;
    const nav = this.document.defaultView?.navigator;
    try {
      if (nav?.share) {
        await nav.share({ title: activity.title, url });
        return;
      }
      await nav?.clipboard.writeText(url);
      this.shared.set(true);
      setTimeout(() => this.shared.set(false), 3000);
    } catch {
      // Partage annulé ou presse-papiers refusé : rien à faire.
    }
  }

  protected scrollRelated(list: HTMLElement, direction: 1 | -1): void {
    list.scrollBy({ left: direction * list.clientWidth * 0.8, behavior: 'smooth' });
  }
}
