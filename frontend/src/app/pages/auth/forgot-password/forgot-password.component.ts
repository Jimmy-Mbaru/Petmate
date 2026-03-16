import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './forgot-password.component.html',
})
export class ForgotPasswordComponent {
  email = '';
  isLoading = signal(false);
  isSubmitted = signal(false);

  constructor(
    private authService: AuthService,
    private toast: ToastService
  ) {}

  onSubmit(): void {
    if (!this.email) {
      this.toast.error('Validation', 'Please enter your email address');
      return;
    }

    this.isLoading.set(true);
    this.authService.requestPasswordReset(this.email).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSubmitted.set(true);
        this.toast.success('Success', 'If an account exists, a reset link has been sent.');
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error('Error', err.error?.message || 'Failed to request password reset');
      }
    });
  }
}
