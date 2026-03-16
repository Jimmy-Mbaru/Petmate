import { Component, OnInit, signal, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideUser, lucideMail, lucideImage, lucideShield } from '@ng-icons/lucide';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../../core/auth/auth.service';
import { UsersService, type UpdateUserDto, type UserProfile } from '../../../core/services/users.service';
import { ToastService } from '../../../core/services/toast.service';
import { UploadService } from '../../../core/services/upload.service';

@Component({
  selector: 'app-admin-profile',
  standalone: true,
  imports: [RouterLink, NgIcon, ReactiveFormsModule],
  providers: [provideIcons({ lucideUser, lucideMail, lucideImage, lucideShield })],
  templateUrl: './admin-profile.component.html',
  styleUrl: './admin-profile.component.css',
})
export class AdminProfileComponent implements OnInit {
  private fb = inject(FormBuilder);

  profile: UserProfile | null = null;
  isLoading = false;
  isSaving = false;
  isUploading = signal(false);

  // Profile picture
  selectedFile: File | null = null;
  previewUrl: string | null = null;

  form = this.fb.group({
    firstName: ['', [Validators.required, Validators.minLength(1)]],
    lastName: ['', [Validators.required, Validators.minLength(1)]],
    bio: [''],
    avatarUrl: [''],
  });

  constructor(
    private auth: AuthService,
    private usersService: UsersService,
    private uploadService: UploadService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadProfile();
  }

  loadProfile(): void {
    const user = this.auth.getCurrentUser();
    if (!user?.id) {
      this.isLoading = false;
      return;
    }

    this.isLoading = true;
    this.usersService.getProfile(user.id).subscribe({
      next: (p: UserProfile) => {
        this.profile = p;
        // Split name into first and last
        const nameParts = (p.name || '').split(' ');
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';
        
        this.form.patchValue({
          firstName,
          lastName,
          bio: '',
          avatarUrl: p.avatarUrl ?? '',
        });
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Error', 'Failed to load profile');
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
        this.previewUrl = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadProfilePicture(): void {
    if (!this.selectedFile) return;
    
    this.isUploading.set(true);
    const user = this.auth.getCurrentUser();
    if (!user?.id) {
      this.isUploading.set(false);
      return;
    }

    this.uploadService.uploadImage(this.selectedFile, 'avatars').subscribe({
      next: (response: { url: string; publicId: string }) => {
        this.saveProfileWithAvatar(response.url);
        this.selectedFile = null;
        this.previewUrl = null;
        this.isUploading.set(false);
      },
      error: () => {
        this.isUploading.set(false);
        this.toast.error('Upload failed', 'Failed to upload image');
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
        next: (updated: UserProfile) => {
          this.auth.updateProfileInStorage(updated);
          this.profile = updated;
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
        next: (updated: UserProfile) => {
          this.auth.updateProfileInStorage(updated);
          this.profile = updated;
          this.isSaving = false;
          this.toast.success('Saved', 'Profile updated successfully');
        },
        error: () => {
          this.isSaving = false;
          this.toast.error('Error', 'Failed to update profile');
        },
      });
  }

  getAvatarUrl(): string {
    return this.previewUrl || this.profile?.avatarUrl || this.auth.getCurrentUser()?.avatar || '';
  }

  getInitials(): string {
    const firstName = this.form.value.firstName || '';
    const lastName = this.form.value.lastName || '';
    return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
  }
}
