import { Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import AOS from 'aos';
import { BoardingService, type Booking } from '../../core/services/boarding.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';

export type BookingFilter = 'all' | 'pending' | 'accepted' | 'declined' | 'completed' | 'cancelled';

@Component({
  selector: 'app-host-bookings',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './host-bookings.component.html',
  styleUrls: ['./host-bookings.component.css'],
})
export class HostBookingsComponent implements OnInit {
  readonly bookings = signal<Booking[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly filter = signal<BookingFilter>('all');
  readonly filterOptions: readonly BookingFilter[] = ['all', 'pending', 'accepted', 'declined', 'completed', 'cancelled'];

  selectedBooking: Booking | null = null;
  showDetailsModal = false;

  constructor(
    @Inject(BoardingService) private boardingService: BoardingService,
    private toastService: ToastService,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      offset: 50,
    });
    this.loadBookings();
  }

  loadBookings(): void {
    this.loading.set(true);
    this.boardingService.myBookings(50, 0).subscribe({
      next: (response) => {
        const data = response.data || [];
        this.bookings.set(data);
        this.total.set(response.total || 0);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('[HostBookings] Failed to load bookings:', error);
        this.loading.set(false);
        this.toastService.error('Error', 'Failed to load bookings');
      },
    });
  }

  async updateBookingStatus(bookingId: number, status: 'ACCEPTED' | 'DECLINED'): Promise<void> {
    const booking = this.bookings().find(b => b.id === bookingId);
    if (!booking) {
      this.toastService.error('Error', 'Booking not found');
      return;
    }

    const confirmed = await this.dialogService.confirm({
      title: 'Update Booking',
      message: `Are you sure you want to ${status.toLowerCase()} this booking?`,
      confirmText: status.charAt(0).toUpperCase() + status.slice(1),
      type: status === 'DECLINED' ? 'danger' : 'info'
    });

    if (!confirmed) return;

    this.boardingService.updateBookingStatus(bookingId, status).subscribe({
      next: () => {
        this.toastService.success('Success', `Booking ${status.toLowerCase()}`);
        this.loadBookings();
      },
      error: (error) => {
        console.error('[HostBookings] Failed to update booking:', error);
        this.toastService.error('Error', `Failed to ${status.toLowerCase()} booking`);
      },
    });
  }

  openDetailsModal(booking: Booking): void {
    this.selectedBooking = booking;
    this.showDetailsModal = true;
  }

  closeDetailsModal(): void {
    this.selectedBooking = null;
    this.showDetailsModal = false;
  }

  onModalBackdropClick(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('hb-modal-backdrop')) {
      this.closeDetailsModal();
    }
  }

  getPriceBreakdown(booking: Booking): { nights: number; pricePerNight: number; total: number } {
    if (!booking?.startDate || !booking?.endDate) {
      return { nights: 1, pricePerNight: booking?.totalPrice || 0, total: booking?.totalPrice || 0 };
    }
    const start = new Date(booking.startDate);
    const end = new Date(booking.endDate);
    const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    return { nights, pricePerNight: booking.totalPrice / nights, total: booking.totalPrice };
  }

  formatDateTime(d: string): string {
    return new Date(d).toLocaleString(undefined, {
      month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  }

  getStatusClass(status: string): string {
    const classes: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700 border-yellow-200',
      ACCEPTED: 'bg-green-100 text-green-700 border-green-200',
      DECLINED: 'bg-red-100 text-red-700 border-red-200',
      COMPLETED: 'bg-blue-100 text-blue-700 border-blue-200',
      CANCELLED: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return classes[status] || 'bg-gray-100 text-gray-700 border-gray-200';
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

  getFilteredBookings(): Booking[] {
    const bookings = this.bookings();
    const filterValue = this.filter();
    if (filterValue === 'all') return bookings;
    return bookings.filter(b => b.status === filterValue.toUpperCase());
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
