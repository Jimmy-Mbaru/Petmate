import { Component, Inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import AOS from 'aos';
import { AuthService } from '../../core/auth/auth.service';
import {
  BoardingService,
  CreateBoardingProfileDto,
  UpdateBoardingProfileDto,
  BlackoutDate,
} from '../../core/services/boarding.service';
import { ToastService } from '../../core/services/toast.service';
import { UsersService, UpdateUserDto } from '../../core/services/users.service';
import { UploadService } from '../../core/services/upload.service';
import { LocationPickerComponent } from '../../shared/components/location-picker/location-picker.component';

@Component({
  selector: 'app-host-profile',
  standalone: true,
  imports: [CommonModule, FormsModule, LocationPickerComponent],
  templateUrl: './host-profile.component.html',
  styleUrls: ['./host-profile.component.css'],
})
export class HostProfileComponent implements OnInit {
  readonly loading = signal(false);
  readonly saving = signal(false);
  readonly savingProfile = signal(false);
  readonly loadingBlackout = signal(false);

  // Personal profile
  personalProfile = signal<{
    name: string;
    bio: string;
    avatarUrl: string | null;
  } | null>(null);

  personalForm = signal({
    firstName: '',
    lastName: '',
    bio: '',
    avatarUrl: '',
  });

  // Manual change trigger for personal form
  personalFormChanged = signal(0);

  // Update personal form field
  updatePersonalField(field: 'firstName' | 'lastName' | 'bio', value: string): void {
    this.personalForm.update(form => ({ ...form, [field]: value }));
    this.personalFormChanged.update(c => c + 1);
  }

  // Boarding profile
  boardingProfile = signal<{
    id?: number;
    location: string;
    latitude?: number;
    longitude?: number;
    capacity: number;
    pricePerDay: number;
    description: string;
    isApproved: boolean;
  } | null>(null);

  boardingForm = signal({
    location: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    capacity: 1,
    pricePerDay: 50,
    description: '',
  });

  // Blackout dates
  blackoutDates = signal<BlackoutDate[]>([]);
  newBlackoutDate = signal('');
  minDate = new Date().toISOString().split('T')[0];

  // Manual change trigger for boarding form
  boardingFormChanged = signal(0);

  // Update boarding form field
  updateBoardingField(field: 'location' | 'capacity' | 'pricePerDay' | 'description', value: string | number): void {
    this.boardingForm.update(form => ({ ...form, [field]: value }));
    this.boardingFormChanged.update(c => c + 1);
  }

  fieldTouched = signal<{ location: boolean; capacity: boolean; pricePerDay: boolean }>({
    location: false,
    capacity: false,
    pricePerDay: false,
  });

  // Profile picture upload
  selectedFile: File | null = null;
  previewUrl = signal<string | null>(null);
  isUploading = signal(false);

  // Track original values for change detection
  originalPersonalForm = signal({
    firstName: '',
    lastName: '',
    bio: '',
    avatarUrl: '',
  });

  originalBoardingForm = signal({
    location: '',
    latitude: undefined as number | undefined,
    longitude: undefined as number | undefined,
    capacity: 1,
    pricePerDay: 50,
    description: '',
  });

  // Computed signals for change detection
  hasPersonalChanges = computed(() => {
    // Trigger re-computation when form changes
    this.personalFormChanged();
    const current = this.personalForm();
    const original = this.originalPersonalForm();
    return (
      current.firstName.trim() !== original.firstName.trim() ||
      current.lastName.trim() !== original.lastName.trim() ||
      current.bio.trim() !== original.bio.trim()
    );
  });

  hasBoardingChanges = computed(() => {
    // Trigger re-computation when form changes
    this.boardingFormChanged();
    const current = this.boardingForm();
    const original = this.originalBoardingForm();
    return (
      current.location.trim() !== original.location.trim() ||
      current.latitude !== original.latitude ||
      current.longitude !== original.longitude ||
      current.capacity !== original.capacity ||
      current.pricePerDay !== original.pricePerDay ||
      current.description.trim() !== original.description.trim()
    );
  });

  hasAvatarChange = computed(() => {
    return this.selectedFile !== null;
  });

  // Combined change detection for personal profile (form + avatar)
  hasAnyPersonalChanges = computed(() => {
    return this.hasPersonalChanges() || this.hasAvatarChange();
  });

  constructor(
    private auth: AuthService,
    @Inject(BoardingService) private boardingService: BoardingService,
    private usersService: UsersService,
    private uploadService: UploadService,
    private toastService: ToastService
  ) {}

  ngOnInit(): void {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      offset: 50,
    });
    this.loadPersonalProfile();
    this.loadBoardingProfile();
  }

  loadPersonalProfile(): void {
    const user = this.auth.getCurrentUser();
    if (!user) return;

    const formData = {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      bio: user.bio || '',
      avatarUrl: user.avatar || '',
    };

    this.personalForm.set(formData);
    this.originalPersonalForm.set(formData);

    this.personalProfile.set({
      name: `${user.firstName} ${user.lastName}`.trim(),
      bio: user.bio || '',
      avatarUrl: user.avatar || null,
    });
  }

  loadBoardingProfile(): void {
    const user = this.auth.getCurrentUser();
    if (!user?.id) return;

    this.boardingService.getProfileByHost(user.id).subscribe({
      next: (response) => {
        if (response) {
          const formData = {
            location: response.location,
            latitude: response.latitude,
            longitude: response.longitude,
            capacity: response.capacity,
            pricePerDay: response.pricePerDay,
            description: response.description ?? '',
          };

          this.boardingProfile.set({
            id: response.id,
            location: response.location,
            capacity: response.capacity,
            pricePerDay: response.pricePerDay,
            description: response.description ?? '',
            isApproved: response.isApproved,
            latitude: response.latitude,
            longitude: response.longitude,
          });

          this.boardingForm.set(formData);
          this.originalBoardingForm.set(formData);

          // Load blackout dates
          this.loadBlackoutDates(response.id);
        }
      },
      error: () => {
        // Profile doesn't exist yet, that's okay
      },
    });
  }

  loadBlackoutDates(profileId: number): void {
    this.loadingBlackout.set(true);
    this.boardingService.getBlackoutDates(profileId).subscribe({
      next: (dates) => {
        this.blackoutDates.set(dates);
        this.loadingBlackout.set(false);
      },
      error: () => {
        this.loadingBlackout.set(false);
        this.toastService.error('Error', 'Failed to load blackout dates');
      },
    });
  }

  addBlackoutDate(): void {
    const profile = this.boardingProfile();
    const date = this.newBlackoutDate();
    if (!profile?.id || !date) return;

    this.loadingBlackout.set(true);
    this.boardingService.addBlackout(profile.id, date).subscribe({
      next: () => {
        this.newBlackoutDate.set('');
        this.loadBlackoutDates(profile.id!);
        this.toastService.success('Success', 'Blackout date added');
      },
      error: (err: any) => {
        this.loadingBlackout.set(false);
        if (err?.error?.message?.includes('already a blackout')) {
          this.toastService.error('Error', 'This date is already a blackout date');
        } else {
          this.toastService.error('Error', 'Failed to add blackout date');
        }
      },
    });
  }

  removeBlackoutDate(date: string): void {
    const profile = this.boardingProfile();
    if (!profile?.id) return;

    this.loadingBlackout.set(true);
    this.boardingService.removeBlackout(profile.id, date).subscribe({
      next: () => {
        this.loadBlackoutDates(profile.id!);
        this.toastService.success('Success', 'Blackout date removed');
      },
      error: () => {
        this.loadingBlackout.set(false);
        this.toastService.error('Error', 'Failed to remove blackout date');
      },
    });
  }

  markTouched(field: 'location' | 'capacity' | 'pricePerDay'): void {
    this.fieldTouched.update((t) => ({ ...t, [field]: true }));
  }

  onLocationSelected(event: { lat: number; lng: number; address?: string }): void {
    this.boardingForm.update(form => ({
      ...form,
      latitude: event.lat,
      longitude: event.lng,
      location: event.address || form.location,
    }));
  }

  // Personal profile methods
  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!file.type.startsWith('image/')) {
        this.toastService.error('Invalid file', 'Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.toastService.error('File too large', 'Image must be less than 5MB');
        return;
      }
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrl.set(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }

  uploadProfilePicture(): void {
    if (!this.selectedFile) {
      this.toastService.error('No file', 'Please select a file first');
      return;
    }

    this.isUploading.set(true);
    const user = this.auth.getCurrentUser();
    if (!user?.id) {
      this.isUploading.set(false);
      this.toastService.error('Auth error', 'User not authenticated');
      return;
    }

    this.toastService.info('Uploading', 'Please wait while your photo is being uploaded...');

    this.uploadService.uploadImage(this.selectedFile, 'avatars').subscribe({
      next: (response) => {
        this.savePersonalProfileWithAvatar(response.url);
        this.selectedFile = null;
        this.previewUrl.set(null);
        this.isUploading.set(false);
      },
      error: (error) => {
        this.isUploading.set(false);
        this.toastService.error(
          'Upload failed',
          'Failed to upload image. Please try again or contact support if the issue persists.'
        );
        console.error('Upload error:', error);
      },
    });
  }

  savePersonalProfileWithAvatar(avatarUrl: string): void {
    const user = this.auth.getCurrentUser();
    if (!user?.id) return;

    this.savingProfile.set(true);

    const { firstName, lastName, bio } = this.personalForm();
    const updateDto: UpdateUserDto = {
      name: `${firstName.trim()} ${lastName.trim()}`,
      bio: bio || undefined,
      avatarUrl,
    };

    this.usersService.updateProfile(user.id, updateDto).subscribe({
      next: (updated) => {
        this.auth.updateProfileInStorage(updated);
        this.savingProfile.set(false);

        const newOriginal = {
          firstName: updated.firstName || firstName,
          lastName: updated.lastName || lastName,
          bio: updated.bio || '',
          avatarUrl: updated.avatarUrl || '',
        };
        this.originalPersonalForm.set(newOriginal);

        this.personalProfile.set({
          name: `${firstName.trim()} ${lastName.trim()}`,
          bio: updated.bio || '',
          avatarUrl: updated.avatarUrl,
        });
        this.toastService.success('Success', 'Profile picture updated successfully');
      },
      error: () => {
        this.savingProfile.set(false);
        this.toastService.error('Error', 'Failed to update profile picture');
      },
    });
  }

  savePersonalProfile(): void {
    const { firstName, lastName, bio } = this.personalForm();
    if (!firstName.trim() || !lastName.trim()) {
      this.toastService.error('Validation', 'First name and last name are required.');
      return;
    }

    const user = this.auth.getCurrentUser();
    if (!user?.id) return;

    this.savingProfile.set(true);

    const updateDto: UpdateUserDto = {
      name: `${firstName.trim()} ${lastName.trim()}`,
      bio: bio || undefined,
    };

    this.usersService.updateProfile(user.id, updateDto).subscribe({
      next: (updated) => {
        this.auth.updateProfileInStorage(updated);
        this.savingProfile.set(false);

        const newOriginal = {
          firstName: updated.firstName || firstName,
          lastName: updated.lastName || lastName,
          bio: updated.bio || '',
          avatarUrl: this.personalForm().avatarUrl,
        };
        this.originalPersonalForm.set(newOriginal);

        this.personalProfile.set({
          name: `${firstName.trim()} ${lastName.trim()}`,
          bio: updated.bio || '',
          avatarUrl: updated.avatarUrl,
        });
        this.toastService.success('Success', 'Personal profile updated successfully');
      },
      error: () => {
        this.savingProfile.set(false);
        this.toastService.error('Error', 'Failed to update personal profile');
      },
    });
  }

  // Boarding profile methods
  saveBoardingProfile(): void {
    this.fieldTouched.set({ location: true, capacity: true, pricePerDay: true });
    const f = this.boardingForm();
    if (!f.location?.trim() || f.capacity == null || f.capacity < 1 || f.pricePerDay == null || f.pricePerDay < 10) {
      this.toastService.error('Validation', 'Please fill in all required fields.');
      return;
    }
    this.saving.set(true);

    const dto: CreateBoardingProfileDto | UpdateBoardingProfileDto = {
      location: this.boardingForm().location,
      latitude: this.boardingForm().latitude,
      longitude: this.boardingForm().longitude,
      capacity: this.boardingForm().capacity,
      pricePerDay: this.boardingForm().pricePerDay,
      description: this.boardingForm().description,
    };

    const profile = this.boardingProfile();

    if (profile && profile.id) {
      // Update existing profile
      this.boardingService.updateProfile(profile.id, dto as UpdateBoardingProfileDto).subscribe({
        next: (response) => {
          this.saving.set(false);
          const value = {
            id: response.id,
            location: response.location,
            capacity: response.capacity,
            pricePerDay: response.pricePerDay,
            description: response.description ?? '',
            isApproved: response.isApproved,
            latitude: response.latitude,
            longitude: response.longitude,
          };
          this.boardingProfile.set(value);
          this.originalBoardingForm.set({
            location: response.location,
            latitude: response.latitude,
            longitude: response.longitude,
            capacity: response.capacity,
            pricePerDay: response.pricePerDay,
            description: response.description ?? '',
          });
          this.toastService.success('Success', 'Boarding profile updated successfully');
        },
        error: () => {
          this.saving.set(false);
          this.toastService.error('Error', 'Failed to update boarding profile');
        },
      });
    } else {
      // Create new profile
      this.boardingService.createProfile(dto as CreateBoardingProfileDto).subscribe({
        next: (response) => {
          this.saving.set(false);
          const value = {
            id: response.id,
            location: response.location,
            capacity: response.capacity,
            pricePerDay: response.pricePerDay,
            description: response.description ?? '',
            isApproved: response.isApproved,
            latitude: response.latitude,
            longitude: response.longitude,
          };
          this.boardingProfile.set(value);
          this.originalBoardingForm.set({
            location: response.location,
            latitude: response.latitude,
            longitude: response.longitude,
            capacity: response.capacity,
            pricePerDay: response.pricePerDay,
            description: response.description ?? '',
          });
          this.toastService.success('Success', 'Boarding profile created successfully');
        },
        error: () => {
          this.saving.set(false);
          this.toastService.error('Error', 'Failed to create boarding profile');
        },
      });
    }
  }

  resetPersonalForm(): void {
    this.personalForm.set({ ...this.originalPersonalForm() });
    this.personalFormChanged.update(c => c + 1);
  }

  resetBoardingForm(): void {
    this.boardingForm.set({ ...this.originalBoardingForm() });
  }

  onPersonalFormChange(): void {
    // Increment counter to trigger change detection
    this.personalFormChanged.update(c => c + 1);
  }

  onBoardingFormChange(): void {
    // Increment counter to trigger change detection
    this.boardingFormChanged.update(c => c + 1);
  }

  getAvatarUrl(): string {
    return this.previewUrl() || this.personalProfile()?.avatarUrl || this.auth.getCurrentUser()?.avatar || '';
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString(undefined, {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }
}
