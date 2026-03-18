import { Component, Inject, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, ChangeDetectorRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import AOS from 'aos';
import {
  lucideCat,
  lucideCalendar,
  lucideHeart,
  lucideShoppingBag,
  lucideTrendingUp,
  lucideArrowRight,
  lucideSparkles,
  lucideMessageCircle,
} from '@ng-icons/lucide';
import { AuthService } from '../../core/auth/auth.service';
import { PetsService } from '../../core/services/pets.service';
import { BoardingService } from '../../core/services/boarding.service';
import { StoreService } from '../../core/services/store.service';
import { ChatService } from '../../core/services/chat.service';
import { FavoritesService } from '../../core/services/favorites.service';
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
  DoughnutController,
  ArcElement,
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
  DoughnutController,
  ArcElement,
  Tooltip,
  Legend,
);

export type ActivityPeriod = 'week' | 'month' | '6months' | 'year';

@Component({
  selector: 'app-owner-dashboard',
  standalone: true,
  imports: [NgIcon, RouterLink],
  providers: [
    provideIcons({
      lucideCat,
      lucideCalendar,
      lucideHeart,
      lucideShoppingBag,
      lucideTrendingUp,
      lucideArrowRight,
      lucideSparkles,
      lucideMessageCircle,
    }),
  ],
  templateUrl: './owner-dashboard.component.html',
  styleUrl: './owner-dashboard.component.css',
})
export class OwnerDashboardComponent implements OnInit, AfterViewInit, OnDestroy {
  private resizeListener = (): void => AOS.refresh();
  @ViewChild('activityChart') activityChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('distributionChart') distributionChartRef!: ElementRef<HTMLCanvasElement>;

  userName = '';
  userRole = 'Owner';
  hasPets: boolean | null = null; // null = loading, false = no pets, true = has pets
  stats = {
    pets: 0,
    bookings: 0,
    favorites: 0,
    orders: 0,
    messages: 0,
  };
  recentBookings: { id: string; title: string; date: string; status: string }[] = [];
  isLoading = false;

  activityPeriod: ActivityPeriod = 'week';
  readonly periodOptions: { value: ActivityPeriod; label: string }[] = [
    { value: 'year', label: 'Year' },
    { value: '6months', label: '6 months' },
    { value: 'month', label: 'Month' },
    { value: 'week', label: 'Week' },
  ];

  private activityChart: Chart | null = null;
  private distributionChart: Chart | null = null;
  private activityDataCache: { labels: string[]; values: number[] } | null = null;

  constructor(
    private auth: AuthService,
    private cdr: ChangeDetectorRef,
    @Inject(PetsService) private petsService: PetsService,
    @Inject(BoardingService) private boardingService: BoardingService,
    @Inject(StoreService) private storeService: StoreService,
    @Inject(ChatService) private chatService: ChatService,
    @Inject(FavoritesService) private favoritesService: FavoritesService
  ) {}

  ngOnInit(): void {
    AOS.init({
      duration: 600,
      easing: 'ease-out-cubic',
      once: true,
      offset: 40,
      delay: 0,
    });
    const user = this.auth.getCurrentUser();
    this.userName = user?.firstName?.trim() || 'Pet';
    this.userRole = 'Owner';
    this.loadDashboardData();
  }

  loadDashboardData(): void {
    this.isLoading = true;

    // Load pets count
    this.petsService.getMyPets(1, 0).subscribe({
      next: (response) => {
        this.stats.pets = response.total;
        this.hasPets = response.total > 0;
        this.cdr.detectChanges();
        this.updateDistributionChart();
      },
      error: () => { this.hasPets = false; },
    });

    // Load bookings
    this.boardingService.myBookings(5, 0).subscribe({
      next: (response) => {
        this.stats.bookings = response.total;
        this.recentBookings = response.data.map((booking) => ({
          id: String(booking.id),
          title: `Boarding at ${booking.boardingProfile?.location || 'Unknown'}`,
          date: new Date(booking.startDate).toLocaleDateString(),
          status: booking.status,
        }));
        this.cdr.detectChanges();
        this.updateDistributionChart();
      },
      error: () => {},
    });

    // Load orders
    this.storeService.myOrders(1, 0).subscribe({
      next: (response) => {
        this.stats.orders = response.total;
        this.cdr.detectChanges();
        this.updateDistributionChart();
      },
      error: () => {},
    });

    // Load unread messages count
    this.chatService.getUnreadCount().subscribe({
      next: (response) => {
        this.stats.messages = response.unreadCount;
        this.cdr.detectChanges();
        this.updateDistributionChart();
      },
      error: () => {},
    });

    // Favorites: count pets + boarding profiles (parallel)
    let favPets = 0;
    let favBoarding = 0;
    let favDone = 0;
    const maybeUpdateFav = () => {
      favDone++;
      if (favDone === 2) {
        this.stats.favorites = favPets + favBoarding;
        this.cdr.detectChanges();
        this.updateDistributionChart();
      }
    };
    this.favoritesService.getFavoritePets().subscribe({
      next: (pets) => { favPets = pets.length; maybeUpdateFav(); },
    });
    this.favoritesService.getFavoriteBoardingProfiles().subscribe({
      next: (boarding) => { favBoarding = boarding.length; maybeUpdateFav(); },
    });

    this.isLoading = false;
  }

  ngOnDestroy(): void {
    window.removeEventListener('resize', this.resizeListener);
  }

  ngAfterViewInit(): void {
    // Defer so canvas elements are laid out and have dimensions (fixes lazy-loaded route)
    setTimeout(() => {
      this.initActivityChart();
    }, 0);
    setTimeout(() => {
      this.initDistributionChart();
      AOS.refresh();
      window.addEventListener('resize', this.resizeListener);
    }, 100);
  }

  setActivityPeriod(period: ActivityPeriod): void {
    this.activityPeriod = period;
    this.activityDataCache = null; // Clear cache when period changes
    this.updateActivityChart();
  }

  private getActivityDataForPeriod(period: ActivityPeriod): { labels: string[]; values: number[] } {
    // Generate date ranges based on period
    const now = new Date();
    let startDate = new Date();
    let labels: string[] = [];
    let dateLabels: { label: string; start: Date; end: Date }[] = [];

    switch (period) {
      case 'week': {
        // Last 7 days
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        labels = [];
        dateLabels = [];
        for (let i = 6; i >= 0; i--) {
          const date = new Date(now);
          date.setDate(date.getDate() - i);
          labels.push(days[date.getDay()]);
          dateLabels.push({
            label: days[date.getDay()],
            start: new Date(date.setHours(0, 0, 0, 0)),
            end: new Date(date.setHours(23, 59, 59, 999)),
          });
        }
        break;
      }
      case 'month': {
        // Last 4 weeks
        labels = [];
        dateLabels = [];
        for (let i = 3; i >= 0; i--) {
          const weekStart = new Date(now);
          weekStart.setDate(weekStart.getDate() - (i * 7));
          const weekEnd = new Date(weekStart);
          weekEnd.setDate(weekEnd.getDate() + 6);
          const weekNum = 4 - i;
          labels.push(`Week ${weekNum}`);
          dateLabels.push({
            label: `Week ${weekNum}`,
            start: new Date(weekStart.setHours(0, 0, 0, 0)),
            end: new Date(weekEnd.setHours(23, 59, 59, 999)),
          });
        }
        break;
      }
      case '6months': {
        // Last 6 months
        labels = [];
        dateLabels = [];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthLabel = months[date.getMonth()];
          labels.push(monthLabel);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
          dateLabels.push({
            label: monthLabel,
            start: monthStart,
            end: monthEnd,
          });
        }
        break;
      }
      case 'year': {
        // Last 12 months
        labels = [];
        dateLabels = [];
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        for (let i = 11; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthLabel = months[date.getMonth()];
          labels.push(monthLabel);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
          dateLabels.push({
            label: monthLabel,
            start: monthStart,
            end: monthEnd,
          });
        }
        break;
      }
    }

    // Fetch real booking data and count by period
    const values = new Array(labels.length).fill(0);
    
    // Get all bookings and count them per period
    this.boardingService.myBookings(100, 0).subscribe({
      next: (response) => {
        const bookings = response.data;
        bookings.forEach((booking) => {
          const bookingDate = new Date(booking.startDate);
          dateLabels.forEach((period, index) => {
            if (bookingDate >= period.start && bookingDate <= period.end) {
              values[index]++;
            }
          });
        });
        
        // Update chart if it exists
        if (this.activityChart) {
          this.activityChart.data.labels = labels;
          this.activityChart.data.datasets[0].data = values;
          this.activityChart.update('active');
        }
      },
      error: (error) => console.error('Error loading activity data:', error),
    });

    return { labels, values };
  }

  private initActivityChart(): void {
    this.updateActivityChart();
  }

  private updateActivityChart(): void {
    const canvas = this.activityChartRef?.nativeElement;
    if (!canvas) return;

    const themeRed = '#d72323';
    const themeRedLight = 'rgba(215, 35, 35, 0.2)';
    const { labels, values } = this.getActivityDataForPeriod(this.activityPeriod);

    if (this.activityChart) {
      this.activityChart.data.labels = labels;
      this.activityChart.data.datasets[0].data = values;
      this.activityChart.update('active');
      return;
    }

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels,
        datasets: [
          {
            label: 'Activity',
            data: values,
            borderColor: themeRed,
            backgroundColor: themeRedLight,
            borderWidth: 2,
            fill: true,
            tension: 0.35,
            pointBackgroundColor: themeRed,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 4,
            pointHoverRadius: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: {
          duration: 800,
        },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#2a2525',
            titleColor: '#fff',
            bodyColor: '#f5eded',
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

    this.activityChart = new Chart(canvas, config);
  }

  private initDistributionChart(): void {
    const canvas = this.distributionChartRef?.nativeElement;
    if (!canvas) return;

    this.updateDistributionChartConfig(canvas);
  }

  updateDistributionChart(): void {
    if (this.distributionChart) {
      const { pets, bookings, favorites, orders, messages } = this.stats;
      this.distributionChart.data.datasets[0].data = [
        pets || 1,
        bookings || 0,
        favorites || 0,
        orders || 0,
        messages || 0,
      ];
      this.distributionChart.update('active');
    }
  }

  private updateDistributionChartConfig(canvas: HTMLCanvasElement): void {
    const { pets, bookings, favorites, orders, messages } = this.stats;
    const themeRed = '#d72323';
    const themeColors = [
      themeRed,
      'rgba(215, 35, 35, 0.75)',
      'rgba(215, 35, 35, 0.5)',
      'rgba(215, 35, 35, 0.3)',
      'rgba(215, 35, 35, 0.2)',
    ];

    const config: ChartConfiguration<'doughnut'> = {
      type: 'doughnut',
      data: {
        labels: ['Pets', 'Bookings', 'Favorites', 'Orders', 'Messages'],
        datasets: [
          {
            data: [pets || 1, bookings || 0, favorites || 0, orders || 0, messages || 0],
            backgroundColor: themeColors,
            borderColor: '#f5eded',
            borderWidth: 2,
            hoverOffset: 6,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '62%',
        animation: {
          duration: 1400,
        },
        plugins: {
          legend: {
            position: 'bottom',
            labels: { color: '#363636', font: { family: "'Lato', sans-serif" }, padding: 12 },
          },
          tooltip: {
            backgroundColor: '#2a2525',
            titleColor: '#fff',
            bodyColor: '#f5eded',
          },
        },
      },
    };

    this.distributionChart = new Chart(canvas, config);
  }
}
