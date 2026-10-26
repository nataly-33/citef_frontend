import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SoporteService,
  MetricasRamsDashboard,
  IndicadorRams,
  ResumenRamsSala,
  KpisRamsDashboard,
} from '../../../core/services/soporte.service';
import {
  InfraestructuraService,
  SalaItem,
} from '../../../core/services/infraestructura.service';
import { PaginationComponent, TableCardComponent } from '../../../shared/components';

@Component({
  selector: 'app-metricas-rams',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, TableCardComponent],
  templateUrl: './metricas-rams.component.html',
  styleUrls: ['./metricas-rams.component.css'],
})
export class MetricasRamsComponent implements OnInit {
  private readonly soporteService = inject(SoporteService);
  private readonly infraService = inject(InfraestructuraService);

  // Estados reactivos
  cargando = signal<boolean>(false);
  dashboard = signal<MetricasRamsDashboard | null>(null);
  salas = signal<SalaItem[]>([]);

  // Filtros
  filtroSala = signal<number | null>(null);
  filtroMes = signal<number>(new Date().getMonth() + 1);
  filtroAnio = signal<number>(new Date().getFullYear());
  filtroBusqueda = signal<string>('');

  // Paginación de tabla desglosada (Regla 8: 15 filas)
  paginaActual = signal<number>(1);
  readonly limite = 15;
  totalRegistros = signal<number>(0);

  // Modal explicativo de fórmulas RAMS (IEEE 762)
  mostrarModalFormulas = signal<boolean>(false);

  // Lista de meses
  readonly meses = [
    { valor: 1, nombre: 'Enero' },
    { valor: 2, nombre: 'Febrero' },
    { valor: 3, nombre: 'Marzo' },
    { valor: 4, nombre: 'Abril' },
    { valor: 5, nombre: 'Mayo' },
    { valor: 6, nombre: 'Junio' },
    { valor: 7, nombre: 'Julio' },
    { valor: 8, nombre: 'Agosto' },
    { valor: 9, nombre: 'Septiembre' },
    { valor: 10, nombre: 'Octubre' },
    { valor: 11, nombre: 'Noviembre' },
    { valor: 12, nombre: 'Diciembre' },
  ];

  readonly anios = [2024, 2025, 2026, 2027];

  getNombreMes(mes: number): string {
    return this.meses.find((m) => m.valor === Number(mes))?.nombre || `Mes ${mes}`;
  }

  ngOnInit(): void {
    this.cargarSalas();
    this.cargarDashboard();
  }

  cargarSalas(): void {
    this.infraService.getSalas({ activo: true }).subscribe({
      next: (salas) => this.salas.set(salas || []),
      error: () => {},
    });
  }

  cargarDashboard(): void {
    this.cargando.set(true);
    this.soporteService
      .getMetricasRamsDashboard({
        id_sala: this.filtroSala() || undefined,
        mes: this.filtroMes(),
        anio: this.filtroAnio(),
        busqueda: this.filtroBusqueda().trim() || undefined,
        pagina: this.paginaActual(),
        limite: this.limite,
      })
      .subscribe({
        next: (data) => {
          this.dashboard.set(data);
          this.totalRegistros.set(data.total || 0);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
        },
      });
  }

  aplicarFiltros(): void {
    this.paginaActual.set(1);
    this.cargarDashboard();
  }

  limpiarFiltros(): void {
    this.filtroSala.set(null);
    this.filtroMes.set(new Date().getMonth() + 1);
    this.filtroAnio.set(new Date().getFullYear());
    this.filtroBusqueda.set('');
    this.paginaActual.set(1);
    this.cargarDashboard();
  }

  cambiarPagina(nuevaPagina: number): void {
    this.paginaActual.set(nuevaPagina);
    this.cargarDashboard();
  }

  // Semáforo formal RAMS (>=95% verde, 90-94.9% azul/ámbar, <90% rojo)
  getSemaforoClase(dispPorcentaje: number): string {
    if (dispPorcentaje >= 95) return 'semaforo-optimo';
    if (dispPorcentaje >= 90) return 'semaforo-aceptable';
    return 'semaforo-critico';
  }

  getSemaforoTexto(dispPorcentaje: number): string {
    if (dispPorcentaje >= 95) return 'Óptimo (>= 95%)';
    if (dispPorcentaje >= 90) return 'Aceptable (90 - 94.9%)';
    return 'Crítico (< 90%)';
  }

  imprimirTablero(): void {
    window.print();
  }
}
