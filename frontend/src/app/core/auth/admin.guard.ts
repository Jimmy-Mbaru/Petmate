import { inject } from '@angular/core';
import { Router, CanActivateFn } from '@angular/router';
import { AuthService } from './auth.service';

/** Allows access only when the user is logged in and has role ADMIN. */
export const AdminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  const currentUser = authService.getCurrentUser();
  if (currentUser?.role === 'ADMIN') {
    return true;
  }

  if (currentUser) {
    // Logged in but not admin -> redirect to owner dashboard
    router.navigate(['/app/dashboard']);
    return false;
  }

  router.navigate(['/auth/login'], {
    queryParams: { returnUrl: state.url },
  });
  return false;
};
