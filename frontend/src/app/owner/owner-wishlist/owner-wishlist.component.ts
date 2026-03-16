import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideShoppingBag, lucideTrash2, lucideHeart, lucideAlertCircle, lucideShoppingCart } from '@ng-icons/lucide';
import { FavoritesService, type FavoriteProduct } from '../../core/services/favorites.service';
import { ToastService } from '../../core/services/toast.service';
import { AuthService } from '../../core/auth/auth.service';
import { DecimalPipe, SlicePipe } from '@angular/common';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-owner-wishlist',
  standalone: true,
  imports: [RouterLink, NgIcon, DecimalPipe, SlicePipe],
  providers: [provideIcons({ lucideShoppingBag, lucideTrash2, lucideHeart, lucideAlertCircle, lucideShoppingCart })],
  templateUrl: './owner-wishlist.component.html',
  styleUrls: ['./owner-wishlist.component.css'],
})
export class OwnerWishlistComponent implements OnInit {
  wishlistProducts: FavoriteProduct[] = [];
  isLoading = false;
  errorMessage: string = '';

  constructor(
    @Inject(FavoritesService) private favoritesService: FavoritesService,
    private toast: ToastService,
    private auth: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadWishlist();
  }

  loadWishlist(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.cdr.detectChanges();

    this.favoritesService.getFavoriteProducts().subscribe({
      next: (data) => {
        this.wishlistProducts = data.map((p) => this.normalizeProductImages(p));
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        if (error.status === 401 || error.status === 403) {
          this.errorMessage = 'Please login to view your wishlist';
          this.toast.error('Error', 'Please login to view your wishlist');
        } else {
          const message = error?.error?.message || 'Failed to load wishlist';
          this.errorMessage = message;
          this.toast.error('Error', message);
        }
        this.cdr.detectChanges();
      },
    });
  }

  removeFromWishlist(product: FavoriteProduct): void {
    this.favoritesService.removeFavoriteProduct(product.id).subscribe({
      next: () => {
        this.wishlistProducts = this.wishlistProducts.filter(p => p.id !== product.id);
        this.toast.success('Removed', `${product.name} removed from wishlist`);
      },
      error: () => {
        this.toast.error('Error', 'Failed to remove from wishlist');
      },
    });
  }

  get totalPrice(): number {
    return this.wishlistProducts.reduce((sum, product) => sum + product.price, 0);
  }

  /** Ensure imageUrls is an array (API may return JSON string). */
  private normalizeProductImages(product: FavoriteProduct): FavoriteProduct {
    const p = { ...product };
    if (p.imageUrls != null && typeof p.imageUrls === 'string') {
      try {
        const parsed = JSON.parse(p.imageUrls);
        p.imageUrls = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        p.imageUrls = [];
      }
    }
    if (!p.imageUrls?.length && p.imageUrl) {
      p.imageUrls = [p.imageUrl];
    }
    return p;
  }

  /** First image URL for display; prepends API base when relative. */
  getProductImageUrl(product: FavoriteProduct): string | null {
    const raw =
      (product.imageUrls && product.imageUrls.length > 0 ? product.imageUrls[0] : null) ||
      product.imageUrl ||
      null;
    if (!raw) return null;
    if (raw.startsWith('http://') || raw.startsWith('https://')) return raw;
    const base = environment.apiUrl?.replace(/\/$/, '') || '';
    return base ? `${base}${raw.startsWith('/') ? '' : '/'}${raw}` : raw;
  }
}
