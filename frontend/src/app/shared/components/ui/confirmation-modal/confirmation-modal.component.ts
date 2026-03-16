import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DialogService } from '../../../../core/services/dialog.service';

@Component({
  selector: 'app-confirmation-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrls: ['./confirmation-modal.component.css']
})
export class ConfirmationModalComponent {
  constructor(protected dialogService: DialogService) {}

  protected onConfirm(): void {
    this.dialogService.close(true);
  }

  protected onCancel(): void {
    this.dialogService.close(false);
  }

  protected onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.onCancel();
    }
  }
}
