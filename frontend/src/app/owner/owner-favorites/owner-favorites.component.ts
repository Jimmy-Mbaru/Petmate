import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideHeart, lucideCat, lucideMapPin, lucideTrash2, lucideEye, lucideShoppingBag } from '@ng-icons/lucide';
import { FavoritesService, type FavoritePet, type FavoriteBoardingProfile } from '../../core/services/favorites.service';
import { ToastService } from '../../core/services/toast.service';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-owner-favorites',
  standalone: true,
  imports: [RouterLink, NgIcon],
  providers: [provideIcons({ lucideHeart, lucideCat, lucideMapPin, lucideTrash2, lucideEye, lucideShoppingBag })],
  templateUrl: './owner-favorites.component.html',
  styleUrl: './owner-favorites.component.css',
})
export class OwnerFavoritesComponent implements OnInit {
  favoritePets: FavoritePet[] = [];
  favoriteBoarding: FavoriteBoardingProfile[] = [];
  isLoading = true;

  constructor(
    @Inject(FavoritesService) private favoritesService: FavoritesService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadFavorites();
  }

  loadFavorites(): void {
    this.isLoading = true;
    
    forkJoin({
      pets: this.favoritesService.getFavoritePets().pipe(
        catchError(() => {
          this.toast.error('Error', 'Failed to load favorite pets');
          return of([]);
        })
      ),
      boarding: this.favoritesService.getFavoriteBoardingProfiles().pipe(
        catchError(() => {
          this.toast.error('Error', 'Failed to load favorite boarding');
          return of([]);
        })
      )
    }).subscribe({
      next: (result) => {
        this.favoritePets = result.pets;
        this.favoriteBoarding = result.boarding;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: () => {
        this.isLoading = false;
        this.cdr.detectChanges();
        this.toast.error('Error', 'Failed to load favorites');
      }
    });
  }

  removePet(pet: FavoritePet): void {
    this.favoritesService.removeFavoritePet(pet.id).subscribe({
      next: () => {
        this.favoritePets = this.favoritePets.filter((p) => p.id !== pet.id);
        this.toast.success('Removed', `${pet.name} removed from favorites`);
      },
      error: () => this.toast.error('Error', 'Failed to remove from favorites'),
    });
  }

  removeBoarding(profile: FavoriteBoardingProfile): void {
    this.favoritesService.removeFavoriteBoardingProfile(profile.id).subscribe({
      next: () => {
        this.favoriteBoarding = this.favoriteBoarding.filter((p) => p.id !== profile.id);
        this.toast.success('Removed', 'Boarding profile removed from favorites');
      },
      error: () => this.toast.error('Error', 'Failed to remove from favorites'),
    });
  }
}
