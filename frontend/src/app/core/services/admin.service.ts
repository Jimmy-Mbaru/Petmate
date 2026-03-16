import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { BoardingProfile, PaginatedResponse } from './boarding.service';
import { Order } from './store.service';

/**
 * Dashboard summary from backend GET /admin/dashboard
 */
export interface DashboardStats {
  totalUsers: number;
  totalBookings: number;
  totalOrders: number;
  totalRevenue: number;
  totalProducts: number;
  avgOrderValue: number;
}

/**
 * Revenue comparison from backend GET /admin/analytics/revenue-comparison
 */
export interface RevenueComparison {
  currentMonthRevenue: number;
  lastMonthRevenue: number;
  percentageChange: number;
}

/**
 * Extended stats for system-stats page (includes dashboard + detailed breakdowns)
 */
export interface SystemStats {
  users: {
    total: number;
    active: number;
    inactive: number;
    admins: number;
    newLast30Days: number;
  };
  boarding: {
    totalProfiles: number;
    approvedProfiles: number;
    pendingProfiles: number;
    totalBookings: number;
    activeBookings: number;
  };
  store: {
    totalProducts: number;
    activeProducts: number;
    totalOrders: number;
    totalRevenue: number;
  };
  activity: {
    loginsLast24h: number;
    messagesLast24h: number;
    bookingsLast24h: number;
  };
}

/**
 * Bookings by status per month from GET /admin/analytics/bookings-by-status
 */
export interface BookingsByStatusItem {
  month: string;
  status: string;
  count: number;
}

/**
 * Revenue by month from GET /admin/analytics/revenue-by-month
 */
export interface RevenueByMonthItem {
  month: string;
  revenue: number;
}

/**
 * Top products from GET /admin/analytics/top-products
 */
export interface TopProductItem {
  productId: string;
  name: string;
  totalQuantity: number;
}

/**
 * Top hosts from GET /admin/analytics/top-hosts
 */
export interface TopHostItem {
  hostId: string;
  hostName: string;
  bookingCount: number;
}

/**
 * User registrations over time from GET /admin/analytics/platform-growth
 */
export interface PlatformGrowthItem {
  date: string;
  count: number;
}

/**
 * Daily platform activity counts from GET /admin/analytics/system-activity
 */
export interface SystemActivityItem {
  date: string;
  bookings: number;
  orders: number;
  messages: number;
  newUsers: number;
}

/**
 * Chart data format for frontend charts
 */
export interface AnalyticsData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
  }[];
}

@Injectable({
  providedIn: 'root',
})
export class AdminService {
  private readonly apiUrl = `${environment.apiUrl}/admin`;

  constructor(private http: HttpClient) {}

  /**
   * Get platform growth (user registrations over time)
   * Uses GET /admin/analytics/platform-growth
   */
  getPlatformGrowth(period: 'daily' | 'monthly' = 'daily'): Observable<PlatformGrowthItem[]> {
    return this.http.get<PlatformGrowthItem[]>(`${this.apiUrl}/analytics/platform-growth?period=${period}`);
  }

  /**
   * Get system activity (daily counts of key actions)
   * Uses GET /admin/analytics/system-activity
   */
  getSystemActivity(): Observable<SystemActivityItem[]> {
    return this.http.get<SystemActivityItem[]>(`${this.apiUrl}/analytics/system-activity`);
  }

  /**
   * Export comprehensive system report as PDF
   * Uses GET /admin/export/system-report
   */
  exportSystemReport(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/export/system-report`, { responseType: 'blob' });
  }

  /**
   * Get dashboard summary (totalUsers, totalBookings, totalOrders, totalRevenue, totalProducts, avgOrderValue)
   * Uses GET /admin/dashboard
   */
  getDashboard(): Observable<DashboardStats> {
    return this.http.get<DashboardStats>(`${this.apiUrl}/dashboard`);
  }

  /**
   * Get revenue comparison between this month and last month
   * Uses GET /admin/analytics/revenue-comparison
   */
  getRevenueComparison(): Observable<RevenueComparison> {
    return this.http.get<RevenueComparison>(`${this.apiUrl}/analytics/revenue-comparison`);
  }

  /**
   * Get comprehensive system statistics
   * Note: This is a frontend-aggregated endpoint using dashboard + users/orders data
   */
  getSystemStats(): Observable<SystemStats> {
    return this.http.get<SystemStats>(`${this.apiUrl}/stats`);
  }

  /**
   * Get bookings by status per month
   * Uses GET /admin/analytics/bookings-by-status
   * @param year - Optional year filter (e.g. 2025)
   * @param month - Optional month filter (1-12)
   */
  getBookingsByStatus(year?: number, month?: number): Observable<BookingsByStatusItem[]> {
    const params: any = {};
    if (year) params.year = year;
    if (month) params.month = month;
    return this.http.get<BookingsByStatusItem[]>(`${this.apiUrl}/analytics/bookings-by-status`, { params });
  }

  /**
   * Get revenue by month
   * Uses GET /admin/analytics/revenue-by-month
   * @param year - Optional year filter (e.g. 2025)
   */
  getRevenueByMonth(year?: number): Observable<RevenueByMonthItem[]> {
    const params: any = {};
    if (year) params.year = year;
    return this.http.get<RevenueByMonthItem[]>(`${this.apiUrl}/analytics/revenue-by-month`, { params });
  }

  /**
   * Get top products by quantity sold
   * Uses GET /admin/analytics/top-products
   * @param limit - Max items to return (default 10, max 100)
   */
  getTopProducts(limit: number = 10): Observable<TopProductItem[]> {
    return this.http.get<TopProductItem[]>(`${this.apiUrl}/analytics/top-products?limit=${limit}`);
  }

  /**
   * Get top hosts by booking count
   * Uses GET /admin/analytics/top-hosts
   * @param limit - Max items to return (default 10, max 100)
   */
  getTopHosts(limit: number = 10): Observable<TopHostItem[]> {
    return this.http.get<TopHostItem[]>(`${this.apiUrl}/analytics/top-hosts?limit=${limit}`);
  }

  /**
   * Get analytics data for charts (frontend-aggregated from backend endpoints)
   * @param type - 'users' | 'revenue' | 'activity' | 'bookings'
   * @param period - 'daily' | 'monthly'
   */
  getAnalytics(type: string, period: string = 'monthly'): Observable<AnalyticsData> {
    const now = new Date();
    const currentYear = now.getFullYear();

    switch (type) {
      case 'revenue':
        return this.getRevenueByMonth().pipe(
          map(data => {
            const last12 = data.slice(-12);
            return {
              labels: last12.map(d =>
                new Date(d.month).toLocaleDateString('en-US', { month: 'short' }),
              ),
              datasets: [
                {
                  label: 'Revenue (KES)',
                  data: last12.map(d => d.revenue),
                },
              ],
            };
          }),
        );

      case 'activity':
        return this.getSystemActivity().pipe(
          map(data => ({
            labels: data.map(d => new Date(d.date).toLocaleDateString('en-US', { day: '2-digit', month: 'short' })),
            datasets: [
              { label: 'Bookings', data: data.map(d => d.bookings) },
              { label: 'Orders', data: data.map(d => d.orders) },
              { label: 'Messages', data: data.map(d => d.messages) },
            ],
          }))
        );

      case 'users':
        return this.getPlatformGrowth(period as 'daily' | 'monthly').pipe(
          map(data => {
            const last12 = data.slice(-12);
            return {
              labels: last12.map(d => {
                const date = new Date(d.date);
                return period === 'monthly'
                  ? date.toLocaleDateString('en-US', {
                      month: 'short',
                      year: '2-digit',
                    })
                  : date.toLocaleDateString('en-US', {
                      day: '2-digit',
                      month: 'short',
                    });
              }),
              datasets: [
                {
                  label: 'User Registrations',
                  data: last12.map(d => d.count),
                },
              ],
            };
          }),
        );

      case 'bookings':
      default:
        return this.getBookingsByStatus(currentYear).pipe(
          map(data => {
            const months = [...new Set(data.map(d => d.month))];
            const statuses = [...new Set(data.map(d => d.status))];
            return {
              labels: months.map(m => new Date(m).toLocaleDateString('en-US', { month: 'short' })),
              datasets: statuses.map(status => ({
                label: status,
                data: months.map(month => {
                  const item = data.find(d => d.month === month && d.status === status);
                  return item ? item.count : 0;
                }),
              })),
            };
          })
        );
    }
  }

  /**
   * Export users as CSV
   * Uses GET /admin/export/users
   * @param role - Optional role filter
   * @param email - Optional email filter (partial match)
   * @param from - Optional from date (ISO format)
   * @param to - Optional to date (ISO format)
   */
  exportUsers(role?: string, email?: string, from?: string, to?: string): Observable<Blob> {
    const params: any = { format: 'csv' };
    if (role) params.role = role;
    if (email) params.email = email;
    if (from) params.from = from;
    if (to) params.to = to;
    return this.http.get(`${this.apiUrl}/export/users`, { params, responseType: 'blob' });
  }

  /**
   * Export users as PDF
   * Uses GET /admin/export/users
   * @param role - Optional role filter
   * @param email - Optional email filter (partial match)
   * @param from - Optional from date (ISO format)
   * @param to - Optional to date (ISO format)
   */
  exportUsersPdf(role?: string, email?: string, from?: string, to?: string): Observable<Blob> {
    const params: any = { format: 'pdf' };
    if (role) params.role = role;
    if (email) params.email = email;
    if (from) params.from = from;
    if (to) params.to = to;
    return this.http.get(`${this.apiUrl}/export/users`, { params, responseType: 'blob' });
  }

  /**
   * Export orders as CSV
   * Uses GET /admin/export/orders
   * @param status - Optional status filter
   * @param from - Optional from date (ISO format)
   * @param to - Optional to date (ISO format)
   */
  exportOrders(status?: string, from?: string, to?: string): Observable<Blob> {
    const params: any = { format: 'csv' };
    if (status) params.status = status;
    if (from) params.from = from;
    if (to) params.to = to;
    return this.http.get(`${this.apiUrl}/export/orders`, { params, responseType: 'blob' });
  }

  /**
   * Export orders as PDF
   * Uses GET /admin/export/orders
   * @param status - Optional status filter
   * @param from - Optional from date (ISO format)
   * @param to - Optional to date (ISO format)
   */
  exportOrdersPdf(status?: string, from?: string, to?: string): Observable<Blob> {
    const params: any = { format: 'pdf' };
    if (status) params.status = status;
    if (from) params.from = from;
    if (to) params.to = to;
    return this.http.get(`${this.apiUrl}/export/orders`, { params, responseType: 'blob' });
  }

  /**
   * Get boarding profiles pending approval
   * Uses GET /admin/boarding
   */
  getPendingBoarding(limit: number = 10, offset: number = 0): Observable<PaginatedResponse<BoardingProfile>> {
    const params = { limit: limit.toString(), offset: offset.toString() };
    return this.http.get<PaginatedResponse<BoardingProfile>>(`${this.apiUrl}/boarding`, { params });
  }

  /**
   * Approve or reject a boarding profile
   * Uses PATCH /boarding/:id/approve
   */
  approveBoardingProfile(id: string, isApproved: boolean): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/boarding/${id}/approve`, { isApproved });
  }

  /**
   * Get all orders with pagination
   * Uses GET /admin/orders
   */
  getOrders(limit: number = 10, offset: number = 0, from?: string, to?: string): Observable<PaginatedResponse<Order>> {
    const params: any = { limit: limit.toString(), offset: offset.toString() };
    if (from) params.from = from;
    if (to) params.to = to;
    return this.http.get<PaginatedResponse<Order>>(`${this.apiUrl}/orders`, { params });
  }

  /**
   * Download a blob file
   */
  downloadFile(blob: Blob, fileName: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    link.click();
    window.URL.revokeObjectURL(url);
  }
}
