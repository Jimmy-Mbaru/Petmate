import { Injectable, signal, computed, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { interval, Subscription } from 'rxjs';
import { switchMap, catchError, of } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class BackendStatusService {
  private readonly http = inject(HttpClient);

  private readonly _isDown = signal(false);
  private readonly _justRecovered = signal(false);
  private pollSub: Subscription | null = null;

  readonly isDown = computed(() => this._isDown());
  readonly justRecovered = computed(() => this._justRecovered());

  /** Fire a one-shot health check to wake the server (call on page load, not just on failure). */
  warmUp(): void {
    this.http
      .get(`${environment.apiUrl}/health`, { responseType: 'json' })
      .pipe(catchError(() => of(null)))
      .subscribe((res) => {
        if (res === null) this.markDown();
      });
  }

  markDown(): void {
    if (this._isDown()) return;
    this._isDown.set(true);
    this.startPolling();
  }

  markUp(): void {
    if (!this._isDown()) return;
    this._isDown.set(false);
    this._justRecovered.set(true);
    this.stopPolling();
    setTimeout(() => this._justRecovered.set(false), 3000);
  }

  private startPolling(): void {
    if (this.pollSub) return;
    this.pollSub = interval(8000)
      .pipe(
        switchMap(() =>
          this.http.get(`${environment.apiUrl}/health`, { responseType: 'json' }).pipe(
            catchError(() => of(null))
          )
        )
      )
      .subscribe((res) => {
        if (res !== null) this.markUp();
      });
  }

  private stopPolling(): void {
    this.pollSub?.unsubscribe();
    this.pollSub = null;
  }
}
