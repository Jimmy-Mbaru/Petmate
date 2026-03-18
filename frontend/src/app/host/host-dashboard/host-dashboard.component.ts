import { Component, Inject, OnInit, AfterViewInit, OnDestroy, signal, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import AOS from 'aos';
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
import { AuthService } from '../../core/auth/auth.service';
import { BoardingService, type Booking, type BoardingProfileWithStats } from '../../core/services/boarding.service';

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
  selector: 'app-host-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './host-dashboard.component.html',
  styleUrls: ['./host-dashboard.component.css'],
})
export class HostDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly today = new Date();
  readonly loading = signal(false);

  @ViewChild('earningsChart') earningsChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('bookingsChart') bookingsChartRef!: ElementRef<HTMLCanvasElement>;

  private earningsChart: Chart | null = null;
  private bookingsChart: Chart | null = null;

  private earningsUpdateTimeoutId: number | null = null;
  private bookingsUpdateTimeoutId: number | null = null;

  userName = '';
  profile: BoardingProfileWithStats | null = null;
  hasProfile = signal<boolean | null>(null); // null = loading, false = no profile, true = has profile
  stats = signal({
    profile: null as { id: number; location: string; isApproved: boolean; averageRating?: number } | null,
    bookings: 0,
    pendingBookings: 0,
    earnings: 0,
    reviews: 0,
  });

  /** Percent change in earnings this month vs last month; null if not available */
  earningsChangePercent = signal<number | null>(null);

  recentBookings: { id: string; ownerName: string; date: string; status: string; totalPrice: number }[] = [];

  /** All bookings for chart data (last 12 months + recent for weekly) */
  private allBookings: Booking[] = [];
  /** Earnings per month (last 12 months), index 0 = oldest month */
  private monthlyEarnings: number[] = [];
  /** Last 7 days: completed and pending counts per day */
  private weeklyCompleted: number[] = [];
  private weeklyPending: number[] = [];

  constructor(
    private auth: AuthService,
    private router: Router,
    @Inject(BoardingService) private boardingService: BoardingService
  ) {}

  ngOnInit(): void {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      offset: 50,
    });
    const user = this.auth.getCurrentUser();
    this.userName = user?.firstName?.trim() || 'Host';
    this.loadDashboardData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initEarningsChart();
      this.initBookingsChart();
    }, 100);
    AOS.refresh();
  }

  ngOnDestroy(): void {
    if (this.earningsUpdateTimeoutId !== null) {
      clearTimeout(this.earningsUpdateTimeoutId);
      this.earningsUpdateTimeoutId = null;
    }
    if (this.bookingsUpdateTimeoutId !== null) {
      clearTimeout(this.bookingsUpdateTimeoutId);
      this.bookingsUpdateTimeoutId = null;
    }
    this.earningsChart?.destroy();
    this.bookingsChart?.destroy();
    AOS.refresh();
  }

  loadDashboardData(): void {
    this.loading.set(true);

    // First, load the host's profile with stats
    this.boardingService.getMyProfile().subscribe({
      next: (profile) => {
        this.profile = profile;
        this.hasProfile.set(true);
        this.stats.update(s => ({
          ...s,
          profile: {
            id: profile.id,
            location: profile.location,
            isApproved: profile.isApproved,
            averageRating: profile.averageRating,
          },
          bookings: profile.stats?.totalBookings || 0,
          pendingBookings: profile.stats?.pendingBookings || 0,
          earnings: profile.stats?.totalEarnings || 0,
          reviews: profile.reviewCount || 0,
        }));

        // Then load bookings for charts and recent list
        this.loadBookingsForCharts();
      },
      error: () => {
        // 404 = no profile yet; redirect to profile setup
        this.hasProfile.set(false);
        this.router.navigate(['/app/host/profile']);
      },
    });
  }

  loadBookingsForCharts(): void {
    // Load enough bookings for stats, recent list, and chart data (backend max limit is 100)
    this.boardingService.myBookings(100, 0).subscribe({
      next: (response) => {
        const bookings = response.data as Booking[];
        this.allBookings = bookings;

        // Update bookings count from profile if available, otherwise from bookings
        if (!this.profile) {
          this.stats.update(s => ({ ...s, bookings: response.total }));
        }

        const pending = bookings.filter(b => b.status === 'PENDING').length;
        if (!this.profile) {
          this.stats.update(s => ({ ...s, pendingBookings: pending }));
        }

        const earnings = bookings
          .filter(b => b.status === 'COMPLETED' || b.status === 'ACCEPTED')
          .reduce((sum, b) => sum + b.totalPrice, 0);
        if (!this.profile) {
          this.stats.update(s => ({ ...s, earnings }));
        }

        this.recentBookings = bookings.slice(0, 5).map(b => ({
          id: String(b.id),
          ownerName: b.owner?.name || 'Unknown Owner',
          date: new Date(b.startDate).toLocaleDateString(),
          status: b.status,
          totalPrice: b.totalPrice,
        }));

        this.computeMonthlyEarnings();
        this.computeWeeklyBookings();

        this.loading.set(false);

        this.earningsUpdateTimeoutId = window.setTimeout(() => {
          this.updateEarningsChart();
        }, 200);

        this.bookingsUpdateTimeoutId = window.setTimeout(() => {
          this.updateBookingsChart();
        }, 200);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  private computeMonthlyEarnings(): void {
    const now = new Date();
    const months: number[] = Array(12).fill(0);

    for (const b of this.allBookings) {
      // Only include earnings from successful bookings
      if (b.status !== 'COMPLETED' && b.status !== 'ACCEPTED') continue;
      const d = new Date(b.startDate);
      const monthsAgo = (now.getFullYear() - d.getFullYear()) * 12 + (now.getMonth() - d.getMonth());
      if (monthsAgo >= 0 && monthsAgo < 12) {
        // months[11] is current month, months[0] is 11 months ago
        months[11 - monthsAgo] += b.totalPrice;
      }
    }

    this.monthlyEarnings = months;

    const thisMonth = months[11] ?? 0;
    const lastMonth = months[10] ?? 0;
    if (lastMonth > 0) {
      const pct = Math.round(((thisMonth - lastMonth) / lastMonth) * 100);
      this.earningsChangePercent.set(pct);
    } else if (thisMonth > 0) {
      this.earningsChangePercent.set(100); // 100% growth if first month with earnings
    } else {
      this.earningsChangePercent.set(0);
    }
  }

  private computeWeeklyBookings(): void {
    const completed = Array(7).fill(0);
    const pending = Array(7).fill(0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (const b of this.allBookings) {
      const d = new Date(b.startDate);
      d.setHours(0, 0, 0, 0);
      
      const diffMs = today.getTime() - d.getTime();
      const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000));
      
      if (diffDays >= 0 && diffDays < 7) {
        const idx = 6 - diffDays; // idx 6 is today, idx 0 is 6 days ago
        if (b.status === 'COMPLETED' || b.status === 'ACCEPTED') {
          completed[idx]++;
        } else if (b.status === 'PENDING') {
          pending[idx]++;
        }
      }
    }

    this.weeklyCompleted = completed;
    this.weeklyPending = pending;
  }

  private last12MonthLabels(): string[] {
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const now = new Date();
    return Array.from({ length: 12 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - (11 - i), 1);
      return names[d.getMonth()];
    });
  }

  private initEarningsChart(): void {
    const canvas = this.earningsChartRef?.nativeElement;
    if (!canvas) return;

    const themeRed = '#d72323';
    const themeRedLight = 'rgba(215, 35, 35, 0.2)';
    const labels = this.last12MonthLabels();
    const data = this.monthlyEarnings.length === 12 ? this.monthlyEarnings : Array(12).fill(0);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Earnings (KES)',
            data,
            borderColor: themeRed,
            backgroundColor: themeRedLight,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: themeRed,
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
            callbacks: {
              label: (context) => `KES ${Number(context.parsed.y).toLocaleString()}`,
            },
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#363636', font: { family: "'Lato', sans-serif" } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(54, 54, 54, 0.08)' },
            ticks: {
              color: '#363636',
              font: { family: "'Lato', sans-serif" },
              callback: (value) => `KES ${Number(value).toLocaleString()}`,
            },
          },
        },
      },
    };

    this.earningsChart = new Chart(canvas, config);
  }

  private updateEarningsChart(): void {
    if (!this.earningsChart || this.monthlyEarnings.length !== 12) return;

    const canvas = this.earningsChart.canvas as HTMLCanvasElement | null | undefined;
    if (!canvas || !canvas.isConnected) return;

    this.earningsChart.data.labels = this.last12MonthLabels();
    this.earningsChart.data.datasets[0].data = [...this.monthlyEarnings];
    this.earningsChart.update('active');
  }

  private last7DayLabels(): string[] {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(d.getDate() - (6 - i));
      return days[d.getDay()];
    });
  }

  private initBookingsChart(): void {
    const canvas = this.bookingsChartRef?.nativeElement;
    if (!canvas) return;

    const themeGreen = '#10b981';
    const themeGreenLight = 'rgba(16, 185, 129, 0.2)';
    const themeOrange = '#f59e0b';
    const themeOrangeLight = 'rgba(245, 158, 11, 0.2)';
    const labels = this.last7DayLabels();
    const completed = this.weeklyCompleted.length === 7 ? this.weeklyCompleted : Array(7).fill(0);
    const pending = this.weeklyPending.length === 7 ? this.weeklyPending : Array(7).fill(0);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Completed',
            data: completed,
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
          {
            label: 'Pending',
            data: pending,
            borderColor: themeOrange,
            backgroundColor: themeOrangeLight,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: themeOrange,
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
          legend: {
            display: true,
            position: 'top',
            labels: { color: '#363636', font: { family: "'Lato', sans-serif", size: 12 }, padding: 12 },
          },
          tooltip: {
            backgroundColor: '#2a2525',
            titleColor: '#fff',
            bodyColor: '#f5eded',
            padding: 12,
            cornerRadius: 8,
          },
        },
        scales: {
          x: {
            grid: { display: false },
            ticks: { color: '#363636', font: { family: "'Lato', sans-serif" } },
          },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(54, 54, 54, 0.08)' },
            ticks: { color: '#363636', font: { family: "'Lato', sans-serif" } },
          },
        },
      },
    };

    this.bookingsChart = new Chart(canvas, config);
  }

  private updateBookingsChart(): void {
    if (!this.bookingsChart || this.weeklyCompleted.length !== 7 || this.weeklyPending.length !== 7) return;

    const canvas = this.bookingsChart.canvas as HTMLCanvasElement | null | undefined;
    if (!canvas || !canvas.isConnected) return;

    this.bookingsChart.data.labels = this.last7DayLabels();
    this.bookingsChart.data.datasets[0].data = [...this.weeklyCompleted];
    this.bookingsChart.data.datasets[1].data = [...this.weeklyPending];
    this.bookingsChart.update('active');
  }

  getStatusClass(status: string): string {
    const statusClasses: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      ACCEPTED: 'bg-green-100 text-green-700',
      DECLINED: 'bg-red-100 text-red-700',
      COMPLETED: 'bg-blue-100 text-blue-700',
      CANCELLED: 'bg-gray-100 text-gray-700',
    };
    return statusClasses[status] || 'bg-gray-100 text-gray-700';
  }
}
