import { Component, computed, effect, inject, input, signal, untracked } from '@angular/core';
import { rxResource, toObservable, toSignal } from '@angular/core/rxjs-interop';
import { Router, RouterLink } from '@angular/router';
import { debounceTime, of, switchMap } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroArrowLeft, heroArrowRight, heroCheck, heroInformationCircle, heroPlus, heroSparkles } from '@ng-icons/heroicons/outline';
import { Button } from 'components/button/button';
import { Checkbox } from 'components/checkbox/checkbox';
import { Input } from 'components/input/input';
import { Select } from 'components/select/select';
import { SystemState } from 'components/system-state/system-state';
import { Textarea } from 'components/textarea/textarea';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { dakarDateTime } from '../../core/dakar';
import { ACTIVITY_CATEGORIES, ActivityCity, ActivityDetail, ActivityForm, ActivityStatus, ItineraryStop, STOP_KINDS } from '../../core/models';
import { translatedOptions } from '../../core/options';
import { STATUS_TONES } from '../activities/activities';
import { activityForm, emptyActivity, emptyStop, KNOW_BEFORE_KEYS, lines, LIST_KEYS, ListKey, missing, payload } from './activity-form';
import { ConfirmDialog, FormSection, PageHeader, StatusBadge, StepItem, Stepper, Toasts } from '../../ui';
import { ActivityImages } from './activity-images';
import { ActivityOptions } from './activity-options';
import { ActivitySlots } from './activity-slots';

/** Étapes du parcours (brief §5) : informations générales, médias et itinéraire, prix et disponibilités, conditions. */
const STEPS = ['general', 'media', 'pricing', 'conditions'] as const;

/** Étape où se corrige chaque problème de `missing()`. */
const PROBLEM_STEP: Readonly<Record<string, number>> = {
  title: 0,
  city: 0,
  provider: 0,
  summary: 0,
  description: 0,
  images: 1,
  itinerary: 1,
  'meeting-point': 1,
  location: 1,
  duration: 2,
};

export function problemStep(problem: string): number {
  return PROBLEM_STEP[problem] ?? 0;
}

/** Listes de l'étape « conditions » (hors « à savoir avant de partir »). */
const CONDITION_KEYS: readonly ListKey[] = ['includes', 'excludes', 'not_allowed'];

/**
 * Fiche d'une activité (admin, manager), de A à Z : contenu, photos, itinéraire, lieu, durée et annulation ; puis
 * options et prix, créneaux, mise en vente, et résumé des avis par Claude. `id` vaut `new` pour une nouvelle fiche.
 * Le parcours est en quatre étapes ; toutes restent dans la page (masquées), l'enregistrement envoie toute la fiche.
 * Pas d'enregistrement automatique : sur une fiche publiée, il modifierait la page du site en cours de saisie.
 */
@Component({
  selector: 'bo-activity',
  imports: [
    RouterLink,
    TranslocoDirective,
    NgIcon,
    Button,
    Checkbox,
    Input,
    Select,
    SystemState,
    Textarea,
    ActivityImages,
    ActivityOptions,
    ActivitySlots,
    ConfirmDialog,
    FormSection,
    PageHeader,
    StatusBadge,
    Stepper,
  ],
  providers: [provideIcons({ heroArrowLeft, heroArrowRight, heroCheck, heroInformationCircle, heroPlus, heroSparkles })],
  templateUrl: './activity.html',
})
export class ActivityPage {
  readonly id = input.required<string>();

  protected readonly action = createAction();
  protected readonly conditionKeys = CONDITION_KEYS;
  protected readonly knowBeforeKeys = KNOW_BEFORE_KEYS;
  protected readonly stepOf = problemStep;
  protected readonly step = signal(0);
  protected readonly archiving = signal(false);
  protected readonly tones = STATUS_TONES;
  protected readonly dateTime = dakarDateTime;
  protected readonly categories = translatedOptions(ACTIVITY_CATEGORIES, 'activities.categories.');
  protected readonly stopKinds = translatedOptions(STOP_KINDS, 'activity.stop-kinds.');
  protected readonly isNew = computed(() => this.id() === 'new');
  /** Saisie en cours ; repart de la fiche enregistrée à chaque chargement ou enregistrement. */
  protected readonly form = signal<ActivityForm>(emptyActivity());
  /** Zones de texte des listes, une ligne par élément. */
  protected readonly listText = signal<Readonly<Record<ListKey, string>>>(listTexts(emptyActivity()));
  protected readonly city = signal<ActivityCity | null>(null);
  protected readonly cityQuery = signal<string | null>('');
  protected readonly problems = signal<readonly string[]>([]);
  protected readonly savedAt = signal<string | null>(null);
  /** Étapes avec leur état : à corriger (après un essai d'enregistrement), ou déjà enregistrée. */
  protected readonly steps = computed((): StepItem[] => {
    const invalid = new Set(this.problems().map(problemStep));
    return STEPS.map((key, index) => ({ label: `activity.steps.${key}`, invalid: invalid.has(index), done: !!this.saved.value() && !invalid.has(index) }));
  });
  private readonly api = inject(StaffApi);
  protected readonly saved = rxResource({
    params: () => (this.isNew() ? undefined : Number(this.id())),
    stream: ({ params }) => this.api.activity(params),
  });
  protected readonly cities = toSignal(
    toObservable(this.cityQuery).pipe(
      debounceTime(250),
      switchMap((query) => ((query ?? '').trim().length >= 2 ? this.api.cities(query!.trim()).pipe(catchError(() => of([]))) : of([]))),
    ),
    { initialValue: [] },
  );
  private readonly router = inject(Router);
  private readonly toasts = inject(Toasts);
  private readonly transloco = inject(TranslocoService);

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

  protected save(): void {
    const texts = this.listText();
    const form: ActivityForm = { ...this.form(), ...Object.fromEntries(LIST_KEYS.map((key) => [key, lines(texts[key])])) };
    const problems = missing(form);
    this.problems.set(problems);
    if (problems.length) {
      // L'étape du premier problème, si l'étape affichée n'en a aucun.
      if (!problems.some((problem) => problemStep(problem) === this.step())) {
        this.step.set(problemStep(problems[0]));
      }
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
    this.toasts.success(this.transloco.translate('common.saved'));
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
