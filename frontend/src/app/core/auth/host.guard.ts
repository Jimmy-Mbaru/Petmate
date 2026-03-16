import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

/** Allows access only when the user is logged in and has role HOST. */
export const HostGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.getCurrentUser();
  if (currentUser?.role === 'HOST') {
    return true;
  }

  if (currentUser) {
    // Logged in but not host
    if (currentUser.role === 'ADMIN') {
      router.navigate(['/app/admin/dashboard']);
    } else if (currentUser.role === 'OWNER') {
      router.navigate(['/app/dashboard']);
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
