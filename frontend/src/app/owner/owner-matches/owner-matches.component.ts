import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideSparkles,
  lucideHeart,
  lucideMapPin,
  lucideUsers,
  lucideShield,
  lucideClock,
  lucideStar,
  lucideArrowRight,
  lucideSearch,
  lucideFilter,
  lucideSlidersHorizontal,
  lucideCheck,
  lucideX,
  lucideLoader2,
  lucidePawPrint,
  lucideHome,
  lucideTrendingUp,
  lucideAward,
  lucideUser,
  lucideCake,
  lucidePlus,
} from '@ng-icons/lucide';
import { PetsService, type Pet, type PetMatch } from '../../core/services/pets.service';
import { ToastService } from '../../core/services/toast.service';

interface MatchPreference {
  id: string;
  label: string;
  icon: string;
  enabled: boolean;
}

@Component({
  selector: 'app-owner-matches',
  standalone: true,
  imports: [RouterLink, NgIcon],
  providers: [provideIcons({
    lucideSparkles,
    lucideHeart,
    lucideMapPin,
    lucideUsers,
    lucideShield,
    lucideClock,
    lucideStar,
    lucideArrowRight,
    lucideSearch,
    lucideFilter,
    lucideSlidersHorizontal,
    lucideCheck,
    lucideX,
    lucideLoader2,
    lucidePawPrint,
    lucideHome,
    lucideTrendingUp,
    lucideAward,
    lucideUser,
    lucideCake,
    lucidePlus,
  })],
  templateUrl: './owner-matches.component.html',
  styleUrl: './owner-matches.component.css',
})
export class OwnerMatchesComponent implements OnInit {
  isFindingMatches = false;
  hasSearched = false;
  hasNoPets = false;
  showPreferences = false;
  myPets: Pet[] = [];
  myPetId: number | string | null = null;

  preferences: MatchPreference[] = [
    { id: 'playdate', label: 'Playdate matching', icon: 'lucideHeart', enabled: true },
    { id: 'boarding', label: 'Boarding compatibility', icon: 'lucideHome', enabled: true },
    { id: 'nearby', label: 'Nearby pets', icon: 'lucideMapPin', enabled: true },
    { id: 'similar', label: 'Similar breed', icon: 'lucideUsers', enabled: false },
    { id: 'verified', label: 'Verified owners only', icon: 'lucideShield', enabled: true },
    { id: 'active', label: 'Active pets', icon: 'lucideTrendingUp', enabled: false },
  ];

  matchResults: PetMatch[] = [];

  constructor(
    private petsService: PetsService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    this.loadMyPetAndFindMatches();
  }

  /**
   * Load user's pets and optionally run matching (when only one pet, auto-run once).
   */
  loadMyPetAndFindMatches(): void {
    if (this.isFindingMatches) return; // avoid duplicate inits (e.g. double navigation)
    this.isFindingMatches = true;
    this.hasSearched = false;

    this.petsService.getMyPets(20, 0).subscribe({
      next: (response) => {
        // Defer state updates to next tick to avoid ExpressionChangedAfterItHasBeenCheckedError
        setTimeout(() => {
          const pets = response?.data ?? [];
          if (pets.length > 0) {
            this.myPets = pets;
            this.myPetId = pets[0].id;
            this.hasNoPets = false;
            this.isFindingMatches = false;
            // Auto-run matches only when user has a single pet; otherwise they pick and click
            if (pets.length === 1) {
              this.findMatches();
            }
          } else {
            this.isFindingMatches = false;
            this.hasNoPets = true;
            this.myPets = [];
            this.myPetId = null;
          }
          this.cdr.detectChanges();
        }, 0);
      },
      error: (error) => {
        setTimeout(() => {
          this.isFindingMatches = false;
          this.hasNoPets = false;
          this.toast.error('Error', 'Failed to load your pets');
          this.cdr.detectChanges();
        }, 0);
        console.error('Error loading pets:', error);
      },
    });
  }

  togglePreference(id: string): void {
    const pref = this.preferences.find(p => p.id === id);
    if (pref) {
      pref.enabled = !pref.enabled;
    }
  }

  findMatches(): void {
    if (!this.myPetId) {
      this.toast.error('Add a pet first', 'Please add a pet in My Pets, then come back to find matches.');
      return;
    }
    if (this.isFindingMatches) {
      return; // avoid duplicate requests (e.g. double init or rapid clicks)
    }

    this.isFindingMatches = true;
    this.hasSearched = false;
    this.matchResults = [];

    const matchOptions = {
      similarBreed: this.preferences.find((p) => p.id === 'similar')?.enabled ?? false,
      verifiedOnly: this.preferences.find((p) => p.id === 'verified')?.enabled ?? false,
      activeOnly: this.preferences.find((p) => p.id === 'active')?.enabled ?? false,
    };
    this.petsService.getMatches(this.myPetId, matchOptions).subscribe({
      next: (matches) => {
        const results = matches || [];
        // Defer to next tick to avoid NG0100 (expression changed after check)
        setTimeout(() => {
          this.matchResults = results;
          this.isFindingMatches = false;
          this.hasSearched = true;
          if (this.matchResults.length === 0) {
            this.toast.info('No matches', 'No compatible pets found yet');
          } else {
            this.toast.success('Success', `Found ${this.matchResults.length} compatible pets!`);
          }
          this.cdr.detectChanges();
        }, 0);
      },
      error: (error) => {
        setTimeout(() => {
          this.isFindingMatches = false;
          this.hasSearched = true;
          const status = error?.status ?? error?.error?.statusCode;
          const is429 = status === 429;
          const isTimeout = error?.name === 'TimeoutError' || error?.message?.includes('timeout');
          const message = is429
            ? 'Too many requests. Please wait a moment and try again.'
            : isTimeout
              ? 'Request took too long. Please try again.'
              : 'Failed to find matches';
          this.toast.error('Error', message);
          this.cdr.detectChanges();
        }, 0);
        console.error('Error finding matches:', error);
      },
    });
  }

  getCompatibilityColor(score: number): string {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    return 'fair';
  }

  getCompatibilityLabel(score: number): string {
    if (score >= 90) return 'Excellent Match';
    if (score >= 75) return 'Good Match';
    return 'Fair Match';
  }

  selectPet(pet: Pet): void {
    this.myPetId = pet.id;
    this.cdr.detectChanges();
  }

  get selectedPet(): Pet | null {
    return this.myPets.find((p) => p.id === this.myPetId) ?? this.myPets[0] ?? null;
  }

  getAgeDisplay(ageMonths: number): string {
    if (ageMonths < 12) {
      return `${ageMonths} month${ageMonths !== 1 ? 's' : ''}`;
    }
    const years = Math.floor(ageMonths / 12);
    const months = ageMonths % 12;
    if (months === 0) {
      return `${years} year${years !== 1 ? 's' : ''}`;
    }
    return `${years}y ${months}m`;
  }
}
