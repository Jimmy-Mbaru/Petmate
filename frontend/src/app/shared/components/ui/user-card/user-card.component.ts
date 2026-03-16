import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AvatarComponent } from '../avatar/avatar.component';
import { UserProfile } from '../../../../core/services/users.service';

@Component({
  selector: 'app-user-card',
  standalone: true,
  imports: [CommonModule, AvatarComponent],
  templateUrl: './user-card.component.html',
  styleUrls: ['./user-card.component.css'],
})
export class UserCardComponent {
  @Input() user: UserProfile | null = null;
  @Input() showActions: boolean = false;
  @Input() isAdminView: boolean = false;

  @Output() viewUser = new EventEmitter<UserProfile>();
  @Output() editUser = new EventEmitter<UserProfile>();
  @Output() deleteUser = new EventEmitter<UserProfile>();
  @Output() suspendUser = new EventEmitter<UserProfile>();
  @Output() changeRole = new EventEmitter<{user: UserProfile, event: Event}>();

  protected getRoleBadgeClass(role: string | null): string {
    if (!role) return 'bg-gray-100 text-gray-700';
    const roleClasses: Record<string, string> = {
      ADMIN: 'bg-(--color-black) text-white',
      OWNER: 'bg-(--color-orange-soft) text-(--color-orange)',
      PET_SITTER: 'bg-blue-100 text-blue-700',
      VET: 'bg-green-100 text-green-700',
    };
    return roleClasses[role] || 'bg-gray-100 text-gray-700';
  }

  protected getStatusBadgeClass(isActive: boolean | null): string {
    if (isActive === null || isActive === undefined) return 'bg-gray-100 text-gray-700';
    return isActive
      ? 'bg-green-100 text-green-700'
      : 'bg-red-100 text-red-700';
  }

  protected formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  protected onView(): void {
    if (this.user) this.viewUser.emit(this.user);
  }

  protected onEdit(): void {
    if (this.user) this.editUser.emit(this.user);
  }

  protected onDelete(): void {
    if (this.user) this.deleteUser.emit(this.user);
  }

  protected onSuspend(): void {
    if (this.user) this.suspendUser.emit(this.user);
  }

  protected onChangeRole(event: Event): void {
    if (this.user) this.changeRole.emit({ user: this.user, event });
  }
}
