import { Component, Inject, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators, FormArray } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideSave, lucideX, lucideUpload, lucideTrash2, lucideImage, lucideCheck } from '@ng-icons/lucide';
import { PetsService, type CreatePetDto, type UpdatePetDto } from '../../core/services/pets.service';
import { UploadService } from '../../core/services/upload.service';
import { ToastService } from '../../core/services/toast.service';

interface UploadedPhoto {
  url: string;
  publicId?: string;
  isPrimary?: boolean;
}

@Component({
  selector: 'app-owner-pet-form',
  standalone: true,
  imports: [RouterLink, ReactiveFormsModule, NgIcon],
  providers: [provideIcons({ lucideSave, lucideX, lucideUpload, lucideTrash2, lucideImage, lucideCheck })],
  templateUrl: './owner-pet-form.component.html',
  styleUrl: './owner-pet-form.component.css',
})
export class OwnerPetFormComponent implements OnInit {
  form!: FormGroup;
  isEdit = false;
  isSubmitting = false;
  isUploadingPhoto = false;
  private petId: string | null = null;
  
  // Photo gallery
  uploadedPhotos: UploadedPhoto[] = [];
  draggedPhotoIndex: number | null = null;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    @Inject(PetsService) private petsService: PetsService,
    private uploadService: UploadService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.isEdit = !!this.route.snapshot.paramMap.get('id');
    const idParam = this.route.snapshot.paramMap.get('id');
    if (idParam) {
      this.petId = idParam;
      this.loadPet(this.petId);
    }
  }

  private initForm(): void {
    this.form = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      species: ['', [Validators.required]],
      breed: ['', [Validators.required]],
      age: [null, [Validators.required, Validators.min(0), Validators.max(300)]],
      gender: ['', [Validators.required]],
      healthNotes: ['', [Validators.maxLength(500)]],
      photoUrls: this.fb.array([]),
      isAvailable: [true],
    });
  }

  get photoUrls(): FormArray {
    return this.form.get('photoUrls') as FormArray;
  }

  private loadPet(id: string): void {
    this.petsService.findOne(id).subscribe({
      next: (pet) => {
        this.form.patchValue({
          name: pet.name,
          species: pet.species,
          breed: pet.breed,
          age: pet.age,
          gender: pet.gender,
          healthNotes: pet.healthNotes || '',
          isAvailable: pet.isAvailable ?? true,
        });

        // Load existing photos
        const photos = pet.photoUrls || (pet.photoUrl ? [pet.photoUrl] : []);
        photos.forEach((url, index) => {
          this.uploadedPhotos.push({
            url,
            isPrimary: index === 0,
          });
          this.photoUrls.push(this.fb.control(url));
        });
      },
      error: (error) => {
        this.toast.error('Error', 'Failed to load pet details');
        console.error('Error loading pet:', error);
        this.router.navigate(['/app/pets']);
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const files = input.files;
    
    if (!files || files.length === 0) {
      return;
    }

    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    for (let i = 0; i < files.length; i++) {
      if (!validTypes.includes(files[i].type)) {
        this.toast.error('Invalid file', 'Please upload JPG, PNG, GIF, or WebP images only');
        input.value = '';
        return;
      }

      // Validate file size (max 5MB)
      if (files[i].size > 5 * 1024 * 1024) {
        this.toast.error('File too large', 'Each image must be less than 5MB');
        input.value = '';
        return;
      }
    }

    // Upload each file
    Array.from(files).forEach(file => {
      this.uploadPhoto(file);
    });

    input.value = '';
  }

  private uploadPhoto(file: File): void {
    this.isUploadingPhoto = true;

    this.uploadService.uploadImage(file, 'pets').subscribe({
      next: (response) => {
        this.uploadedPhotos.push({
          url: response.url,
          publicId: response.publicId,
          isPrimary: this.uploadedPhotos.length === 0,
        });
        this.photoUrls.push(this.fb.control(response.url));
        this.isUploadingPhoto = false;
        this.toast.success('Success', 'Photo uploaded successfully');
      },
      error: (error) => {
        this.isUploadingPhoto = false;
        this.toast.error('Upload failed', 'Failed to upload image. Please try again.');
        console.error('Upload error:', error);
      },
    });
  }

  removePhoto(index: number): void {
    if (this.uploadedPhotos[index].isPrimary && this.uploadedPhotos.length > 1) {
      // Set next photo as primary
      this.uploadedPhotos[index + 1].isPrimary = true;
    }

    this.uploadedPhotos.splice(index, 1);
    this.photoUrls.removeAt(index);

    // Update primary if needed
    if (this.uploadedPhotos.length > 0 && !this.uploadedPhotos.some(p => p.isPrimary)) {
      this.uploadedPhotos[0].isPrimary = true;
    }

    this.toast.success('Removed', 'Photo removed');
  }

  setAsPrimary(index: number): void {
    this.uploadedPhotos.forEach((photo, i) => {
      photo.isPrimary = i === index;
    });
    this.toast.success('Success', 'Primary photo updated');
  }

  // Drag and drop for reordering
  onDragStart(index: number): void {
    this.draggedPhotoIndex = index;
  }

  onDragOver(event: DragEvent, index: number): void {
    event.preventDefault();
    if (this.draggedPhotoIndex === null || this.draggedPhotoIndex === index) {
      return;
    }

    // Swap photos in array
    const draggedPhoto = this.uploadedPhotos[this.draggedPhotoIndex];
    const targetPhoto = this.uploadedPhotos[index];

    this.uploadedPhotos[this.draggedPhotoIndex] = targetPhoto;
    this.uploadedPhotos[index] = draggedPhoto;

    // Update form array
    const draggedControl = this.photoUrls.at(this.draggedPhotoIndex);
    const targetControl = this.photoUrls.at(index);

    this.photoUrls.setControl(this.draggedPhotoIndex, targetControl);
    this.photoUrls.setControl(index, draggedControl);

    this.draggedPhotoIndex = index;
  }

  onDragEnd(): void {
    this.draggedPhotoIndex = null;
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.toast.error('Validation', 'Please fill in all required fields');
      return;
    }

    this.isSubmitting = true;
    const formValue = this.form.getRawValue();

    // Get primary photo URL
    const primaryPhoto = this.uploadedPhotos.find(p => p.isPrimary);
    const photoUrls = this.uploadedPhotos.map(p => p.url);

    if (this.isEdit && this.petId) {
      const updateDto: UpdatePetDto = {
        name: formValue.name,
        species: formValue.species,
        breed: formValue.breed,
        age: formValue.age,
        gender: formValue.gender,
        healthNotes: formValue.healthNotes || undefined,
        photoUrl: primaryPhoto?.url,
        photoUrls: photoUrls,
        isAvailable: formValue.isAvailable,
      };

      this.petsService.update(this.petId, updateDto).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.toast.success('Success', 'Pet updated successfully');
          this.router.navigate(['/app/pets']);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.toast.error('Error', 'Failed to update pet');
          console.error('Error updating pet:', error);
        },
      });
    } else {
      const createDto: CreatePetDto = {
        name: formValue.name,
        species: formValue.species,
        breed: formValue.breed,
        age: formValue.age,
        gender: formValue.gender,
        healthNotes: formValue.healthNotes || undefined,
        photoUrl: primaryPhoto?.url,
        photoUrls: photoUrls,
        isAvailable: formValue.isAvailable,
      };

      this.petsService.create(createDto).subscribe({
        next: () => {
          this.isSubmitting = false;
          this.toast.success('Success', 'Pet created successfully');
          this.router.navigate(['/app/pets']);
        },
        error: (error) => {
          this.isSubmitting = false;
          this.toast.error('Error', 'Failed to create pet');
          console.error('Error creating pet:', error);
        },
      });
    }
  }

  get canSubmit(): boolean {
    return this.form.valid && !this.isSubmitting;
  }

  get photoCount(): number {
    return this.uploadedPhotos.length;
  }

  isUploadDisabled(): boolean {
    return this.isUploadingPhoto || this.uploadedPhotos.length >= 10;
  }
}
