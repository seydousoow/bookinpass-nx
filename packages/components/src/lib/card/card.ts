import { booleanAttribute, Component, computed, input } from '@angular/core';
import { TranslocoPipe } from '@jsverse/transloco';
import { clsx } from 'clsx';

const paddings = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' } as const;

@Component({
  selector: 'bip-card',
  host: { '[class]': 'hostClass()' },
  template: `
    @if (title(); as heading) {
      <header class="flex items-start justify-between gap-2">
        <div class="min-w-0">
          <h3 class="truncate text-lg text-muted">{{ heading | transloco }}</h3>
          @if (subtitle(); as sub) {
            <p class="mt-1 text-sm text-muted">{{ sub | transloco }}</p>
          }
        </div>
        <ng-content select="[cardActions]" />
      </header>
    }
    <ng-content />
    <ng-content select="[cardFooter]" />
  `,
  imports: [TranslocoPipe],
})
export class Card {
  readonly title = input<string>();
  readonly subtitle = input<string>();
  readonly padding = input<'none' | 'sm' | 'md' | 'lg'>('md');
  readonly interactive = input(false, { transform: booleanAttribute });
  readonly flat = input(false, { transform: booleanAttribute });

  protected readonly hostClass = computed(() =>
    clsx(
      'flex flex-col gap-3 rounded-card border border-border-subtle bg-surface-card',
      paddings[this.padding()],
      this.interactive() && 'cursor-pointer transition-shadow focus-within:ring-2 focus-within:ring-brand-primary hover:shadow-panel',
      { 'shadow-card': !this.flat() },
    ),
  );
}
