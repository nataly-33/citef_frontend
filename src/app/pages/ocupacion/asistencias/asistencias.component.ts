import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  OcupacionService,
  AsistenciaItem,
  FiltroAsistenciasDto,
} from '../../../core/services/ocupacion.service';
import { InfraestructuraService, SalaItem } from '../../../core/services/infraestructura.service';
import { CatalogosService } from '../../../core/services/catalogos.service';
import { TableCardComponent } from '../../../shared/components/table-card/table-card.component';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ModalAlertComponent } from '../../../shared/components/modal-alert/modal-alert.component';

@Component({
  selector: 'app-asistencias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableCardComponent,
    PaginationComponent,
    ModalAlertComponent,
  ],
  templateUrl: './asistencias.component.html',
  styleUrl: './asistencias.component.css',
})
export class AsistenciasComponent implements OnInit {
  asistencias = signal<AsistenciaItem[]>([]);
  total = signal<number>(0);
  page = signal<number>(1);
  limit = signal<number>(15);
  totalPages = signal<number>(1);
  cargando = signal<boolean>(false);
  errorGeneral = signal<string | null>(null);

  // Filtros reactivos
  filtroSala = signal<number | undefined>(undefined);
  filtroCarrera = signal<number | undefined>(undefined);
  filtroMotivo = signal<number | undefined>(undefined);
  filtroEstado = signal<string | undefined>(undefined);
  filtroFechaInicio = signal<string>('');
  filtroFechaFin = signal<string>('');
  filtroTermino = signal<string>('');

  // Catálogos
  salas = signal<SalaItem[]>([]);
  carreras = signal<{ id_carrera: number; nombre: string; codigo: string }[]>([]);
  motivos = signal<{ id_motivo: number; descrip: string; tipo: string }[]>([]);

  // Modal detalle
  sesionSeleccionada = signal<AsistenciaItem | null>(null);
  modalDetalleVisible = signal<boolean>(false);

  constructor(
    private ocupacionService: OcupacionService,
    private infraestructuraService: InfraestructuraService,
    private catalogosService: CatalogosService,
  ) {}

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarAsistencias();
  }

  cargarCatalogos() {
    this.infraestructuraService.getSalas().subscribe({
      next: (salas) => this.salas.set(salas),
    });

    this.catalogosService.getCarreras({ activo: true }).subscribe({
      next: (res) => this.carreras.set(res?.items || []),
    });

    this.catalogosService.getMotivos({ activo: true }).subscribe({
      next: (res) => this.motivos.set(res?.items || []),
    });
  }

  cargarAsistencias(nuevaPagina: number = 1) {
    this.cargando.set(true);
    this.errorGeneral.set(null);
    this.page.set(nuevaPagina);

    const filtro: FiltroAsistenciasDto = {
      page: this.page(),
      limit: this.limit(),
      id_sala: this.filtroSala() ? Number(this.filtroSala()) : undefined,
      id_carrera: this.filtroCarrera() ? Number(this.filtroCarrera()) : undefined,
      id_motivo: this.filtroMotivo() ? Number(this.filtroMotivo()) : undefined,
      estado: this.filtroEstado() || undefined,
      fecha_inicio: this.filtroFechaInicio() || undefined,
      fecha_fin: this.filtroFechaFin() || undefined,
      termino: this.filtroTermino().trim() || undefined,
    };

    this.ocupacionService.consultarAsistencias(filtro).subscribe({
      next: (resp) => {
        this.asistencias.set(resp.data);
        this.total.set(resp.total);
        this.totalPages.set(resp.totalPages);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorGeneral.set(err?.error?.message || 'Error al consultar asistencias');
      },
    });
  }

  buscar() {
    this.cargarAsistencias(1);
  }

  limpiarFiltros() {
    this.filtroSala.set(undefined);
    this.filtroCarrera.set(undefined);
    this.filtroMotivo.set(undefined);
    this.filtroEstado.set(undefined);
    this.filtroFechaInicio.set('');
    this.filtroFechaFin.set('');
    this.filtroTermino.set('');
    this.cargarAsistencias(1);
  }

  onCambioPagina(p: number) {
    this.cargarAsistencias(p);
  }

  exportarCsv() {
    const filtro: FiltroAsistenciasDto = {
      id_sala: this.filtroSala() ? Number(this.filtroSala()) : undefined,
      id_carrera: this.filtroCarrera() ? Number(this.filtroCarrera()) : undefined,
      id_motivo: this.filtroMotivo() ? Number(this.filtroMotivo()) : undefined,
      estado: this.filtroEstado() || undefined,
      fecha_inicio: this.filtroFechaInicio() || undefined,
      fecha_fin: this.filtroFechaFin() || undefined,
      termino: this.filtroTermino().trim() || undefined,
    };

    this.ocupacionService.descargarReporteCsv(filtro);
  }

  verDetalle(item: AsistenciaItem) {
    this.sesionSeleccionada.set(item);
    this.modalDetalleVisible.set(true);
  }
}
