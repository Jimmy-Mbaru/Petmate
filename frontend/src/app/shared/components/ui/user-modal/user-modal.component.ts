import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserProfile } from '../../../../core/services/users.service';
import { AvatarComponent } from '../avatar/avatar.component';

@Component({
  selector: 'app-user-modal',
  standalone: true,
  imports: [CommonModule, FormsModule, AvatarComponent],
  templateUrl: './user-modal.component.html',
  styleUrls: ['./user-modal.component.css'],
})
export class UserModalComponent {
  @Input() user: UserProfile | null = null;
  @Input() mode: 'view' | 'edit' = 'view';
  @Input() isOpen = false;

  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<{ name: string; avatarUrl: string }>();

  editedName = '';
  editedAvatarUrl = '';

  ngOnChanges(): void {
    if (this.user) {
      this.editedName = this.user.name || '';
      this.editedAvatarUrl = this.user.avatarUrl || '';
    }
  }

  protected onClose(): void {
    this.close.emit();
  }

  protected onSave(): void {
    this.save.emit({
      name: this.editedName,
      avatarUrl: this.editedAvatarUrl,
    });
  }

  protected onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onClose();
    }
  }
}
