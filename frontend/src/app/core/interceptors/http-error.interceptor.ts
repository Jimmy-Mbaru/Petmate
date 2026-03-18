import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
  HttpErrorResponse,
} from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { inject } from '@angular/core';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../auth/auth.service';

/**
 * HTTP Error Interceptor
 * Handles HTTP errors globally:
 * - 401: Unauthorized - clear auth and redirect to login
 * - 403: Forbidden - show error toast, optionally redirect
 * - 404: Not Found - show error toast
 * - 500: Server Error - show error toast
 * - Other errors - show generic error toast
 */
export const httpErrorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const router = inject(Router);
  const toastService = inject(ToastService);
  const authService = inject(AuthService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      let errorMessage = 'An unexpected error occurred';
      let shouldRedirect = false;
      let redirectUrl = '/';

      if (error.error instanceof ErrorEvent) {
        // Client-side error
        errorMessage = error.error.message || 'Network error. Please check your connection.';
      } else {
        // Server-side error
        switch (error.status) {
          case 401:
            errorMessage = 'Session expired. Please login again.';
            authService.logout();
            shouldRedirect = true;
            redirectUrl = '/auth/login';
            break;
          case 403:
            errorMessage = error.error?.message || 'You do not have permission to access this resource.';
            // Don't redirect on 403, let the user stay on current page
            break;
          case 404:
            // Don't show toast for API 404s — components handle "not found" themselves
            // (e.g. "no profile yet" is an expected 404, not an error worth alerting)
            return throwError(() => error);
          case 410:
            errorMessage = 'The requested resource no longer exists.';
            break;
          case 409:
            errorMessage = 'Conflict: The resource already exists or is in use.';
            break;
          case 422:
            errorMessage = 'Validation failed. Please check your input.';
            if (error.error?.message) {
              errorMessage = error.error.message;
            }
            break;
          case 500:
            errorMessage = 'Internal server error. Please try again later.';
            break;
          case 502:
            errorMessage = 'Bad gateway. The server is temporarily unavailable.';
            break;
          case 503:
            errorMessage = 'Service unavailable. Please try again later.';
            break;
          default:
            errorMessage = error.error?.message || `Error: ${error.status}`;
            break;
        }
      }

      // Show error toast (use friendlier title for 403 email verification)
      const toastTitle = error.status === 403 && typeof errorMessage === 'string' && errorMessage.toLowerCase().includes('verify')
        ? 'Verification required'
        : 'Error';
      toastService.error(toastTitle, errorMessage);

      // Redirect if needed
      if (shouldRedirect) {
        setTimeout(() => {
          router.navigateByUrl(redirectUrl);
        }, 1500);
      }

      return throwError(() => error);
    })
  );
};
