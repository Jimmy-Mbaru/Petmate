import { Component, OnInit, AfterViewInit, OnDestroy, signal, ViewChild, ElementRef, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import AOS from 'aos';
import { UsersService } from '../../../core/services/users.service';
import { AdminService, type SystemStats, type AnalyticsData, type DashboardStats } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  type ChartConfiguration,
} from 'chart.js';

Chart.register(
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
);

interface StatCard {
  label: string;
  value: number | string;
  icon: string;
  color: string;
  bgColor: string;
  link: string;
  gradient: string;
  change?: {
    isPositive: boolean;
    value: number;
  };
}

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
})
export class AdminDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly today = new Date();
  readonly systemStats = signal<SystemStats | null>(null);
  readonly loading = signal(false);
  readonly exporting = signal(false);

  @ViewChild('usersChart') usersChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('activityChart') activityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;

  private usersChart: Chart | null = null;
  private activityChart: Chart | null = null;
  private revenueChart: Chart | null = null;

  stats = signal<StatCard[]>([
    {
      label: 'Total Users',
      value: 0,
      icon: 'users',
      color: '#d72323',
      bgColor: 'rgba(215, 35, 35, 0.1)',
      link: '/app/admin/users',
      gradient: 'linear-gradient(135deg, #d72323 0%, #bc1f1f 100%)',
    },
    {
      label: 'Sales Volume',
      value: 0,
      icon: 'shopping',
      color: '#f59e0b',
      bgColor: 'rgba(245, 158, 11, 0.1)',
      link: '/app/admin/store',
      gradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
    },
    {
      label: 'Total Revenue',
      value: 'KES 0.00',
      icon: 'shield',
      color: '#10b981',
      bgColor: 'rgba(16, 185, 129, 0.1)',
      link: '/app/admin/store',
      gradient: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
    },
    {
      label: 'Avg Order',
      value: 'KES 0.00',
      icon: 'calendar',
      color: '#3b82f6',
      bgColor: 'rgba(59, 130, 246, 0.1)',
      link: '/app/admin/store',
      gradient: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    },
  ]);

  quickActions = [
    { name: 'Boarding Apps', icon: 'boarding', link: '/app/admin/boarding', color: '#d72323' },
    { name: 'Store Products', icon: 'shopping', link: '/app/admin/store', color: '#f59e0b' },
    { name: 'Pending Reports', icon: 'message', link: '/app/admin/reports', color: '#ef4444' },
    { name: 'System Stats', icon: 'shield', link: '/app/admin/system-stats', color: '#3b82f6' },
  ];

  constructor(
    private usersService: UsersService,
    @Inject(AdminService) private adminService: AdminService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      offset: 50,
    });
    this.loadStats();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initUsersChart();
      this.initActivityChart();
      this.initRevenueChart();
    }, 100);
    AOS.refresh();
  }

  ngOnDestroy(): void {
    this.usersChart?.destroy();
    this.activityChart?.destroy();
    this.revenueChart?.destroy();
    AOS.refresh();
  }

  loadStats(): void {
    this.loading.set(true);
    this.adminService.getDashboard().subscribe({
      next: (stats) => {
        this.systemStats.set({
          users: { total: stats.totalUsers, active: stats.totalUsers, inactive: 0, admins: 0, newLast30Days: 0 },
          boarding: { totalProfiles: 0, approvedProfiles: 0, pendingProfiles: 0, totalBookings: stats.totalBookings, activeBookings: 0 },
          store: { totalProducts: stats.totalProducts, activeProducts: 0, totalOrders: stats.totalOrders, totalRevenue: stats.totalRevenue },
          activity: { loginsLast24h: 0, messagesLast24h: 0, bookingsLast24h: 0 },
        });
        this.updateStatCardsFromDashboard(stats);
        this.loading.set(false);
        this.refreshCharts();
      },
      error: (err) => {
        console.error('Failed to load dashboard stats', err);
        this.loading.set(false);
      },
    });
  }

  private updateStatCardsFromDashboard(stats: DashboardStats): void {
    this.stats.update(cards => cards.map(card => {
      switch (card.label) {
        case 'Total Users':
          return { ...card, value: stats.totalUsers.toLocaleString() };
        case 'Sales Volume':
          return { ...card, value: stats.totalOrders.toLocaleString() };
        case 'Total Revenue':
          return {
            ...card,
            value: `KES ${stats.totalRevenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          };
        case 'Avg Order':
          return {
            ...card,
            value: `KES ${stats.avgOrderValue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}`,
          };
        default:
          return card;
      }
    }));
  }

  exportUsers(): void {
    this.exporting.set(true);
    this.adminService.exportUsers().subscribe({
      next: (blob) => {
        this.adminService.downloadFile(blob, `petmate-users-${new Date().toISOString().split('T')[0]}.csv`);
        this.toast.success('Export Success', 'User list exported successfully');
        this.exporting.set(false);
      },
      error: () => {
        this.toast.error('Export Failed', 'Failed to export users');
        this.exporting.set(false);
      }
    });
  }

  exportOrders(): void {
    this.exporting.set(true);
    this.adminService.exportOrders().subscribe({
      next: (blob) => {
        this.adminService.downloadFile(blob, `petmate-orders-${new Date().toISOString().split('T')[0]}.csv`);
        this.toast.success('Export Success', 'Orders exported successfully');
        this.exporting.set(false);
      },
      error: () => {
        this.toast.error('Export Failed', 'Failed to export orders');
        this.exporting.set(false);
      }
    });
  }

  exportSystemReport(): void {
    this.exporting.set(true);
    this.adminService.exportSystemReport().subscribe({
      next: (blob) => {
        this.adminService.downloadFile(blob, `petmate-system-report-${new Date().toISOString().split('T')[0]}.pdf`);
        this.toast.success('Export Success', 'System report generated successfully');
        this.exporting.set(false);
      },
      error: () => {
        this.toast.error('Export Failed', 'Failed to generate system report');
        this.exporting.set(false);
      }
    });
  }

  private refreshCharts(): void {
    this.adminService.getAnalytics('users', 'monthly').subscribe({
      next: (data) => this.updateUsersChart(data),
      error: (err) => console.error('Failed to load user analytics', err)
    });

    this.adminService.getAnalytics('activity').subscribe({
      next: (data) => this.updateActivityChart(data),
      error: (err) => console.error('Failed to load activity analytics', err)
    });

    this.adminService.getAnalytics('revenue').subscribe({
      next: (data) => this.updateRevenueChart(data),
      error: (err) => console.error('Failed to load revenue analytics', err)
    });
  }

  private initUsersChart(): void {
    const canvas = this.usersChartRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const gradient = ctx ? ctx.createLinearGradient(0, 0, 0, 400) : null;
    if (gradient) {
      gradient.addColorStop(0, 'rgba(215, 35, 35, 0.4)');
      gradient.addColorStop(1, 'rgba(215, 35, 35, 0)');
    }

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Total Users',
            data: [],
            borderColor: '#d72323',
            backgroundColor: gradient || 'rgba(215, 35, 35, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#d72323',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#2a2525',
            padding: 12,
            cornerRadius: 8,
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: { 
            beginAtZero: true, 
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              precision: 0
            }
          },
        },
      },
    };

    this.usersChart = new Chart(canvas, config);
  }

  private updateUsersChart(data: AnalyticsData): void {
    if (this.usersChart) {
      this.usersChart.data.labels = data.labels;
      this.usersChart.data.datasets[0].data = data.datasets[0].data;
      this.usersChart.update();
    }
  }

  private initActivityChart(): void {
    const canvas = this.activityChartRef?.nativeElement;
    if (!canvas) return;

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: [],
        datasets: [],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { 
            display: true,
            position: 'top',
            labels: { boxWidth: 12, usePointStyle: true }
          },
          tooltip: {
            backgroundColor: '#2a2525',
            padding: 12,
            cornerRadius: 8,
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.05)' } },
        },
      },
    };

    this.activityChart = new Chart(canvas, config);
  }

  private updateActivityChart(data: AnalyticsData): void {
    if (this.activityChart) {
      this.activityChart.data.labels = data.labels;
      
      const colors = ['#3b82f6', '#10b981', '#f59e0b'];
      const bgColors = ['rgba(59, 130, 246, 0.1)', 'rgba(16, 185, 129, 0.1)', 'rgba(245, 158, 11, 0.1)'];

      this.activityChart.data.datasets = data.datasets.map((ds, i) => ({
        ...ds,
        borderColor: colors[i % colors.length],
        backgroundColor: bgColors[i % bgColors.length],
        borderWidth: 2,
        fill: true,
        tension: 0.4,
        pointRadius: 3,
      }));

      this.activityChart.update();
    }
  }

  private initRevenueChart(): void {
    const canvas = this.revenueChartRef?.nativeElement;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const gradient = ctx ? ctx.createLinearGradient(0, 0, 0, 400) : null;
    if (gradient) {
      gradient.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
      gradient.addColorStop(1, 'rgba(16, 185, 129, 0)');
    }

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: [],
        datasets: [
          {
            label: 'Monthly Revenue',
            data: [],
            borderColor: '#10b981',
            backgroundColor: gradient || 'rgba(16, 185, 129, 0.1)',
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: '#10b981',
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          }
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#2a2525',
            padding: 12,
            cornerRadius: 8,
            callbacks: {
              label: (context) => `KES ${Number(context.raw).toLocaleString()}`
            }
          },
        },
        scales: {
          x: { grid: { display: false } },
          y: { 
            beginAtZero: true, 
            grid: { color: 'rgba(0,0,0,0.05)' },
            ticks: {
              callback: (value) => `KES ${Number(value).toLocaleString()}`
            }
          },
        },
      },
    };

    this.revenueChart = new Chart(canvas, config);
  }

  private updateRevenueChart(data: AnalyticsData): void {
    if (this.revenueChart) {
      this.revenueChart.data.labels = data.labels;
      
      const colors = ['#10b981', '#3b82f6'];
      const bgColors = ['rgba(16, 185, 129, 0.1)', 'rgba(59, 130, 246, 0.1)'];

      this.revenueChart.data.datasets = data.datasets.map((ds, i) => ({
        ...ds,
        borderColor: colors[i % colors.length],
        backgroundColor: bgColors[i % bgColors.length],
        borderWidth: 3,
        fill: i === 0, // Fill only for revenue
        tension: 0.4,
        pointRadius: 4,
        yAxisID: i === 0 ? 'y' : 'y1', // Use dual axes
      }));

      // Update options for dual axes
      if (this.revenueChart.options.scales) {
        this.revenueChart.options.scales['y'] = {
          type: 'linear',
          display: true,
          position: 'left',
          beginAtZero: true,
          grid: { color: 'rgba(0,0,0,0.05)' },
          ticks: { callback: (value) => `KES ${Number(value).toLocaleString()}` }
        };
        this.revenueChart.options.scales['y1'] = {
          type: 'linear',
          display: true,
          position: 'right',
          beginAtZero: true,
          grid: { drawOnChartArea: false },
          ticks: { precision: 0 }
        };
      }

      this.revenueChart.update();
    }
  }

  getIconPath(iconName: string): string {
    const icons: Record<string, string> = {
      users: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z',
      check: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z',
      shield: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z',
      boarding: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4',
      pet: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z',
      calendar: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
      shopping: 'M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z',
      message: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    };
    return icons[iconName] || icons['users'];
  }
}
