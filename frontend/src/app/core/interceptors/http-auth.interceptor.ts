import {
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn,
  HttpEvent,
} from '@angular/common/http';
import { Observable } from 'rxjs';
import { inject } from '@angular/core';
import { AuthService } from '../auth/auth.service';

/**
 * HTTP Auth Interceptor
 * Adds JWT token to all API requests if available
 */
export const httpAuthInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
): Observable<HttpEvent<unknown>> => {
  const authService = inject(AuthService);

  const token = authService.getToken();

  if (!token) {
    return next(req);
  }

  // Check if this is a multipart request (file upload)
  const isMultipart = req.body instanceof FormData;

  // Clone the request and add the authorization header
  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`,
      // Don't set Content-Type for multipart requests - browser sets it with boundary
      ...(isMultipart ? {} : {
        'Content-Type': req.headers.get('Content-Type') || 'application/json',
      }),
    },
  });

  return next(authReq);
};
