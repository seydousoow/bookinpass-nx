import { ApplicationConfig, inject, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, TitleStrategy, withComponentInputBinding, withInMemoryScrolling } from '@angular/router';
import { appRoutes } from './app.routes';
import { APP_CONFIG, AppTitleStrategy, environment, langInterceptor, provideI18n, runtimeConfig } from 'configs';
import { provideNgIconLoader, provideNgIconsConfig, withCaching } from '@ng-icons/core';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';

const fetchIcon = (name: string) => {
  const http = inject(HttpClient);
  return http.get(`/svg/${name}.svg`, { responseType: 'text' });
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),

    provideRouter(
      appRoutes,
      withComponentInputBinding(),
      withInMemoryScrolling({ scrollPositionRestoration: 'enabled', anchorScrolling: 'enabled' }),
    ),

    provideHttpClient(withInterceptors([langInterceptor])),

    provideI18n(),
    provideNgIconsConfig({ size: '1.2rem' }),
    provideNgIconLoader((name) => fetchIcon(name), withCaching()),

    { provide: APP_CONFIG, useValue: runtimeConfig(environment) },
    { provide: TitleStrategy, useClass: AppTitleStrategy },
  ],
};
