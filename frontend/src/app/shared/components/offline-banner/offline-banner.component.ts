import { Component, inject } from '@angular/core';
import { BackendStatusService } from '../../../core/services/backend-status.service';

@Component({
  selector: 'app-offline-banner',
  standalone: true,
  template: `
    @if (status.isDown()) {
      <div class="offline-banner" role="alert" aria-live="assertive">
        <span class="pulse-dot" aria-hidden="true"></span>
        <span>Server is temporarily unavailable — retrying automatically…</span>
      </div>
    } @else if (status.justRecovered()) {
      <div class="recovered-banner" role="status" aria-live="polite">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
          <circle cx="7" cy="7" r="7" fill="#10b981"/>
          <path d="M4 7l2 2 4-4" stroke="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span>Reconnected</span>
      </div>
    }
  `,
  styles: [`
    .offline-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 10px;
      padding: 10px 16px;
      background: #1e293b;
      color: #f1f5f9;
      font-size: 0.875rem;
      font-weight: 500;
      text-align: center;
    }

    .recovered-banner {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      z-index: 9999;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px 16px;
      background: #064e3b;
      color: #d1fae5;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #f59e0b;
      flex-shrink: 0;
      animation: pulse 1.4s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.75); }
    }
  `],
})
export class OfflineBannerComponent {
  protected readonly status = inject(BackendStatusService);
}
