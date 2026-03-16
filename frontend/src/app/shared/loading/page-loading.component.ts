import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-page-loading',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (loading) {
      <div class="flex items-center justify-center min-h-[400px]">
        <div class="flex flex-col items-center gap-4" [attr.data-aos]="aosAnimation">
          <!-- Spinner -->
          <div class="relative">
            <div class="w-16 h-16 rounded-full border-4 border-gray-200 animate-spin"></div>
            <div class="absolute inset-0 w-16 h-16 rounded-full border-4 border-transparent border-t-[--color-primary] border-r-[--color-primary-hover] animate-spin"></div>
          </div>
          
          <!-- Text -->
          @if (showText) {
            <p class="text-gray-600 font-medium">{{ text }}</p>
          }
        </div>
      </div>
    } @else {
      <ng-content></ng-content>
    }
  `,
  styles: [],
})
export class PageLoadingComponent {
  @Input() loading = false;
  @Input() showText = true;
  @Input() text = 'Loading...';
  @Input() aosAnimation = 'fade-in';
}
