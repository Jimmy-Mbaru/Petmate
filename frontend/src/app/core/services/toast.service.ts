import { Injectable, signal, computed } from '@angular/core';

export type ToastVariant = 'default' | 'info' | 'success' | 'error' | 'warning';

export interface Toast {
  id: string;
  title: string;
  message: string;
  variant: ToastVariant;
  duration?: number;
  highlightTitle?: boolean;
  onDismiss?: () => void;
}

export interface ShowToastOptions {
  title: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  highlightTitle?: boolean;
  onDismiss?: () => void;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly toasts = signal<Toast[]>([]);
  readonly items = computed(() => this.toasts());

  show(options: ShowToastOptions): string {
    const id = crypto.randomUUID();
    const duration = options.duration ?? 3000;
    const toast: Toast = {
      id,
      title: options.title,
      message: options.message,
      variant: options.variant ?? 'default',
      duration,
      highlightTitle: options.highlightTitle,
      onDismiss: options.onDismiss,
    };
    this.toasts.update((list) => [...list, toast]);
    if (duration > 0) {
      setTimeout(() => this.dismiss(id), duration);
    }
    return id;
  }

  info(title: string, message: string, options?: Partial<ShowToastOptions>): string {
    return this.show({ ...options, title, message, variant: 'info' });
  }

  success(title: string, message: string, options?: Partial<ShowToastOptions>): string {
    return this.show({ ...options, title, message, variant: 'success' });
  }

  error(title: string, message: string, options?: Partial<ShowToastOptions>): string {
    return this.show({ ...options, title, message, variant: 'error' });
  }

  warning(title: string, message: string, options?: Partial<ShowToastOptions>): string {
    return this.show({ ...options, title, message, variant: 'warning' });
  }

  dismiss(id: string): void {
    const list = this.toasts();
    const toast = list.find((t) => t.id === id);
    toast?.onDismiss?.();
    this.toasts.update((list) => list.filter((t) => t.id !== id));
  }
}
