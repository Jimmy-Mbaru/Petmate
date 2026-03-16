import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './reset-password.component.html',
})
export class ResetPasswordComponent implements OnInit {
  token = '';
  password = '';
  confirmPassword = '';
  isLoading = signal(false);
  isSuccess = signal(false);
  showPassword = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.toast.error('Error', 'Invalid or missing reset token');
      this.router.navigate(['/auth/login']);
    }
  }

  togglePassword(): void {
    this.showPassword = !this.showPassword;
  }

  onSubmit(): void {
    if (!this.password || this.password.length < 6) {
      this.toast.error('Validation', 'Password must be at least 6 characters long');
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.toast.error('Validation', 'Passwords do not match');
      return;
    }

    this.isLoading.set(true);
    this.authService.resetPassword(this.token, this.password).subscribe({
      next: () => {
        this.isLoading.set(false);
        this.isSuccess.set(true);
        this.toast.success('Success', 'Your password has been reset successfully.');
        setTimeout(() => this.router.navigate(['/auth/login']), 3000);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.toast.error('Error', err.error?.message || 'Failed to reset password');
      }
    });
  }
}
