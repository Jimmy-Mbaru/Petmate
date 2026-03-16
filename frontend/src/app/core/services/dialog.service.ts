import { Injectable, signal } from '@angular/core';

export interface DialogOptions {
  title?: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'info' | 'warning' | 'danger';
}

@Injectable({ providedIn: 'root' })
export class DialogService {
  readonly isOpen = signal(false);
  readonly options = signal<DialogOptions | null>(null);
  
  private resolveFn?: (result: boolean) => void;

  /**
   * Shows a confirmation dialog and returns a promise that resolves to true (confirmed) or false (cancelled).
   */
  confirm(options: DialogOptions | string): Promise<boolean> {
    const opts: DialogOptions = typeof options === 'string' ? { message: options } : options;
    
    this.options.set({
      title: opts.title || 'Confirm Action',
      confirmText: opts.confirmText || 'Confirm',
      cancelText: opts.cancelText || 'Cancel',
      type: opts.type || 'info',
      ...opts
    });
    
    this.isOpen.set(true);
    
    return new Promise((resolve) => {
      this.resolveFn = resolve;
    });
  }

  /**
   * Closes the dialog and resolves the promise.
   */
  close(result: boolean): void {
    this.isOpen.set(false);
    if (this.resolveFn) {
      this.resolveFn(result);
      this.resolveFn = undefined;
    }
  }
}
