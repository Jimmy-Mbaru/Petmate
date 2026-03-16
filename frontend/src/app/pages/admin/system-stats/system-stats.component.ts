import { Component, OnInit, AfterViewInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import AOS from 'aos';
import { AdminService, type DashboardStats, type TopProductItem, type TopHostItem } from '../../../core/services/admin.service';
import { StoreService, type Product, type PaginatedResponse } from '../../../core/services/store.service';
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

@Component({
  selector: 'app-system-stats',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './system-stats.component.html',
  styleUrls: ['./system-stats.component.css'],
})
export class SystemStatsComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly today = new Date();
  readonly loading = signal(false);
  readonly dashboardStats = signal<DashboardStats | null>(null);
  readonly topProducts = signal<TopProductItem[]>([]);
  readonly topHosts = signal<TopHostItem[]>([]);
  readonly lowStockProducts = signal<Product[]>([]);
  readonly recentActivity = signal<any[]>([
    { type: 'USER', description: 'New host application from Sarah M.', time: '2m ago', color: 'blue' },
    { type: 'ORDER', description: 'Order #8293 fulfilled by Admin', time: '15m ago', color: 'green' },
    { type: 'SYSTEM', description: 'Monthly backup completed', time: '1h ago', color: 'purple' },
    { type: 'SECURITY', description: 'Suspicious login attempt blocked', time: '3h ago', color: 'red' },
  ]);
  readonly systemStats = signal({
    uptime: '99.9%',
    apiResponseTime: '45ms',
    databaseConnections: 12,
    activeUsers: 0,
    totalRequests: 0,
    errorRate: '0.1%',
  });

  /** Numeric uptime for the progress bar (0–100). */
  readonly uptimePercent = signal(95);

  getTopProducts(): TopProductItem[] {
    return this.topProducts();
  }

  getTopHosts(): TopHostItem[] {
    return this.topHosts();
  }

  @ViewChild('requestsChart') requestsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('responseTimeChart') responseTimeChartRef!: ElementRef<HTMLCanvasElement>;

  private requestsChart: Chart | null = null;
  private responseTimeChart: Chart | null = null;

  constructor(
    private adminService: AdminService,
    private storeService: StoreService
  ) {}

  ngOnInit(): void {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      offset: 50,
    });
    this.loadSystemStats();
    this.loadStoreData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initRequestsChart();
      this.initResponseTimeChart();
    }, 100);
    AOS.refresh();
  }

  ngOnDestroy(): void {
    this.requestsChart?.destroy();
    this.responseTimeChart?.destroy();
    AOS.refresh();
  }

  loadSystemStats(): void {
    this.loading.set(true);
    this.adminService.getDashboard().subscribe({
      next: (stats: DashboardStats) => {
        this.dashboardStats.set(stats);
        this.systemStats.set({
          uptime: '99.9%',
          apiResponseTime: '45ms',
          databaseConnections: 12,
          activeUsers: stats.totalUsers,
          totalRequests: stats.totalOrders,
          errorRate: '0.1%',
        });
        this.loading.set(false);
        this.loadRevenueChart();
        this.loadTopData();
      },
      error: (err: any) => {
        console.error('Failed to load dashboard stats', err);
        this.loading.set(false);
      },
    });
  }

  loadStoreData(): void {
    this.storeService.searchProducts({}, 'createdAt', 'desc', 100, 0).subscribe({
      next: (response: PaginatedResponse<Product>) => {
        const products = response.data || [];
        const lowStock = products.filter((p: Product) => p.stock <= 10);
        this.lowStockProducts.set(lowStock);
      },
      error: (err: any) => console.error('Failed to load products for stats', err)
    });
  }

  loadTopData(): void {
    this.adminService.getTopProducts(5).subscribe({
      next: (data: TopProductItem[]) => this.topProducts.set(data),
      error: (err: any) => console.error('Failed to load top products', err)
    });

    this.adminService.getTopHosts(5).subscribe({
      next: (data: TopHostItem[]) => this.topHosts.set(data),
      error: (err: any) => console.error('Failed to load top hosts', err)
    });
  }

  loadRevenueChart(): void {
    this.adminService.getRevenueByMonth().subscribe({
      next: (data: any[]) => this.updateRevenueChart(data),
      error: (err: any) => console.error('Failed to load revenue data', err),
    });
  }

  private initRequestsChart(): void {
    const canvas = this.requestsChartRef?.nativeElement;
    if (!canvas) return;

    const themeBlue = '#3b82f6';
    const themeBlueLight = 'rgba(59, 130, 246, 0.2)';

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '23:59'],
        datasets: [
          {
            label: 'API Requests',
            data: [120, 80, 450, 890, 750, 620, 340],
            borderColor: themeBlue,
            backgroundColor: themeBlueLight,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: themeBlue,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000 },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#2a2525',
            titleColor: '#fff',
            bodyColor: '#f5eded',
            padding: 12,
            cornerRadius: 8,
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#363636' } },
          y: { beginAtZero: true, grid: { color: 'rgba(54, 54, 54, 0.08)' }, ticks: { color: '#363636' } },
        },
      },
    };

    this.requestsChart = new Chart(canvas, config);
  }

  private initResponseTimeChart(): void {
    const canvas = this.responseTimeChartRef?.nativeElement;
    if (!canvas) return;

    const themeGreen = '#10b981';
    const themeGreenLight = 'rgba(16, 185, 129, 0.2)';

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [
          {
            label: 'Revenue',
            data: [0, 0, 0, 0, 0, 0, 0],
            borderColor: themeGreen,
            backgroundColor: themeGreenLight,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: themeGreen,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000 },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#2a2525',
            titleColor: '#fff',
            bodyColor: '#f5eded',
            padding: 12,
            cornerRadius: 8,
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#363636' } },
          y: { beginAtZero: true, grid: { color: 'rgba(54, 54, 54, 0.08)' }, ticks: { color: '#363636' } },
        },
      },
    };

    this.responseTimeChart = new Chart(canvas, config);
  }

  private updateRevenueChart(data: { month: string; revenue: number }[]): void {
    if (!this.responseTimeChart) return;

    this.responseTimeChart.data.labels = data.map((d: any) =>
      new Date(d.month).toLocaleDateString('en-US', { month: 'short' })
    );
    this.responseTimeChart.data.datasets[0].label = 'Revenue (KES)';
    this.responseTimeChart.data.datasets[0].data = data.map((d: any) => d.revenue);
    this.responseTimeChart.update();
  }
}
