import { Component, inject } from '@angular/core';
import { ToastService, type Toast, type ToastVariant } from '../../../core/services/toast.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  imports: [],
  templateUrl: './toast.component.html',
  styleUrl: './toast.component.css',
})
export class ToastComponent {
  protected readonly toastService = inject(ToastService);

  protected variantClasses(variant: ToastVariant): string {
    const base =
      'rounded-xl border-2 shadow-xl p-4 flex gap-3 items-start min-w-[280px] max-w-[380px] ' +
      'bg-white/25 dark:bg-black/35 backdrop-blur-md text-neutral-900 dark:text-neutral-100';
    const variants: Record<ToastVariant, string> = {
      default: 'border-neutral-300/80 dark:border-neutral-600/80',
      info: 'border-sky-500 dark:border-sky-400/90',
      success: 'border-emerald-500 dark:border-emerald-400/90',
      error: 'border-red-500 dark:border-red-400/90',
      warning: 'border-amber-500 dark:border-amber-400/90',
    };
    return `${base} ${variants[variant]}`;
  }

  protected close(toast: Toast): void {
    this.toastService.dismiss(toast.id);
  }
}
