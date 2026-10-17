import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-confirm-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="visible" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <div class="modal-icon" [class.danger]="isDanger" [class.primary]="!isDanger">
            <i class="bi" [class.bi-exclamation-triangle-fill]="isDanger" [class.bi-info-circle-fill]="!isDanger"></i>
          </div>
          <div>
            <h4 class="modal-title">{{ title }}</h4>
            <p class="modal-message">{{ message }}</p>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="citef-btn citef-btn-outline" (click)="cancel()">
            {{ cancelBtnText }}
          </button>
          <button
            type="button"
            class="citef-btn"
            [class.citef-btn-danger]="isDanger"
            [class.citef-btn-primary]="!isDanger"
            (click)="confirm()"
          >
            <i class="bi" [class.bi-trash3]="isDanger" [class.bi-check2]="!isDanger"></i>
            <span>{{ confirmBtnText }}</span>
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 3000;
        padding: 1rem;
      }

      .modal-card {
        width: 100%;
        max-width: 440px;
        background: #ffffff;
        border-radius: var(--citef-radius-lg, 12px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 8px 10px -6px rgba(0, 0, 0, 0.15);
        padding: 1.75rem;
        animation: fadeInScale 0.2s cubic-bezier(0.16, 1, 0.3, 1);
      }

      @keyframes fadeInScale {
        from {
          opacity: 0;
          transform: scale(0.95);
        }
        to {
          opacity: 1;
          transform: scale(1);
        }
      }

      .modal-header {
        display: flex;
        align-items: flex-start;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .modal-icon {
        width: 44px;
        height: 44px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.35rem;
        flex-shrink: 0;
      }

      .modal-icon.danger {
        background-color: #fee2e2;
        color: var(--citef-danger, #ef4444);
      }

      .modal-icon.primary {
        background-color: #e0edff;
        color: var(--citef-primary, #002855);
      }

      .modal-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--citef-text-primary, #1e293b);
        margin: 0 0 0.35rem 0;
      }

      .modal-message {
        font-size: 0.875rem;
        color: var(--citef-text-secondary, #64748b);
        margin: 0;
        line-height: 1.45;
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
      }
    `,
  ],
})
export class ConfirmModalComponent {
  @Input() visible = false;
  @Input() title = 'Confirmar Acción';
  @Input() message = '¿Está seguro de continuar con esta operación?';
  @Input() confirmBtnText = 'Confirmar';
  @Input() cancelBtnText = 'Cancelar';
  @Input() isDanger = true;

  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  confirm() {
    this.confirmed.emit();
  }

  cancel() {
    this.cancelled.emit();
  }
}
