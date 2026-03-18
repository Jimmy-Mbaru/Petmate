import { Component, Inject, OnInit, AfterViewInit, OnDestroy, signal, computed, ViewChild, ElementRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import AOS from 'aos';
import { StoreService, Product, Order, PaginatedResponse } from '../../../core/services/store.service';
import { AdminService } from '../../../core/services/admin.service';
import { ToastService } from '../../../core/services/toast.service';
import { DialogService } from '../../../core/services/dialog.service';
import { UploadService } from '../../../core/services/upload.service';
import {
  Chart,
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
  type ChartConfiguration,
  type TooltipItem,
} from 'chart.js';

Chart.register(
  CategoryScale,
  LinearScale,
  LineController,
  LineElement,
  PointElement,
  Filler,
  Tooltip,
  Legend,
);

@Component({
  selector: 'app-admin-store',
  standalone: true,
  imports: [CommonModule, FormsModule, ReactiveFormsModule],
  templateUrl: './store.component.html',
  styleUrls: ['./store.component.css'],
})
export class AdminStoreComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly loading = signal(false);
  readonly products = signal<Product[]>([]);
  readonly orders = signal<Order[]>([]);
  readonly totalRevenue = signal(0);
  readonly totalSales = signal(0);
  readonly totalDeliveredSales = signal(0);
  readonly totalProducts = signal(0);
  readonly revenueGrowth = signal(0);
  readonly avgOrderValue = computed(() => 
    this.totalDeliveredSales() > 0 ? this.totalRevenue() / this.totalDeliveredSales() : 0
  );
  readonly view = signal<'overview' | 'products' | 'orders'>('overview');
  readonly searchQuery = signal('');
  readonly categoryFilter = signal<string>('ALL');
  readonly orderSearchQuery = signal('');
  readonly orderStatusFilter = signal<string>('ALL');

  // Modal state
  readonly modalOpen = signal(false);
  readonly modalMode = signal<'edit' | 'revenue' | 'create'>('edit');
  readonly selectedProduct = signal<Product | null>(null);

  // Product form (reactive)
  productForm!: FormGroup;

  // Uploaded image URLs (not in form; updated by upload/remove)
  imageUrls = signal<string[]>([]);

  // File upload state
  selectedFiles = signal<File[]>([]);
  uploadingImage = signal(false);
  imagePreviews = signal<string[]>([]);

  // Product categories
  readonly categories = [
    { value: 'FOOD', label: 'Food' },
    { value: 'TOYS', label: 'Toys' },
    { value: 'ACCESSORIES', label: 'Accessories' },
    { value: 'HEALTH', label: 'Health' },
    { value: 'GROOMING', label: 'Grooming' },
    { value: 'BEDS', label: 'Beds' },
    { value: 'CLOTHING', label: 'Clothing' },
    { value: 'TRAINING', label: 'Training' },
    { value: 'OUTDOOR', label: 'Outdoor' },
    { value: 'OTHER', label: 'Other' },
  ];

  @ViewChild('revenueChart') revenueChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('salesChart') salesChartRef!: ElementRef<HTMLCanvasElement>;
  @ViewChild('productRevenueChart') productRevenueChartRef!: ElementRef<HTMLCanvasElement>;

  private revenueChart: Chart | null = null;
  private salesChart: Chart | null = null;
  private productRevenueChart: Chart | null = null;

  constructor(
    private fb: FormBuilder,
    @Inject(StoreService) private storeService: StoreService,
    private adminService: AdminService,
    private toastService: ToastService,
    private uploadService: UploadService,
    private dialogService: DialogService
  ) {
    this.initProductForm();
  }

  private initProductForm(): void {
    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(100)]],
      description: [''],
      price: [0, [Validators.required, Validators.min(0)]],
      stock: [0, [Validators.required, Validators.min(0)]],
      category: ['', [Validators.required]],
      imageUrl: [''],
      isActive: [true],
    });
  }

  /**
   * Get validation error message for a form control
   */
  getValidationError(controlName: string): string {
    const control = this.productForm.get(controlName);
    if (!control || !control.invalid || !control.touched) return '';

    if (control.hasError('required')) {
      return `${this.getFieldLabel(controlName)} is required.`;
    }
    if (control.hasError('minlength')) {
      return `${this.getFieldLabel(controlName)} must be at least ${control.errors?.['minlength'].requiredLength} characters.`;
    }
    if (control.hasError('maxlength')) {
      return `${this.getFieldLabel(controlName)} must be less than ${control.errors?.['maxlength'].requiredLength} characters.`;
    }
    if (control.hasError('min')) {
      return `${this.getFieldLabel(controlName)} cannot be negative.`;
    }
    if (control.hasError('pattern')) {
      return `${this.getFieldLabel(controlName)} format is invalid.`;
    }

    return `${this.getFieldLabel(controlName)} is invalid.`;
  }

  /**
   * Get field label for error messages
   */
  private getFieldLabel(controlName: string): string {
    const labels: Record<string, string> = {
      name: 'Product name',
      description: 'Description',
      price: 'Price',
      stock: 'Stock',
      category: 'Category',
      imageUrl: 'Image URL',
    };
    return labels[controlName] || controlName;
  }

  /**
   * Check if a form control has errors and was touched
   */
  hasErrorAndTouched(controlName: string): boolean {
    const control = this.productForm.get(controlName);
    return !!(control && control.invalid && control.touched);
  }

  ngOnInit(): void {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      offset: 50,
    });
    this.loadStoreData();
  }

  ngAfterViewInit(): void {
    setTimeout(() => {
      this.initRevenueChart();
      this.initSalesChart();
    }, 100);
    AOS.refresh();
  }

  ngOnDestroy(): void {
    this.revenueChart?.destroy();
    this.salesChart?.destroy();
    this.productRevenueChart?.destroy();
    AOS.refresh();
  }

  loadStoreData(): void {
    this.loading.set(true);

    // Load products
    this.storeService.searchProducts({}, 'createdAt', 'desc', 100, 0).subscribe({
      next: (response) => {
        this.products.set(response.data);
        this.totalProducts.set(response.total);
        this.loading.set(false);
      },
      error: (error) => {
        console.error('Failed to load products:', error);
        this.products.set([]);
        this.totalProducts.set(0);
        this.loading.set(false);
        if (error.status === 401) {
          this.toastService.error('Error', 'Please log in to view products');
        } else {
          this.toastService.error('Error', 'Failed to load products');
        }
      },
    });

    // Load orders from backend (real data)
    this.storeService.getAllOrders(50, 0).subscribe({
      next: (response) => {
        this.orders.set(response.data);
        
        // Calculate real revenue from all non-cancelled orders
        const countedOrders = response.data.filter(
          o => o.status !== 'CANCELLED'
        );
        
        const totalRev = countedOrders.reduce(
          (sum, o) => sum + (o.total ?? o.totalAmount ?? 0),
          0,
        );
        this.totalRevenue.set(totalRev);
        this.totalDeliveredSales.set(countedOrders.length);
        this.totalSales.set(countedOrders.length);

        // Calculate growth from last month
        const now = new Date();
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        
        const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;
        const lastMonthYear = thisMonth === 0 ? thisYear - 1 : thisYear;

        const currentMonthRevenue = countedOrders
          .filter(o => {
            const d = new Date(o.createdAt);
            return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
          })
          .reduce((sum, o) => sum + (o.total ?? o.totalAmount ?? 0), 0);

        const previousMonthRevenue = countedOrders
          .filter(o => {
            const d = new Date(o.createdAt);
            return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
          })
          .reduce((sum, o) => sum + (o.total ?? o.totalAmount ?? 0), 0);

        if (previousMonthRevenue > 0) {
          const growth = ((currentMonthRevenue - previousMonthRevenue) / previousMonthRevenue) * 100;
          this.revenueGrowth.set(growth);
        } else if (currentMonthRevenue > 0) {
          this.revenueGrowth.set(100);
        } else {
          this.revenueGrowth.set(0);
        }

        setTimeout(() => {
          this.updateCharts();
        }, 200);
      },
      error: (error) => {
        console.error('Failed to load orders:', error);
        // Fallback to empty data if orders endpoint doesn't exist or fails
        this.orders.set([]);
        this.totalRevenue.set(0);
        this.totalSales.set(0);
      },
    });
  }

  setView(v: 'overview' | 'products' | 'orders'): void {
    this.view.set(v);
    if (v === 'overview') {
      // Canvas elements are re-created by Angular after the @if block renders;
      // wait one tick then re-initialize the charts.
      setTimeout(() => this.updateCharts(), 50);
    }
  }

  /**
   * Rebuild overview charts after orders/products change.
   */
  private updateCharts(): void {
    if (this.revenueChart) {
      this.revenueChart.destroy();
      this.revenueChart = null;
    }
    if (this.salesChart) {
      this.salesChart.destroy();
      this.salesChart = null;
    }

    this.initRevenueChart();
    this.initSalesChart();
  }

  async createProduct(): Promise<void> {
    this.productForm.markAllAsTouched();

    if (this.productForm.invalid) {
      this.toastService.error('Validation', 'Please fill in all required fields correctly.');
      return;
    }

    this.uploadingImage.set(true);
    const uploadedUrls: string[] = [...this.imageUrls()];
    
    try {
      const files = this.selectedFiles();
      if (files.length > 0) {
        // Upload all files first
        for (const file of files) {
          try {
            const result = await this.uploadService.uploadImage(file, 'products').toPromise();
            if (result?.url) {
              uploadedUrls.push(result.url);
            }
          } catch (err) {
            console.error('Upload error:', err);
            this.toastService.error('Error', `Failed to upload ${file.name}`);
            this.uploadingImage.set(false);
            return;
          }
        }
      }

      const raw = this.productForm.getRawValue();
      const payload = {
        name: String(raw.name ?? '').trim(),
        description: raw.description ? String(raw.description).trim() : undefined,
        price: Number(raw.price) || 0,
        stock: Math.max(0, Math.floor(Number(raw.stock) || 0)),
        category: String(raw.category || ''),
        imageUrl: raw.imageUrl ? String(raw.imageUrl).trim() : undefined,
        imageUrls: uploadedUrls.length > 0 ? uploadedUrls : undefined,
        isActive: raw.isActive !== false,
      };
      
      this.storeService.createProduct(payload).subscribe({
        next: (created) => {
          this.toastService.success('Success', 'Product created and saved.');
          this.products.update(products => [created, ...products]);
          this.totalProducts.update(count => count + 1);
          this.closeModal();
          this.loadStoreData(); // Reload to ensure we have fresh data from DB
        },
        error: (err) => {
          const msg = err?.error?.message || err?.message || 'Failed to create product';
          this.toastService.error('Error', msg);
          console.error('Create product error:', err);
        },
      });
    } finally {
      this.uploadingImage.set(false);
    }
  }

  getFilteredProducts(): Product[] {
    let products = this.products();

    if (this.searchQuery()) {
      const query = this.searchQuery().toLowerCase();
      products = products.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description?.toLowerCase().includes(query)
      );
    }

    if (this.categoryFilter() !== 'ALL') {
      products = products.filter(p => p.category === this.categoryFilter());
    }

    return products;
  }

  getFilteredOrders(): Order[] {
    let orders = this.orders();

    if (this.orderSearchQuery()) {
      const query = this.orderSearchQuery().toLowerCase();
      orders = orders.filter(o =>
        o.id.toLowerCase().includes(query) ||
        o.userId.toLowerCase().includes(query)
      );
    }

    if (this.orderStatusFilter() !== 'ALL') {
      orders = orders.filter(o => o.status === this.orderStatusFilter());
    }

    return orders;
  }

  updateOrderStatus(orderId: string, event: Event): void {
    const select = event.target as HTMLSelectElement;
    const newStatus = select.value;

    // Prevent updating if already delivered or cancelled
    if (newStatus === 'DELIVERED' || newStatus === 'CANCELLED') {
      select.value = this.orders().find(o => o.id === orderId)?.status || 'PLACED';
      return;
    }

    this.storeService.updateOrderStatus(orderId, newStatus).subscribe({
      next: (updatedOrder) => {
        this.toastService.success('Success', `Order status updated to ${newStatus}`);
        this.orders.update(orders =>
          orders.map(o => o.id === updatedOrder.id ? updatedOrder : o)
        );
      },
      error: (err) => {
        this.toastService.error('Error', 'Failed to update order status');
        console.error(err);
        this.loadStoreData(); // Refresh to reset select
      }
    });
  }

  exportOrders(format: 'csv' | 'pdf'): void {
    this.toastService.info('Exporting...', `Generating ${format.toUpperCase()} report...`);
    
    const status = this.orderStatusFilter() === 'ALL' ? undefined : this.orderStatusFilter();
    const obs = format === 'csv' 
      ? this.adminService.exportOrders(status)
      : this.adminService.exportOrdersPdf(status);

    obs.subscribe({
      next: (blob: Blob) => {
        const date = new Date().toISOString().split('T')[0];
        this.adminService.downloadFile(blob, `orders-export-${date}.${format}`);
        this.toastService.success('Success', 'Export completed successfully');
      },
      error: (err: unknown) => {
        this.toastService.error('Error', 'Failed to export orders');
        console.error('Export error:', err);
      }
    });
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  onCategoryChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.categoryFilter.set(target.value);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    if (!files || files.length === 0) return;

    const validFiles: File[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // Validate file type
      if (!file.type.startsWith('image/')) {
        this.toastService.error('Error', `${file.name} is not an image file`);
        continue;
      }

      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.error('Error', `${file.name} exceeds 5MB limit`);
        continue;
      }

      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Add to existing files
    this.selectedFiles.update(files => [...files, ...validFiles]);

    // Create previews for new files
    validFiles.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.imagePreviews.update(previews => [...previews, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  }

  async uploadImages(): Promise<void> {
    const files = this.selectedFiles();
    if (files.length === 0) return;

    this.uploadingImage.set(true);
    const uploadedUrls: string[] = [];

    try {
      // Upload each file
      for (const file of files) {
        try {
          const result = await this.uploadService.uploadImage(file, 'products').toPromise();
          if (result) {
            uploadedUrls.push(result.url);
          }
        } catch (error) {
          this.toastService.error('Error', `Failed to upload ${file.name}`);
          console.error('Upload error:', error);
        }
      }

      if (uploadedUrls.length > 0) {
        this.imageUrls.update(urls => [...urls, ...uploadedUrls]);
        this.toastService.success('Success', `${uploadedUrls.length} image(s) uploaded successfully`);
      }

      this.selectedFiles.set([]);
      this.imagePreviews.set([]);
    } finally {
      this.uploadingImage.set(false);
    }
  }

  removeImage(index: number): void {
    this.imagePreviews.update(previews => previews.filter((_, i) => i !== index));
    this.selectedFiles.update(files => files.filter((_, i) => i !== index));
  }

  removeExistingImage(index: number): void {
    this.imageUrls.update(urls => urls.filter((_, i) => i !== index));
  }

  clearSelectedFiles(): void {
    this.selectedFiles.set([]);
    this.imagePreviews.set([]);
    const input = document.getElementById('productImageInput') as HTMLInputElement;
    if (input) input.value = '';
  }

  openEditModal(product: Product): void {
    this.selectedProduct.set(product);
    this.productForm.patchValue({
      name: product.name,
      description: product.description || '',
      price: product.price,
      stock: product.stock,
      category: product.category,
      imageUrl: product.imageUrl || '',
      isActive: product.isActive,
    });
    this.imageUrls.set(product.imageUrls || []);
    this.modalMode.set('edit');
    this.modalOpen.set(true);
  }

  openCreateModal(): void {
    this.productForm.reset({
      name: '',
      description: '',
      price: 0,
      stock: 0,
      category: '',
      imageUrl: '',
      isActive: true,
    });
    this.imageUrls.set([]);
    this.selectedFiles.set([]);
    this.imagePreviews.set([]);
    this.modalMode.set('create');
    this.modalOpen.set(true);
  }

  openRevenueModal(product: Product): void {
    this.selectedProduct.set(product);
    this.modalMode.set('revenue');
    this.modalOpen.set(true);

    // Inject "real" chart data from orders already loaded on this page.
    // This avoids showing dummy zeroes if the admin-only revenue endpoint fails.
    const computed = this.computeProductWeeklyRevenue(product);
    setTimeout(() => {
      this.initProductRevenueChart({
        productId: String(product.id),
        labels: computed.labels,
        data: computed.data,
        totalRevenue: computed.totalRevenue,
        totalItemsSold: computed.totalItemsSold,
      });
    }, 50);

    // Optional refresh from backend (authoritative, but can fail due to auth/network).
    this.storeService.getProductRevenue(product.id).subscribe({
      next: (revenueData) => setTimeout(() => this.initProductRevenueChart(revenueData), 50),
      error: (error) => console.warn('Failed to refresh product revenue:', error),
    });
  }

  private computeProductWeeklyRevenue(product: Product): {
    labels: string[];
    data: number[];
    totalRevenue: number;
    totalItemsSold: number;
  } {
    const labels = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const statusOk = new Set(['DELIVERED', 'PAID', 'SHIPPED']);

    const weeklyRevenue = new Array(4).fill(0);
    let totalItemsSold = 0;

    const now = new Date();
    const msPerWeek = 7 * 24 * 60 * 60 * 1000;

    const orders = this.orders();
    orders.forEach((order) => {
      if (!statusOk.has(order.status)) return;
      const orderDate = new Date(order.createdAt);
      const weeksAgo = Math.floor((now.getTime() - orderDate.getTime()) / msPerWeek);

      if (weeksAgo < 0 || weeksAgo >= 4) return;

      (order.items ?? []).forEach((item) => {
        if (String(item.productId) !== String(product.id)) return;
        const qty = Number(item.quantity ?? 0);
        const unitPrice = Number(item.unitPrice ?? 0);

        weeklyRevenue[3 - weeksAgo] += unitPrice * qty;
        totalItemsSold += qty;
      });
    });

    const totalRevenue = weeklyRevenue.reduce((a, b) => a + b, 0);
    return { labels, data: weeklyRevenue, totalRevenue, totalItemsSold };
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.selectedProduct.set(null);
    this.productForm.markAsUntouched();
  }

  saveProduct(): void {
    const product = this.selectedProduct();
    if (!product) return;

    this.productForm.markAllAsTouched();

    if (this.productForm.invalid) {
      this.toastService.error('Validation', 'Please fill in all required fields correctly.');
      return;
    }

    const value = { ...this.productForm.getRawValue(), imageUrls: this.imageUrls() };
    this.storeService.updateProduct(product.id, value).subscribe({
      next: (updated) => {
        this.toastService.success('Success', 'Product updated successfully');
        this.products.update(products =>
          products.map(p => p.id === updated.id ? updated : p)
        );
        this.closeModal();
      },
      error: () => {
        this.toastService.error('Error', 'Failed to update product');
      },
    });
  }

  handleModalSave(): void {
    if (this.modalMode() === 'create') {
      void this.createProduct();
    } else {
      this.saveProduct();
    }
  }

  async deleteProduct(product: Product): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Delete Product',
      message: `Are you sure you want to delete "${product.name}"?`,
      confirmText: 'Delete',
      type: 'danger'
    });

    if (confirmed) {
      this.storeService.deleteProduct(product.id).subscribe({
        next: () => {
          this.toastService.success('Success', 'Product deleted successfully');
          this.products.update(products => products.filter(p => p.id !== product.id));
          this.totalProducts.update(count => count - 1);
        },
        error: () => {
          this.toastService.error('Error', 'Failed to delete product');
        },
      });
    }
  }

  getCategories(): string[] {
    return this.categories.map(c => c.value);
  }

  getCategoryLabel(value: string): string {
    return this.categories.find(c => c.value === value)?.label || value;
  }

  private initRevenueChart(): void {
    const canvas = this.revenueChartRef?.nativeElement;
    if (!canvas) return;

    const themeGreen = '#10b981';
    const themeGreenLight = 'rgba(16, 185, 129, 0.2)';

    // Calculate real revenue data from orders by month
    const orders = this.orders();
    const monthlyRevenue = new Array(12).fill(0);
    const now = new Date();

    orders.forEach(order => {
      // Use successful orders only
      if (order.status !== 'CANCELLED') {
        const orderDate = new Date(order.createdAt);
        const monthsAgo = (now.getFullYear() - orderDate.getFullYear()) * 12 + (now.getMonth() - orderDate.getMonth());
        if (monthsAgo >= 0 && monthsAgo < 12) {
          monthlyRevenue[11 - monthsAgo] += (order.total ?? order.totalAmount ?? 0);
        }
      }
    });

    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = now.getMonth();
    const displayLabels = labels.map((_, i) => labels[(currentMonth - 11 + i + 12) % 12]);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: displayLabels,
        datasets: [{
          label: 'Revenue (KES)',
          data: monthlyRevenue,
          borderColor: themeGreen,
          backgroundColor: themeGreenLight,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: themeGreen,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000 },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#2a2525',
            titleColor: '#fff',
            bodyColor: '#f5eded',
            padding: 12,
            cornerRadius: 8,
            callbacks: { label: this.formatRevenueTooltip.bind(this) },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#363636' } },
          y: { 
            beginAtZero: true, 
            grid: { color: 'rgba(54, 54, 54, 0.08)' }, 
            ticks: { 
              color: '#363636',
              callback: (value) => `KES ${Number(value).toLocaleString()}`
            } 
          },
        },
      },
    };

    this.revenueChart = new Chart(canvas, config);
  }

  private initSalesChart(): void {
    const canvas = this.salesChartRef?.nativeElement;
    if (!canvas) return;

    const themeBlue = '#3b82f6';
    const themeBlueLight = 'rgba(59, 130, 246, 0.2)';

    // Calculate real sales data from orders by month
    const orders = this.orders();
    const monthlySales = new Array(12).fill(0);
    const now = new Date();

    orders.forEach(order => {
      if (order.status !== 'CANCELLED') {
        const orderDate = new Date(order.createdAt);
        const monthsAgo = (now.getFullYear() - orderDate.getFullYear()) * 12 + (now.getMonth() - orderDate.getMonth());
        if (monthsAgo >= 0 && monthsAgo < 12) {
          monthlySales[11 - monthsAgo]++;
        }
      }
    });

    const labels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentMonth = now.getMonth();
    const displayLabels = labels.map((_, i) => labels[(currentMonth - 11 + i + 12) % 12]);

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: displayLabels,
        datasets: [{
          label: 'Sales',
          data: monthlySales,
          borderColor: themeBlue,
          backgroundColor: themeBlueLight,
          borderWidth: 3,
          fill: true,
          tension: 0.4,
          pointBackgroundColor: themeBlue,
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 5,
          pointHoverRadius: 7,
        }],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 1000 },
        interaction: { intersect: false, mode: 'index' },
        plugins: { legend: { display: false } },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#363636' } },
          y: { beginAtZero: true, grid: { color: 'rgba(54, 54, 54, 0.08)' }, ticks: { color: '#363636', precision: 0 } },
        },
      },
    };

    this.salesChart = new Chart(canvas, config);
  }

  private initProductRevenueChart(revenueData: {
    productId: string;
    labels: string[];
    data: number[];
    totalRevenue: number;
    totalItemsSold: number;
  }): void {
    const canvas = this.productRevenueChartRef?.nativeElement;
    if (!canvas) return;

    if (this.productRevenueChart) {
      this.productRevenueChart.destroy();
      this.productRevenueChart = null;
    }

    const themeRed = '#ef4444';
    const themeRedLight = 'rgba(239, 68, 68, 0.18)';

    const config: ChartConfiguration<'line'> = {
      type: 'line',
      data: {
        labels: revenueData.labels,
        datasets: [
          {
            label: 'Revenue (KES)',
            data: revenueData.data,
            borderColor: themeRed,
            backgroundColor: themeRedLight,
            borderWidth: 3,
            fill: true,
            tension: 0.4,
            pointBackgroundColor: themeRed,
            pointBorderColor: '#fff',
            pointBorderWidth: 2,
            pointRadius: 5,
            pointHoverRadius: 7,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: { duration: 800 },
        interaction: { intersect: false, mode: 'index' },
        plugins: {
          legend: { display: false },
          tooltip: {
            backgroundColor: '#2a2525',
            titleColor: '#fff',
            bodyColor: '#f5eded',
            padding: 10,
            cornerRadius: 8,
            callbacks: {
              label: this.formatProductRevenueTooltip.bind(this),
            },
          },
        },
        scales: {
          x: { grid: { display: false }, ticks: { color: '#363636' } },
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(54, 54, 54, 0.08)' },
            ticks: {
              color: '#363636',
              callback: (value) => `KES ${Number(value).toLocaleString()}`,
            },
          },
        },
      },
    };

    this.productRevenueChart = new Chart(canvas, config);
  }

  private formatRevenueTooltip(tooltipItem: TooltipItem<'line'>): string {
    const value = tooltipItem.parsed.y ?? 0;
    return `KES ${value.toLocaleString()}`;
  }

  private formatProductRevenueTooltip(tooltipItem: TooltipItem<'line'>): string {
    const value = tooltipItem.parsed.y ?? 0;
    return `KES ${value.toLocaleString()}`;
  }
}
