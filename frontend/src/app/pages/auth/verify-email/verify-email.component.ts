import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink, FormsModule],
  templateUrl: './verify-email.component.html',
})
export class VerifyEmailComponent implements OnInit {
  isVerifying = true;
  isSuccess = false;
  isError = false;
  isEmailSent = false;
  emailSentTo = '';
  errorMessage = '';
  resendEmail = '';
  isResending = false;
  resendSent = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private authService: AuthService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    const token = this.route.snapshot.queryParamMap.get('token');
    const sent = this.route.snapshot.queryParamMap.get('sent');
    const email = this.route.snapshot.queryParamMap.get('email');
    
    // If coming from registration (email sent state)
    if (sent === 'true') {
      this.isVerifying = false;
      this.isEmailSent = true;
      this.emailSentTo = email || '';
      return;
    }
    
    if (!token) {
      this.isVerifying = false;
      this.isError = true;
      this.errorMessage = 'Verification token is missing';
      this.toast.error('Verification failed', 'Missing verification token');
      return;
    }

    this.verifyEmail(token);
  }

  verifyEmail(token: string): void {
    this.isVerifying = true;
    this.authService.verifyEmail(token).subscribe({
      next: () => {
        this.isVerifying = false;
        this.isSuccess = true;
        this.toast.success('Email verified', 'Your email has been verified successfully!');
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
          this.router.navigate(['/app/dashboard']);
        }, 3000);
      },
      error: (error) => {
        this.isVerifying = false;
        this.isError = true;
        this.errorMessage = this.getErrorMessage(error);
        this.toast.error('Verification failed', this.errorMessage);
      },
    });
  }

  private getErrorMessage(error: { error?: { message?: string | string[] }; message?: string }): string {
    const m = error?.error?.message;
    if (Array.isArray(m)) return m.join(' ');
    if (typeof m === 'string') return m;
    return error?.message ?? 'Verification failed. Please try again.';
  }

  resendVerification(): void {
    const email = this.resendEmail || this.emailSentTo;
    if (!email) {
      this.toast.error('Error', 'Please enter your email address');
      return;
    }
    this.isResending = true;
    this.authService.resendVerificationEmail(email).subscribe({
      next: () => {
        this.isResending = false;
        this.resendSent = true;
        this.toast.success('Email sent', 'A new verification link has been sent to your email');
      },
      error: () => {
        this.isResending = false;
        this.toast.error('Error', 'Failed to resend verification email. Please try again.');
      },
    });
  }
}
