import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface Product {
  id: string | number;
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
  imageUrls?: string[];  // Array of image URLs
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  price: number;
  stock: number;
  category: string;
  imageUrl?: string;
  imageUrls?: string[];
  isActive?: boolean;
}

export interface UpdateProductDto {
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  category?: string;
  imageUrl?: string;
  imageUrls?: string[];
  isActive?: boolean;
}

export interface SearchProductsParams {
  q?: string;
  category?: string;
  minPrice?: number;
  maxPrice?: number;
}

export interface CheckoutItem {
  productId: string | number;
  quantity: number;
}

export interface CheckoutDto {
  items: CheckoutItem[];
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string | number;
  quantity: number;
  unitPrice: number;
  totalPrice?: number;
  product?: Product;
}

export interface Order {
  id: string;
  userId: string;
  status: 'PLACED' | 'PROCESSING' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';
  total: number;
  totalAmount?: number;  // Alias for compatibility
  createdAt: string;
  updatedAt?: string;
  items?: OrderItem[];
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
}

export interface ProductRevenue {
  productId: string;
  labels: string[];
  data: number[];
  totalRevenue: number;
  totalItemsSold: number;
}

@Injectable({
  providedIn: 'root',
})
export class StoreService {
  private readonly apiUrl = `${environment.apiUrl}/store`;

  constructor(private http: HttpClient) {}

  /**
   * Search & discover products (public, paginated)
   */
  searchProducts(
    params?: SearchProductsParams,
    sortBy: 'createdAt' | 'price' = 'createdAt',
    sortOrder: 'asc' | 'desc' = 'desc',
    limit: number = 12,
    offset: number = 0
  ): Observable<PaginatedResponse<Product>> {
    let httpParams = new HttpParams()
      .set('sortBy', sortBy)
      .set('sortOrder', sortOrder)
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    if (params) {
      if (params.q) httpParams = httpParams.set('q', params.q);
      if (params.category) httpParams = httpParams.set('category', params.category);
      if (params.minPrice !== undefined) httpParams = httpParams.set('minPrice', params.minPrice.toString());
      if (params.maxPrice !== undefined) httpParams = httpParams.set('maxPrice', params.maxPrice.toString());
    }

    return this.http.get<PaginatedResponse<Product>>(`${this.apiUrl}/products`, { params: httpParams });
  }

  /**
   * Get product by ID
   */
  findOneProduct(id: string | number): Observable<Product> {
    return this.http.get<Product>(`${this.apiUrl}/products/${id}`);
  }

  /**
   * Place order (cart checkout)
   */
  checkout(items: CheckoutItem[]): Observable<Order> {
    return this.http.post<Order>(`${this.apiUrl}/cart/checkout`, { items });
  }

  /**
   * Get user's order history (paginated)
   */
  myOrders(
    limit: number = 10,
    offset: number = 0
  ): Observable<PaginatedResponse<Order>> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    return this.http.get<PaginatedResponse<Order>>(`${this.apiUrl}/orders/my`, { params });
  }

  /**
   * Cancel own order (if allowed)
   */
  cancelOrder(orderId: string | number): Observable<Order> {
    return this.http.patch<Order>(`${this.apiUrl}/orders/${orderId}/cancel`, {});
  }

  /**
   * Update product (admin)
   */
  updateProduct(id: string | number, dto: UpdateProductDto): Observable<Product> {
    return this.http.patch<Product>(`${this.apiUrl}/products/${id}`, dto);
  }

  /**
   * Delete product (admin)
   */
  deleteProduct(id: string | number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/products/${id}`);
  }

  /**
   * Create product (admin)
   */
  createProduct(dto: CreateProductDto): Observable<Product> {
    return this.http.post<Product>(`${this.apiUrl}/products`, dto);
  }

  /**
   * Get all orders (admin)
   */
  getAllOrders(limit: number = 50, offset: number = 0): Observable<PaginatedResponse<Order>> {
    const params = new HttpParams()
      .set('limit', limit.toString())
      .set('offset', offset.toString());
    return this.http.get<PaginatedResponse<Order>>(`${this.apiUrl}/orders`, { params });
  }

  /**
   * Get product revenue data (admin)
   */
  getProductRevenue(productId: string | number): Observable<ProductRevenue> {
    return this.http.get<ProductRevenue>(`${this.apiUrl}/products/${productId}/revenue`);
  }

  /**
   * Update order status (admin)
   */
  updateOrderStatus(orderId: string, status: string): Observable<Order> {
    return this.http.patch<Order>(`${this.apiUrl}/orders/${orderId}/status`, { status });
  }
}
