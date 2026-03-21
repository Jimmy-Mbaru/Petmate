import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideShield,
  lucideAlertTriangle,
  lucideCheckCircle,
  lucideXCircle,
  lucideEye,
  lucideFilter,
  lucideRefreshCw,
  lucideTrash2,
  lucideFileText,
  lucideUser,
  lucideMail,
  lucideCalendar,
  lucideTrendingUp,
  lucideCheck,
  lucideX,
  lucideChevronDown,
  lucideChevronUp,
  lucideDownload,
  lucideFileSpreadsheet,
} from '@ng-icons/lucide';
import {
  ReportsService,
  type UserReport,
  type ReportStatus,
  type ReportReason,
  type ReportStats,
} from '../../../core/services/reports.service';
import { ToastService } from '../../../core/services/toast.service';
import { DialogService } from '../../../core/services/dialog.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-admin-reports',
  standalone: true,
  imports: [CommonModule, NgIcon],
  providers: [provideIcons({
    lucideShield,
    lucideAlertTriangle,
    lucideCheckCircle,
    lucideXCircle,
    lucideEye,
    lucideFilter,
    lucideRefreshCw,
    lucideTrash2,
    lucideFileText,
    lucideUser,
    lucideMail,
    lucideCalendar,
    lucideTrendingUp,
    lucideCheck,
    lucideX,
    lucideChevronDown,
    lucideChevronUp,
    lucideDownload,
    lucideFileSpreadsheet,
  })],
  templateUrl: './reports.component.html',
  styleUrl: './reports.component.css',
})
export class AdminReportsComponent implements OnInit {
  reports: UserReport[] = [];
  stats: ReportStats | null = null;
  isLoading = true;
  selectedStatus: ReportStatus | 'all' = 'all';
  expandedReportId: number | null = null;
  isUpdating = false;

  statusOptions: { value: ReportStatus | 'all'; label: string; color: string }[] = [
    { value: 'all', label: 'All Reports', color: 'gray' },
    { value: 'pending', label: 'Pending', color: 'yellow' },
    { value: 'under_review', label: 'Under Review', color: 'blue' },
    { value: 'resolved', label: 'Resolved', color: 'green' },
    { value: 'dismissed', label: 'Dismissed', color: 'gray' },
    { value: 'action_taken', label: 'Action Taken', color: 'red' },
  ];

  reasonLabels: Record<ReportReason, string> = {
    spam: 'Spam',
    harassment: 'Harassment',
    fake_profile: 'Fake Profile',
    inappropriate_content: 'Inappropriate Content',
    scam: 'Scam/Fraud',
    underage: 'Underage User',
    other: 'Other',
  };

  constructor(
    private reportsService: ReportsService,
    private toast: ToastService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    // Check if admin
    const user = this.auth.getCurrentUser();
    if (!user || user.role !== 'ADMIN') {
      this.toast.error('Access Denied', 'You do not have permission to view this page');
      this.router.navigate(['/app/dashboard']);
      return;
    }

    this.loadReports();
    this.loadStats();
  }

  loadReports(): void {
    this.isLoading = true;
    const filter = this.selectedStatus === 'all' ? undefined : { status: this.selectedStatus };

    this.reportsService.getAllReports(filter).subscribe({
      next: (response) => {
        this.reports = response.data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
        this.toast.error('Error', 'Failed to load reports');
      },
    });
  }

  loadStats(): void {
    this.reportsService.getReportStats().subscribe({
      next: (stats) => {
        this.stats = stats;
        this.cdr.detectChanges();
      },
      error: () => {
        // Stats are optional, don't show error
      },
    });
  }

  /** Map status filter to ReportStats key and return count for template */
  getStatCount(optionValue: ReportStatus | 'all'): number {
    if (!this.stats) return 0;
    if (optionValue === 'all') return this.stats.total;
    const keyMap: Record<ReportStatus, keyof ReportStats> = {
      pending: 'pending',
      under_review: 'underReview',
      resolved: 'resolved',
      dismissed: 'dismissed',
      action_taken: 'actionTaken',
    };
    return this.stats[keyMap[optionValue]] ?? 0;
  }

  filterByStatus(status: ReportStatus | 'all'): void {
    this.selectedStatus = status;
    this.loadReports();
  }

  toggleExpand(reportId: number): void {
    this.expandedReportId = this.expandedReportId === reportId ? null : reportId;
  }

  updateReportStatus(reportId: number, status: ReportStatus): void {
    this.isUpdating = true;
    
    this.reportsService.updateReport(reportId, { status, adminNotes: '' }).subscribe({
      next: () => {
        this.isUpdating = false;
        this.toast.success('Updated', `Report marked as ${status.replace('_', ' ')}`);
        this.loadReports();
        this.loadStats();
      },
      error: () => {
        this.isUpdating = false;
        this.toast.error('Error', 'Failed to update report');
      },
    });
  }

  async deleteReport(reportId: number): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Delete Report',
      message: 'Are you sure you want to delete this report? This action cannot be undone.',
      confirmText: 'Delete',
      type: 'danger'
    });

    if (!confirmed) {
      return;
    }

    this.reportsService.deleteReport(reportId).subscribe({
      next: () => {
        this.toast.success('Deleted', 'Report has been deleted');
        this.loadReports();
        this.loadStats();
      },
      error: () => {
        this.toast.error('Error', 'Failed to delete report');
      },
    });
  }

  getStatusColor(status: ReportStatus): string {
    switch (status) {
      case 'pending': return 'yellow';
      case 'under_review': return 'blue';
      case 'resolved': return 'green';
      case 'dismissed': return 'gray';
      case 'action_taken': return 'red';
      default: return 'gray';
    }
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  getReasonIcon(reason: ReportReason): string {
    switch (reason) {
      case 'spam': return 'lucideMessageSquare';
      case 'harassment': return 'lucideUserX';
      case 'fake_profile': return 'lucideUser';
      case 'inappropriate_content': return 'lucideAlertTriangle';
      case 'scam': return 'lucideDollarSign';
      case 'underage': return 'lucideShield';
      default: return 'lucideHelpCircle';
    }
  }

  exportExcel(): void {
    this.reportsService.exportToExcel().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'reports.xlsx';
        link.click();
        window.URL.revokeObjectURL(url);
        this.toast.info('Exporting', 'Excel export downloaded.');
      },
      error: () => this.toast.error('Export Failed', 'Could not export to Excel.'),
    });
  }

  exportPdf(): void {
    this.reportsService.exportToPdf().subscribe({
      next: (blob) => {
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'reports.pdf';
        link.click();
        window.URL.revokeObjectURL(url);
        this.toast.info('Exporting', 'PDF export downloaded.');
      },
      error: () => this.toast.error('Export Failed', 'Could not export to PDF.'),
    });
  }
}
