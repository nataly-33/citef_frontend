import {
  Component,
  Input,
  Output,
  EventEmitter,
  computed,
  signal,
  OnInit,
  OnChanges,
  SimpleChanges,
} from '@angular/core';
import { CommonModule } from '@angular/common';

export interface CuadriculaComputadoraItem {
  id_computadora: number;
  codigo_equipo: string;
  posicion_fila: number;
  posicion_columna: number;
  estado_actual: 'DISPONIBLE' | 'OCUPADA' | 'RESERVADA' | 'EN_MANTENIMIENTO';
  maquina_docente: boolean;
  horas_uso_acumuladas: number;
  perifericos_conteo?: number;
  perifericos?: any[];
  ip_red?: string | null;
  sesion_activa?: {
    id_asignacion?: number;
    registro_estudiante?: string;
    estudiante_nombres?: string;
    carrera_nombre?: string;
    motivo_descrip?: string;
    auxiliar_nombre?: string;
    fecha_hora_inicio?: string;
    minutos_transcurridos?: number;
    asignacion_automatica?: boolean;
  } | null;
}

@Component({
  selector: 'app-lab-cuadricula',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './lab-cuadricula.component.html',
  styleUrls: ['./lab-cuadricula.component.css'],
})
export class LabCuadriculaComponent implements OnInit, OnChanges {
  @Input() modo: 'editor' | 'monitor' = 'monitor';
  @Input() filas: number = 6;
  @Input() columnas: number = 8;
  @Input() computadoras: any[] = [];
  @Input() pcSeleccionada: any = null;
  @Input() dragOverCoord: string | null = null;
  @Input() tituloPodium: string = 'PIZARRA DIGITAL Y PROYECCIÓN AUDIOVISUAL';
  @Input() subtituloPodium: string = 'FRENTE DE SALA';

  // Salidas para modo editor
  @Output() celdaVaciaClick = new EventEmitter<{ fila: number; col: number }>();
  @Output() moverPc = new EventEmitter<{
    pc: any;
    fila: number;
    col: number;
  }>();
  @Output() editarPc = new EventEmitter<any>();
  @Output() eliminarPc = new EventEmitter<any>();
  @Output() verPerifericos = new EventEmitter<any>();
  @Output() seleccionarPc = new EventEmitter<any>();
  @Output() dragOverChange = new EventEmitter<string | null>();

  // Salidas para modo monitor
  @Output() asignar = new EventEmitter<any>();
  @Output() liberar = new EventEmitter<any>();
  @Output() verDetalle = new EventEmitter<any>();

  // Índices para iterar filas y columnas
  filasArray = computed(() =>
    Array.from({ length: this.filasSignal() }, (_, i) => i + 1),
  );
  columnasArray = computed(() =>
    Array.from({ length: this.columnasSignal() }, (_, i) => i + 1),
  );

  private filasSignal = signal<number>(6);
  private columnasSignal = signal<number>(8);

  // Mapa rápido de posicion -> Computadora
  private pcMap = new Map<string, any>();

  ngOnInit(): void {
    this.filasSignal.set(this.filas || 6);
    this.columnasSignal.set(this.columnas || 8);
    this.actualizarMapaPcs();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filas']) {
      this.filasSignal.set(this.filas || 6);
    }
    if (changes['columnas']) {
      this.columnasSignal.set(this.columnas || 8);
    }
    if (changes['computadoras']) {
      this.actualizarMapaPcs();
    }
  }

  private actualizarMapaPcs(): void {
    this.pcMap.clear();
    for (const pc of this.computadoras || []) {
      this.pcMap.set(`${pc.posicion_fila}-${pc.posicion_columna}`, pc);
    }
  }

  getPc(fila: number, col: number): any | undefined {
    return this.pcMap.get(`${fila}-${col}`);
  }

  formatHorasUso(horas: number | undefined | null): string {
    if (horas === undefined || horas === null || isNaN(Number(horas))) return '0h';
    const num = Number(horas);
    if (num < 1000) {
      return `${Math.round(num * 10) / 10}h`;
    }
    if (num < 10000) {
      return `${(num / 1000).toFixed(1)}k h`;
    }
    return `${Math.round(num / 1000)}k h`;
  }

  tooltipHorasUso(horas: number | undefined | null): string {
    const num = Number(horas || 0);
    return `Horas de uso acumuladas: ${num.toFixed(1)} h (Balanceo de hardware)`;
  }

  // --- Handlers para Drag & Drop (Modo Editor) ---
  onDragStart(event: DragEvent, pc: any): void {
    if (this.modo !== 'editor') return;
    event.dataTransfer?.setData('text/plain', JSON.stringify(pc));
    event.dataTransfer?.setData('application/json', JSON.stringify(pc));
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent, fila: number, col: number): void {
    if (this.modo !== 'editor') return;
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverChange.emit(`${fila}-${col}`);
  }

  onDragLeave(): void {
    if (this.modo !== 'editor') return;
    this.dragOverChange.emit(null);
  }

  onDrop(event: DragEvent, fila: number, col: number): void {
    if (this.modo !== 'editor') return;
    event.preventDefault();
    this.dragOverChange.emit(null);

    const rawData =
      event.dataTransfer?.getData('application/json') ||
      event.dataTransfer?.getData('text/plain');

    if (!rawData) return;

    try {
      const pc: any = JSON.parse(rawData);
      this.moverPc.emit({ pc, fila, col });
    } catch {
      // Ignorar fallo de deserialización
    }
  }

  onCellClick(fila: number, col: number): void {
    if (this.modo === 'editor') {
      this.celdaVaciaClick.emit({ fila, col });
    }
  }

  onCardClick(pc: any): void {
    if (this.modo === 'editor') {
      this.seleccionarPc.emit(pc);
    }
  }
}
