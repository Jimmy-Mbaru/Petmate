import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError, timer } from 'rxjs';
import { catchError, retry, tap } from 'rxjs/operators';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../auth/auth.service';
import { BackendStatusService } from '../services/backend-status.service';

const SERVER_DOWN_STATUSES = new Set([0, 502, 503]);
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 7000;

export const httpErrorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);
  const toastService = inject(ToastService);
  const authService = inject(AuthService);
  const backendStatus = inject(BackendStatusService);

  // Skip retry + status tracking for health-check polls (avoid infinite loop)
  const isHealthCheck = req.url.includes('/health');

  return next(req).pipe(
    // Auto-retry on server-down errors before showing any toast
    isHealthCheck
      ? tap()
      : retry({
          count: MAX_RETRIES,
          delay: (error: HttpErrorResponse, retryCount: number) => {
            if (!SERVER_DOWN_STATUSES.has(error.status)) {
              return throwError(() => error);
            }
            backendStatus.markDown();
            return timer(retryCount * RETRY_DELAY_MS);
          },
        }),
    // On success after retries, mark backend as recovered
    tap(() => {
      if (!isHealthCheck && backendStatus.isDown()) backendStatus.markUp();
    }),
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';
      let shouldRedirect = false;
      let redirectUrl = '/';

      if (error.error instanceof ErrorEvent) {
        errorMessage = error.error.message || 'Network error. Please check your connection.';
      } else {
        switch (error.status) {
          case 0:
          case 502:
          case 503:
            // Already handled by banner — don't double-toast
            return throwError(() => error);
          case 401:
            errorMessage = 'Session expired. Please login again.';
            authService.logout();
            shouldRedirect = true;
            redirectUrl = '/auth/login';
            break;
          case 403:
            errorMessage = error.error?.message || 'You do not have permission to access this resource.';
            break;
          case 404:
            // Expected 404s handled by components
            return throwError(() => error);
          case 410:
            errorMessage = 'The requested resource no longer exists.';
            break;
          case 409:
            errorMessage = 'Conflict: The resource already exists or is in use.';
            break;
          case 422:
            errorMessage = error.error?.message || 'Validation failed. Please check your input.';
            break;
          case 500:
            errorMessage = 'Internal server error. Please try again later.';
            break;
          default:
            errorMessage = error.error?.message || `Error: ${error.status}`;
            break;
        }
      }

      const toastTitle =
        error.status === 403 &&
        typeof errorMessage === 'string' &&
        errorMessage.toLowerCase().includes('verify')
          ? 'Verification required'
          : 'Error';
      toastService.error(toastTitle, errorMessage);

      if (shouldRedirect) {
        setTimeout(() => router.navigateByUrl(redirectUrl), 1500);
      }

      return throwError(() => error);
    })
  );
};
