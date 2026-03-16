import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import type { Pet } from './pets.service';
import type { BoardingProfile } from './boarding.service';
import type { Product } from './store.service';

/** Favorite pet (API returns full Pet with optional owner). Use type so template sees Pet fields. */
export type FavoritePet = Pet & { owner?: { id: string; name: string } };

/** Favorite boarding profile (API returns full profile with optional host). */
export type FavoriteBoardingProfile = BoardingProfile & { host?: { id: string; name: string } };

/** Favorite product (wishlist). */
export type FavoriteProduct = Product;

@Injectable({
  providedIn: 'root',
})
export class FavoritesService {
  private readonly apiUrl = `${environment.apiUrl}/favorites`;

  constructor(private http: HttpClient) {}

  getFavoritePets(): Observable<FavoritePet[]> {
    return this.http.get<FavoritePet[]>(`${this.apiUrl}/pets`);
  }

  addFavoritePet(petId: string | number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/pets/${petId}`, {});
  }

  removeFavoritePet(petId: string | number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/pets/${petId}`);
  }

  getFavoriteBoardingProfiles(): Observable<FavoriteBoardingProfile[]> {
    return this.http.get<FavoriteBoardingProfile[]>(`${this.apiUrl}/boarding`);
  }

  addFavoriteBoardingProfile(boardingProfileId: string | number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/boarding/${boardingProfileId}`, {});
  }

  removeFavoriteBoardingProfile(boardingProfileId: string | number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/boarding/${boardingProfileId}`);
  }

  // Product Wishlist
  getFavoriteProducts(): Observable<FavoriteProduct[]> {
    return this.http.get<FavoriteProduct[]>(`${this.apiUrl}/products`);
  }

  addFavoriteProduct(productId: string | number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/products/${productId}`, {});
  }

  removeFavoriteProduct(productId: string | number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/products/${productId}`);
  }
}
