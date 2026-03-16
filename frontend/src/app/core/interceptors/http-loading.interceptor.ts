import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpResponse,
} from '@angular/common/http';
import { Observable, finalize, tap } from 'rxjs';
import { inject } from '@angular/core';
import { LoadingService } from '../services/loading.service';

/**
 * HTTP Loading Interceptor
 * Shows loading indicator for requests that take longer than a threshold
 */
export const httpLoadingInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const loadingService = inject(LoadingService);

  // Skip loading indicator for certain request types
  const skipLoadingMethods = ['GET'];
  const skipLoadingUrls = ['/auth/login', '/auth/register', '/users/profile'];

  const shouldSkipLoading =
    skipLoadingMethods.includes(req.method) ||
    skipLoadingUrls.some((url) => req.url.includes(url));

  if (shouldSkipLoading) {
    return next(req);
  }

  // Show loading indicator
  loadingService.show();

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        loadingService.hide();
      }
    }),
    finalize(() => {
      loadingService.hide();
    })
  );
};
