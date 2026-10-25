import { booleanAttribute, Component, input, model } from '@angular/core';
import { OutsideClickDirective } from '../../directives/outside-click.directive';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroChevronDownSolid } from '@ng-icons/heroicons/solid';
import { NgClass } from '@angular/common';
import { TranslocoPipe } from '@jsverse/transloco';

@Component({
  selector: 'bip-dropdown',
  imports: [OutsideClickDirective, NgIcon, NgClass, TranslocoPipe],
  host: { class: 'block', '(keydown.escape)': 'close()' },
  providers: [provideIcons({ heroChevronDownSolid })],
  templateUrl: './dropdown.html',
})
export class Dropdown {
  readonly prefix = input<string | undefined>(undefined);
  readonly prefixColor = input<string | undefined>(undefined);
  readonly opened = model(false);
  readonly name = input.required<string>();
  readonly label = input<string>();
  readonly hideLabel = input(false, { transform: booleanAttribute });
  readonly value = input<string>();
  /** Texte d'attente déjà traduit ; à défaut, « Sélectionner » dans la langue active. */
  readonly placeholder = input<string>();
  readonly align = input<'start' | 'end'>('start');
  readonly disabled = input(false, { transform: booleanAttribute });
  readonly error = input.required<boolean>();
  /** Le panneau prend la largeur du déclencheur, ou sa largeur naturelle. */
  readonly panelWidth = input<'trigger' | 'auto'>('trigger');

  toggle(): void {
    if (this.disabled()) {
      return;
    }
    this.opened.update((v) => !v);
  }

  close(): void {
    if (this.opened()) {
      this.opened.set(false);
    }
  }
}
