import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface BoardingProfile {
  id: number;
  hostId: string;
  host?: {
    id: string;
    name: string;
    email: string;
    avatarUrl?: string;
  };
  location: string;
  latitude?: number;
  longitude?: number;
  capacity: number;
  maxPetsPerNight?: number;
  pricePerDay: number;
  description?: string;
  photoUrls?: string[];
  documentUrls?: string[];
  isApproved: boolean;
  averageRating?: number;
  reviewCount: number;
  createdAt: string;
  updatedAt: string;
  blackoutDates?: BlackoutDate[];
}

export interface CreateBoardingProfileDto {
  location: string;
  latitude?: number;
  longitude?: number;
  capacity: number;
  maxPetsPerNight?: number;
  pricePerDay: number;
  description?: string;
  photoUrls?: string[];
  documentUrls?: string[];
}

export interface UpdateBoardingProfileDto {
  location?: string;
  latitude?: number;
  longitude?: number;
  capacity?: number;
  maxPetsPerNight?: number;
  pricePerDay?: number;
  description?: string;
  photoUrls?: string[];
  documentUrls?: string[];
}

export interface SearchBoardingParams {
  q?: string;
  minPrice?: number;
  maxPrice?: number;
  minCapacity?: number;
  minRating?: number;
  lat?: number;
  lng?: number;
  maxDistanceKm?: number;
  startDate?: string;
  endDate?: string;
}

export interface CreateBookingDto {
  startDate: string;
  endDate: string;
}

export interface Booking {
  id: number;
  boardingProfileId: number;
  ownerId: string;
  hostId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  updatedAt: string;
  boardingProfile?: {
    id: number;
    location: string;
    pricePerDay: number;
  };
  owner?: {
    id: string;
    email: string;
    name: string;
  };
}

export interface Review {
  id: number;
  bookingId: number;
  boardingProfileId: number;
  ownerId: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface BoardingProfileWithStats extends BoardingProfile {
  stats?: {
    totalEarnings: number;
    totalBookings: number;
    pendingBookings: number;
    completedBookings: number;
  };
}

export interface BlackoutDate {
  id: number;
  boardingProfileId: number;
  date: string;
  createdAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

@Injectable({
  providedIn: 'root',
})
export class BoardingService {
  private readonly apiUrl = `${environment.apiUrl}/boarding`;

  constructor(private http: HttpClient) {}

  /**
   * Host creates boarding profile
   */
  createProfile(dto: CreateBoardingProfileDto): Observable<BoardingProfile> {
    return this.http.post<BoardingProfile>(`${this.apiUrl}/profile`, dto);
  }

  /**
   * Get current host's boarding profile with stats
   */
  getMyProfile(): Observable<BoardingProfileWithStats> {
    return this.http.get<BoardingProfileWithStats>(`${this.apiUrl}/my-profile`);
  }

  /**
   * Search & discover boarding services (paginated, public)
   */
  search(
    params?: SearchBoardingParams,
    limit: number = 10,
    offset: number = 0
  ): Observable<PaginatedResponse<BoardingProfile>> {
    let httpParams = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    if (params) {
      if (params.q) httpParams = httpParams.set('q', params.q);
      if (params.minPrice !== undefined) httpParams = httpParams.set('minPrice', params.minPrice.toString());
      if (params.maxPrice !== undefined) httpParams = httpParams.set('maxPrice', params.maxPrice.toString());
      if (params.minCapacity !== undefined) httpParams = httpParams.set('minCapacity', params.minCapacity.toString());
      if (params.minRating !== undefined) httpParams = httpParams.set('minRating', params.minRating.toString());
      if (params.lat !== undefined) httpParams = httpParams.set('lat', params.lat.toString());
      if (params.lng !== undefined) httpParams = httpParams.set('lng', params.lng.toString());
      if (params.maxDistanceKm !== undefined) httpParams = httpParams.set('maxDistanceKm', params.maxDistanceKm.toString());
      if (params.startDate) httpParams = httpParams.set('startDate', params.startDate);
      if (params.endDate) httpParams = httpParams.set('endDate', params.endDate);
    }

    return this.http.get<PaginatedResponse<BoardingProfile>>(this.apiUrl, { params: httpParams });
  }

  /**
   * Get boarding profile by ID
   */
  findOneProfile(id: number): Observable<BoardingProfile & { reviews?: Review[] }> {
    return this.http.get<BoardingProfile & { reviews?: Review[] }>(`${this.apiUrl}/${id}`);
  }

  /**
   * Get boarding profile by host ID
   */
  getProfileByHost(hostId: string): Observable<BoardingProfile | null> {
    return this.http.get<BoardingProfile | null>(`${this.apiUrl}/profile/host/${hostId}`);
  }

  /**
   * Host updates own profile
   */
  updateProfile(id: number, dto: UpdateBoardingProfileDto): Observable<BoardingProfile> {
    return this.http.patch<BoardingProfile>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * Owner books a slot
   */
  book(profileId: number, dto: CreateBookingDto): Observable<Booking> {
    return this.http.post<Booking>(`${this.apiUrl}/${profileId}/book`, dto);
  }

  /**
   * Get my bookings (owner or host), paginated
   */
  myBookings(
    limit: number = 10,
    offset: number = 0
  ): Observable<PaginatedResponse<Booking>> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http.get<PaginatedResponse<Booking>>(`${this.apiUrl}/bookings/my`, { params });
  }

  /**
   * Host accept/decline booking
   */
  updateBookingStatus(
    bookingId: number,
    status: 'ACCEPTED' | 'DECLINED'
  ): Observable<Booking> {
    return this.http.patch<Booking>(`${this.apiUrl}/bookings/${bookingId}`, { status });
  }

  /**
   * Owner leaves review after completed booking
   */
  createReview(
    bookingId: number,
    rating: number,
    comment?: string
  ): Observable<Review> {
    return this.http.post<Review>(`${this.apiUrl}/bookings/${bookingId}/review`, {
      rating,
      comment,
    });
  }

  /**
   * Get blackout dates for host profile
   */
  getBlackoutDates(
    profileId: number,
    startDate?: string,
    endDate?: string
  ): Observable<BlackoutDate[]> {
    let params = new HttpParams();
    if (startDate) params = params.set('startDate', startDate);
    if (endDate) params = params.set('endDate', endDate);

    return this.http.get<BlackoutDate[]>(`${this.apiUrl}/${profileId}/blackout`, { params });
  }

  /**
   * Add a blackout date (Host only)
   */
  addBlackout(profileId: number, date: string): Observable<BlackoutDate> {
    return this.http.post<BlackoutDate>(`${this.apiUrl}/${profileId}/blackout`, { date });
  }

  /**
   * Remove a blackout date (Host only)
   */
  removeBlackout(profileId: number, date: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${profileId}/blackout/${date}`);
  }
}
