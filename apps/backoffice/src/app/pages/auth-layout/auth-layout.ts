import { Component } from '@angular/core';
import { NgOptimizedImage } from '@angular/common';
import { TranslocoDirective } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { heroBanknotes, heroChatBubbleLeftRight, heroQrCode } from '@ng-icons/heroicons/outline';
import { Card } from 'components/card/card';

/**
 * Mise en page des pages hors session (connexion, changement de mot de passe) : panneau de marque animé à gauche sur
 * grand écran, carte avec le logo et le contenu de la page à droite.
 */
@Component({
  selector: 'bo-auth-layout',
  imports: [NgOptimizedImage, TranslocoDirective, NgIcon, Card],
  providers: [provideIcons({ heroBanknotes, heroChatBubbleLeftRight, heroQrCode })],
  templateUrl: './auth-layout.html',
})
export class AuthLayout {
  /** Gares du tracé décoratif (noms propres, non traduits), placées sur la ligne du dessin. */
  protected readonly stops = [
    { name: 'Dakar', x: 30, y: 200 },
    { name: 'Thiès', x: 140, y: 150 },
    { name: 'Touba', x: 250, y: 110 },
    { name: 'Saint-Louis', x: 370, y: 40 },
  ] as const;
}
