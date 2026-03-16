import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import AOS from 'aos';
import { HttpClient } from '@angular/common/http';
import { ToastService } from '../../../core/services/toast.service';
import { environment } from '../../../../environments/environment';

interface Report {
  id: number;
  reporterId: string;
  reportedUserId: string;
  reason: string;
  description?: string;
  status: 'PENDING' | 'REVIEWED' | 'DISMISSED';
  createdAt: string;
  updatedAt: string;
  reporter?: { name: string; email: string };
  reportedUser?: { name: string; email: string };
}

@Component({
  selector: 'app-admin-complaints',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './complaints.component.html',
  styleUrls: ['./complaints.component.css'],
})
export class AdminComplaintsComponent implements OnInit {
  readonly reports = signal<Report[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly filter = signal<'all' | 'pending' | 'reviewed' | 'dismissed'>('pending');

  constructor(
    private http: HttpClient,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      offset: 50,
    });
    this.loadReports();
  }

  loadReports(): void {
    this.loading.set(true);
    const status = this.filter() === 'all' ? undefined : this.filter().toUpperCase();
    const params: any = { limit: 50, offset: 0 };
    if (status) params.status = status;

    this.http.get<{ data: Report[]; total: number }>(`${environment.apiUrl}/admin/reports`, { params })
      .subscribe({
        next: (response) => {
          this.reports.set(response.data);
          this.total.set(response.total);
          this.loading.set(false);
        },
        error: () => {
          this.loading.set(false);
          this.toastService.error('Error', 'Failed to load reports');
        },
      });
  }

  resolveReport(reportId: number, status: 'REVIEWED' | 'DISMISSED'): void {
    this.http.patch(`${environment.apiUrl}/admin/reports/${reportId}/resolve`, {
      status,
      adminNotes: `Resolved by admin - ${status}`,
    }).subscribe({
      next: () => {
        this.toastService.success('Success', `Report ${status.toLowerCase()}`);
        this.loadReports();
      },
      error: () => {
        this.toastService.error('Error', 'Failed to resolve report');
      },
    });
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      REVIEWED: 'bg-green-100 text-green-700',
      DISMISSED: 'bg-gray-100 text-gray-700',
    };
    return classes[status] || 'bg-gray-100 text-gray-700';
  }

  getFilteredReports(): Report[] {
    const reports = this.reports();
    if (this.filter() === 'all') return reports;
    return reports.filter(r => r.status === this.filter().toUpperCase());
  }

  setFilter(status: 'all' | 'pending' | 'reviewed' | 'dismissed'): void {
    this.filter.set(status);
    this.loadReports();
  }
}
