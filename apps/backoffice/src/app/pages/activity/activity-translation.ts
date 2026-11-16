import { Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { rxResource } from '@angular/core/rxjs-interop';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroSparkles } from '@ng-icons/heroicons/outline';
import { Button } from 'components/button/button';
import { Checkbox } from 'components/checkbox/checkbox';
import { Input } from 'components/input/input';
import { SystemState } from 'components/system-state/system-state';
import { Textarea } from 'components/textarea/textarea';
import { BadgeTone } from 'components/badge/badge';
import { createAction } from '../../core/action';
import { StaffApi } from '../../core/api';
import { dakarDateTime } from '../../core/dakar';
import { ActivityDetail, ActivityTranslation, ActivityTranslationContent, ContentLang, TranslationStatus } from '../../core/models';
import { StatusBadge, Toasts } from '../../ui';
import { lines } from './activity-form';

/** Listes de textes traduites ligne à ligne. */
const LISTS = ['highlights', 'includes', 'excludes', 'not_allowed', 'to_bring', 'know_before'] as const;
type TranslatedList = (typeof LISTS)[number];

export const TRANSLATION_TONES: Readonly<Record<TranslationStatus, BadgeTone>> = {
  none: 'neutral',
  pending: 'info',
  proposed: 'warning',
  applied: 'success',
  outdated: 'warning',
  failed: 'error',
};

/** Traduction vide de la forme de la source (champs à remplir à la main). */
function blankFrom(source: ActivityTranslationContent): ActivityTranslationContent {
  return {
    title: '',
    summary: '',
    description: '',
    highlights: [],
    includes: [],
    excludes: [],
    not_allowed: [],
    to_bring: [],
    know_before: [],
    itinerary: source.itinerary.map(() => ({ name: '', description: '' })),
    meeting_point: '',
    image_alts: source.image_alts.map(() => ''),
    options: source.options.map((o) => ({ id: o.id, title: '', description: '' })),
  };
}

/** Copie modifiable, alignée sur la source (étapes, photos et options manquantes ajoutées vides). */
function editable(content: ActivityTranslationContent, source: ActivityTranslationContent): ActivityTranslationContent {
  return {
    ...content,
    highlights: [...content.highlights],
    includes: [...content.includes],
    excludes: [...content.excludes],
    not_allowed: [...content.not_allowed],
    to_bring: [...content.to_bring],
    know_before: [...content.know_before],
    itinerary: source.itinerary.map((_, i) => ({ name: content.itinerary[i]?.name ?? '', description: content.itinerary[i]?.description ?? '' })),
    image_alts: source.image_alts.map((_, i) => content.image_alts[i] ?? ''),
    options: source.options.map((o) => {
      const found = content.options.find((t) => t.id === o.id);
      return { id: o.id, title: found?.title ?? '', description: found?.description ?? '' };
    }),
  };
}

/**
 * Traduction d'une fiche dans une autre langue que sa source : chaque champ à côté du texte source, proposition de
 * Claude préremplie, relue puis appliquée (montrée sur le site aux visiteurs de cette langue).
 */
@Component({
  selector: 'bo-activity-translation',
  imports: [TranslocoDirective, NgIcon, Button, Checkbox, Input, Textarea, SystemState, StatusBadge],
  providers: [provideIcons({ heroSparkles })],
  host: { class: 'block space-y-4' },
  template: `
    <ng-container *transloco="let t; prefix: 'activity.translation'">
      @if (translation.isLoading() && !translation.hasValue()) {
        <bip-system-state [skeletonCount]="3" [skeletonHeight]="100" status="loading" />
      } @else if (translation.error()) {
        <bip-system-state (retry)="translation.reload()" message="errors.unexpected" status="error" />
      } @else if (translation.value(); as tr) {
        <section class="space-y-3 bo-card">
          <div class="flex flex-wrap items-center gap-3">
            <h2 class="bo-section-title">{{ t('title', { lang: t('langs.' + tr.lang), source: t('langs.' + tr.source_lang) }) }}</h2>
            <bo-status [tone]="tones[tr.status]">{{ t('statuses.' + tr.status) }}</bo-status>
            <span class="ml-auto flex flex-wrap items-center gap-2">
              <bip-checkbox (checkedChange)="compare.set($event)" [checked]="compare()" [label]="t('compare')" name="compare" />
              <button (clicked)="propose()" [loading]="action.busy()" bipButton size="sm" variant="outline">
                <ng-icon aria-hidden="true" name="heroSparkles" size="16" />
                {{ t(tr.proposal || tr.content ? 'retranslate' : 'translate') }}
              </button>
            </span>
          </div>
          <p class="text-sm text-muted">{{ t('hints.' + tr.status) }}</p>
          @if (tr.applied_at) {
            <p class="text-xs text-muted">{{ t('applied-meta', { time: dateTime(tr.applied_at), by: tr.applied_by ?? '' }) }}</p>
          }
          @if (tr.proposal && tr.content) {
            <p class="flex flex-wrap items-center gap-2 text-sm">
              {{ t('editing', { what: t(editing() === 'proposal' ? 'the-proposal' : 'the-applied') }) }}
              <button (click)="edit(editing() === 'proposal' ? 'content' : 'proposal')" class="bo-link" type="button">
                {{ t(editing() === 'proposal' ? 'show-applied' : 'show-proposal') }}
              </button>
            </p>
          }
          @if (action.error(); as code) {
            <p class="rounded-card bg-state-error-soft p-3 text-sm text-state-error" role="alert">{{ t2('errors.' + code) }}</p>
          }
        </section>

        @if (draft(); as d) {
          <section class="space-y-4 bo-card">
            <div [class.lg:grid-cols-2]="compare()" class="grid gap-x-6 gap-y-1">
              @if (compare()) {
                <p class="text-xs font-semibold text-muted uppercase">{{ t('langs.' + tr.source_lang) }} · {{ t('source') }}</p>
              }
              <p class="text-xs font-semibold text-muted uppercase">{{ t('langs.' + tr.lang) }}</p>
            </div>

            <!-- Textes principaux -->
            <div [class.lg:grid-cols-2]="compare()" class="grid items-start gap-x-6 gap-y-3 border-t border-border-subtle pt-3">
              @if (compare()) {
                <p class="rounded-card bg-surface-muted p-3 text-sm font-semibold">{{ tr.source.title }}</p>
              }
              <bip-input (valueChange)="set({ title: $event ?? '' })" [maxLength]="200" [value]="d.title" label="activity.fields.title" name="tr-title" required />
              @if (compare()) {
                <p class="rounded-card bg-surface-muted p-3 text-sm whitespace-pre-line">{{ tr.source.summary }}</p>
              }
              <bip-textarea (valueChange)="set({ summary: $event })" [maxLength]="600" [rows]="3" [value]="d.summary" label="activity.fields.summary" name="tr-summary" required />
              @if (compare()) {
                <p class="max-h-96 overflow-y-auto rounded-card bg-surface-muted p-3 text-sm whitespace-pre-line">{{ tr.source.description }}</p>
              }
              <bip-textarea
                (valueChange)="set({ description: $event })"
                [maxLength]="10000"
                [rows]="10"
                [value]="d.description"
                label="activity.fields.description"
                name="tr-description"
                required />
              @if (compare()) {
                <p class="rounded-card bg-surface-muted p-3 text-sm">{{ tr.source.meeting_point }}</p>
              }
              <bip-input
                (valueChange)="set({ meeting_point: $event ?? '' })"
                [maxLength]="500"
                [value]="d.meeting_point"
                label="activity.fields.meeting-point"
                name="tr-meeting"
                required />
            </div>

            <!-- Listes, une ligne par élément -->
            @for (key of lists; track key) {
              @if (tr.source[key].length || d[key].length) {
                <div [class.lg:grid-cols-2]="compare()" class="grid items-start gap-x-6 gap-y-3 border-t border-border-subtle pt-3">
                  @if (compare()) {
                    <ul class="list-disc rounded-card bg-surface-muted p-3 pl-7 text-sm">
                      @for (item of tr.source[key]; track $index) {
                        <li>{{ item }}</li>
                      }
                    </ul>
                  }
                  <bip-textarea
                    (valueChange)="setList(key, $event)"
                    [hint]="'activity.one-per-line'"
                    [maxLength]="10000"
                    [name]="'tr-' + key"
                    [rows]="Math.max(3, tr.source[key].length + 1)"
                    [value]="d[key].join('\\n')"
                    [label]="'activity.lists.' + key" />
                </div>
              }
            }

            <!-- Itinéraire -->
            @for (stop of tr.source.itinerary; track $index; let i = $index) {
              <div [class.lg:grid-cols-2]="compare()" class="grid items-start gap-x-6 gap-y-3 border-t border-border-subtle pt-3">
                @if (compare()) {
                  <div class="rounded-card bg-surface-muted p-3 text-sm">
                    <p class="font-semibold">{{ i + 1 }}. {{ stop.name }}</p>
                    @if (stop.description) {
                      <p class="mt-1 text-muted">{{ stop.description }}</p>
                    }
                  </div>
                }
                <div class="space-y-2">
                  <bip-input
                    (valueChange)="setStop(i, { name: $event ?? '' })"
                    [maxLength]="150"
                    [name]="'tr-stop-' + i"
                    [value]="d.itinerary[i].name"
                    label="activity.stop.name" />
                  @if (stop.description) {
                    <bip-textarea
                      (valueChange)="setStop(i, { description: $event })"
                      [maxLength]="500"
                      [name]="'tr-stop-desc-' + i"
                      [rows]="2"
                      [value]="d.itinerary[i].description"
                      label="activity.stop.description" />
                  }
                </div>
              </div>
            }

            <!-- Options vendues -->
            @for (option of tr.source.options; track option.id; let i = $index) {
              <div [class.lg:grid-cols-2]="compare()" class="grid items-start gap-x-6 gap-y-3 border-t border-border-subtle pt-3">
                @if (compare()) {
                  <div class="rounded-card bg-surface-muted p-3 text-sm">
                    <p class="font-semibold">{{ option.title }}</p>
                    @if (option.description) {
                      <p class="mt-1 text-muted">{{ option.description }}</p>
                    }
                  </div>
                }
                <div class="space-y-2">
                  <bip-input
                    (valueChange)="setOption(i, { title: $event ?? '' })"
                    [maxLength]="200"
                    [name]="'tr-option-' + i"
                    [value]="d.options[i].title"
                    label="activity.translation.option-title" />
                  @if (option.description) {
                    <bip-textarea
                      (valueChange)="setOption(i, { description: $event })"
                      [maxLength]="1000"
                      [name]="'tr-option-desc-' + i"
                      [rows]="2"
                      [value]="d.options[i].description"
                      label="activity.translation.option-description" />
                  }
                </div>
              </div>
            }

            <!-- Descriptions des photos -->
            @for (alt of tr.source.image_alts; track $index; let i = $index) {
              <div [class.lg:grid-cols-2]="compare()" class="grid items-start gap-x-6 gap-y-3 border-t border-border-subtle pt-3">
                @if (compare()) {
                  <p class="flex items-center gap-3 rounded-card bg-surface-muted p-3 text-sm">
                    @if (activity().images[i]; as image) {
                      <img [src]="image.url" alt="" class="size-12 rounded-button object-cover" loading="lazy" />
                    }
                    {{ alt }}
                  </p>
                }
                <bip-input (valueChange)="setAlt(i, $event ?? '')" [maxLength]="200" [name]="'tr-alt-' + i" [value]="d.image_alts[i]" label="activity.image.alt" />
              </div>
            }

            <div class="flex flex-wrap items-center gap-3 border-t border-border-subtle pt-3">
              @if (!complete()) {
                <p class="text-sm text-muted">{{ t('incomplete') }}</p>
              }
              <button (clicked)="apply()" [disabled]="!complete()" [loading]="action.busy()" bipButton class="ml-auto">{{ t('apply') }}</button>
            </div>
          </section>
        }
      }
    </ng-container>
  `,
})
export class ActivityTranslationEditor {
  readonly activity = input.required<ActivityDetail>();
  readonly lang = input.required<ContentLang>();
  /** Traduction appliquée ou nouvelle proposition : l'état des langues de la fiche a changé. */
  readonly changed = output<void>();

  protected readonly Math = Math;
  protected readonly lists = LISTS;
  protected readonly tones = TRANSLATION_TONES;
  protected readonly dateTime = dakarDateTime;
  protected readonly action = createAction();
  protected readonly compare = signal(true);
  protected readonly draft = signal<ActivityTranslationContent | null>(null);
  /** Version modifiée quand il y a une proposition et une traduction appliquée. */
  protected readonly editing = signal<'proposal' | 'content'>('proposal');
  protected readonly complete = computed(() => {
    const d = this.draft();
    return !!d && !!d.title.trim() && !!d.summary.trim() && !!d.description.trim() && !!d.meeting_point.trim();
  });
  private readonly api = inject(StaffApi);
  protected readonly translation = rxResource({
    params: () => ({ ref: this.activity().ref, lang: this.lang() }),
    stream: ({ params }) => this.api.translation(params.ref, params.lang),
  });
  private readonly toasts = inject(Toasts);
  private readonly transloco = inject(TranslocoService);

  constructor() {
    effect(() => {
      const tr = this.translation.value();
      if (tr) {
        untracked(() => this.load(tr));
      }
    });
  }

  protected t2(key: string): string {
    return this.transloco.translate(key);
  }

  protected edit(which: 'proposal' | 'content'): void {
    const tr = this.translation.value();
    const content = which === 'proposal' ? tr?.proposal : tr?.content;
    if (tr && content) {
      this.editing.set(which);
      this.draft.set(editable(content, tr.source));
    }
  }

  protected set(patch: Partial<ActivityTranslationContent>): void {
    this.draft.update((d) => (d ? { ...d, ...patch } : d));
  }

  protected setList(key: TranslatedList, text: string | null): void {
    this.set({ [key]: lines(text) } as Partial<ActivityTranslationContent>);
  }

  protected setStop(index: number, patch: Partial<{ name: string; description: string }>): void {
    this.draft.update((d) => (d ? { ...d, itinerary: d.itinerary.map((s, i) => (i === index ? { ...s, ...patch } : s)) } : d));
  }

  protected setOption(index: number, patch: Partial<{ title: string; description: string }>): void {
    this.draft.update((d) => (d ? { ...d, options: d.options.map((o, i) => (i === index ? { ...o, ...patch } : o)) } : d));
  }

  protected setAlt(index: number, alt: string): void {
    this.draft.update((d) => (d ? { ...d, image_alts: d.image_alts.map((a, i) => (i === index ? alt : a)) } : d));
  }

  protected propose(): void {
    this.action.run(this.api.proposeTranslation(this.activity().ref, this.lang()), (tr) => {
      this.translation.set(tr);
      this.changed.emit();
    });
  }

  protected apply(): void {
    const d = this.draft();
    if (!d || !this.complete()) {
      return;
    }
    const body: ActivityTranslationContent = {
      ...d,
      title: d.title.trim(),
      summary: d.summary.trim(),
      description: d.description.trim(),
      meeting_point: d.meeting_point.trim(),
      itinerary: d.itinerary.map((s) => ({ name: s.name.trim(), description: s.description.trim() })),
      image_alts: d.image_alts.map((a) => a.trim()),
      options: d.options.map((o) => ({ id: o.id, title: o.title.trim(), description: o.description.trim() })),
    };
    this.action.run(this.api.applyTranslation(this.activity().ref, this.lang(), body), (tr) => {
      this.translation.set(tr);
      this.toasts.success(this.transloco.translate('activity.translation.applied'));
      this.changed.emit();
    });
  }

  /** Proposition de Claude d'abord, sinon la traduction appliquée, sinon des champs vides. */
  private load(tr: ActivityTranslation): void {
    this.editing.set(tr.proposal ? 'proposal' : 'content');
    const content = tr.proposal ?? tr.content;
    this.draft.set(content ? editable(content, tr.source) : blankFrom(tr.source));
  }
}
