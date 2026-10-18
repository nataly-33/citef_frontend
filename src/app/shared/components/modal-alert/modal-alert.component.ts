import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-alert',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './modal-alert.component.html',
  styleUrls: ['./modal-alert.component.css'],
})
export class ModalAlertComponent {
  @Input() mensaje: string | null = null;
  @Input() tipo: 'danger' | 'warning' | 'info' | 'success' = 'danger';
  @Input() dismissible = true;

  @Output() cerrar = new EventEmitter<void>();

  get icono(): string {
    switch (this.tipo) {
      case 'danger':
        return 'bi-exclamation-triangle-fill';
      case 'warning':
        return 'bi-exclamation-circle-fill';
      case 'success':
        return 'bi-check-circle-fill';
      case 'info':
        return 'bi-info-circle-fill';
      default:
        return 'bi-info-circle-fill';
    }
  }

  cerrarAlerta(): void {
    this.cerrar.emit();
  }
}
