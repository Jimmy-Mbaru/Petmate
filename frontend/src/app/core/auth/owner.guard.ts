import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

/** Allows access to /app (owner area) only when the user is OWNER. HOSTs must use /app/host. Admins must use /app/admin. */
export const OwnerGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.getCurrentUser();
  if (currentUser?.role === 'OWNER') {
    return true;
  }

  if (currentUser) {
    // Logged in but not owner - redirect to appropriate dashboard
    if (currentUser.role === 'HOST') {
      router.navigate(['/app/host/dashboard']);
    } else if (currentUser.role === 'ADMIN') {
      router.navigate(['/app/admin/dashboard']);
    } else {
      router.navigate(['/app/dashboard']);
    }
    return false;
  }

  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};
