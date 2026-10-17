import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="citef-pagination-bar" *ngIf="totalRegistros > 0">
      <div class="pagination-info">
        <span>Mostrando</span>
        <strong class="info-number">{{ inicioRegistro }}–{{ finRegistro }}</strong>
        <span>de</span>
        <strong class="info-number">{{ totalRegistros }}</strong>
        <span>{{ etiqueta }}</span>
      </div>

      <div class="pagination-controls">
        <button
          type="button"
          class="citef-btn citef-btn-outline citef-btn-xs btn-nav"
          [disabled]="paginaActual <= 1"
          (click)="irAPagina(paginaActual - 1)"
          title="Página anterior"
        >
          <i class="bi bi-chevron-left"></i>
          <span>Anterior</span>
        </button>

        <div class="page-numbers" *ngIf="totalPaginas > 1">
          <ng-container *ngFor="let item of paginasVisibles">
            <span *ngIf="item === -1" class="page-ellipsis">…</span>
            <button
              *ngIf="item !== -1"
              type="button"
              class="page-num-btn"
              [class.active]="item === paginaActual"
              (click)="irAPagina(item)"
            >
              {{ item }}
            </button>
          </ng-container>
        </div>

        <span class="page-indicator" *ngIf="totalPaginas <= 1">
          Pág. 1 de 1
        </span>

        <button
          type="button"
          class="citef-btn citef-btn-outline citef-btn-xs btn-nav"
          [disabled]="paginaActual >= totalPaginas"
          (click)="irAPagina(paginaActual + 1)"
          title="Página siguiente"
        >
          <span>Siguiente</span>
          <i class="bi bi-chevron-right"></i>
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .citef-pagination-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.85rem 1.25rem;
        border-top: 1px solid var(--citef-border, #e2e8f0);
        background: #f8fafc;
        border-bottom-left-radius: var(--citef-radius-md, 8px);
        border-bottom-right-radius: var(--citef-radius-md, 8px);
        gap: 1rem;
        flex-wrap: wrap;
      }

      .pagination-info {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        font-size: 0.8125rem;
        color: var(--citef-text-secondary, #64748b);
      }

      .info-number {
        font-weight: 700;
        color: var(--citef-text-primary, #0f172a);
      }

      .pagination-controls {
        display: inline-flex;
        align-items: center;
        gap: 0.5rem;
        margin-left: auto; /* Posiciona firmemente hacia la derecha */
      }

      .btn-nav {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        padding: 0.35rem 0.65rem;
        font-size: 0.775rem;
        font-weight: 600;
        border-radius: var(--citef-radius-sm, 6px);
        border: 1px solid var(--citef-border, #cbd5e1);
        background: #ffffff;
        color: var(--citef-text-primary, #1e293b);
        cursor: pointer;
        transition: all 0.15s ease-in-out;
      }

      .btn-nav:hover:not(:disabled) {
        background: #f1f5f9;
        border-color: var(--citef-primary, #002855);
        color: var(--citef-primary, #002855);
      }

      .btn-nav:disabled {
        opacity: 0.45;
        cursor: not-allowed;
        background: #f8fafc;
        border-color: #e2e8f0;
      }

      .page-numbers {
        display: inline-flex;
        align-items: center;
        gap: 0.25rem;
      }

      .page-num-btn {
        min-width: 28px;
        height: 28px;
        padding: 0 0.35rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.775rem;
        font-weight: 600;
        border-radius: var(--citef-radius-sm, 6px);
        border: 1px solid transparent;
        background: transparent;
        color: var(--citef-text-secondary, #475569);
        cursor: pointer;
        transition: all 0.15s ease-in-out;
      }

      .page-num-btn:hover:not(.active) {
        background: #e2e8f0;
        color: var(--citef-text-primary, #0f172a);
      }

      .page-num-btn.active {
        background: var(--citef-primary, #002855);
        color: #ffffff;
        border-color: var(--citef-primary, #002855);
        font-weight: 700;
        box-shadow: 0 1px 2px rgba(0, 40, 85, 0.2);
      }

      .page-ellipsis {
        font-size: 0.8rem;
        color: #94a3b8;
        padding: 0 0.2rem;
      }

      .page-indicator {
        font-size: 0.775rem;
        font-weight: 600;
        color: var(--citef-text-secondary, #64748b);
        padding: 0 0.5rem;
      }
    `,
  ],
})
export class PaginationComponent {
  @Input() paginaActual = 1;
  @Input() totalRegistros = 0;
  @Input() tamanoPagina = 15;
  @Input() etiqueta = 'registros';

  @Output() paginaCambiada = new EventEmitter<number>();

  get totalPaginas(): number {
    return Math.ceil(this.totalRegistros / this.tamanoPagina) || 1;
  }

  get inicioRegistro(): number {
    if (this.totalRegistros === 0) return 0;
    return (this.paginaActual - 1) * this.tamanoPagina + 1;
  }

  get finRegistro(): number {
    return Math.min(this.paginaActual * this.tamanoPagina, this.totalRegistros);
  }

  get paginasVisibles(): number[] {
    const total = this.totalPaginas;
    const actual = this.paginaActual;
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }

    const pages: number[] = [];
    pages.push(1);

    if (actual > 3) {
      pages.push(-1); // ellipsis
    }

    const start = Math.max(2, actual - 1);
    const end = Math.min(total - 1, actual + 1);

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    if (actual < total - 2) {
      pages.push(-1); // ellipsis
    }

    pages.push(total);
    return pages;
  }

  irAPagina(p: number): void {
    if (p >= 1 && p <= this.totalPaginas && p !== this.paginaActual) {
      this.paginaCambiada.emit(p);
    }
  }
}
