import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-modal-alert',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div
      *ngIf="mensaje"
      class="modal-alert-banner"
      [ngClass]="'modal-alert-' + tipo"
      role="alert"
    >
      <div class="alert-content">
        <i class="bi alert-icon" [ngClass]="icono"></i>
        <div class="alert-text">{{ mensaje }}</div>
      </div>

      <button
        *ngIf="dismissible"
        type="button"
        class="alert-close-btn"
        (click)="cerrarAlerta()"
        title="Cerrar notificación"
      >
        <i class="bi bi-x-lg"></i>
      </button>
    </div>
  `,
  styles: [
    `
      .modal-alert-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 0.75rem;
        padding: 0.75rem 1rem;
        border-radius: var(--citef-radius-sm, 6px);
        font-size: 0.84rem;
        margin-bottom: 1.25rem;
        animation: alertFadeIn 0.2s ease-in-out;
      }

      @keyframes alertFadeIn {
        from {
          opacity: 0;
          transform: translateY(-4px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }

      .alert-content {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        line-height: 1.4;
      }

      .alert-icon {
        font-size: 1.05rem;
        flex-shrink: 0;
      }

      .alert-text {
        font-weight: 500;
      }

      .alert-close-btn {
        background: transparent;
        border: none;
        cursor: pointer;
        padding: 0.2rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        opacity: 0.7;
        transition: opacity 0.15s ease-in-out;
        color: inherit;
      }

      .alert-close-btn:hover {
        opacity: 1;
      }

      /* Tipos de alertas institucionales */
      .modal-alert-danger {
        background-color: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
      }

      .modal-alert-warning {
        background-color: #fffbeb;
        color: #d97706;
        border: 1px solid #fde68a;
      }

      .modal-alert-success {
        background-color: #f0fdf4;
        color: #16a34a;
        border: 1px solid #bbf7d0;
      }

      .modal-alert-info {
        background-color: #eff6ff;
        color: #2563eb;
        border: 1px solid #bfdbfe;
      }
    `,
  ],
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
