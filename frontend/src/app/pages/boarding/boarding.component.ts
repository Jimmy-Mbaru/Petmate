import { DecimalPipe } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideSearch,
  lucideMapPin,
  lucideStar,
  lucideCalendar,
  lucideDollarSign,
  lucideLocateFixed,
  lucideAlertCircle,
} from '@ng-icons/lucide';
import {
  BoardingService,
  type BoardingProfile,
  type SearchBoardingParams,
} from '../../core/services/boarding.service';
import { ToastService } from '../../core/services/toast.service';
import { UserLocationService } from '../../core/services/user-location.service';
import { MapComponent, type MapMarker } from '../../shared/components/map/map.component';

@Component({
  selector: 'app-boarding',
  standalone: true,
  imports: [RouterLink, NgIcon, MapComponent, FormsModule, DecimalPipe],
  providers: [
    provideIcons({
      lucideSearch,
      lucideMapPin,
      lucideStar,
      lucideCalendar,
      lucideDollarSign,
      lucideLocateFixed,
      lucideAlertCircle,
    }),
  ],
  templateUrl: './boarding.component.html',
  styleUrl: './boarding.component.css',
})
export class BoardingComponent implements OnInit {
  profiles: BoardingProfile[] = [];
  isLoading = false;
  searchQuery: SearchBoardingParams = {};
  locationSearchText = '';
  limit = 12;
  offset = 0;
  total = 0;

  // Map settings
  mapLat = -1.2921; // Nairobi coordinates (default)
  mapLng = 36.8219;
  mapMarkers: MapMarker[] = [];
  showMap = false;

  // Booking modal
  bookingModalOpen = false;
  bookingProfile: BoardingProfile | null = null;
  bookingStartDate = '';
  bookingEndDate = '';
  bookingInProgress = false;
  currentBlackoutDates: string[] = [];

  constructor(
    @Inject(BoardingService) private boardingService: BoardingService,
    private toast: ToastService,
    private router: Router,
    public userLocation: UserLocationService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    // Don't set location filters on initial load - retrieve all approved profiles
    this.loadProfiles();
  }

  loadProfiles(): void {
    this.isLoading = true;
    this.boardingService
      .search(this.searchQuery, this.limit, this.offset)
      .subscribe({
        next: (response) => {
          queueMicrotask(() => {
            this.profiles = response.data;
            this.total = response.total;
            this.updateMapMarkers();
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        },
        error: (error) => {
          queueMicrotask(() => {
            this.isLoading = false;
            this.cdr.markForCheck();
          });
          this.toast.error('Error', 'Failed to load boarding profiles');
          console.error('Error loading boarding profiles:', error);
        },
      });
  }

  updateMapMarkers(): void {
    const withCoords = this.profiles.filter(
      (p) =>
        p.latitude != null &&
        p.longitude != null &&
        typeof p.latitude === 'number' &&
        typeof p.longitude === 'number' &&
        !Number.isNaN(p.latitude) &&
        !Number.isNaN(p.longitude)
    );
    
    this.mapMarkers = withCoords.map((p) => ({
      lat: p.latitude as number,
      lng: p.longitude as number,
      title: p.location,
      popup: `<strong>${p.location}</strong><br/>KES ${p.pricePerDay}/day<br/>Capacity: ${p.capacity}`,
    }));

    if (this.mapMarkers.length > 0) {
      this.mapLat = this.mapMarkers[0].lat;
      this.mapLng = this.mapMarkers[0].lng;
    }
  }

  toggleMap(): void {
    this.showMap = !this.showMap;
  }

  onSearch(): void {
    this.offset = 0;
    this.loadProfiles();
  }

  onLocationChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value.trim();
    this.locationSearchText = value;
    this.searchQuery.q = value || undefined;
  }

  async useMyLocation(): Promise<void> {
    const loc = await this.userLocation.updateCurrentLocation();
    if (loc) {
      this.mapLat = loc.lat;
      this.mapLng = loc.lng;
      if (loc.address) {
        this.locationSearchText = loc.address;
        this.searchQuery.q = loc.address;
      }
      this.searchQuery.lat = loc.lat;
      this.searchQuery.lng = loc.lng;
      this.searchQuery.maxDistanceKm = 50;
      this.offset = 0;
      this.loadProfiles();
      this.toast.success('Location updated', loc.address || `Lat ${loc.lat.toFixed(4)}, Lng ${loc.lng.toFixed(4)}`);
    } else {
      this.toast.error('Location', this.userLocation.errorMessage() || 'Could not get location');
    }
  }

  onMinPriceChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.minPrice = value ? parseFloat(value) : undefined;
  }

  onMaxPriceChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.maxPrice = value ? parseFloat(value) : undefined;
  }

  onMinRatingChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.minRating = value ? parseFloat(value) : undefined;
  }

  loadMore(): void {
    this.offset += this.limit;
    this.isLoading = true;
    this.boardingService
      .search(this.searchQuery, this.limit, this.offset)
      .subscribe({
        next: (response) => {
          queueMicrotask(() => {
            this.profiles = [...this.profiles, ...response.data];
            this.total = response.total;
            this.updateMapMarkers();
            this.isLoading = false;
            this.cdr.markForCheck();
          });
        },
        error: (error) => {
          queueMicrotask(() => {
            this.isLoading = false;
            this.cdr.markForCheck();
          });
          this.toast.error('Error', 'Failed to load more profiles');
          console.error('Error loading more profiles:', error);
        },
      });
  }

  openBookingModal(profile: BoardingProfile): void {
    this.bookingProfile = profile;
    this.bookingStartDate = '';
    this.bookingEndDate = '';
    this.currentBlackoutDates = [];
    this.bookingModalOpen = true;
    
    // Load blackout dates for this profile
    this.boardingService.getBlackoutDates(profile.id).subscribe({
      next: (dates) => {
        this.currentBlackoutDates = dates.map(d => d.date.split('T')[0]);
        this.cdr.detectChanges();
      }
    });
  }

  closeBookingModal(): void {
    this.bookingModalOpen = false;
    this.bookingProfile = null;
    this.bookingStartDate = '';
    this.bookingEndDate = '';
    this.bookingInProgress = false;
    this.currentBlackoutDates = [];
  }

  isDateBlackedOut(dateStr: string): boolean {
    return this.currentBlackoutDates.includes(dateStr);
  }

  hasBlackoutInSelection(): boolean {
    if (!this.bookingStartDate || !this.bookingEndDate) return false;
    
    const start = new Date(this.bookingStartDate);
    const end = new Date(this.bookingEndDate);
    
    // Iterate through days
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      if (this.isDateBlackedOut(dateStr)) return true;
    }
    return false;
  }

  /** Minimum booking date: today (local), so we never allow past days. */
  minBookingDate(): string {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  maxBookingDate(): string {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 1);
    return d.toISOString().slice(0, 10);
  }

  isBookingDisabled(): boolean {
    return this.bookingInProgress || !this.bookingStartDate || !this.bookingEndDate || this.hasBlackoutInSelection();
  }

  onBookingBackdropClick(event: Event): void {
    if ((event.target as HTMLElement).classList.contains('booking-modal-backdrop')) {
      this.closeBookingModal();
    }
  }

  confirmBooking(): void {
    const startDate = this.bookingStartDate?.trim();
    const endDate = this.bookingEndDate?.trim();
    if (!startDate || !endDate || !this.bookingProfile) {
      this.toast.error('Invalid dates', 'Please enter both start and end date (YYYY-MM-DD).');
      return;
    }

    if (this.hasBlackoutInSelection()) {
      this.toast.error('Unavailable', 'One or more selected dates are blacked out by the host.');
      return;
    }

    const today = this.minBookingDate();
    if (startDate < today) {
      this.toast.error('Invalid start date', 'Start date cannot be in the past.');
      return;
    }
    if (endDate < today) {
      this.toast.error('Invalid end date', 'End date cannot be in the past.');
      return;
    }
    if (endDate < startDate) {
      this.toast.error('Invalid dates', 'End date must be on or after the start date.');
      return;
    }
    
    const currentUserId = localStorage.getItem('petmate_auth');
    if (!currentUserId) {
      this.closeBookingModal();
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/boarding' } });
      return;
    }
    
    this.bookingInProgress = true;
    this.cdr.detectChanges();
    
    this.boardingService.book(this.bookingProfile.id, { startDate, endDate }).subscribe({
      next: (booking) => {
        this.bookingInProgress = false;
        this.toast.success(
          'Booked',
          `Booking confirmed! Total: KES ${booking.totalPrice}`
        );
        setTimeout(() => {
          this.closeBookingModal();
          this.cdr.detectChanges();
        }, 800);
      },
      error: (error) => {
        this.bookingInProgress = false;
        this.cdr.detectChanges();

        let errorMsg = 'Failed to book this slot';
        if (error?.status === 401 || error?.status === 403) {
          this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/boarding' } });
          return;
        } else if (error?.status === 400) {
          errorMsg = error?.error?.message || 'Invalid booking dates';
          this.toast.error('Invalid booking', errorMsg);
        } else if (error?.status === 409) {
          errorMsg = 'This slot is already booked';
          this.toast.error('Unavailable', errorMsg);
        } else {
          this.toast.error('Error', errorMsg);
        }
        console.error('Error booking:', error);
      },
    });
  }
}
