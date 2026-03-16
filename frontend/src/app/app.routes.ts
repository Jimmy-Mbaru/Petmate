import { Routes } from '@angular/router';
import { AdminGuard } from './core/auth/admin.guard';
import { OwnerGuard } from './core/auth/owner.guard';
import { HostGuard } from './core/auth/host.guard';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/landing/landing.component').then((m) => m.LandingComponent),
  },
  {
    path: 'auth/login',
    loadComponent: () => import('./pages/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'auth/register',
    loadComponent: () =>
      import('./pages/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'auth/forgot-password',
    loadComponent: () =>
      import('./pages/auth/forgot-password/forgot-password.component').then(
        (m) => m.ForgotPasswordComponent,
      ),
  },
  {
    path: 'auth/reset-password',
    loadComponent: () =>
      import('./pages/auth/reset-password/reset-password.component').then(
        (m) => m.ResetPasswordComponent,
      ),
  },
  {
    path: 'auth/verify-email',
    loadComponent: () =>
      import('./pages/auth/verify-email/verify-email.component').then(
        (m) => m.VerifyEmailComponent,
      ),
  },
  {
    path: 'store',
    loadComponent: () => import('./pages/store/store.component').then((m) => m.StoreComponent),
  },
  {
    path: 'boarding',
    loadComponent: () =>
      import('./pages/boarding/boarding.component').then((m) => m.BoardingComponent),
  },
  {
    path: 'app',
    canActivate: [OwnerGuard],
    loadComponent: () =>
      import('./owner/owner-shell/owner-shell.component').then((m) => m.OwnerShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./owner/owner-dashboard/owner-dashboard.component').then(
            (m) => m.OwnerDashboardComponent,
          ),
      },
      {
        path: 'pets',
        loadComponent: () =>
          import('./owner/owner-pets/owner-pets.component').then((m) => m.OwnerPetsComponent),
      },
      {
        path: 'pets/new',
        loadComponent: () =>
          import('./owner/owner-pet-form/owner-pet-form.component').then(
            (m) => m.OwnerPetFormComponent,
          ),
      },
      {
        path: 'pets/:id',
        loadComponent: () =>
          import('./owner/pet-detail/pet-detail.component').then((m) => m.PetDetailComponent),
      },
      {
        path: 'pets/:id/edit',
        loadComponent: () =>
          import('./owner/owner-pet-form/owner-pet-form.component').then(
            (m) => m.OwnerPetFormComponent,
          ),
      },
      {
        path: 'matches',
        loadComponent: () =>
          import('./owner/owner-matches/owner-matches.component').then(
            (m) => m.OwnerMatchesComponent,
          ),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./owner/owner-bookings/owner-bookings.component').then(
            (m) => m.OwnerBookingsComponent,
          ),
      },
      {
        path: 'favorites',
        loadComponent: () =>
          import('./owner/owner-favorites/owner-favorites.component').then(
            (m) => m.OwnerFavoritesComponent,
          ),
      },
      {
        path: 'wishlist',
        loadComponent: () =>
          import('./owner/owner-wishlist/owner-wishlist.component').then(
            (m) => m.OwnerWishlistComponent,
          ),
      },
      {
        path: 'boarding',
        loadComponent: () =>
          import('./pages/boarding/boarding.component').then((m) => m.BoardingComponent),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./owner/owner-chat/owner-chat.component').then((m) => m.OwnerChatComponent),
      },
      {
        path: 'store',
        loadComponent: () => import('./pages/store/store.component').then((m) => m.StoreComponent),
      },
      {
        path: 'store/orders',
        loadComponent: () =>
          import('./pages/store/my-orders/my-orders.component').then((m) => m.MyOrdersComponent),
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./pages/profile/user-profile/user-profile.component').then(
            (m) => m.UserProfileComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./owner/owner-profile/owner-profile.component').then(
            (m) => m.OwnerProfileComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./owner/owner-settings/owner-settings.component').then(
            (m) => m.OwnerSettingsComponent,
          ),
      },
    ],
  },
  {
    path: 'app/admin',
    canActivate: [AdminGuard],
    loadComponent: () => import('./pages/admin/admin.component').then((m) => m.AdminComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/admin/dashboard/admin-dashboard.component').then(
            (m) => m.AdminDashboardComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/admin/users/users.component').then((m) => m.AdminUsersComponent),
      },
      {
        path: 'boarding',
        loadComponent: () =>
          import('./pages/admin/boarding/boarding.component').then((m) => m.AdminBoardingComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/admin/reports/reports.component').then((m) => m.AdminReportsComponent),
      },
      {
        path: 'store',
        loadComponent: () =>
          import('./pages/admin/store/store.component').then((m) => m.AdminStoreComponent),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./pages/admin/chat/chat.component').then((m) => m.AdminChatComponent),
      },
      {
        path: 'system-stats',
        loadComponent: () =>
          import('./pages/admin/system-stats/system-stats.component').then(
            (m) => m.SystemStatsComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./pages/admin/admin-profile/admin-profile.component').then(
            (m) => m.AdminProfileComponent,
          ),
      },
    ],
  },
  {
    path: 'app/host',
    canActivate: [HostGuard],
    loadComponent: () =>
      import('./host/host-shell/host-shell.component').then((m) => m.HostShellComponent),
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./host/host-dashboard/host-dashboard.component').then(
            (m) => m.HostDashboardComponent,
          ),
      },
      {
        path: 'bookings',
        loadComponent: () =>
          import('./host/host-bookings/host-bookings.component').then(
            (m) => m.HostBookingsComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./host/host-profile/host-profile.component').then((m) => m.HostProfileComponent),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./host/host-settings/host-settings.component').then(
            (m) => m.HostSettingsComponent,
          ),
      },
      {
        path: 'chat',
        loadComponent: () =>
          import('./host/host-chat/host-chat.component').then((m) => m.HostChatComponent),
      },
      {
        path: 'store',
        loadComponent: () => import('./pages/store/store.component').then((m) => m.StoreComponent),
      },
      {
        path: 'store/orders',
        loadComponent: () =>
          import('./pages/store/my-orders/my-orders.component').then((m) => m.MyOrdersComponent),
      },
      {
        path: 'wishlist',
        loadComponent: () =>
          import('./owner/owner-wishlist/owner-wishlist.component').then(
            (m) => m.OwnerWishlistComponent,
          ),
      },
      {
        path: 'users/:id',
        loadComponent: () =>
          import('./pages/profile/user-profile/user-profile.component').then(
            (m) => m.UserProfileComponent,
          ),
      },
    ],
  },
  {
    path: '404',
    loadComponent: () =>
      import('./pages/not-found/not-found.component').then((m) => m.NotFoundComponent),
  },
  { path: '**', redirectTo: '404' },
];
