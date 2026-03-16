import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface UserReport {
  id: number;
  reporterId: string;
  reporterName: string;
  reporterEmail?: string;
  reportedUserId: string;
  reportedUserName: string;
  reportedUserEmail: string;
  reason: ReportReason;
  description: string;
  status: ReportStatus;
  createdAt: string;
  reviewedAt?: string;
  reviewedByAdminId?: string;
  adminNotes?: string;
}

export type ReportReason = 
  | 'spam'
  | 'harassment'
  | 'fake_profile'
  | 'inappropriate_content'
  | 'scam'
  | 'underage'
  | 'other';

export type ReportStatus = 
  | 'pending'
  | 'under_review'
  | 'resolved'
  | 'dismissed'
  | 'action_taken';

export interface CreateReportDto {
  reportedUserId: string;
  reason: ReportReason;
  description: string;
}

export interface UpdateReportDto {
  status?: ReportStatus;
  adminNotes?: string;
}

export interface ReportStats {
  total: number;
  pending: number;
  underReview: number;
  resolved: number;
  dismissed: number;
  actionTaken: number;
}

export interface ReportsFilter {
  status?: ReportStatus;
  reason?: ReportReason;
  limit?: number;
  offset?: number;
}

@Injectable({
  providedIn: 'root',
})
export class ReportsService {
  private readonly apiUrl = `${environment.apiUrl}/reports`;

  constructor(private http: HttpClient) {}

  /**
   * Submit a new user report
   */
  createReport(dto: CreateReportDto): Observable<UserReport> {
    return this.http.post<UserReport>(this.apiUrl, dto);
  }

  /**
   * Get all reports (Admin only)
   */
  getAllReports(filter?: ReportsFilter): Observable<{ data: UserReport[]; total: number; limit: number; offset: number }> {
    let params = new HttpParams();
    
    if (filter?.status) {
      params = params.set('status', filter.status);
    }
    if (filter?.reason) {
      params = params.set('reason', filter.reason);
    }
    if (filter?.limit) {
      params = params.set('limit', filter.limit.toString());
    }
    if (filter?.offset) {
      params = params.set('offset', filter.offset.toString());
    }

    return this.http.get<{ data: UserReport[]; total: number; limit: number; offset: number }>(this.apiUrl, { params });
  }

  /**
   * Get report by ID (Admin only)
   */
  getReportById(id: number): Observable<UserReport> {
    return this.http.get<UserReport>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get reports for a specific user (Admin only)
   */
  getReportsByUser(userId: string): Observable<UserReport[]> {
    return this.http.get<UserReport[]>(`${this.apiUrl}/user/${userId}`);
  }

  /**
   * Update report status and add admin notes (Admin only)
   */
  updateReport(id: number, dto: UpdateReportDto): Observable<UserReport> {
    return this.http.patch<UserReport>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * Get report statistics (Admin only)
   */
  getReportStats(): Observable<ReportStats> {
    return this.http.get<ReportStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Delete a report (Admin only)
   */
  deleteReport(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Export reports to Excel
   */
  exportToExcel(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/excel`, { responseType: 'blob' });
  }

  /**
   * Export reports to PDF
   */
  exportToPdf(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/pdf`, { responseType: 'blob' });
  }
}
