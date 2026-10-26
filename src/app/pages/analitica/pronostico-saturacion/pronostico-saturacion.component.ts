import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AnaliticaService,
  PrediccionDemandaResponse,
  PrediccionDemandaDto,
  SimuladorColasResponse,
  SimuladorColasDto,
} from '../../../core/services/analitica.service';
import { InfraestructuraService, SalaItem } from '../../../core/services/infraestructura.service';
import { ModalAlertComponent } from '../../../shared/components/modal-alert/modal-alert.component';

export interface PointML {
  x: number;
  y: number;
  hora: string;
  demanda: number;
  aforo: number;
  pct: number;
  esPico: boolean;
}

@Component({
  selector: 'app-pronostico-saturacion',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalAlertComponent],
  templateUrl: './pronostico-saturacion.component.html',
  styleUrls: ['./pronostico-saturacion.component.css'],
})
export class PronosticoSaturacionComponent implements OnInit {
  private readonly analiticaService = inject(AnaliticaService);
  private readonly infraService = inject(InfraestructuraService);

  readonly Math = Math;

  // Salas disponibles
  salas = signal<SalaItem[]>([]);
  cargandoSalas = signal<boolean>(false);

  // Estados Predictivo ML (RandomForest)
  cargandoPrediccion = signal<boolean>(false);
  prediccion = signal<PrediccionDemandaResponse | null>(null);
  salaSeleccionadaId = signal<number>(1);
  fechaPrediccion = signal<string>(new Date().toISOString().slice(0, 10));

  // Estados Simulador Erlang-C (M/M/c)
  lambdaInput = signal<number>(32); // llegadas / hora
  tiempoUsoMinutosInput = signal<number>(60); // tiempo de uso medio (min) -> mu = 60 / tiempo
  puestosActivosInput = signal<number>(36); // servidores c
  toleranciaEsperaInput = signal<number>(5); // minutos de espera tolerados

  resultadoColas = signal<SimuladorColasResponse | null>(null);
  mensajeAlerta = signal<string | null>(null);

  // Tooltip dinámico
  tooltipVisible = signal<boolean>(false);
  tooltipX = signal<number>(0);
  tooltipY = signal<number>(0);
  tooltipTitle = signal<string>('');
  tooltipLine1 = signal<string>('');
  tooltipLine2 = signal<string>('');

  // Puntos calculados para el Gráfico SVG de RandomForest
  mlCurveData = computed(() => {
    const res = this.prediccion();
    if (!res || !res.curva_horaria || res.curva_horaria.length === 0) {
      return { pathLine: '', pathArea: '', points: [], aforoY: 60 };
    }

    const svgWidth = 660;
    const svgHeight = 200;
    const paddingX = 45;
    const paddingY = 30;
    const effectiveWidth = svgWidth - paddingX * 2;
    const effectiveHeight = svgHeight - paddingY * 2;

    const aforo = res.aforo_total || 35;
    const maxVal = Math.max(aforo * 1.15, ...res.curva_horaria.map((c) => c.demanda_proyectada));
    const stepX = effectiveWidth / (res.curva_horaria.length - 1);

    const aforoY = Math.round(
      (svgHeight - paddingY - (aforo / maxVal) * effectiveHeight) * 10
    ) / 10;

    const points: PointML[] = res.curva_horaria.map((item, idx) => {
      const x = Math.round((paddingX + idx * stepX) * 10) / 10;
      const y = Math.round(
        (svgHeight - paddingY - (item.demanda_proyectada / maxVal) * effectiveHeight) * 10
      ) / 10;
      return {
        x,
        y,
        hora: item.hora,
        demanda: item.demanda_proyectada,
        aforo: item.aforo_sala,
        pct: item.porcentaje_saturacion,
        esPico: item.es_hora_pico,
      };
    });

    const pathLine = points.reduce(
      (acc, p, i) => (i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`),
      ''
    );
    const firstPoint = points[0];
    const lastPoint = points[points.length - 1];
    const baselineY = svgHeight - paddingY;
    const pathArea = `${pathLine} L ${lastPoint.x} ${baselineY} L ${firstPoint.x} ${baselineY} Z`;

    return { pathLine, pathArea, points, aforoY };
  });

  ngOnInit(): void {
    this.cargarSalas();
    this.ejecutarPrediccionDemanda();
    this.recalcularModeloColas();
  }

  cargarSalas(): void {
    this.cargandoSalas.set(true);
    this.infraService.getSalas({ activo: true }).subscribe({
      next: (salas) => {
        this.salas.set(salas || []);
        if (salas && salas.length > 0) {
          this.salaSeleccionadaId.set(salas[0].id_sala);
        }
        this.cargandoSalas.set(false);
      },
      error: () => {
        this.cargandoSalas.set(false);
      },
    });
  }

  ejecutarPrediccionDemanda(): void {
    this.cargandoPrediccion.set(true);
    this.mensajeAlerta.set(null);

    const dto: PrediccionDemandaDto = {
      id_sala: this.salaSeleccionadaId(),
      fecha: this.fechaPrediccion(),
    };

    this.analiticaService.predecirDemanda(dto).subscribe({
      next: (res) => {
        this.prediccion.set(res);
        this.cargandoPrediccion.set(false);
      },
      error: () => {
        this.mensajeAlerta.set('No se pudo conectar con el microservicio predictivo RandomForest. Se utilizaron parámetros de referencia.');
        this.cargandoPrediccion.set(false);
      },
    });
  }

  // ==========================================
  // TEORÍA DE COLAS INTERACTIVA (Erlang-C)
  // ==========================================
  recalcularModeloColas(): void {
    const lambda = Number(this.lambdaInput());
    const tUso = Math.max(1, Number(this.tiempoUsoMinutosInput()));
    const c = Math.max(1, Number(this.puestosActivosInput()));
    const tol = Math.max(0.5, Number(this.toleranciaEsperaInput()));

    // mu = cuántos estudiantes atiende 1 máquina en 1 hora = 60 / tiempo_de_uso
    const mu = 60 / tUso;

    const dto: SimuladorColasDto = {
      lambda,
      mu,
      c,
      tolerancia_min: tol,
    };

    // Usar cálculo instantáneo local con sincronización opcional al backend
    const calcLocal = this.analiticaService.calcularModeloColasMmc(dto);
    this.resultadoColas.set(calcLocal);

    // Llamar al endpoint por si el backend tiene telemetría adicional
    this.analiticaService.simularColas(dto).subscribe({
      next: (res) => {
        if (res) this.resultadoColas.set(res);
      },
      error: () => {},
    });
  }

  aplicarPuestosRecomendados(): void {
    const optimo = this.resultadoColas()?.puestos_optimos_recomendados;
    if (optimo && optimo > 0) {
      this.puestosActivosInput.set(optimo);
      this.recalcularModeloColas();
    }
  }

  // Tooltip
  showTooltip(event: MouseEvent, title: string, l1: string, l2: string): void {
    this.tooltipTitle.set(title);
    this.tooltipLine1.set(l1);
    this.tooltipLine2.set(l2);
    this.tooltipX.set(event.clientX);
    this.tooltipY.set(event.clientY - 40);
    this.tooltipVisible.set(true);
  }

  hideTooltip(): void {
    this.tooltipVisible.set(false);
  }
}
