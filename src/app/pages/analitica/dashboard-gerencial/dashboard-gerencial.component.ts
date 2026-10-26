import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AnaliticaService,
  KpisDashboard,
  GraficosDashboard,
  CarreraDemanda,
  SalaAforoOcupacion,
  DiaAfluencia,
  DemandaHorariaItem,
  HeatmapDiaFila,
  HeatmapCelda,
} from '../../../core/services/analitica.service';
import { InfraestructuraService, SalaItem } from '../../../core/services/infraestructura.service';
import { CatalogosService, CarreraItem } from '../../../core/services/catalogos.service';

export interface SvgDonutSegment {
  carrera: string;
  codigo: string;
  porcentaje: number;
  total_horas: number;
  color: string;
  strokeDasharray: string;
  strokeDashoffset: number;
}

export interface TooltipInfo {
  visible: boolean;
  x: number;
  y: number;
  titulo: string;
  linea1: string;
  linea2?: string;
  color?: string;
}

@Component({
  selector: 'app-dashboard-gerencial',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard-gerencial.component.html',
  styleUrls: ['./dashboard-gerencial.component.css'],
})
export class DashboardGerencialComponent implements OnInit {
  private readonly analiticaService = inject(AnaliticaService);
  private readonly infraService = inject(InfraestructuraService);
  private readonly catalogosService = inject(CatalogosService);

  // Estados Reactivos
  cargando = signal<boolean>(false);
  kpis = signal<KpisDashboard | null>(null);
  graficos = signal<GraficosDashboard | null>(null);
  salas = signal<SalaItem[]>([]);
  carreras = signal<CarreraItem[]>([]);

  // Filtros compactos (Sin etiquetas)
  filtroFechaDesde = signal<string>('');
  filtroFechaHasta = signal<string>('');
  filtroSalaId = signal<number | null>(null);
  filtroCarreraId = signal<number | null>(null);

  // Tooltip interactivo para gráficos SVG
  tooltip = signal<TooltipInfo>({
    visible: false,
    x: 0,
    y: 0,
    titulo: '',
    linea1: '',
  });

  // Fecha actual para membrete de impresión
  fechaGeneracion = signal<string>(
    new Date().toLocaleDateString('es-BO', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  );

  // Constante circunferencia donut: r = 70 => 2 * PI * 70 = 439.82297
  readonly donutCircumference = 2 * Math.PI * 70;

  // Segmentos SVG del Donut calculados reactivamente
  donutSegments = computed<SvgDonutSegment[]>(() => {
    const data = this.graficos()?.distribucion_carreras;
    if (!data || data.length === 0) return [];

    let currentOffset = 0;
    const C = this.donutCircumference;

    return data.map((item) => {
      const length = (item.porcentaje / 100) * C;
      const segment: SvgDonutSegment = {
        carrera: item.carrera,
        codigo: item.codigo,
        porcentaje: item.porcentaje,
        total_horas: item.total_horas,
        color: item.color || '#002855',
        strokeDasharray: `${length.toFixed(2)} ${(C - length).toFixed(2)}`,
        strokeDashoffset: -currentOffset,
      };
      currentOffset += length;
      return segment;
    });
  });

  // Puntos calculados para el Gráfico de Líneas de Demanda Horaria
  linePoints = computed(() => {
    const data = this.graficos()?.demanda_horaria;
    if (!data || data.length === 0) return { pathLine: '', pathArea: '', points: [] };

    const svgWidth = 640;
    const svgHeight = 180;
    const paddingX = 40;
    const paddingY = 25;
    const effectiveWidth = svgWidth - paddingX * 2;
    const effectiveHeight = svgHeight - paddingY * 2;

    const maxAfluencia = Math.max(300, ...data.map((d) => d.afluencia_media));
    const stepX = effectiveWidth / (data.length - 1);

    const points = data.map((d, index) => {
      const x = paddingX + index * stepX;
      const y = svgHeight - paddingY - (d.afluencia_media / maxAfluencia) * effectiveHeight;
      return {
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        hora: d.hora,
        valor: d.afluencia_media,
        capacidad: d.capacidad_media,
      };
    });

    // Construir paths SVG
    const pathLine = points.reduce((acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`), '');
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const baselineY = svgHeight - paddingY;
    const pathArea = `${pathLine} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;

    return { pathLine, pathArea, points };
  });

  ngOnInit(): void {
    // Inicializar fechas por defecto (mes en curso)
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.filtroFechaDesde.set(primerDia.toISOString().slice(0, 10));
    this.filtroFechaHasta.set(hoy.toISOString().slice(0, 10));

    this.cargarSalas();
    this.cargarCarreras();
    this.cargarDashboard();
  }

  cargarSalas(): void {
    this.infraService.getSalas({ activo: true }).subscribe({
      next: (res) => this.salas.set(res || []),
      error: () => {},
    });
  }

  cargarCarreras(): void {
    this.catalogosService.getCarreras({ activo: true }).subscribe({
      next: (res) => this.carreras.set(res.items || []),
      error: () => {},
    });
  }

  cargarDashboard(): void {
    this.cargando.set(true);
    const filtros: any = {};
    if (this.filtroFechaDesde()) filtros.fecha_desde = this.filtroFechaDesde();
    if (this.filtroFechaHasta()) filtros.fecha_hasta = this.filtroFechaHasta();
    if (this.filtroSalaId()) filtros.id_sala = this.filtroSalaId();
    if (this.filtroCarreraId()) filtros.id_carrera = this.filtroCarreraId();

    this.analiticaService.getKpis(filtros).subscribe({
      next: (data) => {
        this.kpis.set(data);
      },
      error: () => {},
    });

    this.analiticaService.getGraficos(filtros).subscribe({
      next: (data) => {
        this.graficos.set(data);
        this.cargando.set(false);
      },
      error: () => {
        this.cargando.set(false);
      },
    });
  }

  limpiarFiltros(): void {
    const hoy = new Date();
    const primerDia = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.filtroFechaDesde.set(primerDia.toISOString().slice(0, 10));
    this.filtroFechaHasta.set(hoy.toISOString().slice(0, 10));
    this.filtroSalaId.set(null);
    this.filtroCarreraId.set(null);
    this.cargarDashboard();
  }

  // Interacción de Tooltip para SVG
  mostrarTooltip(event: MouseEvent, titulo: string, linea1: string, linea2?: string, color?: string): void {
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    this.tooltip.set({
      visible: true,
      x: event.clientX,
      y: event.clientY - 40,
      titulo,
      linea1,
      linea2,
      color,
    });
  }

  ocultarTooltip(): void {
    this.tooltip.update((t) => ({ ...t, visible: false }));
  }

  // Color de calor dinámico según saturación
  getHeatmapColor(saturacion: number): string {
    if (saturacion >= 90) return '#A81124'; // Carmesí FCEE saturado
    if (saturacion >= 80) return '#d97706'; // Dorado/Ámbar alta demanda
    if (saturacion >= 65) return '#002855'; // Azul Marino pleno
    if (saturacion >= 45) return '#3b82f6'; // Azul medio
    return '#93c5fd'; // Azul tenue baja carga
  }

  getHeatmapTextColor(saturacion: number): string {
    return saturacion >= 45 ? '#ffffff' : '#0f172a';
  }

  imprimirResumen(): void {
    window.print();
  }
}
