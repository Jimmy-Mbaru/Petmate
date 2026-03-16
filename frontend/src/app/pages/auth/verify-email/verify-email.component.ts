import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './verify-email.component.html',
})
export class VerifyEmailComponent implements OnInit {
  isVerifying = true;
  isSuccess = false;
  isError = false;
  isEmailSent = false;
  emailSentTo = '';
  errorMessage = '';

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
    // Navigate to register page or implement resend logic
    this.toast.info('Info', 'Please contact support to resend verification email');
  }
}
