import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideCat, lucidePlus, lucidePencil, lucideTrash2, lucideCheck, lucideImage, lucideArrowRight, lucideCake } from '@ng-icons/lucide';
import { PetsService, type Pet } from '../../core/services/pets.service';
import { ToastService } from '../../core/services/toast.service';
import { DialogService } from '../../core/services/dialog.service';

@Component({
  selector: 'app-owner-pets',
  standalone: true,
  imports: [RouterLink, NgIcon],
  providers: [provideIcons({ lucideCat, lucidePlus, lucidePencil, lucideTrash2, lucideCheck, lucideImage, lucideArrowRight, lucideCake })],
  templateUrl: './owner-pets.component.html',
  styleUrl: './owner-pets.component.css',
})
export class OwnerPetsComponent implements OnInit {
  pets: Pet[] = [];
  isLoading = true;

  constructor(
    @Inject(PetsService) private petsService: PetsService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    this.loadPets();
  }

  loadPets(): void {
    this.isLoading = true;
    this.petsService.getMyPets().subscribe({
      next: (response) => {
        this.pets = response.data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.isLoading = false;
        this.cdr.detectChanges();
        
        if (error?.status === 429) {
          this.toast.error('Too many requests', 'Please wait a moment and try again');
          console.warn('Rate limit exceeded - please slow down requests');
        } else {
          this.toast.error('Error', 'Failed to load pets');
        }
        console.error('Error loading pets:', error);
      },
    });
  }

  async deletePet(pet: Pet): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Delete Pet',
      message: `Are you sure you want to delete ${pet.name}?`,
      confirmText: 'Delete',
      type: 'danger'
    });

    if (confirmed) {
      this.petsService.remove(pet.id).subscribe({
        next: () => {
          this.pets = this.pets.filter((p) => p.id !== pet.id);
          this.toast.success('Deleted', `${pet.name} has been deleted`);
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
}
