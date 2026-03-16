import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { NgClass, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCalendar, lucideMapPin, lucideArrowRight, lucideCheckCircle, lucideClock, lucideXCircle, lucideCat, lucideLayoutDashboard, lucideX, lucideDollarSign, lucideUser, lucideHome, lucideStar } from '@ng-icons/lucide';
import { BoardingService, type Booking } from '../../core/services/boarding.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-owner-bookings',
  standalone: true,
  imports: [NgClass, CommonModule, RouterLink, NgIcon, FormsModule],
  providers: [provideIcons({ lucideCalendar, lucideMapPin, lucideArrowRight, lucideCheckCircle, lucideClock, lucideXCircle, lucideCat, lucideLayoutDashboard, lucideX, lucideDollarSign, lucideUser, lucideHome, lucideStar })],
  templateUrl: './owner-bookings.component.html',
  styleUrl: './owner-bookings.component.css',
})
export class OwnerBookingsComponent implements OnInit {
  bookings: Booking[] = [];
  total = 0;
  isLoading = true;

  // Modal state
  selectedBooking: Booking | null = null;
  showDetailsModal = false;

  // Review state
  showReviewSection = false;
  reviewRating = 5;
  reviewComment = '';
  isSubmittingReview = false;

  constructor(
    @Inject(BoardingService) private boardingService: BoardingService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadBookings();
  }

  loadBookings(): void {
    this.isLoading = true;
    this.boardingService.myBookings(50, 0).subscribe({
      next: (res) => {
        this.bookings = res.data || [];
        this.total = res.total || 0;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[OwnerBookings] Failed to load bookings:', error);
        this.isLoading = false;
        this.cdr.detectChanges();
        
        if (error?.status === 429) {
          this.toast.error('Too many requests', 'Please wait a moment and try again');
          console.warn('Rate limit exceeded - please slow down requests');
        } else {
          this.toast.error('Error', 'Failed to load bookings');
        }
      },
    });
  }

  openDetailsModal(booking: Booking): void {
    console.log('[Booking Modal] Opening modal for booking:', booking);
    console.log('[Booking Modal] Boarding profile:', booking.boardingProfile);
    this.selectedBooking = booking;
    this.showDetailsModal = true;
    this.showReviewSection = false;
    this.reviewRating = 5;
    this.reviewComment = '';
    // Force change detection
    this.cdr.detectChanges();
  }

  closeDetailsModal(): void {
    this.selectedBooking = null;
    this.showDetailsModal = false;
    this.showReviewSection = false;
  }

  submitReview(): void {
    if (!this.selectedBooking) return;
    
    this.isSubmittingReview = true;
    this.boardingService.createReview(
      this.selectedBooking.id,
      this.reviewRating,
      this.reviewComment
    ).subscribe({
      next: () => {
        this.toast.success('Review submitted', 'Thank you for your feedback!');
        this.isSubmittingReview = false;
        this.showReviewSection = false;
        this.loadBookings(); // Reload to update status if needed
      },
      error: (error) => {
        this.isSubmittingReview = false;
        console.error('Failed to submit review:', error);
        this.toast.error('Error', 'Failed to submit review. Maybe you already left one?');
      },
    });
  }

  onModalBackdropClick(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('details-modal-backdrop')) {
      this.closeDetailsModal();
    }
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatDateTime(d: string): string {
    return new Date(d).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  statusClass(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'ACCEPTED' || s === 'COMPLETED') return 'accepted';
    if (s === 'PENDING') return 'pending';
    if (s === 'DECLINED' || s === 'CANCELLED') return 'declined';
    return 'pending';
  }

  statusIcon(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'ACCEPTED') return 'lucideCheckCircle';
    if (s === 'COMPLETED') return 'lucideCheckCircle';
    if (s === 'PENDING') return 'lucideClock';
    if (s === 'DECLINED' || s === 'CANCELLED') return 'lucideXCircle';
    return 'lucideCalendar';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PENDING: 'Pending',
      ACCEPTED: 'Accepted',
      DECLINED: 'Declined',
      COMPLETED: 'Completed',
      CANCELLED: 'Cancelled',
    };
    return labels[status] || status;
  }

  getPriceBreakdown(booking: Booking): { nights: number; pricePerNight: number; total: number } {
    if (!booking?.startDate || !booking?.endDate) {
      return { nights: 1, pricePerNight: booking?.totalPrice || 0, total: booking?.totalPrice || 0 };
    }
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    const diffTime = end.getTime() - start.getTime();
    const nights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const pricePerNight = nights > 0 ? booking.totalPrice / nights : booking.totalPrice;
    return {
      nights: Math.max(1, nights),
      pricePerNight,
      total: booking.totalPrice,
    };
  }
}
