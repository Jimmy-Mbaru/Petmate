import { Injectable, signal, computed } from '@angular/core';

const STORAGE_KEY = 'petmate_user_location';

export interface StoredLocation {
  lat: number;
  lng: number;
  address?: string;
  updatedAt: number;
}

@Injectable({
  providedIn: 'root',
})
export class UserLocationService {
  private readonly stored = signal<StoredLocation | null>(null);
  private readonly loading = signal(false);
  private readonly error = signal<string | null>(null);

  readonly location = computed(() => this.stored());
  readonly isLoading = computed(() => this.loading());
  readonly errorMessage = computed(() => this.error());
  readonly hasLocation = computed(() => this.stored() !== null);

  constructor() {
    this.loadFromStorage();
  }

  private loadFromStorage(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredLocation;
      if (
        typeof parsed?.lat === 'number' &&
        typeof parsed?.lng === 'number' &&
        typeof parsed?.updatedAt === 'number'
      ) {
        this.stored.set(parsed);
      }
    } catch {
      // ignore invalid stored data
    }
  }

  private saveToStorage(loc: StoredLocation): void {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loc));
      this.stored.set(loc);
      this.error.set(null);
    } catch (e) {
      this.error.set('Could not save location');
    }
  }

  /** Get persisted location (from storage). */
  getStored(): StoredLocation | null {
    return this.stored();
  }

  /**
   * Retrieve current position from browser, persist it, and optionally reverse-geocode for address.
   * Returns the stored location after update.
   */
  async updateCurrentLocation(): Promise<StoredLocation | null> {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      this.error.set('Geolocation is not supported. Use HTTPS or localhost.');
      return null;
    }

    this.loading.set(true);
    this.error.set(null);

    const options: PositionOptions = {
      enableHighAccuracy: true,
      timeout: 20000,
      maximumAge: 0, // always get a fresh position for "Use my location"
    };

    return new Promise<StoredLocation | null>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const address = await this.reverseGeocode(lat, lng);
          const loc: StoredLocation = {
            lat,
            lng,
            address,
            updatedAt: Date.now(),
          };
          this.saveToStorage(loc);
          this.loading.set(false);
          resolve(loc);
        },
        (err) => {
          this.loading.set(false);
          const message =
            err.code === 1
              ? 'Location permission denied. Allow location in your browser or device settings.'
              : err.code === 2
                ? 'Location unavailable. Check GPS/network and try again.'
                : err.code === 3
                  ? 'Location request timed out. Try again.'
                  : 'Could not get location. Use HTTPS or allow location access.';
          this.error.set(message);
          resolve(null);
        },
        options
      );
    });
  }

  private async reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
        {
          headers: {
            Accept: 'application/json',
            'User-Agent': 'PetMate/1.0 (https://github.com/petmate)',
          },
        }
      );
      if (!res.ok) return undefined;
      const data = await res.json();
      return data?.display_name;
    } catch {
      return undefined;
    }
  }

  /** Clear persisted location. */
  clear(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    this.stored.set(null);
    this.error.set(null);
  }
}
