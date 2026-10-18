import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pagination.component.html',
  styleUrls: ['./pagination.component.css'],
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
