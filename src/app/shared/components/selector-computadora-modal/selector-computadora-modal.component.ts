import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  SimpleChanges,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  InfraestructuraService,
  SalaItem,
  ComputadoraItem,
} from '../../../core/services/infraestructura.service';

@Component({
  selector: 'app-selector-computadora-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './selector-computadora-modal.component.html',
  styleUrls: ['./selector-computadora-modal.component.css'],
})
export class SelectorComputadoraModalComponent implements OnChanges {
  private readonly infraService = inject(InfraestructuraService);

  @Input() visible: boolean = false;
  @Input() idSala: number | null = null;
  @Input() idComputadoraSeleccionada: number | null = null;
  @Input() salasDisponibles: SalaItem[] = [];

  @Output() seleccionada = new EventEmitter<ComputadoraItem>();
  @Output() cerrar = new EventEmitter<void>();

  salaActual = signal<SalaItem | null>(null);
  computadoras = signal<ComputadoraItem[]>([]);
  pcSeleccionada = signal<ComputadoraItem | null>(null);
  cargando = signal<boolean>(false);
  errorCarga = signal<string | null>(null);

  salaSeleccionadaId = signal<number | null>(null);

  filasArray = computed(() => {
    const total = this.salaActual()?.filas_cuadricula || 0;
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  columnasArray = computed(() => {
    const total = this.salaActual()?.columnas_cuadricula || 0;
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['visible'] && this.visible) {
      if (this.idSala) {
        this.salaSeleccionadaId.set(Number(this.idSala));
        this.cargarPlanoSala(Number(this.idSala));
      } else if (this.salasDisponibles.length > 0) {
        this.salaSeleccionadaId.set(this.salasDisponibles[0].id_sala);
        this.cargarPlanoSala(this.salasDisponibles[0].id_sala);
      }
    } else if (changes['idSala'] && this.idSala && this.visible) {
      this.salaSeleccionadaId.set(Number(this.idSala));
      this.cargarPlanoSala(Number(this.idSala));
    }
  }

  cargarPlanoSala(idSala: number): void {
    if (!idSala) return;
    this.cargando.set(true);
    this.errorCarga.set(null);
    this.pcSeleccionada.set(null);

    this.infraService.getComputadorasPorSala(idSala).subscribe({
      next: (res) => {
        this.salaActual.set(res?.sala || null);
        const pcs = (res?.computadoras || []).filter((c) => c.activo);
        this.computadoras.set(pcs);
        this.cargando.set(false);

        if (this.idComputadoraSeleccionada) {
          const pre = pcs.find(
            (c) => Number(c.id_computadora) === Number(this.idComputadoraSeleccionada),
          );
          if (pre) {
            this.pcSeleccionada.set(pre);
          }
        }
      },
      error: (err) => {
        console.error('Error cargando plano visual de computadoras:', err);
        this.cargando.set(false);
        this.errorCarga.set('No se pudo cargar la distribución física de la sala.');
      },
    });
  }

  cambiarSala(id: any): void {
    const num = Number(id);
    this.salaSeleccionadaId.set(num);
    this.cargarPlanoSala(num);
  }

  getPcEnCoordenada(fila: number, col: number): ComputadoraItem | undefined {
    return this.computadoras().find(
      (c) => Number(c.posicion_fila) === fila && Number(c.posicion_columna) === col,
    );
  }

  seleccionarPc(pc: ComputadoraItem): void {
    this.pcSeleccionada.set(pc);
  }

  confirmar(): void {
    const pc = this.pcSeleccionada();
    if (pc) {
      this.seleccionada.emit(pc);
    }
    this.cerrarModal();
  }

  cerrarModal(): void {
    this.cerrar.emit();
  }

  onBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.cerrarModal();
    }
  }
}
