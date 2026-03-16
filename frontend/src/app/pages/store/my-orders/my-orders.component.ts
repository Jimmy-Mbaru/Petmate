import { Component, OnInit, signal, Inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucidePackage, lucideClock, lucideTruck, lucideCheckCircle, lucideXCircle, lucideArrowRight, lucideExternalLink, lucideShoppingBag, lucideChevronRight, lucideX, lucideInfo } from '@ng-icons/lucide';
import { StoreService, type Order, type OrderItem } from '../../../core/services/store.service';
import { ToastService } from '../../../core/services/toast.service';
import { DialogService } from '../../../core/services/dialog.service';

@Component({
  selector: 'app-my-orders',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon],
  providers: [provideIcons({ lucidePackage, lucideClock, lucideTruck, lucideCheckCircle, lucideXCircle, lucideArrowRight, lucideExternalLink, lucideShoppingBag, lucideChevronRight, lucideX, lucideInfo })],
  templateUrl: './my-orders.component.html',
  styleUrl: './my-orders.component.css',
})
export class MyOrdersComponent implements OnInit {
  orders = signal<Order[]>([]);
  total = signal(0);
  isLoading = signal(true);
  
  // Modal state
  selectedOrder = signal<Order | null>(null);
  showDetailsModal = signal(false);
  isCancelling = signal(false);

  constructor(
    @Inject(StoreService) private storeService: StoreService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.loadOrders();
  }

  loadOrders(): void {
    this.isLoading.set(true);
    this.storeService.myOrders(50, 0).subscribe({
      next: (res) => {
        this.orders.set(res.data || []);
        this.total.set(res.total || 0);
        this.isLoading.set(false);
        this.cdr.detectChanges();
      },
      error: (error) => {
        console.error('[MyOrders] Failed to load orders:', error);
        this.isLoading.set(false);
        this.toast.error('Error', 'Failed to load your orders');
        this.cdr.detectChanges();
      },
    });
  }

  openDetails(order: Order): void {
    this.selectedOrder.set(order);
    this.showDetailsModal.set(true);
    this.cdr.detectChanges();
  }

  closeDetails(): void {
    this.selectedOrder.set(null);
    this.showDetailsModal.set(false);
    this.cdr.detectChanges();
  }

  async cancelOrder(orderId: string): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Cancel Order',
      message: 'Are you sure you want to cancel this order?',
      confirmText: 'Cancel Order',
      type: 'danger'
    });

    if (!confirmed) return;

    this.isCancelling.set(true);
    this.storeService.cancelOrder(orderId).subscribe({
      next: () => {
        this.toast.success('Order cancelled', 'Your order has been cancelled successfully');
        this.isCancelling.set(false);
        this.loadOrders();
        this.closeDetails();
      },
      error: (err) => {
        this.isCancelling.set(false);
        console.error('[MyOrders] Failed to cancel order:', err);
        this.toast.error('Error', err.error?.message || 'Failed to cancel order');
      }
    });
  }

  formatDate(d: string): string {
    return new Date(d).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }

  formatDateTime(d: string): string {
    return new Date(d).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  statusClass(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'PLACED') return 'status-placed';
    if (s === 'PROCESSING') return 'status-processing';
    if (s === 'SHIPPED') return 'status-shipped';
    if (s === 'DELIVERED') return 'status-delivered';
    if (s === 'CANCELLED') return 'status-cancelled';
    return '';
  }

  statusIcon(status: string): string {
    const s = (status || '').toUpperCase();
    if (s === 'PLACED') return 'lucideClock';
    if (s === 'PROCESSING') return 'lucidePackage';
    if (s === 'SHIPPED') return 'lucideTruck';
    if (s === 'DELIVERED') return 'lucideCheckCircle';
    if (s === 'CANCELLED') return 'lucideXCircle';
    return 'lucideInfo';
  }

  getStatusLabel(status: string): string {
    const labels: Record<string, string> = {
      PLACED: 'Order Placed',
      PROCESSING: 'Processing',
      SHIPPED: 'Shipped',
      DELIVERED: 'Delivered',
      CANCELLED: 'Cancelled',
    };
    return labels[status] || status;
  }
}
