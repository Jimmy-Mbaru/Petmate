import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import {
  lucideArrowLeft,
  lucidePencil,
  lucideTrash2,
  lucideImage,
  lucideCake,
  lucideMapPin,
  lucideHeart,
  lucideCheckCircle2,
  lucideCircleDot,
  lucideCircle,
  lucideCalendar,
  lucideFileText,
  lucideEdit3,
  lucideDroplet,
  lucideUtensils,
  lucideActivity,
  lucideHome,
  lucidePhone,
  lucideMail,
  lucideShare2,
  lucideMoreVertical,
  lucideStar,
  lucideAward,
  lucideShield,
  lucideClock,
} from '@ng-icons/lucide';
import { PetsService, type Pet } from '../../core/services/pets.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';

@Component({
  selector: 'app-pet-detail',
  standalone: true,
  imports: [RouterLink, NgIcon],
  providers: [provideIcons({
    lucideArrowLeft,
    lucidePencil,
    lucideTrash2,
    lucideImage,
    lucideCake,
    lucideMapPin,
    lucideHeart,
    lucideCheckCircle2,
    lucideCircleDot,
    lucideCircle,
    lucideCalendar,
    lucideFileText,
    lucideEdit3,
    lucideDroplet,
    lucideUtensils,
    lucideActivity,
    lucideHome,
    lucidePhone,
    lucideMail,
    lucideShare2,
    lucideMoreVertical,
    lucideStar,
    lucideAward,
    lucideShield,
    lucideClock,
  })],
  templateUrl: './pet-detail.component.html',
  styleUrl: './pet-detail.component.css',
})
export class PetDetailComponent implements OnInit {
  pet: Pet | null = null;
  isLoading = true;
  selectedPhotoIndex = 0;
  private petId: string | null = null;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PetsService) private petsService: PetsService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.petId = idParam;
      this.loadPet(this.petId);
    } else {
      this.router.navigate(['/app/pets']);
    }
  }

  loadPet(id: string): void {
    this.isLoading = true;
    this.petsService.findOne(id).subscribe({
      next: (pet) => {
        this.pet = pet;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        this.cdr.detectChanges();
        this.toast.error('Error', 'Failed to load pet details');
        console.error('Error loading pet:', error);
        this.router.navigate(['/app/pets']);
      },
    });
  }

  async deletePet(): Promise<void> {
    const pet = this.pet;
    if (!pet) return;

    const confirmed = await this.dialogService.confirm({
      title: 'Delete Pet',
      message: `Are you sure you want to delete ${pet.name}?`,
      confirmText: 'Delete',
      type: 'danger'
    });

    if (confirmed) {
      this.petsService.remove(pet.id).subscribe({
        next: () => {
          this.toast.success('Deleted', `${pet.name} has been deleted`);
          this.router.navigate(['/app/pets']);
        },
        error: (error) => {
          this.toast.error('Error', 'Failed to delete pet');
          console.error('Error deleting pet:', error);
        },
      });
    }
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

  get photos(): string[] {
    if (!this.pet) return [];
    return this.pet.photoUrls || (this.pet.photoUrl ? [this.pet.photoUrl] : []);
  }

  get primaryPhoto(): string {
    const photos = this.photos;
    if (photos.length === 0) return '';
    return photos[this.selectedPhotoIndex] || photos[0];
  }

  selectPhoto(index: number): void {
    this.selectedPhotoIndex = index;
  }

  previousPhoto(): void {
    const photos = this.photos;
    if (photos.length > 0) {
      this.selectedPhotoIndex = (this.selectedPhotoIndex - 1 + photos.length) % photos.length;
    }
  }

  nextPhoto(): void {
    const photos = this.photos;
    if (photos.length > 0) {
      this.selectedPhotoIndex = (this.selectedPhotoIndex + 1) % photos.length;
    }
  }

  getGenderIcon(): string {
    return this.pet?.gender === 'male' ? 'lucideCircleDot' : 'lucideCircle';
  }

  get joinDate(): string {
    return this.getJoinDate();
  }

  getJoinDate(): string {
    if (!this.pet?.id) return '';
    const date = new Date(2024, 0, 1); // Placeholder - use actual created date if available
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }
}
