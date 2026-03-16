import { Component, Inject } from '@angular/core';
import { NgIcon, provideIcons } from '@ng-icons/core';
import { lucideX, lucideUserX, lucideShield, lucideAlertTriangle } from '@ng-icons/lucide';
import { BlockUserService } from '../../../core/services/block-user.service';
import { ToastService } from '../../../core/services/toast.service';

export interface BlockModalData {
  blockedUserId: string;
  blockedUserName: string;
}

@Component({
  selector: 'app-block-user-modal',
  standalone: true,
  imports: [NgIcon],
  providers: [provideIcons({ lucideX, lucideUserX, lucideShield, lucideAlertTriangle })],
  templateUrl: './block-user-modal.component.html',
  styleUrl: './block-user-modal.component.css',
})
export class BlockUserModalComponent {
  isBlocking = false;

  constructor(
    private blockService: BlockUserService,
    private toast: ToastService,
    @Inject('BLOCK_MODAL_DATA') public data: BlockModalData
  ) {}

  blockUser(): void {
    this.isBlocking = true;

    this.blockService.blockUser(this.data.blockedUserId).subscribe({
      next: () => {
        this.isBlocking = false;
        this.toast.success('User Blocked', `${this.data.blockedUserName} has been blocked. They won't be able to contact you.`);
        this.closeModal();
      },
      error: (error: unknown) => {
        this.isBlocking = false;
        console.error('Error blocking user:', error);
        const err = error as { error?: { message?: string } };
        if (err?.error?.message?.includes('already blocked')) {
          this.toast.error('Already Blocked', 'You have already blocked this user.');
        } else {
          this.toast.error('Error', 'Failed to block user. Please try again.');
        }
      },
    });
  }

  closeModal(): void {
    const modalElement = document.getElementById('block-modal-backdrop');
    if (modalElement) {
      modalElement.style.display = 'none';
      modalElement.remove();
    }
    document.body.style.overflow = '';
  }
}
