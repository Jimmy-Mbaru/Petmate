import { Component, OnInit, signal, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideUser, lucideBell, lucideShield, lucideShieldOff, lucideTrash2 } from '@ng-icons/lucide';
import { BlockUserService, type BlockedUser } from '../../core/services/block-user.service';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-owner-settings',
  standalone: true,
  imports: [CommonModule, RouterLink, NgIcon],
  providers: [provideIcons({ lucideUser, lucideBell, lucideShield, lucideShieldOff, lucideTrash2 })],
  templateUrl: './owner-settings.component.html',
  styleUrl: './owner-settings.component.css',
})
export class OwnerSettingsComponent implements OnInit {
  blockedUsers = signal<BlockedUser[]>([]);
  isLoading = signal(false);

  constructor(
    @Inject(BlockUserService) private blockUserService: BlockUserService,
    private toast: ToastService
  ) {}

  ngOnInit(): void {
    this.loadBlockedUsers();
  }

  loadBlockedUsers(): void {
    this.isLoading.set(true);
    this.blockUserService.getBlockedUsers().subscribe({
      next: (users) => {
        this.blockedUsers.set(users);
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
        this.toast.error('Error', 'Failed to load blocked users');
      }
    });
  }

  unblockUser(userId: string): void {
    this.blockUserService.unblockUser(userId).subscribe({
      next: () => {
        this.toast.success('Success', 'User unblocked');
        this.loadBlockedUsers();
      },
      error: () => this.toast.error('Error', 'Failed to unblock user')
    });
  }
}
