import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminService } from '../../../core/services/admin.service';
import { BoardingProfile } from '../../../core/services/boarding.service';
import { ToastService } from '../../../core/services/toast.service';
import { DialogService } from '../../../core/services/dialog.service';
import AOS from 'aos';

@Component({
  selector: 'app-admin-boarding',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './boarding.component.html',
  styleUrls: ['./boarding.component.css']
})
export class AdminBoardingComponent implements OnInit {
  readonly profiles = signal<BoardingProfile[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly limit = signal(10);
  readonly offset = signal(0);
  readonly currentPage = signal(1);

  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit()));

  constructor(
    private adminService: AdminService,
    private toastService: ToastService,
    private dialogService: DialogService
  ) {}

  ngOnInit(): void {
    AOS.init({ duration: 800, once: false });
    this.loadPendingProfiles();
  }

  loadPendingProfiles(): void {
    this.loading.set(true);
    this.adminService.getPendingBoarding(this.limit(), this.offset()).subscribe({
      next: (res) => {
        this.profiles.set(res.data);
        this.total.set(res.total);
        this.loading.set(false);
      },
      error: (err) => {
        this.loading.set(false);
        this.toastService.error('Error', 'Failed to load pending profiles');
        console.error(err);
      }
    });
  }

  async approveProfile(id: string): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Approve Profile',
      message: 'Are you sure you want to approve this profile?',
      confirmText: 'Approve',
      type: 'info'
    });

    if (confirmed) {
      this.adminService.approveBoardingProfile(id, true).subscribe({
        next: () => {
          this.toastService.success('Approved', 'Boarding profile approved successfully');
          this.loadPendingProfiles();
        },
        error: (err) => {
          this.toastService.error('Error', 'Failed to approve profile');
          console.error(err);
        }
      });
    }
  }

  async rejectProfile(id: string): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Reject Profile',
      message: 'Are you sure you want to reject and delete this profile? This cannot be undone.',
      confirmText: 'Reject & Delete',
      type: 'danger'
    });

    if (confirmed) {
      this.adminService.approveBoardingProfile(id, false).subscribe({
        next: () => {
          this.toastService.success('Rejected', 'Boarding profile rejected and deleted');
          this.loadPendingProfiles();
        },
        error: (err) => {
          this.toastService.error('Error', 'Failed to reject profile');
          console.error(err);
        }
      });
    }
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.offset.set((page - 1) * this.limit());
    this.loadPendingProfiles();
  }

  readonly getHostInitials = (profile: BoardingProfile): string => {
    const host: BoardingProfile['host'] | undefined = (profile as BoardingProfile & { host?: BoardingProfile['host'] }).host;
    if (host?.name) {
      const parts = host.name.trim().split(/\s+/);
      const first = parts[0]?.[0] ?? '';
      const second = parts[1]?.[0] ?? '';
      return (first + second).toUpperCase();
    }
    return profile.hostId.substring(0, 2).toUpperCase();
  };
}
