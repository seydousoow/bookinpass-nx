import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TranslocoDirective } from '@jsverse/transloco';
import { Badge } from 'components/badge/badge';
import { Button } from 'components/button/button';
import { Checkbox } from 'components/checkbox/checkbox';
import { Input } from 'components/input/input';
import { Select } from 'components/select/select';
import { Spinner } from 'components/spinner/spinner';
import { SystemState } from 'components/system-state/system-state';
import { Textarea } from 'components/textarea/textarea';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { dakarDateTime } from '../../core/dakar';
import { ACTIVITY_CATEGORIES, ActivityCity, ActivityDetail, ActivityForm, ActivityImage, ActivityStatus, ItineraryStop, STOP_KINDS } from '../../core/models';
import { translatedOptions } from '../../core/options';
import { STATUS_TONES } from '../activities/activities';
import { activityForm, emptyActivity, emptyStop, LIST_KEYS, ListKey, lines, missing, payload } from './activity-form';
import { ActivityOptions } from './activity-options';
import { ActivitySlots } from './activity-slots';

/**
 * Fiche d'une activité (admin, manager), de A à Z : contenu, photos, itinéraire, lieu, durée et annulation ; puis
 * options et prix, créneaux, mise en vente, et résumé des avis par Claude. `id` vaut `new` pour une nouvelle fiche.
 */
@Component({
  selector: 'bo-activity',
  imports: [RouterLink, TranslocoDirective, Badge, Button, Checkbox, Input, Select, Spinner, SystemState, Textarea, ActivityOptions, ActivitySlots],
  templateUrl: './activity.html',
})
export class ActivityPage {
  readonly id = input.required<string>();

  protected readonly action = createAction();
  protected readonly listKeys = LIST_KEYS;
  protected readonly tones = STATUS_TONES;
  protected readonly dateTime = dakarDateTime;
  protected readonly categories = translatedOptions(ACTIVITY_CATEGORIES, 'activities.categories.');
  protected readonly stopKinds = translatedOptions(STOP_KINDS, 'activity.stop-kinds.');
  protected readonly isNew = computed(() => this.id() === 'new');
  private readonly api = inject(StaffApi);
  private readonly router = inject(Router);
  protected readonly saved = rxResource({
    params: () => (this.isNew() ? undefined : Number(this.id())),
    stream: ({ params }) => this.api.activity(params),
  });

  /** Saisie en cours ; repart de la fiche enregistrée à chaque chargement ou enregistrement. */
  protected readonly form = signal<ActivityForm>(emptyActivity());
  /** Zones de texte des listes, une ligne par élément. */
  protected readonly listText = signal<Readonly<Record<ListKey, string>>>(listTexts(emptyActivity()));
  protected readonly city = signal<ActivityCity | null>(null);
  protected readonly cityQuery = signal<string | null>('');
  protected readonly cities = toSignal(
    toObservable(this.cityQuery).pipe(
      debounceTime(250),
      switchMap((query) => ((query ?? '').trim().length >= 2 ? this.api.cities(query!.trim()).pipe(catchError(() => of([]))) : of([]))),
    ),
    { initialValue: [] },
  );
  protected readonly problems = signal<readonly string[]>([]);
  protected readonly savedAt = signal<string | null>(null);

  constructor() {
    effect(() => {
      const activity = this.saved.value();
      if (activity) {
        untracked(() => this.load(activity));
      }
    });
  }

  protected patch(patch: Partial<ActivityForm>): void {
    this.form.update((form) => ({ ...form, ...patch }));
  }

  protected setList(key: ListKey, text: string | null): void {
    this.listText.update((all) => ({ ...all, [key]: text ?? '' }));
  }

  protected chooseCity(city: ActivityCity): void {
    this.city.set(city);
    this.cityQuery.set('');
    this.patch({ city_id: city.id });
  }

  protected patchStop(index: number, patch: Partial<ItineraryStop>): void {
    this.patch({ itinerary: this.form().itinerary.map((stop, i) => (i === index ? { ...stop, ...patch } : stop)) });
  }

  protected addStop(): void {
    this.patch({ itinerary: [...this.form().itinerary, emptyStop()] });
  }

  protected removeStop(index: number): void {
    this.patch({ itinerary: this.form().itinerary.filter((_, i) => i !== index) });
  }

  protected patchImage(index: number, patch: Partial<ActivityImage>): void {
    this.patch({ images: this.form().images.map((image, i) => (i === index ? { ...image, ...patch } : image)) });
  }

  protected addImage(): void {
    this.patch({ images: [...this.form().images, { url: '', alt: null }] });
  }

  protected removeImage(index: number): void {
    this.patch({ images: this.form().images.filter((_, i) => i !== index) });
  }

  /** La première photo est l'image principale : la remonter ou la descendre change l'ordre. */
  protected moveImage(index: number, step: -1 | 1): void {
    const images = [...this.form().images];
    const target = index + step;
    if (target < 0 || target >= images.length) {
      return;
    }
    [images[index], images[target]] = [images[target], images[index]];
    this.patch({ images });
  }

  protected save(): void {
    const texts = this.listText();
    const form: ActivityForm = { ...this.form(), ...Object.fromEntries(LIST_KEYS.map((key) => [key, lines(texts[key])])) };
    const problems = missing(form);
    this.problems.set(problems);
    if (problems.length) {
      return;
    }
    const body = payload(form);
    if (this.isNew()) {
      this.action.run(this.api.createActivity(body), (created) => void this.router.navigate(['/activities', created.id]));
    } else {
      this.action.run(this.api.updateActivity(Number(this.id()), body), (activity) => this.refresh(activity));
    }
  }

  protected changeStatus(status: ActivityStatus): void {
    this.action.run(this.api.activityStatus(Number(this.id()), status), (activity) => this.refresh(activity));
  }

  protected summarize(): void {
    this.action.run(this.api.summarizeReviews(Number(this.id())), (activity) => this.refresh(activity));
  }

  /** Fiche renvoyée par le serveur après une action : elle devient la version enregistrée. */
  protected refresh(activity: ActivityDetail): void {
    this.saved.set(activity);
    this.savedAt.set(new Date().toISOString());
  }

  private load(activity: ActivityDetail): void {
    const form = activityForm(activity);
    this.form.set(form);
    this.listText.set(listTexts(form));
    this.city.set(activity.city);
    this.problems.set([]);
  }
}

function listTexts(form: ActivityForm): Record<ListKey, string> {
  return Object.fromEntries(LIST_KEYS.map((key) => [key, form[key].join('\n')])) as Record<ListKey, string>;
}
