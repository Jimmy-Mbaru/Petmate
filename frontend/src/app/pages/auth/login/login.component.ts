import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterLink, ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';
import { BackendStatusService } from '../../../core/services/backend-status.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
})
export class LoginComponent implements OnInit, OnDestroy {
  email = '';
  password = '';
  rememberMe = false;
  showPassword = false;
  isLoading = false;
  isServerWakingUp = false;
  errorMessage = '';
  showSuccessMessage = false;
  returnUrl = '/';
  emailTouched = false;
  passwordTouched = false;

  private slowTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(
    private router: Router,
    private route: ActivatedRoute,
    private authService: AuthService,
    private toast: ToastService,
    private backendStatus: BackendStatusService
  ) {}

  ngOnInit(): void {
    this.returnUrl = this.route.snapshot.queryParams['returnUrl'] || '/';
    // Pre-warm the server so it wakes up while the user is typing
    this.backendStatus.warmUp();
  }

  ngOnDestroy(): void {
    if (this.slowTimer) clearTimeout(this.slowTimer);
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onEmailBlur(): void {
    this.emailTouched = true;
  }

  onPasswordBlur(): void {
    this.passwordTouched = true;
  }

  get emailRequired(): boolean {
    return this.emailTouched && !this.email?.trim();
  }

  get passwordRequired(): boolean {
    return this.passwordTouched && !this.password;
  }

  onSubmit(): void {
    this.emailTouched = true;
    this.passwordTouched = true;
    if (!this.email?.trim() || !this.password) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    this.isLoading = true;
    this.isServerWakingUp = false;
    this.errorMessage = '';

    // Show a hint if the server takes more than 5s (likely cold start)
    this.slowTimer = setTimeout(() => { this.isServerWakingUp = true; }, 5000);

    this.authService.login({ email: this.email, password: this.password }).subscribe({
      next: () => {
        if (this.slowTimer) { clearTimeout(this.slowTimer); this.slowTimer = null; }
        this.isLoading = false;
        this.isServerWakingUp = false;
        this.showSuccessMessage = true;
        this.toast.success('Welcome back', 'You have signed in successfully.');
        const user = this.authService.getCurrentUser();
        const target = this.getRedirectTarget(user?.role, this.returnUrl);
        setTimeout(() => {
          this.router.navigateByUrl(target);
        }, 800);
      },
      error: (error) => {
        if (this.slowTimer) { clearTimeout(this.slowTimer); this.slowTimer = null; }
        this.isLoading = false;
        this.isServerWakingUp = false;
        const msg = this.getErrorMessage(error);
        this.errorMessage = msg;
        this.toast.error('Login failed', msg);
      },
    });
  }

  /** Role-based redirect: admin -> /app/admin/dashboard, host -> /app/host/dashboard, owner -> /app/dashboard. Respects returnUrl only when it matches role. */
  private getRedirectTarget(role: string | undefined, returnUrl: string): string {
    const defaultAdmin = '/app/admin/dashboard';
    const defaultHost = '/app/host/dashboard';
    const defaultOwner = '/app/dashboard';
    
    if (role === 'ADMIN') {
      if (returnUrl && returnUrl !== '/' && returnUrl.startsWith('/app/admin')) return returnUrl;
      return defaultAdmin;
    }
    if (role === 'HOST') {
      if (returnUrl && returnUrl !== '/' && returnUrl.startsWith('/app/host')) return returnUrl;
      return defaultHost;
    }
    if (role === 'OWNER') {
      if (returnUrl && returnUrl !== '/' && (returnUrl.startsWith('/app/') && !returnUrl.startsWith('/app/admin') && !returnUrl.startsWith('/app/host'))) return returnUrl;
      return defaultOwner;
    }
    return returnUrl && returnUrl !== '/' ? returnUrl : defaultOwner;
  }

  private getErrorMessage(error: { error?: { message?: string | string[] }; message?: string }): string {
    const m = error?.error?.message;
    if (Array.isArray(m)) return m.join(' ');
    if (typeof m === 'string') return m;
    return error?.message ?? 'Something went wrong. Please try again.';
  }

  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  onSocialLogin(provider: string): void {
    console.log(`Login with ${provider}`);
    // Implement social login logic here
  }
}
