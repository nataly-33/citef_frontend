import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AuditoriaService,
  BitacoraItem,
} from '../../core/services/auditoria.service';
import {
  PaginationComponent,
  TableCardComponent,
} from '../../shared/components';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, TableCardComponent],
  templateUrl: './auditoria.component.html',
  styleUrls: ['./auditoria.component.css'],
})
export class AuditoriaComponent implements OnInit {
  listaAuditoria = signal<BitacoraItem[]>([]);
  totalRegistros = signal<number>(0);
  totalPaginas = signal<number>(1);
  paginaActual = signal<number>(1);
  tamanoPagina = 15;

  // Filtros
  filtroTabla = '';
  filtroAccion = '';
  filtroCorreo = '';

  // Ordenamiento
  columnaOrden = signal<string>('fecha_hora');
  direccionOrden = signal<'asc' | 'desc'>('desc');

  // Modal Detalle
  itemSeleccionado = signal<BitacoraItem | null>(null);

  inicioRegistro = computed(() => {
    if (this.totalRegistros() === 0) return 0;
    return (this.paginaActual() - 1) * this.tamanoPagina + 1;
  });

  finRegistro = computed(() => {
    return Math.min(
      this.paginaActual() * this.tamanoPagina,
      this.totalRegistros(),
    );
  });

  constructor(private auditoriaService: AuditoriaService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    this.auditoriaService
      .getBitacora({
        tabla: this.filtroTabla || undefined,
        accion: this.filtroAccion || undefined,
        correo: this.filtroCorreo ? this.filtroCorreo.trim() : undefined,
        pagina: this.paginaActual(),
        limite: this.tamanoPagina,
        ordenColumna: this.columnaOrden(),
        ordenDireccion: this.direccionOrden(),
      })
      .subscribe({
        next: (res) => {
          this.listaAuditoria.set(res.items);
          this.totalRegistros.set(res.total);
          this.totalPaginas.set(res.paginas_totales || 1);
        },
      });
  }

  aplicarFiltros() {
    this.paginaActual.set(1);
    this.cargarDatos();
  }

  limpiarFiltros() {
    this.filtroTabla = '';
    this.filtroAccion = '';
    this.filtroCorreo = '';
    this.paginaActual.set(1);
    this.cargarDatos();
  }

  cambiarPagina(nueva: number) {
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
      this.cargarDatos();
    }
  }

  ordenarPor(columna: string) {
    if (this.columnaOrden() === columna) {
      this.direccionOrden.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.columnaOrden.set(columna);
      this.direccionOrden.set('desc');
    }
    this.cargarDatos();
  }

  iconoOrden(columna: string): string {
    if (this.columnaOrden() !== columna) {
      return 'bi-arrow-down-up text-muted';
    }
    return this.direccionOrden() === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  iconoAccion(accion: string): string {
    if (accion === 'LOGIN') return 'bi-box-arrow-in-right';
    if (accion === 'INSERT') return 'bi-plus-circle-fill';
    if (accion === 'UPDATE') return 'bi-pencil-fill';
    if (accion === 'RESET_PASSWORD' || accion.includes('PASSWORD')) return 'bi-key-fill';
    if (accion === 'CAMBIO_ESTADO') return 'bi-toggle-on';
    return 'bi-activity';
  }

  abrirDetalle(item: BitacoraItem) {
    this.itemSeleccionado.set(item);
  }
}
