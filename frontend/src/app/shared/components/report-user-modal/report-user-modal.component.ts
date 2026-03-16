import { Component, EventEmitter, Inject, Input, Optional, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX, lucideAlertTriangle, lucideShield, lucideUserX, lucideMessageSquare, lucideDollarSign, lucideUser, lucideHelpCircle, lucideSend } from '@ng-icons/lucide';
import { ReportsService, type ReportReason, type CreateReportDto } from '../../../core/services/reports.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth.service';

export interface ReportModalData {
  reportedUserId: string;
  reportedUserName: string;
}

@Component({
  selector: 'app-report-user-modal',
  standalone: true,
  imports: [ReactiveFormsModule, NgIcon],
  providers: [provideIcons({ 
    lucideX, 
    lucideAlertTriangle, 
    lucideShield, 
    lucideUserX, 
    lucideMessageSquare, 
    lucideDollarSign, 
    lucideUser, 
    lucideHelpCircle, 
    lucideSend 
  })],
  templateUrl: './report-user-modal.component.html',
  styleUrl: './report-user-modal.component.css',
})
export class ReportUserModalComponent {
  /** When used as a child, pass data via this input. When created dynamically, use REPORT_MODAL_DATA token. */
  @Input() set data(value: ReportModalData | null) {
    this._data = value ?? this._injectedData ?? null;
  }
  get data(): ReportModalData | null {
    return this._data ?? this._injectedData ?? null;
  }
  private _data: ReportModalData | null = null;

  @Output() close = new EventEmitter<void>();

  form: FormGroup;
  isSubmitting = false;

  reportReasons: { value: ReportReason; label: string; icon: string; description: string }[] = [
    { value: 'spam', label: 'Spam', icon: 'lucideMessageSquare', description: 'Unsolicited promotional content' },
    { value: 'harassment', label: 'Harassment', icon: 'lucideUserX', description: 'Bullying or threatening behavior' },
    { value: 'fake_profile', label: 'Fake Profile', icon: 'lucideUser', description: 'Impersonation or false information' },
    { value: 'inappropriate_content', label: 'Inappropriate Content', icon: 'lucideAlertTriangle', description: 'Offensive or explicit material' },
    { value: 'scam', label: 'Scam/Fraud', icon: 'lucideDollarSign', description: 'Attempted fraud or financial scam' },
    { value: 'underage', label: 'Underage User', icon: 'lucideShield', description: 'User appears to be under 18' },
    { value: 'other', label: 'Other', icon: 'lucideHelpCircle', description: 'Different reason not listed' },
  ];

  constructor(
    private fb: FormBuilder,
    private reportsService: ReportsService,
    private toast: ToastService,
    private auth: AuthService,
    @Optional() @Inject('REPORT_MODAL_DATA') private _injectedData: ReportModalData | null
  ) {
    this.form = this.fb.group({
      reason: ['', Validators.required],
      description: ['', [Validators.required, Validators.minLength(20), Validators.maxLength(500)]],
    });
  }

  get reason() {
    return this.form.get('reason');
  }

  get description() {
    return this.form.get('description');
  }

  selectReason(reason: ReportReason): void {
    this.form.patchValue({ reason });
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Validation', 'Please select a reason and provide details');
      return;
    }

    const currentUser = this.auth.getCurrentUser();
    if (!currentUser) {
      this.toast.error('Error', 'You must be logged in to submit a report');
      return;
    }

    this.isSubmitting = true;

    if (!this.data) return;
    const dto: CreateReportDto = {
      reportedUserId: this.data.reportedUserId,
      reason: this.form.value.reason,
      description: this.form.value.description,
    };

    this.reportsService.createReport(dto).subscribe({
      next: () => {
        this.isSubmitting = false;
        this.toast.success('Report Submitted', 'Thank you for helping keep our community safe. Our team will review this report.');
        this.closeModal();
      },
      error: (error: unknown) => {
        this.isSubmitting = false;
        console.error('Error submitting report:', error);
        const err = error as { error?: { message?: string } };
        if (err?.error?.message?.includes('already reported')) {
          this.toast.error('Already Reported', 'You have already reported this user.');
        } else {
          this.toast.error('Error', 'Failed to submit report. Please try again.');
        }
      },
    });
  }

  closeModal(): void {
    this.close.emit();
    document.body.style.overflow = '';
  }

  getSelectedReason(): ReportReason | null {
    return this.form.value.reason;
  }
}
