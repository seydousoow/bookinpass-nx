import { Component, computed, inject, signal } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { Header, NavEntry } from 'components/header/header';
import { Button } from 'components/button/button';
import { Session } from '../../core/session';
import { StaffRole } from '../../core/models';
import { BackofficeLang, saveLang } from '../../core/lang';
import { CHIEFS, MANAGERS } from '../../app.routes';

interface Section {
  readonly key: string;
  readonly route: string;
  /** Rôles qui voient la section ; sans rôles, tout le personnel. */
  readonly roles?: readonly StaffRole[];
}

const SECTIONS: readonly Section[] = [
  { key: 'departures', route: '/' },
  { key: 'scan', route: '/scan' },
  { key: 'luggage', route: '/luggage', roles: CHIEFS },
  { key: 'incidents', route: '/incidents' },
  { key: 'bookings', route: '/bookings' },
  { key: 'refunds', route: '/refunds', roles: MANAGERS },
  { key: 'activities', route: '/activities', roles: MANAGERS },
  { key: 'activity-bookings', route: '/activity-bookings', roles: MANAGERS },
  { key: 'activity-reviews', route: '/activity-reviews', roles: MANAGERS },
  { key: 'routes', route: '/routes', roles: MANAGERS },
  { key: 'staff', route: '/staff', roles: MANAGERS },
];

/** En-tête du site (bip-header) : sections permises par le rôle, langue ; membre connecté, gare et déconnexion. */
@Component({
  selector: 'bo-shell',
  imports: [RouterOutlet, TranslocoDirective, Header, Button],
  templateUrl: './shell.html',
})
export class Shell {
  protected readonly session = inject(Session);
  protected readonly languages: BackofficeLang[] = ['fr', 'en'];
  protected readonly entries = computed<readonly NavEntry[]>(() =>
    SECTIONS.filter((section) => !section.roles || this.session.has(...section.roles)).map((section) => ({ labelKey: `nav.${section.key}`, route: section.route })),
  );
  protected readonly leaving = signal(false);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  protected readonly lang = signal(this.transloco.getActiveLang());

  /** Langue choisie dans l'en-tête : appliquée et retenue sur l'appareil. */
  protected changeLang(lang: string): void {
    const next: BackofficeLang = lang === 'en' ? 'en' : 'fr';
    this.lang.set(next);
    this.transloco.setActiveLang(next);
    saveLang(next);
  }

  protected logout(): void {
    if (this.leaving()) {
      return;
    }
    this.leaving.set(true);
    this.session.logout().subscribe(() => void this.router.navigate(['/login']));
  }
}
