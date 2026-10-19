import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import {
  InfraestructuraService,
  SalaItem,
  ComputadoraItem,
} from '../../../core/services/infraestructura.service';
import {
  ModalAlertComponent,
  ConfirmModalComponent,
  LabCuadriculaComponent,
} from '../../../shared/components';

export interface ErroresPc {
  codigo_equipo?: string;
  posicion_fila?: string;
  posicion_columna?: string;
}

@Component({
  selector: 'app-editor-cuadricula',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalAlertComponent,
    ConfirmModalComponent,
    LabCuadriculaComponent,
  ],
  templateUrl: './editor-cuadricula.component.html',
  styleUrls: ['./editor-cuadricula.component.css'],
})
export class EditorCuadriculaComponent implements OnInit {
  listaSalas = signal<SalaItem[]>([]);
  idSalaActual = signal<number>(1);
  salaActual = signal<SalaItem | null>(null);
  computadoras = signal<ComputadoraItem[]>([]);
  posicionesOriginales = new Map<number, { fila: number; col: number }>();

  // Estado de interactividad
  pcSeleccionada = signal<ComputadoraItem | null>(null);
  draggedPc = signal<ComputadoraItem | null>(null);
  dragOverCoord = signal<string | null>(null);
  cambiosPendientes = signal<boolean>(false);
  guardandoPosiciones = signal<boolean>(false);

  // Modal PC
  modalPcVisible = signal<boolean>(false);
  modoEdicionPc = signal<boolean>(false);
  guardandoPc = signal<boolean>(false);
  errorModalPc = signal<string | null>(null);
  erroresPc = signal<ErroresPc>({});

  formPc: {
    id_computadora?: number;
    codigo_equipo: string;
    posicion_fila: number | null;
    posicion_columna: number | null;
    estado_actual: 'DISPONIBLE' | 'OCUPADA' | 'RESERVADA' | 'EN_MANTENIMIENTO';
    ip_red?: string;
    mac_address?: string;
    horas_uso_acumuladas: number;
    maquina_docente: boolean;
  } = {
    codigo_equipo: '',
    posicion_fila: 1,
    posicion_columna: 1,
    estado_actual: 'DISPONIBLE',
    ip_red: '',
    mac_address: '',
    horas_uso_acumuladas: 0,
    maquina_docente: false,
  };

  // Confirm Modal retiro
  confirmModalPcVisible = signal<boolean>(false);
  confirmModalPcMensaje = signal<string>('');
  pcARetirar = signal<ComputadoraItem | null>(null);
  perifericosModalVisible = signal<boolean>(false);
  pcPerifericosSeleccionada = signal<ComputadoraItem | null>(null);

  // Modal Advertencia de Sesión Activa al cambiar estado de PC
  modalAdvertenciaSesionVisible = signal<boolean>(false);
  advertenciaSesionActivaData = signal<{
    pcCodigo: string;
    estudianteNombre: string;
    registro: string;
    minutosActivo: number;
    nuevoEstado: string;
  } | null>(null);
  private cambioEstadoSesionConfirmado = false;

  // Arreglos de índices para el render de la matriz
  filasArray = computed(() => {
    const total = this.salaActual()?.filas_cuadricula || 6;
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  columnasArray = computed(() => {
    const total = this.salaActual()?.columnas_cuadricula || 8;
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  constructor(
    private readonly infraService: InfraestructuraService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarListaSalas();
  }

  cargarListaSalas(): void {
    this.infraService.getSalas().subscribe({
      next: (salas) => {
        // Filtrar exclusivamente salas activas
        const activas = salas.filter((s) => s.activo);
        this.listaSalas.set(activas);

        const idParam = this.route.snapshot.paramMap.get('id');
        const idNum = idParam ? parseInt(idParam, 10) : null;
        const encontrada = idNum ? activas.find((s) => s.id_sala === idNum) : null;

        if (encontrada) {
          this.idSalaActual.set(encontrada.id_sala);
          this.cargarSalaYEquipos(encontrada.id_sala);
        } else if (activas.length > 0) {
          this.idSalaActual.set(activas[0].id_sala);
          this.cargarSalaYEquipos(activas[0].id_sala);
        } else {
          this.salaActual.set(null);
          this.computadoras.set([]);
        }
      },
      error: (err) => console.error('Error al cargar lista de salas:', err),
    });
  }

  cambiarSala(id: any): void {
    const numId = Number(id);
    if (this.cambiosPendientes()) {
      if (
        !confirm(
          'Tiene cambios de distribución pendientes sin guardar en esta sala. ¿Desea descartarlos y cambiar de sala?',
        )
      ) {
        return;
      }
    }
    this.idSalaActual.set(numId);
    this.cargarSalaYEquipos(numId);
  }

  cargarSalaYEquipos(idSala: number): void {
    this.pcSeleccionada.set(null);
    this.cambiosPendientes.set(false);
    this.infraService.getComputadorasPorSala(idSala).subscribe({
      next: (res) => {
        this.salaActual.set(res.sala);
        this.computadoras.set(res.computadoras);
        this.posicionesOriginales.clear();
        for (const c of res.computadoras) {
          this.posicionesOriginales.set(c.id_computadora, {
            fila: c.posicion_fila,
            col: c.posicion_columna,
          });
        }
      },
      error: (err) => console.error('Error al cargar sala y computadoras:', err),
    });
  }

  volverALaboratorios(): void {
    if (this.cambiosPendientes()) {
      if (
        !confirm(
          'Hay cambios en la distribución sin guardar. ¿Está seguro de salir?',
        )
      ) {
        return;
      }
    }
    this.router.navigate(['/infraestructura/salas']);
  }

  getPcEnCoordenada(fila: number, col: number): ComputadoraItem | undefined {
    return this.computadoras().find(
      (c) => Number(c.posicion_fila) === fila && Number(c.posicion_columna) === col && c.activo,
    );
  }

  // ================= MOVIMIENTO DE EQUIPOS =================
  seleccionarPcParaMover(pc: ComputadoraItem): void {
    // La reubicación se realiza exclusivamente mediante Drag and Drop
    this.pcSeleccionada.set(null);
  }

  clickCeldaVacia(fila: number, col: number): void {
    // Clic en celda vacía con '+' abre directamente el modal de registro en esa coordenada
    this.abrirModalNuevaPcEnCoordenada(fila, col);
  }

  onDragStart(event: DragEvent, pc: ComputadoraItem): void {
    this.draggedPc.set(pc);
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', String(pc.id_computadora));
      event.dataTransfer.effectAllowed = 'move';
    }
  }

  onDragOver(event: DragEvent, fila: number, col: number): void {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    this.dragOverCoord.set(`${fila}-${col}`);
  }

  onDragLeave(): void {
    this.dragOverCoord.set(null);
  }

  onDrop(event: DragEvent, fila: number, col: number): void {
    event.preventDefault();
    event.stopPropagation();
    this.dragOverCoord.set(null);

    let pc = this.draggedPc();
    if (!pc && event.dataTransfer) {
      const idRaw = event.dataTransfer.getData('text/plain');
      if (idRaw) {
        const idNum = Number(idRaw);
        pc = this.computadoras().find((c) => Number(c.id_computadora) === idNum) || null;
      }
    }
    this.draggedPc.set(null);

    if (!pc) return;

    // Verificar si la celda de destino ya está ocupada
    const ocupada = this.getPcEnCoordenada(fila, col);
    if (ocupada && Number(ocupada.id_computadora) !== Number(pc.id_computadora)) {
      alert(
        `La celda (${fila}, ${col}) ya está ocupada por el equipo "${ocupada.codigo_equipo}". No se permiten colisiones.`,
      );
      return;
    }

    this.reubicarPc(pc, fila, col);
  }

  onMoverPc(event: { pc: any; fila: number; col: number }): void {
    const pc = this.computadoras().find(
      (c) => Number(c.id_computadora) === Number(event.pc.id_computadora),
    );
    if (!pc) return;

    const ocupada = this.getPcEnCoordenada(event.fila, event.col);
    if (ocupada && Number(ocupada.id_computadora) !== Number(pc.id_computadora)) {
      alert(
        `La celda (${event.fila}, ${event.col}) ya está ocupada por el equipo "${ocupada.codigo_equipo}". No se permiten colisiones.`,
      );
      return;
    }

    this.reubicarPc(pc, event.fila, event.col);
  }

  private reubicarPc(pc: ComputadoraItem, fila: number, col: number): void {
    if (Number(pc.posicion_fila) === fila && Number(pc.posicion_columna) === col) {
      return;
    }

    const actualizadas = this.computadoras().map((item) => {
      if (Number(item.id_computadora) === Number(pc.id_computadora)) {
        return {
          ...item,
          posicion_fila: fila,
          posicion_columna: col,
        };
      }
      return item;
    });

    this.computadoras.set(actualizadas);
    this.cambiosPendientes.set(true);
  }

  descartarCambios(): void {
    const idSala = this.idSalaActual();
    this.cargarSalaYEquipos(idSala);
  }

  guardarDistribucion(): void {
    const sala = this.salaActual();
    if (!sala) return;

    const payload = this.computadoras()
      .filter((c) => c.activo)
      .map((c) => ({
        id_computadora: Number(c.id_computadora),
        posicion_fila: Number(c.posicion_fila),
        posicion_columna: Number(c.posicion_columna),
      }));

    this.guardandoPosiciones.set(true);
    this.infraService.guardarPosiciones(sala.id_sala, payload).subscribe({
      next: (res) => {
        this.guardandoPosiciones.set(false);
        this.cambiosPendientes.set(false);
        this.computadoras.set(res.computadoras);
        this.posicionesOriginales.clear();
        for (const c of res.computadoras) {
          this.posicionesOriginales.set(Number(c.id_computadora), {
            fila: Number(c.posicion_fila),
            col: Number(c.posicion_columna),
          });
        }
      },
      error: (err) => {
        this.guardandoPosiciones.set(false);
        const msg = err.error?.message || 'Error al guardar posiciones de equipos.';
        alert(Array.isArray(msg) ? msg.join('\n') : msg);
      },
    });
  }

  // ================= MODAL CREAR / EDITAR COMPUTADORA =================
  abrirModalNuevaPc(): void {
    const sala = this.salaActual();
    if (!sala) return;

    // Encontrar primera celda libre
    let fLibre = 1;
    let cLibre = 1;
    let hallado = false;
    for (let f = 1; f <= sala.filas_cuadricula; f++) {
      for (let c = 1; c <= sala.columnas_cuadricula; c++) {
        if (!this.getPcEnCoordenada(f, c)) {
          fLibre = f;
          cLibre = c;
          hallado = true;
          break;
        }
      }
      if (hallado) break;
    }

    this.abrirModalNuevaPcEnCoordenada(fLibre, cLibre);
  }

  abrirModalNuevaPcEnCoordenada(fila: number, col: number): void {
    const sala = this.salaActual();
    if (!sala) return;

    const numSiguiente = this.computadoras().length + 1;
    const numStr = numSiguiente < 10 ? `0${numSiguiente}` : `${numSiguiente}`;
    const prefijo = sala.codigo_sala.replace('-', '');

    this.modoEdicionPc.set(false);
    this.errorModalPc.set(null);
    this.erroresPc.set({});
    this.formPc = {
      codigo_equipo: `${prefijo}-PC${numStr}`,
      posicion_fila: fila,
      posicion_columna: col,
      estado_actual: 'DISPONIBLE',
      ip_red: `192.168.10.${10 + numSiguiente}`,
      mac_address: '',
      horas_uso_acumuladas: 0,
      maquina_docente: false,
    };
    this.modalPcVisible.set(true);
  }

  abrirModalEditarPc(pc: ComputadoraItem): void {
    this.modoEdicionPc.set(true);
    this.errorModalPc.set(null);
    this.erroresPc.set({});
    this.formPc = {
      id_computadora: pc.id_computadora,
      codigo_equipo: pc.codigo_equipo,
      posicion_fila: pc.posicion_fila,
      posicion_columna: pc.posicion_columna,
      estado_actual: pc.estado_actual,
      ip_red: pc.ip_red || '',
      mac_address: pc.mac_address || '',
      horas_uso_acumuladas: pc.horas_uso_acumuladas,
      maquina_docente: pc.maquina_docente,
    };
    this.modalPcVisible.set(true);
  }

  abrirModalPerifericos(pc: ComputadoraItem): void {
    this.pcPerifericosSeleccionada.set(pc);
    this.perifericosModalVisible.set(true);
  }

  cerrarModalPerifericos(): void {
    this.perifericosModalVisible.set(false);
    this.pcPerifericosSeleccionada.set(null);
  }

  cerrarModalPcDirecto(): void {
    this.modalPcVisible.set(false);
    this.errorModalPc.set(null);
    this.erroresPc.set({});
  }

  cerrarModalPc(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.cerrarModalPcDirecto();
    }
  }

  validarFormPc(): boolean {
    const errs: ErroresPc = {};
    const sala = this.salaActual();

    if (!this.formPc.codigo_equipo || this.formPc.codigo_equipo.trim() === '') {
      errs.codigo_equipo = 'El código patrimonial es obligatorio';
    }

    if (
      this.formPc.posicion_fila === null ||
      this.formPc.posicion_fila < 1 ||
      (sala && this.formPc.posicion_fila > sala.filas_cuadricula)
    ) {
      errs.posicion_fila = `Fila fuera de rango (1 a ${sala?.filas_cuadricula || 6})`;
    }

    if (
      this.formPc.posicion_columna === null ||
      this.formPc.posicion_columna < 1 ||
      (sala && this.formPc.posicion_columna > sala.columnas_cuadricula)
    ) {
      errs.posicion_columna = `Columna fuera de rango (1 a ${sala?.columnas_cuadricula || 8})`;
    }

    // Validar colisión si se cambia o crea en celda ocupada
    if (this.formPc.posicion_fila && this.formPc.posicion_columna) {
      const ocupante = this.getPcEnCoordenada(
        Number(this.formPc.posicion_fila),
        Number(this.formPc.posicion_columna),
      );
      if (
        ocupante &&
        (!this.modoEdicionPc() || Number(ocupante.id_computadora) !== Number(this.formPc.id_computadora))
      ) {
        errs.posicion_fila = `Celda (${this.formPc.posicion_fila}, ${this.formPc.posicion_columna}) ocupada por ${ocupante.codigo_equipo}`;
      }
    }

    this.erroresPc.set(errs);
    return Object.keys(errs).length === 0;
  }

  guardarPc(): void {
    if (!this.validarFormPc()) {
      return;
    }

    const sala = this.salaActual();
    if (!sala) return;

    // Verificar si se está editando una PC que estaba OCUPADA y se le cambia el estado
    if (this.modoEdicionPc() && this.formPc.id_computadora) {
      const pcActual = this.computadoras().find(
        (c) => Number(c.id_computadora) === Number(this.formPc.id_computadora),
      );

      const teniaSesion = pcActual?.estado_actual === 'OCUPADA' || !!(pcActual as any)?.sesion_activa;
      if (
        teniaSesion &&
        this.formPc.estado_actual !== 'OCUPADA' &&
        !this.cambioEstadoSesionConfirmado
      ) {
        const sesion = (pcActual as any)?.sesion_activa;
        this.advertenciaSesionActivaData.set({
          pcCodigo: pcActual?.codigo_equipo || this.formPc.codigo_equipo,
          estudianteNombre: sesion?.estudiante_nombres || 'un estudiante universitario',
          registro: sesion?.registro_estudiante || 'En curso',
          minutosActivo: sesion?.minutos_transcurridos ?? 1,
          nuevoEstado: this.formPc.estado_actual,
        });
        this.modalAdvertenciaSesionVisible.set(true);
        return;
      }
    }

    this.guardandoPc.set(true);
    this.errorModalPc.set(null);

    const payload: Partial<ComputadoraItem> = {
      id_sala: sala.id_sala,
      codigo_equipo: this.formPc.codigo_equipo.trim().toUpperCase(),
      posicion_fila: Number(this.formPc.posicion_fila),
      posicion_columna: Number(this.formPc.posicion_columna),
      estado_actual: this.formPc.estado_actual,
      ip_red: this.formPc.ip_red ? this.formPc.ip_red.trim() : null,
      mac_address: this.formPc.mac_address ? this.formPc.mac_address.trim() : null,
      horas_uso_acumuladas: Number(this.formPc.horas_uso_acumuladas),
      maquina_docente: this.formPc.maquina_docente,
    };

    if (this.modoEdicionPc() && this.formPc.id_computadora) {
      this.infraService
        .actualizarComputadora(this.formPc.id_computadora, payload)
        .subscribe({
          next: () => {
            this.guardandoPc.set(false);
            this.modalPcVisible.set(false);
            this.cargarSalaYEquipos(sala.id_sala);
          },
          error: (err) => {
            this.guardandoPc.set(false);
            const msg = err.error?.message || 'Error al actualizar el equipo.';
            this.errorModalPc.set(Array.isArray(msg) ? msg.join(', ') : msg);
          },
        });
    } else {
      this.infraService.crearComputadora(payload).subscribe({
        next: () => {
          this.guardandoPc.set(false);
          this.modalPcVisible.set(false);
          this.cargarSalaYEquipos(sala.id_sala);
        },
        error: (err) => {
          this.guardandoPc.set(false);
          const msg =
            err.error?.message ||
            'Error al dar de alta el equipo. Verifique la capacidad máxima o código repetido.';
          this.errorModalPc.set(Array.isArray(msg) ? msg.join(', ') : msg);
        },
      });
    }
  }

  confirmarCambioEstadoConSesion(): void {
    this.cambioEstadoSesionConfirmado = true;
    this.modalAdvertenciaSesionVisible.set(false);
    this.guardarPc();
    this.cambioEstadoSesionConfirmado = false;
  }

  solicitarRetiroPc(pc: ComputadoraItem): void {
    this.pcARetirar.set(pc);
    this.confirmModalPcMensaje.set(
      `¿Desea dar de baja o retirar el equipo "${pc.codigo_equipo}" de la sala? Sus periféricos volverán a bodega.`,
    );
    this.confirmModalPcVisible.set(true);
  }

  ejecutarRetiroPc(): void {
    const pc = this.pcARetirar();
    if (!pc) return;

    this.infraService.eliminarComputadora(pc.id_computadora).subscribe({
      next: () => {
        this.confirmModalPcVisible.set(false);
        this.cargarSalaYEquipos(this.idSalaActual());
      },
      error: (err) => {
        console.error('Error al retirar equipo:', err);
        this.confirmModalPcVisible.set(false);
      },
    });
  }
}
