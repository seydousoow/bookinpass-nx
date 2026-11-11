import { Component, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NgOptimizedImage, NgTemplateOutlet } from '@angular/common';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter, map } from 'rxjs';
import { CdkTrapFocus } from '@angular/cdk/a11y';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  heroArrowRightOnRectangle,
  heroArrowsRightLeft,
  heroBanknotes,
  heroBars3,
  heroBriefcase,
  heroCalendarDays,
  heroChevronDoubleLeft,
  heroChevronDoubleRight,
  heroClock,
  heroExclamationTriangle,
  heroMap,
  heroSquares2x2,
  heroStar,
  heroTicket,
  heroUsers,
  heroXMark,
} from '@ng-icons/heroicons/outline';
import { Button } from 'components/button/button';
import { Overlay } from 'components/overlay/overlay';
import { lockScrollWhile } from 'components/scroll-lock/scroll-lock';
import { Session } from '../../core/session';
import { StaffRole } from '../../core/models';
import { BackofficeLang, saveLang } from '../../core/lang';
import { CHIEFS, MANAGERS } from '../../app.routes';
import { ToastOutlet } from '../../ui/toasts';

interface Section {
  readonly key: string;
  readonly route: string;
  readonly icon: string;
  /** Rôles qui voient la section ; sans rôles, tout le personnel. */
  readonly roles?: readonly StaffRole[];
}

interface SectionGroup {
  readonly key: string;
  readonly sections: readonly Section[];
}

/** Menu du back-office, groupé par métier (brief §3) ; les routes et les rôles sont ceux de `app.routes`. */
const GROUPS: readonly SectionGroup[] = [
  {
    key: 'workspace',
    sections: [
      { key: 'home', route: '/', icon: 'heroSquares2x2' },
      { key: 'departures', route: '/departures', icon: 'heroClock' },
      { key: 'luggage', route: '/luggage', icon: 'heroBriefcase', roles: CHIEFS },
      { key: 'incidents', route: '/incidents', icon: 'heroExclamationTriangle' },
    ],
  },
  {
    key: 'sales',
    sections: [
      { key: 'bookings', route: '/bookings', icon: 'heroTicket' },
      { key: 'refunds', route: '/refunds', icon: 'heroBanknotes', roles: MANAGERS },
    ],
  },
  {
    key: 'tourism',
    sections: [
      { key: 'activities', route: '/activities', icon: 'heroMap', roles: MANAGERS },
      { key: 'activity-bookings', route: '/activity-bookings', icon: 'heroCalendarDays', roles: MANAGERS },
      { key: 'activity-reviews', route: '/activity-reviews', icon: 'heroStar', roles: MANAGERS },
    ],
  },
  {
    key: 'configuration',
    sections: [
      { key: 'routes', route: '/routes', icon: 'heroArrowsRightLeft', roles: MANAGERS },
      { key: 'staff', route: '/staff', icon: 'heroUsers', roles: MANAGERS },
    ],
  },
];

/** Préférence « menu replié », retenue sur l'appareil. */
const COLLAPSED_KEY = 'bo.sidebar-collapsed';

function readCollapsed(): boolean {
  try {
    return localStorage.getItem(COLLAPSED_KEY) === '1';
  } catch {
    return false;
  }
}

/** Section d'une adresse : la plus longue route qui la préfixe (`/departures/12` → Départs). */
export function sectionOf(url: string, sections: readonly Section[]): Section | undefined {
  const path = url.split(/[?#]/)[0];
  return [...sections].sort((a, b) => b.route.length - a.route.length).find((s) => (s.route === '/' ? path === '/' : path === s.route || path.startsWith(s.route + '/')));
}

/**
 * Coquille du back-office : menu latéral groupé (repliable sur ordinateur, tiroir sur mobile), barre du haut (section
 * courante, langue, membre connecté, déconnexion), puis la page.
 */
@Component({
  selector: 'bo-shell',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, NgOptimizedImage, NgTemplateOutlet, CdkTrapFocus, TranslocoDirective, NgIcon, Button, Overlay, ToastOutlet],
  providers: [
    provideIcons({
      heroArrowRightOnRectangle,
      heroArrowsRightLeft,
      heroBanknotes,
      heroBars3,
      heroBriefcase,
      heroCalendarDays,
      heroChevronDoubleLeft,
      heroChevronDoubleRight,
      heroClock,
      heroExclamationTriangle,
      heroMap,
      heroSquares2x2,
      heroStar,
      heroTicket,
      heroUsers,
      heroXMark,
    }),
  ],
  templateUrl: './main.html',
})
export class Main {
  protected readonly session = inject(Session);
  protected readonly languages: BackofficeLang[] = ['fr', 'en'];
  /** Groupes et sections permis par le rôle ; un groupe vide disparaît. */
  protected readonly groups = computed(() =>
    GROUPS.map((group) => ({ ...group, sections: group.sections.filter((s) => !s.roles || this.session.has(...s.roles)) })).filter((group) => group.sections.length),
  );
  protected readonly collapsed = signal(readCollapsed());
  /** Tiroir du menu, sur mobile et tablette. */
  protected readonly menuOpen = signal(false);
  protected readonly leaving = signal(false);
  private readonly router = inject(Router);
  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event) => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
    ),
    { initialValue: this.router.url },
  );
  /** Section et groupe de la page affichée, pour la barre du haut. */
  protected readonly current = computed(() => {
    const groups = this.groups();
    const section = sectionOf(
      this.url(),
      groups.flatMap((g) => g.sections),
    );
    const group = section && groups.find((g) => g.sections.includes(section));
    return section && group ? { section, group } : null;
  });
  protected readonly initials = computed(() =>
    (this.session.user()?.full_name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0].toUpperCase())
      .join(''),
  );
  private readonly transloco = inject(TranslocoService);
  protected readonly lang = signal(this.transloco.getActiveLang());

  constructor() {
    lockScrollWhile(this.menuOpen);
  }

  protected toggleCollapsed(): void {
    const next = !this.collapsed();
    this.collapsed.set(next);
    try {
      localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0');
    } catch {
      // Stockage indisponible (navigation privée) : la préférence vaut pour la session.
    }
  }

  /** Langue choisie dans la barre du haut : appliquée et retenue sur l'appareil. */
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
