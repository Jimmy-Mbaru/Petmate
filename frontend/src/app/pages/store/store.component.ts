import { Component, ElementRef, Inject, OnDestroy, OnInit, ViewChild, ChangeDetectorRef } from '@angular/core';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideShoppingBag, lucideSearch, lucidePlus, lucideMinus, lucideTrash2, lucideX, lucideChevronLeft, lucideChevronRight, lucideLoader2, lucideAlertTriangle, lucideHeart, lucideEye, lucideShoppingCart, lucidePackage } from '@ng-icons/lucide';
import { StoreService, type Product, type SearchProductsParams, type CheckoutItem } from '../../core/services/store.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/auth/auth.service';
import { FavoritesService } from '../../core/services/favorites.service';
import { DialogService } from '../../core/services/dialog.service';

interface CartItem {
  productId: string;
  quantity: number;
  product: Product;
}

@Component({
  selector: 'app-store',
  standalone: true,
  imports: [RouterLink, NgIcon, DecimalPipe, SlicePipe],
  providers: [provideIcons({ lucideShoppingBag, lucideSearch, lucidePlus, lucideMinus, lucideTrash2, lucideX, lucideChevronLeft, lucideChevronRight, lucideLoader2, lucideAlertTriangle, lucideHeart, lucideEye, lucideShoppingCart, lucidePackage })],
  templateUrl: './store.component.html',
  styleUrl: './store.component.css',
})
export class StoreComponent implements OnInit, OnDestroy {
  private static readonly DEBOUNCE_MS = 400;
  products: Product[] = [];
  isLoading = false;
  searchQuery: SearchProductsParams = {};
  limit = 12;
  offset = 0;
  total = 0;
  showCart = false;
  cart: CartItem[] = [];
  checkoutInProgress = false;
  ordersCount = 0;
  hasLoadError = false;
  readonly skeletonItems = Array(6).fill(0);
  categories: string[] = ['Food', 'Toys', 'Accessories', 'Health', 'Grooming', 'Beds'];
  private filterDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  // Lightbox
  showLightbox = false;
  lightboxImages: string[] = [];
  lightboxIndex = 0;

  // Product detail modal
  selectedProduct: Product | null = null;
  showProductModal = false;

  @ViewChild('productsGrid') productsGridRef?: ElementRef<HTMLElement>;
  @ViewChild('loadingBlock') loadingBlockRef?: ElementRef<HTMLElement>;

  constructor(
    @Inject(StoreService) private storeService: StoreService,
    @Inject(FavoritesService) private favoritesService: FavoritesService,
    private toast: ToastService,
    private auth: AuthService,
    private router: Router,
    private dialogService: DialogService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadProducts();
    this.loadOrdersCount();
  }

  private loadOrdersCount(): void {
    this.storeService.myOrders(1, 0).subscribe({
      next: (res) => { this.ordersCount = res.total ?? 0; },
      error: () => { this.ordersCount = 0; }
    });
  }

  ngOnDestroy(): void {
    if (this.filterDebounceTimer != null) {
      clearTimeout(this.filterDebounceTimer);
    }
  }

  private scheduleFilterLoad(): void {
    if (this.filterDebounceTimer != null) clearTimeout(this.filterDebounceTimer);
    this.filterDebounceTimer = setTimeout(() => {
      this.filterDebounceTimer = null;
      this.loadProducts();
    }, StoreComponent.DEBOUNCE_MS);
  }

  retryLoad(): void {
    this.hasLoadError = false;
    this.offset = 0;
    this.loadProducts();
  }

  loadProducts(): void {
    this.isLoading = true;
    const wasInitialLoad = this.offset === 0;
    if (wasInitialLoad) {
      setTimeout(() => this.scrollLoadingIntoView(), 150);
    }

    this.storeService.searchProducts(
      this.searchQuery,
      'createdAt',
      'desc',
      this.limit,
      this.offset
    ).subscribe({
      next: (response) => {
        if (response && response.data) {
          if (this.offset === 0) {
            this.products = response.data;
          } else {
            this.products = [...this.products, ...response.data];
          }
          this.total = response.total || 0;
          this.hasLoadError = false;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
        // After initial load, scroll products into view so user sees them without scrolling
        if (wasInitialLoad && this.products.length > 0) {
          setTimeout(() => this.scrollProductsIntoView(), 200);
        }
      },
      error: (error) => {
        this.isLoading = false;
        if (this.products.length === 0) this.hasLoadError = true;
        this.cdr.detectChanges();
        console.error('Error loading products:', error);
        this.toast.error('Error', 'Failed to load products. Please check your connection.');
      },
    });
  }

  onSearch(): void {
    this.offset = 0;
    this.loadProducts();
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.q = value || undefined;
    this.offset = 0;
    this.scheduleFilterLoad();
  }

  onCategoryChange(event: Event): void {
    const value = (event.target as HTMLSelectElement).value;
    this.searchQuery.category = value || undefined;
    // Auto-search when category changes
    this.offset = 0;
    this.loadProducts();
  }

  onMaxPriceChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.maxPrice = value ? parseFloat(value) : undefined;
    this.offset = 0;
    this.scheduleFilterLoad();
  }

  clearFilters(): void {
    this.searchQuery = {};
    this.offset = 0;
    
    // Reset form inputs
    const searchInput = document.querySelector('input[type="text"]') as HTMLInputElement;
    const categorySelect = document.querySelector('select') as HTMLSelectElement;
    const priceInput = document.querySelector('input[type="number"]') as HTMLInputElement;
    
    if (searchInput) searchInput.value = '';
    if (categorySelect) categorySelect.value = '';
    if (priceInput) priceInput.value = '';
    
    this.loadProducts();
    this.toast.success('Filters', 'All filters cleared');
  }

  hasActiveFilters(): boolean {
    return !!(this.searchQuery.q || this.searchQuery.category || this.searchQuery.maxPrice);
  }

  private scrollLoadingIntoView(): void {
    const el = this.loadingBlockRef?.nativeElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  private scrollProductsIntoView(): void {
    const el = this.productsGridRef?.nativeElement;
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  scrollToImage(scrollContainer: HTMLElement, index: number): void {
    const images = scrollContainer.querySelectorAll('.product-image');
    if (images[index]) {
      images[index].scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }

  toggleWishlist(product: Product): void {
    const user = this.auth.getCurrentUser();
    if (!user) {
      this.toast.error('Wishlist', 'Please login to add items to wishlist');
      return;
    }

    this.favoritesService.addFavoriteProduct(product.id).subscribe({
      next: () => {
        this.toast.success('Wishlist', `${product.name} added to wishlist`);
      },
      error: async (error: any) => {
        if (error.status === 409) {
          // Already in wishlist - ask if they want to remove it
          const confirmed = await this.dialogService.confirm({
            title: 'Remove from Wishlist',
            message: `${product.name} is already in your wishlist. Remove it?`,
            confirmText: 'Remove',
            type: 'warning'
          });

          if (confirmed) {
            this.favoritesService.removeFavoriteProduct(product.id).subscribe({
              next: () => {
                this.toast.info('Wishlist', `${product.name} removed from wishlist`);
              },
              error: () => {
                this.toast.error('Error', 'Failed to remove from wishlist');
              },
            });
          }
        } else {
          this.toast.error('Error', 'Failed to add to wishlist');
        }
      },
    });
  }

  loadMore(): void {
    this.offset += this.limit;
    this.isLoading = true;
    this.storeService.searchProducts(
      this.searchQuery,
      'createdAt',
      'desc',
      this.limit,
      this.offset
    ).subscribe({
      next: (response) => {
        this.products = [...this.products, ...response.data];
        this.total = response.total;
        this.isLoading = false;
      },
      error: (error) => {
        this.isLoading = false;
        this.toast.error('Error', 'Failed to load more products');
        console.error('Error loading more products:', error);
      },
    });
  }

  addToCart(product: Product): void {
    const existing = this.cart.find((item) => item.productId === String(product.id));
    if (existing) {
      if (existing.quantity >= product.stock) {
        this.toast.error('Cart', 'Cannot add more - out of stock');
        return;
      }
      existing.quantity++;
    } else {
      this.cart.push({
        productId: String(product.id),
        quantity: 1,
        product,
      });
    }
    this.toast.success('Cart', `${product.name} added to cart`);
  }

  getCartQuantity(productId: string | number): number {
    const id = String(productId);
    const item = this.cart.find((item) => item.productId === id);
    return item?.quantity || 0;
  }

  increaseQuantity(productId: string | number): void {
    const item = this.cart.find((item) => item.productId === String(productId));
    if (item && item.quantity < item.product.stock) {
      item.quantity++;
    } else {
      this.toast.error('Cart', 'Cannot add more - out of stock');
    }
  }

  decreaseQuantity(productId: string | number): void {
    const item = this.cart.find((item) => item.productId === String(productId));
    if (item) {
      if (item.quantity > 1) {
        item.quantity--;
      } else {
        this.removeFromCart(productId);
      }
    }
  }

  removeFromCart(productId: string | number): void {
    const id = String(productId);
    this.cart = this.cart.filter((item) => item.productId !== id);
  }

  toggleCart(): void {
    this.showCart = !this.showCart;
  }

  get cartTotal(): number {
    return this.cart.reduce((total, item) => total + item.product.price * item.quantity, 0);
  }

  checkout(): void {
    if (!this.auth.getCurrentUser()) {
      this.router.navigate(['/auth/login'], { queryParams: { returnUrl: '/store' } });
      return;
    }

    if (this.cart.length === 0) {
      this.toast.error('Checkout', 'Your cart is empty');
      return;
    }

    const items: CheckoutItem[] = this.cart.map((item) => ({
      productId: String(item.productId),
      quantity: item.quantity,
    }));

    this.checkoutInProgress = true;
    this.storeService.checkout(items).subscribe({
      next: (order) => {
        this.checkoutInProgress = false;
        this.toast.success('Order', `Order placed successfully! Order #${order.id}`);
        this.cart = [];
        this.showCart = false;
        this.router.navigate(['/app/store/orders']);
      },
      error: (err) => {
        this.checkoutInProgress = false;
        if (err?.status !== 403) {
          this.toast.error('Checkout', 'Failed to place order. Please try again.');
        }
        console.error('Error checking out:', err);
      },
    });
  }

  openProductModal(product: Product): void {
    this.selectedProduct = product;
    this.showProductModal = true;
    document.body.style.overflow = 'hidden';
  }

  closeProductModal(): void {
    this.selectedProduct = null;
    this.showProductModal = false;
    document.body.style.overflow = '';
  }

  openLightbox(images: string[], index: number): void {
    this.lightboxImages = images;
    this.lightboxIndex = index;
    this.showLightbox = true;
    document.body.style.overflow = 'hidden';
  }

  closeLightbox(): void {
    this.showLightbox = false;
    document.body.style.overflow = '';
  }

  nextImage(event: Event): void {
    event.stopPropagation();
    if (this.lightboxIndex < this.lightboxImages.length - 1) {
      this.lightboxIndex++;
    }
  }

  prevImage(event: Event): void {
    event.stopPropagation();
    if (this.lightboxIndex > 0) {
      this.lightboxIndex--;
    }
  }
}
