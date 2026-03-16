import { Component, OnInit, signal, inject, computed } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideUser, lucideMail, lucideImage } from '@ng-icons/lucide';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../core/auth/auth.service';
import { UsersService, type UpdateUserDto, type UserProfile } from '../../core/services/users.service';
import { ToastService } from '../../core/services/toast.service';
import { UploadService } from '../../core/services/upload.service';

@Component({
  selector: 'app-owner-profile',
  standalone: true,
  imports: [NgIcon, ReactiveFormsModule],
  providers: [provideIcons({ lucideUser, lucideMail, lucideImage })],
  templateUrl: './owner-profile.component.html',
  styleUrl: './owner-profile.component.css',
})
export class OwnerProfileComponent implements OnInit {
  private fb = inject(FormBuilder);

  profile: UserProfile | null = null;
  isLoading = true; // Start with true to show loading state initially
  isSaving = false;
  isUploading = signal(false);

  // Profile picture
  selectedFile: File | null = null;
  previewUrl = signal<string | null>(null);

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(1)]],
    lastName: ['', [Validators.required, Validators.minLength(1)]],
    bio: [''],
    avatarUrl: [''],
  });

  // Track original values for change detection
  originalFormValues = signal({
    firstName: '',
    lastName: '',
    bio: '',
  });

  // Manual change trigger for form
  formChanged = signal(0);

  // Computed signal for change detection
  hasChanges = computed(() => {
    // Trigger re-computation when form changes
    this.formChanged();
    const current = this.form.value;
    const original = this.originalFormValues();
    return (
      (current.firstName || '').trim() !== original.firstName.trim() ||
      (current.lastName || '').trim() !== original.lastName.trim() ||
      (current.bio || '').trim() !== original.bio.trim()
    );
  });

  hasAvatarChange = computed(() => {
    return this.selectedFile !== null;
  });

  // Combined change detection for profile (form + avatar)
  hasAnyChanges = computed(() => {
    return this.hasChanges() || this.hasAvatarChange();
  });

  constructor(
    private auth: AuthService,
    private usersService: UsersService,
    private uploadService: UploadService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    console.log('OwnerProfile: ngOnInit called');
    this.loadProfile();
  }

  loadProfile(): void {
    const user = this.auth.getCurrentUser();
    
    console.log('OwnerProfile: Current user from auth:', user);
    console.log('OwnerProfile: User ID:', user?.id);
    console.log('OwnerProfile: User email:', user?.email);
    
    if (!user?.id) {
      this.isLoading = false;
      this.toast.error('Error', 'User not authenticated. Please log in again.');
      console.error('OwnerProfile: No user ID found');
      return;
    }

    this.isLoading = true;
    console.log('OwnerProfile: Loading profile for user ID:', user.id);
    
    this.usersService.getProfile(user.id).subscribe({
      next: (p) => {
        console.log('OwnerProfile: Profile loaded successfully:', p);
        this.profile = p;
        // Split name into first and last
        const nameParts = (p.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        console.log('OwnerProfile: Name parts:', { firstName, lastName, fullName: p.name });

        const formValues = {
          firstName,
          lastName,
          bio: p.bio || '',
          avatarUrl: p.avatarUrl ?? '',
        };

        console.log('OwnerProfile: Patching form with:', formValues);
        this.form.patchValue(formValues);
        this.originalFormValues.set({
          firstName,
          lastName,
          bio: p.bio || '',
        });
        this.isLoading = false;
        console.log('OwnerProfile: Loading complete, isLoading set to false');
      },
      error: (error) => {
        console.error('OwnerProfile: Error loading profile:', error);
        console.error('OwnerProfile: Error status:', error?.status);
        console.error('OwnerProfile: Error message:', error?.message);
        this.isLoading = false;
        
        let errorMsg = 'Failed to load profile.';
        if (error?.status === 401) {
          errorMsg = 'Authentication failed. Please log in again.';
        } else if (error?.status === 404) {
          errorMsg = 'User profile not found.';
        } else if (error?.status === 0) {
          errorMsg = 'Cannot connect to server. Please try again later.';
        }
        
        this.toast.error('Error', errorMsg);
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      if (!file.type.startsWith('image/')) {
        this.toast.error('Invalid file', 'Please select an image file');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.toast.error('File too large', 'Image must be less than 5MB');
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
      this.toast.error('No file', 'Please select a file first');
      return;
    }

    this.isUploading.set(true);
    const user = this.auth.getCurrentUser();
    if (!user?.id) {
      this.isUploading.set(false);
      this.toast.error('Auth error', 'User not authenticated');
      return;
    }

    this.toast.success('Uploading', 'Please wait while your photo is being uploaded...');

    this.uploadService.uploadImage(this.selectedFile, 'avatars').subscribe({
      next: (response) => {
        this.saveProfileWithAvatar(response.url);
        this.selectedFile = null;
        this.previewUrl.set(null);
        this.isUploading.set(false);
      },
      error: (error) => {
        this.isUploading.set(false);
        this.toast.error(
          'Upload failed',
          'Failed to upload image. Please try again or contact support if the issue persists.'
        );
        console.error('Upload error:', error);
      },
    });
  }

  saveProfileWithAvatar(avatarUrl: string): void {
    if (!this.profile) return;

    this.isSaving = true;
    const { firstName, lastName } = this.form.value;
    const updateDto: UpdateUserDto = {
      name: `${firstName?.trim() || ''} ${lastName?.trim() || ''}`.trim(),
      avatarUrl,
    };

    this.usersService
      .updateProfile(this.profile.id, updateDto)
      .subscribe({
        next: (updated) => {
          this.auth.updateProfileInStorage(updated);
          this.profile = updated;

          // Update original values
          const nameParts = (updated.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          this.originalFormValues.set({
            firstName,
            lastName,
            bio: this.form.value.bio || '',
          });

          this.isSaving = false;
          this.toast.success('Saved', 'Profile picture updated successfully');
        },
        error: () => {
          this.isSaving = false;
          this.toast.error('Error', 'Failed to update profile picture');
        },
      });
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || !this.profile) {
      if (this.form.invalid) {
        this.toast.error('Validation', 'Please fill in all required fields.');
      }
      return;
    }

    const { firstName, lastName } = this.form.value;
    const updateDto: UpdateUserDto = {
      name: `${firstName?.trim() || ''} ${lastName?.trim() || ''}`.trim(),
    };

    this.isSaving = true;
    this.usersService
      .updateProfile(this.profile.id, updateDto)
      .subscribe({
        next: (updated) => {
          this.auth.updateProfileInStorage(updated);
          this.profile = updated;

          // Update original values
          const nameParts = (updated.name || '').split(' ');
          const firstName = nameParts[0] || '';
          const lastName = nameParts.slice(1).join(' ') || '';
          this.originalFormValues.set({
            firstName,
            lastName,
            bio: this.form.value.bio || '',
          });

          this.isSaving = false;
          this.toast.success('Saved', 'Profile updated successfully');
        },
        error: () => {
          this.isSaving = false;
          this.toast.error('Error', 'Failed to update profile');
        },
      });
  }

  resetForm(): void {
    const original = this.originalFormValues();
    this.form.patchValue({
      firstName: original.firstName,
      lastName: original.lastName,
      bio: original.bio,
    });
    this.formChanged.update(c => c + 1);
  }

  onFormChange(): void {
    // Increment counter to trigger change detection
    this.formChanged.update(c => c + 1);
  }

  getAvatarUrl(): string {
    return this.previewUrl() || this.profile?.avatarUrl || this.auth.getCurrentUser()?.avatar || '';
  }

  getInitials(): string {
    const firstName = this.form.value.firstName || '';
    const lastName = this.form.value.lastName || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  }
}
