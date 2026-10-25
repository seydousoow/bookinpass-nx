import { ApplicationConfig, isDevMode, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideTransloco } from '@jsverse/transloco';
// Par fichier, pas par le barrel 'configs' : il entraînerait la configuration i18n du site (messageformat, locale)
// dans le chargement initial.
import { APP_CONFIG, runtimeConfig } from 'configs/configs/app-config.token';
import { environment } from 'configs/configs/environment';
import { provideAppIcons } from 'configs/configs/icons.provider';
import { HttpTranslocoLoader } from 'configs/translation/transloco-loader';
import { appRoutes } from './app.routes';
import { credentialsInterceptor, signedOutInterceptor } from './core/session';
import { savedLang } from './core/lang';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(appRoutes, withComponentInputBinding()),
    provideHttpClient(withInterceptors([credentialsInterceptor, signedOutInterceptor])),
    // URL de l'API : celle du déploiement (`/env.js`), `/api` à défaut.
    { provide: APP_CONFIG, useFactory: () => runtimeConfig(environment) },
    provideTransloco({
      config: { availableLangs: ['fr', 'en'], defaultLang: savedLang(), fallbackLang: 'fr', reRenderOnLangChange: true, prodMode: !isDevMode() },
      loader: HttpTranslocoLoader,
    }),
    provideAppIcons(),
  ],
};
