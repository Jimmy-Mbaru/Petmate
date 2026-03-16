import { Injectable, signal } from '@angular/core';

/**
 * Global Loading Service
 * Manages application-wide loading state
 */
@Injectable({
  providedIn: 'root',
})
export class LoadingService {
  private loadingCount = signal(0);
  private isLoading = signal(false);
  private timeoutId: any = null;
  private readonly DELAY = 300; // Delay before showing loading (ms)

  /**
   * Get the current loading state
   */
  getLoadingState() {
    return this.isLoading.asReadonly();
  }

  /**
   * Get the current loading count
   */
  getLoadingCount() {
    return this.loadingCount.asReadonly();
  }

  /**
   * Show loading indicator with optional delay
   */
  show(): void {
    this.loadingCount.update((count) => count + 1);

    // Delay showing to avoid flickering for fast requests
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = setTimeout(() => {
      if (this.loadingCount() > 0) {
        this.isLoading.set(true);
      }
    }, this.DELAY);
  }

  /**
   * Hide loading indicator
   */
  hide(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    this.loadingCount.update((count) => Math.max(0, count - 1));

    if (this.loadingCount() === 0) {
      this.isLoading.set(false);
    }
  }

  /**
   * Force hide all loading indicators
   */
  forceHide(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.loadingCount.set(0);
    this.isLoading.set(false);
  }
}
