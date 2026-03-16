import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { Subscription } from 'rxjs';
import {
  lucideMail,
  lucideMessageCircle,
  lucideUser,
  lucideFlag,
  lucideShieldAlert,
  lucideShieldOff,
} from '@ng-icons/lucide';
import {
  UsersService,
  type UserProfile,
} from '../../../core/services/users.service';
import { ToastService } from '../../../core/services/toast.service';
import { AuthService } from '../../../core/auth/auth.service';
import { BlockUserService } from '../../../core/services/block-user.service';
import { DialogService } from '../../../core/services/dialog.service';
import { ReportUserModalComponent, type ReportModalData } from '../../../shared/components/report-user-modal/report-user-modal.component';

@Component({
  selector: 'app-user-profile',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon, ReportUserModalComponent],
  providers: [
    provideIcons({
      lucideUser,
      lucideMail,
      lucideMessageCircle,
      lucideFlag,
      lucideShieldAlert,
      lucideShieldOff,
    }),
  ],
  templateUrl: './user-profile.component.html',
  styleUrl: './user-profile.component.css',
})
export class UserProfileComponent implements OnInit, OnDestroy {
  profile: UserProfile | null = null;
  isLoading = false;
  isSelf = false;
  isBlocked = false;
  showReportModal = false;
  private paramsSub?: Subscription;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly usersService: UsersService,
    private readonly blockUserService: BlockUserService,
    private readonly toast: ToastService,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly dialogService: DialogService,
  ) {}

  ngOnInit(): void {
    this.paramsSub = this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (!id) {
        this.toast.error('Error', 'User not found');
        this.router.navigate(['/404']);
        return;
      }

      const current = this.auth.getCurrentUser();
      this.isSelf = !!current && current.id === id;

      this.loadProfile(id);
      this.checkIfBlocked(id);
    });
  }

  ngOnDestroy(): void {
    if (this.paramsSub) {
      this.paramsSub.unsubscribe();
    }
  }

  loadProfile(id: string): void {
    this.isLoading = true;
    this.usersService.getProfile(id).subscribe({
      next: (profile) => {
        this.profile = profile;
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
        this.toast.error('Error', 'Failed to load profile');
        this.router.navigate(['/404']);
      },
    });
  }

  checkIfBlocked(id: string): void {
    if (this.isSelf) return;
    this.blockUserService.getBlockedUsers().subscribe({
      next: (blockedUsers) => {
        this.isBlocked = blockedUsers.some(u => u.blockedId === id);
      },
      error: () => {}
    });
  }

  async blockUser(): Promise<void> {
    if (!this.profile || this.isSelf) return;
    
    if (this.isBlocked) {
      this.blockUserService.unblockUser(this.profile.id).subscribe({
        next: () => {
          this.isBlocked = false;
          this.toast.success('Unblocked', `You have unblocked ${this.profile?.name}`);
        },
        error: () => this.toast.error('Error', 'Failed to unblock user')
      });
    } else {
      const confirmed = await this.dialogService.confirm({
        title: 'Block User',
        message: `Are you sure you want to block ${this.profile.name}? You won't see their messages or bookings.`,
        confirmText: 'Block User',
        type: 'danger'
      });

      if (confirmed) {
        this.blockUserService.blockUser(this.profile.id).subscribe({
          next: () => {
            this.isBlocked = true;
            this.toast.success('Blocked', `You have blocked ${this.profile?.name}`);
          },
          error: () => this.toast.error('Error', 'Failed to block user')
        });
      }
    }
  }

  getInitials(): string {
    if (!this.profile?.name) return '';
    const parts = this.profile.name.trim().split(/\s+/);
    const first = parts[0]?.[0] ?? '';
    const second = parts[1]?.[0] ?? '';
    return (first + second).toUpperCase();
  }

  getFormattedRole(): string {
    if (!this.profile?.role) return '';
    return this.profile.role.charAt(0) + this.profile.role.slice(1).toLowerCase();
  }

  getMemberSince(): string {
    if (!this.profile?.createdAt) return '';
    const date = new Date(this.profile.createdAt);
    return date.toLocaleDateString([], {
      year: 'numeric',
      month: 'short',
    });
  }

  messageUser(): void {
    if (!this.profile) return;

    const current = this.auth.getCurrentUser();
    if (!current) {
      this.toast.error('Login required', 'Please log in to send messages');
      this.router.navigate(['/auth/login']);
      return;
    }

    if (current.id === this.profile.id) {
      this.toast.info('Info', 'This is your own profile');
      return;
    }

    const basePath =
      current.role === 'HOST'
        ? ['/app/host/chat']
        : ['/app/chat'];

    this.router.navigate(basePath, {
      queryParams: {
        userId: this.profile.id,
        userName: this.profile.name,
      },
    });
  }

  openReportModal(): void {
    if (!this.profile) return;

    const current = this.auth.getCurrentUser();
    if (!current) {
      this.toast.error('Login required', 'Please log in to report users');
      this.router.navigate(['/auth/login']);
      return;
    }

    if (current.id === this.profile.id) {
      this.toast.info('Info', 'You cannot report your own profile');
      return;
    }

    this.showReportModal = true;
  }

  closeReportModal(): void {
    this.showReportModal = false;
  }

  getReportModalData(): ReportModalData | null {
    if (!this.profile) return null;
    return {
      reportedUserId: this.profile.id,
      reportedUserName: this.profile.name,
    };
  }
}

