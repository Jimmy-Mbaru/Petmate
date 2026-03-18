import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule, NgClass } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, NgClass, RouterLink, FormsModule],
  templateUrl: './register.component.html',
})
export class RegisterComponent implements OnInit {
  firstName = '';
  lastName = '';
  email = '';
  password = '';
  confirmPassword = '';
  selectedRole: 'OWNER' | 'HOST' = 'OWNER';
  agreeToTerms = false;
  showPassword = false;
  showConfirmPassword = false;
  isLoading = false;
  errorMessage = '';
  showSuccessMessage = false;
  passwordStrength: 'weak' | 'medium' | 'strong' = 'weak';
  firstNameTouched = false;
  lastNameTouched = false;
  emailTouched = false;
  passwordTouched = false;
  confirmPasswordTouched = false;

  constructor(
    private router: Router,
    private authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {}

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  toggleConfirmPassword(): void {
    this.showConfirmPassword = !this.showConfirmPassword;
  }

  markAllTouched(): void {
    this.firstNameTouched = true;
    this.lastNameTouched = true;
    this.emailTouched = true;
    this.passwordTouched = true;
    this.confirmPasswordTouched = true;
  }

  get firstNameRequired(): boolean {
    return this.firstNameTouched && !this.firstName?.trim();
  }
  get lastNameRequired(): boolean {
    return this.lastNameTouched && !this.lastName?.trim();
  }
  get emailRequired(): boolean {
    return this.emailTouched && !this.email?.trim();
  }
  get passwordRequired(): boolean {
    return this.passwordTouched && !this.password;
  }
  get confirmPasswordRequired(): boolean {
    return this.confirmPasswordTouched && !this.confirmPassword;
  }

  protected get passwordsMismatch(): boolean {
    return !!this.confirmPassword && this.password !== this.confirmPassword;
  }

  checkPasswordStrength(): void {
    const length = this.password.length;
    const hasUpperCase = /[A-Z]/.test(this.password);
    const hasLowerCase = /[a-z]/.test(this.password);
    const hasNumbers = /\d/.test(this.password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(this.password);

    const score = length + (hasUpperCase ? 1 : 0) + (hasLowerCase ? 1 : 0) + (hasNumbers ? 1 : 0) + (hasSpecialChar ? 1 : 0);

    if (score >= 10) {
      this.passwordStrength = 'strong';
    } else if (score >= 6) {
      this.passwordStrength = 'medium';
    } else {
      this.passwordStrength = 'weak';
    }
  }

  onSubmit(): void {
    this.markAllTouched();
    if (!this.firstName?.trim() || !this.lastName?.trim() || !this.email?.trim() || !this.password || !this.confirmPassword) {
      this.errorMessage = 'Please fill in all fields';
      return;
    }

    if (!this.isValidEmail(this.email)) {
      this.errorMessage = 'Please enter a valid email address';
      return;
    }

    if (this.password.length < 6) {
      this.errorMessage = 'Password must be at least 6 characters long';
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Passwords do not match';
      return;
    }

    if (!this.agreeToTerms) {
      this.errorMessage = 'You must agree to the Terms and Privacy Policy';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.authService.register({
      email: this.email,
      password: this.password,
      firstName: this.firstName,
      lastName: this.lastName,
      role: this.selectedRole,
    }).subscribe({
      next: () => {
        this.isLoading = false;
        this.showSuccessMessage = true;
        this.toast.success('Account created', 'Please check your email to verify your account!');
        setTimeout(() => {
          // Redirect to verify email page with a note
          this.router.navigate(['/auth/verify-email'], { queryParams: { sent: 'true', email: this.email } });
        }, 2000);
      },
      error: (error) => {
        this.isLoading = false;
        const msg = this.getErrorMessage(error);
        this.errorMessage = msg;
        this.toast.error('Registration failed', msg);
      },
    });
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
    console.log(`Register with ${provider}`);
    // Implement social login logic here
  }
}
