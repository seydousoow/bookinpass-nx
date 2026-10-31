import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, TitleStrategy, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { appRoutes } from './app.routes';
import { APP_CONFIG, AppTitleStrategy, environment, langInterceptor, provideAppIcons, provideI18n, runtimeConfig } from 'configs';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideRouter(appRoutes, withComponentInputBinding(), withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' })),

    provideHttpClient(withInterceptors([langInterceptor])),

    provideI18n(),
    provideAppIcons(),

    { provide: APP_CONFIG, useValue: runtimeConfig(environment) },
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
