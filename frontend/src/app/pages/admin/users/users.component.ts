import { Component, OnInit, AfterViewInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { UsersService, UserProfile, UpdateUserDto } from '../../../core/services/users.service';
import { ToastService } from '../../../core/services/toast.service';
import { DialogService } from '../../../core/services/dialog.service';
import { AdminService } from '../../../core/services/admin.service';
import { UserCardComponent } from '../../../shared/components/ui/user-card/user-card.component';
import { UserModalComponent } from '../../../shared/components/ui/user-modal/user-modal.component';
import { AuthService } from '../../../core/auth/auth.service';
import AOS from 'aos';

@Component({
  selector: 'app-admin-users',
  standalone: true,
  imports: [CommonModule, UserCardComponent, UserModalComponent],
  templateUrl: './users.component.html',
  styleUrls: ['./users.component.css'],
})
export class AdminUsersComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly users = signal<UserProfile[]>([]);
  readonly loading = signal(false);
  readonly total = signal(0);
  readonly limit = signal(10);
  readonly offset = signal(0);
  readonly currentPage = signal(1);

  readonly totalPages = computed(() => Math.ceil(this.total() / this.limit()));
  readonly hasPrevious = computed(() => this.currentPage() > 1);
  readonly hasNext = computed(() => this.currentPage() < this.totalPages());

  readonly searchQuery = signal('');
  readonly roleFilter = signal<string>('ALL');
  readonly statusFilter = signal<string>('ALL');

  readonly filteredUsers = computed(() => {
    let result = this.users();

    // Search filter
    const query = this.searchQuery().toLowerCase().trim();
    if (query) {
      result = result.filter(
        (user) =>
          user.name.toLowerCase().includes(query) ||
          user.email.toLowerCase().includes(query)
      );
    }

    // Role filter
    const role = this.roleFilter();
    if (role !== 'ALL') {
      result = result.filter((user) => user.role === role);
    }

    // Status filter
    const status = this.statusFilter();
    if (status !== 'ALL') {
      const isActive = status === 'ACTIVE';
      result = result.filter((user) => user.isActive === isActive);
    }

    return result;
  });

  // Modal state
  readonly modalOpen = signal(false);
  readonly modalMode = signal<'view' | 'edit'>('view');
  readonly selectedUser = signal<UserProfile | null>(null);

  // Bulk selection state
  readonly selectedUserIds = signal<Set<string>>(new Set());
  readonly selectionCount = computed(() => this.selectedUserIds().size);
  readonly isAllSelected = computed(() => {
    const ids = this.selectedUserIds();
    const users = this.filteredUsers();
    return users.length > 0 && users.every(u => ids.has(u.id));
  });
  readonly isIndeterminate = computed(() => {
    const count = this.selectionCount();
    return count > 0 && count < this.filteredUsers().length;
  });

  constructor(
    private usersService: UsersService,
    private toastService: ToastService,
    private authService: AuthService,
    private dialogService: DialogService,
    private adminService: AdminService
  ) {}

  ngOnInit(): void {
    AOS.init({
      duration: 800,
      easing: 'ease-out-cubic',
      once: false,
      offset: 50,
    });
    this.loadUsers();
  }

  ngAfterViewInit(): void {
    AOS.refresh();
  }

  ngOnDestroy(): void {
    AOS.refresh();
  }

  loadUsers(): void {
    this.loading.set(true);
    this.usersService.getUsers(this.limit(), this.offset()).subscribe({
      next: (response) => {
        this.users.set(response.data);
        this.total.set(response.total);
        this.loading.set(false);
      },
      error: (error) => {
        this.loading.set(false);
        this.toastService.error('Error', 'Failed to load users. Please try again.');
        console.error('Error loading users:', error);
      },
    });
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) return;
    this.currentPage.set(page);
    this.offset.set((page - 1) * this.limit());
    this.loadUsers();
  }

  nextPage(): void {
    if (this.hasNext()) {
      this.goToPage(this.currentPage() + 1);
    }
  }

  prevPage(): void {
    if (this.hasPrevious()) {
      this.goToPage(this.currentPage() - 1);
    }
  }

  onSearchChange(event: Event): void {
    const target = event.target as HTMLInputElement;
    this.searchQuery.set(target.value);
  }

  onRoleFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.roleFilter.set(target.value);
  }

  onStatusFilterChange(event: Event): void {
    const target = event.target as HTMLSelectElement;
    this.statusFilter.set(target.value);
  }

  onViewUser(user: UserProfile): void {
    this.selectedUser.set(user);
    this.modalMode.set('view');
    this.modalOpen.set(true);
  }

  onEditUser(user: UserProfile): void {
    this.selectedUser.set(user);
    this.modalMode.set('edit');
    this.modalOpen.set(true);
  }

  async onDeleteUser(user: UserProfile): Promise<void> {
    const confirmed = await this.dialogService.confirm({
      title: 'Deactivate User',
      message: `Are you sure you want to deactivate ${user.name}?`,
      confirmText: 'Deactivate',
      type: 'danger'
    });

    if (confirmed) {
      this.usersService.deleteUser(user.id).subscribe({
        next: () => {
          this.toastService.success('Success', 'User deactivated successfully');
          this.loadUsers();
        },
        error: (error) => {
          this.toastService.error('Error', 'Failed to delete user. Please try again.');
          console.error('Error deleting user:', error);
        },
      });
    }
  }

  async onSuspendUser(user: UserProfile): Promise<void> {
    const action = user.isActive ? 'suspend' : 'activate';
    const confirmed = await this.dialogService.confirm({
      title: `${action.charAt(0).toUpperCase() + action.slice(1)} User`,
      message: `Are you sure you want to ${action} ${user.name}?`,
      confirmText: action.charAt(0).toUpperCase() + action.slice(1),
      type: user.isActive ? 'danger' : 'info'
    });

    if (confirmed) {
      this.usersService.suspendUser(user.id, !user.isActive).subscribe({
        next: () => {
          this.toastService.success('Success', `User ${action}ed successfully`);
          this.loadUsers();
        },
        error: (error) => {
          this.toastService.error('Error', `Failed to ${action} user. Please try again.`);
          console.error('Error suspending user:', error);
        },
      });
    }
  }

  async onChangeRole(user: UserProfile, event: Event): Promise<void> {
    const select = event.target as HTMLSelectElement;
    const newRole = select.value;
    if (user.role === newRole) return;
    
    const confirmed = await this.dialogService.confirm({
      title: 'Change User Role',
      message: `Are you sure you want to change ${user.name}'s role to ${newRole}?`,
      confirmText: 'Change Role',
      type: 'warning'
    });

    if (confirmed) {
      this.usersService.updateUserRole(user.id, newRole).subscribe({
        next: () => {
          this.toastService.success('Success', `User role updated to ${newRole}`);
          this.loadUsers();
        },
        error: (error) => {
          this.toastService.error('Error', 'Failed to update user role. Please try again.');
          console.error('Error updating user role:', error);
          select.value = user.role; // Reset back on error
        },
      });
    } else {
      select.value = user.role; // Reset if cancelled
    }
  }

  toggleSelection(id: string): void {
    const current = new Set(this.selectedUserIds());
    if (current.has(id)) {
      current.delete(id);
    } else {
      current.add(id);
    }
    this.selectedUserIds.set(current);
  }

  toggleSelectAll(): void {
    if (this.isAllSelected()) {
      this.selectedUserIds.set(new Set());
    } else {
      this.selectedUserIds.set(new Set(this.filteredUsers().map(u => u.id)));
    }
  }

  clearSelection(): void {
    this.selectedUserIds.set(new Set());
  }

  async bulkDeactivate(): Promise<void> {
    const ids = [...this.selectedUserIds()];
    const confirmed = await this.dialogService.confirm({
      title: 'Deactivate Users',
      message: `Are you sure you want to deactivate ${ids.length} selected user${ids.length !== 1 ? 's' : ''}?`,
      confirmText: 'Deactivate',
      type: 'danger'
    });

    if (!confirmed) return;

    let successCount = 0;
    let errorCount = 0;
    const total = ids.length;

    const processNext = (index: number) => {
      if (index >= total) {
        if (successCount > 0) {
          this.toastService.success('Success', `${successCount} user${successCount !== 1 ? 's' : ''} deactivated`);
          this.clearSelection();
          this.loadUsers();
        }
        if (errorCount > 0) {
          this.toastService.error('Error', `Failed to deactivate ${errorCount} user${errorCount !== 1 ? 's' : ''}`);
        }
        return;
      }
      this.usersService.deleteUser(ids[index]).subscribe({
        next: () => { successCount++; processNext(index + 1); },
        error: () => { errorCount++; processNext(index + 1); }
      });
    };

    processNext(0);
  }

  async bulkDelete(): Promise<void> {
    const ids = [...this.selectedUserIds()];
    const confirmed = await this.dialogService.confirm({
      title: 'Delete Users',
      message: `Are you sure you want to permanently delete ${ids.length} selected user${ids.length !== 1 ? 's' : ''}? This cannot be undone.`,
      confirmText: 'Delete',
      type: 'danger'
    });

    if (!confirmed) return;

    let successCount = 0;
    let errorCount = 0;
    const total = ids.length;

    const processNext = (index: number) => {
      if (index >= total) {
        if (successCount > 0) {
          this.toastService.success('Success', `${successCount} user${successCount !== 1 ? 's' : ''} deleted`);
          this.clearSelection();
          this.loadUsers();
        }
        if (errorCount > 0) {
          this.toastService.error('Error', `Failed to delete ${errorCount} user${errorCount !== 1 ? 's' : ''}`);
        }
        return;
      }
      this.usersService.deleteUser(ids[index]).subscribe({
        next: () => { successCount++; processNext(index + 1); },
        error: () => { errorCount++; processNext(index + 1); }
      });
    };

    processNext(0);
  }

  closeModal(): void {
    this.modalOpen.set(false);
    this.selectedUser.set(null);
  }

  onSaveUser(data: { name: string; avatarUrl: string }): void {
    const user = this.selectedUser();
    if (!user) return;

    const updateDto: UpdateUserDto = {
      name: data.name,
      ...(data.avatarUrl && { avatarUrl: data.avatarUrl }),
    };

    this.usersService.updateProfile(user.id, updateDto).subscribe({
      next: (updatedUser) => {
        this.toastService.success('Success', 'User updated successfully');
        
        // Update user in list
        const currentUsers = this.users();
        const updatedUsers = currentUsers.map(u => 
          u.id === user.id ? { ...u, ...updatedUser } : u
        );
        this.users.set(updatedUsers);
        
        // Update current user in storage if it's the logged-in user
        const currentUser = this.authService.getCurrentUser();
        if (currentUser && currentUser.id === user.id) {
          this.authService.updateProfileInStorage({
            name: updatedUser.name,
            avatarUrl: updatedUser.avatarUrl,
          });
        }
        
        this.closeModal();
      },
      error: (error) => {
        this.toastService.error('Error', 'Failed to update user. Please try again.');
        console.error('Error updating user:', error);
      },
    });
  }

  refresh(): void {
    this.loadUsers();
    this.toastService.success('Success', 'Users list refreshed');
  }

  exportUsers(format: 'csv' | 'pdf'): void {
    this.toastService.info('Exporting...', `Generating ${format.toUpperCase()} report...`);
    
    const role = this.roleFilter() === 'ALL' ? undefined : this.roleFilter();
    const obs = format === 'csv' 
      ? this.adminService.exportUsers(role)
      : this.adminService.exportUsersPdf(role);

    obs.subscribe({
      next: (blob) => {
        const date = new Date().toISOString().split('T')[0];
        this.adminService.downloadFile(blob, `users-export-${date}.${format}`);
        this.toastService.success('Success', 'Export completed successfully');
      },
      error: (error) => {
        this.toastService.error('Error', 'Failed to export users');
        console.error('Export error:', error);
      }
    });
  }

  getNewUsersThisWeek(): number {
    const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    return this.users().filter(u => u.createdAt && new Date(u.createdAt).getTime() > oneWeekAgo).length;
  }

  clearFilters(): void {
    this.searchQuery.set('');
    this.roleFilter.set('ALL');
    this.statusFilter.set('ALL');
  }

  clearSearch(): void {
    this.searchQuery.set('');
  }

  clearRoleFilter(): void {
    this.roleFilter.set('ALL');
  }

  clearStatusFilter(): void {
    this.statusFilter.set('ALL');
  }

  /** Pagination "to" value (min of offset+limit and total) for template. */
  readonly paginationTo = computed(() =>
    Math.min(this.offset() + this.limit(), this.total())
  );
}
