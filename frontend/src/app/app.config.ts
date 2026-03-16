import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';

import { routes } from './app.routes';
import { httpAuthInterceptor } from './core/interceptors/http-auth.interceptor';
import { httpErrorInterceptor } from './core/interceptors/http-error.interceptor';
import { httpLoadingInterceptor } from './core/interceptors/http-loading.interceptor';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(
      routes,
      withInMemoryScrolling({
        scrollPositionRestoration: 'enabled',
        anchorScrolling: 'enabled',
      })
    ),
    provideHttpClient(
      withInterceptors([
        httpAuthInterceptor,
        httpErrorInterceptor,
        httpLoadingInterceptor,
      ])
    ),
  ],
};
