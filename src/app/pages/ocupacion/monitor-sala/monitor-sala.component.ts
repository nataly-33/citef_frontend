import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription, interval } from 'rxjs';
import {
  OcupacionService,
  SalaOcupacionEstado,
  ComputadoraOcupacionItem,
  ColaEsperaItem,
  EstudianteItem,
} from '../../../core/services/ocupacion.service';
import { InfraestructuraService, SalaItem } from '../../../core/services/infraestructura.service';
import { CatalogosService } from '../../../core/services/catalogos.service';
import { ModalAlertComponent } from '../../../shared/components/modal-alert/modal-alert.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';
import { LabCuadriculaComponent } from '../../../shared/components/lab-cuadricula/lab-cuadricula.component';

@Component({
  selector: 'app-monitor-sala',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ModalAlertComponent,
    ConfirmModalComponent,
    LabCuadriculaComponent,
  ],
  templateUrl: './monitor-sala.component.html',
  styleUrl: './monitor-sala.component.css',
})
export class MonitorSalaComponent implements OnInit, OnDestroy {
  // Salas y Estado
  salas = signal<SalaItem[]>([]);
  salaSeleccionadaId = signal<number>(1);
  estadoSala = signal<SalaOcupacionEstado | null>(null);
  cargando = signal<boolean>(false);
  errorGeneral = signal<string | null>(null);
  mensajeExito = signal<string | null>(null);
  socketConectado = signal<boolean>(false);

  // Catálogos
  motivos = signal<{ id_motivo: number; descrip: string; tipo: string }[]>([]);
  carreras = signal<{ id_carrera: number; nombre: string; codigo: string }[]>([]);

  // Subscripciones
  private subscriptions: Subscription = new Subscription();

  // Helper arrays para render de la cuadrícula
  filasArray = computed<number[]>(() => {
    const estado = this.estadoSala();
    const cantFilas = estado?.sala.filas_cuadricula || 6;
    return Array.from({ length: cantFilas }, (_, i) => i + 1);
  });

  columnasArray = computed<number[]>(() => {
    const estado = this.estadoSala();
    const cantCols = estado?.sala.columnas_cuadricula || 8;
    return Array.from({ length: cantCols }, (_, i) => i + 1);
  });

  // Modal Asignar
  modalAsignarVisible = signal<boolean>(false);
  computadoraSeleccionada = signal<ComputadoraOcupacionItem | null>(null);
  esAsignacionAutomatica = signal<boolean>(false);
  equipoSugerido = signal<ComputadoraOcupacionItem | null>(null);
  busquedaRegistro = signal<string>('');
  estudianteEncontrado = signal<EstudianteItem | null>(null);
  buscandoEstudiante = signal<boolean>(false);
  errorAsignar = signal<string | null>(null);
  alertaSancion = signal<string | null>(null);
  alertaSesionPrevia = signal<string | null>(null);
  motivoSeleccionado = signal<number>(1);
  observacionesAsignar = signal<string>('');
  guardandoAsignacion = signal<boolean>(false);

  // Registro rápido de estudiante nuevo
  mostrarFormNuevoEstudiante = signal<boolean>(false);
  formNuevoEstudiante = {
    registro: '',
    ci: '',
    nombres: '',
    apellidos: '',
    correo: '',
    id_carrera: 1,
  };
  erroresNuevoEstudiante = signal<Record<string, string>>({});

  // Modal Liberar
  modalLiberarVisible = signal<boolean>(false);
  computadoraALiberar = signal<ComputadoraOcupacionItem | null>(null);
  observacionesLiberar = signal<string>('');
  guardandoLiberacion = signal<boolean>(false);
  errorLiberar = signal<string | null>(null);

  // Modal Cola de Espera
  modalColaVisible = signal<boolean>(false);
  listaCola = signal<ColaEsperaItem[]>([]);
  cargandoCola = signal<boolean>(false);
  nuevoRegistroCola = signal<string>('');
  errorCola = signal<string | null>(null);
  guardandoCola = signal<boolean>(false);

  // Modal Detalle Sesión
  modalDetalleVisible = signal<boolean>(false);
  computadoraDetalle = signal<ComputadoraOcupacionItem | null>(null);

  constructor(
    private ocupacionService: OcupacionService,
    private infraestructuraService: InfraestructuraService,
    private catalogosService: CatalogosService,
  ) {}

  ngOnInit(): void {
    this.cargarCatalogosIniciales();

    // Escuchar socket en vivo
    this.subscriptions.add(
      this.ocupacionService.onSocketConectado().subscribe((conectado) => {
        this.socketConectado.set(conectado);
      }),
    );

    this.subscriptions.add(
      this.ocupacionService.onEstadoSalaActualizado().subscribe((nuevoEstado) => {
        if (nuevoEstado && nuevoEstado.sala.id_sala === this.salaSeleccionadaId()) {
          this.estadoSala.set(nuevoEstado);
        }
      }),
    );

    // Polling de seguridad y actualización de cronómetros cada 20s
    this.subscriptions.add(
      interval(20000).subscribe(() => {
        if (this.salaSeleccionadaId()) {
          this.refrescarEstadoSilencioso(this.salaSeleccionadaId());
        }
      }),
    );
  }

  ngOnDestroy(): void {
    if (this.salaSeleccionadaId()) {
      this.ocupacionService.desuscribirSala(this.salaSeleccionadaId());
    }
    this.subscriptions.unsubscribe();
  }

  cargarCatalogosIniciales() {
    this.infraestructuraService.getSalas({ activo: true }).subscribe({
      next: (salas) => {
        const activas = salas.filter((s) => s.activo && s.estado_operativo !== 'CERRADA');
        this.salas.set(activas);
        if (activas.length > 0) {
          const idInicial = activas[0].id_sala;
          this.cambiarSala(idInicial);
        }
      },
      error: () => {
        this.errorGeneral.set('No se pudo cargar la lista de laboratorios');
      },
    });

    this.catalogosService.getMotivos({ activo: true }).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.items || [];
        this.motivos.set(list);
        if (list.length > 0) {
          this.motivoSeleccionado.set(list[0].id_motivo);
        }
      },
    });

    this.catalogosService.getCarrerasTodas().subscribe({
      next: (list) => {
        const items = Array.isArray(list) ? list : (list as any)?.items || [];
        this.carreras.set(items);
        if (items.length > 0) {
          this.formNuevoEstudiante.id_carrera = items[0].id_carrera;
        }
      },
      error: () => {
        this.catalogosService.getCarreras({ activo: true }).subscribe({
          next: (res) => {
            const list = res?.items || [];
            this.carreras.set(list);
            if (list.length > 0) {
              this.formNuevoEstudiante.id_carrera = list[0].id_carrera;
            }
          },
        });
      },
    });
  }

  cambiarSala(idSala: number) {
    if (this.salaSeleccionadaId()) {
      this.ocupacionService.desuscribirSala(this.salaSeleccionadaId());
    }

    this.salaSeleccionadaId.set(Number(idSala));
    this.ocupacionService.suscribirSala(Number(idSala));
    this.cargarEstadoSala(Number(idSala));
  }

  cargarEstadoSala(idSala: number) {
    this.cargando.set(true);
    this.errorGeneral.set(null);
    this.ocupacionService.obtenerEstadoSala(idSala).subscribe({
      next: (estado) => {
        this.estadoSala.set(estado);
        this.cargando.set(false);
      },
      error: (err) => {
        this.cargando.set(false);
        this.errorGeneral.set(err?.error?.message || 'Error al obtener ocupación del laboratorio');
      },
    });
  }

  refrescarEstadoSilencioso(idSala: number) {
    this.ocupacionService.obtenerEstadoSala(idSala).subscribe({
      next: (estado) => {
        this.estadoSala.set(estado);
      },
      error: () => {},
    });
  }

  getPcEnCoordenada(fila: number, col: number): ComputadoraOcupacionItem | undefined {
    return this.estadoSala()?.computadoras.find(
      (pc) => pc.posicion_fila === fila && pc.posicion_columna === col,
    );
  }

  // ================= MODAL ASIGNAR EQUIPO =================
  abrirModalAsignarManual(pc: ComputadoraOcupacionItem) {
    if (pc.estado_actual !== 'DISPONIBLE') return;
    this.computadoraSeleccionada.set(pc);
    this.esAsignacionAutomatica.set(false);
    this.equipoSugerido.set(null);
    this.limpiarFormAsignar();
    this.modalAsignarVisible.set(true);
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

  abrirModalAsignarAutomatico() {
    this.computadoraSeleccionada.set(null);
    this.esAsignacionAutomatica.set(true);
    this.limpiarFormAsignar();

    const disponibles = this.estadoSala()?.kpis?.disponibles ?? 0;
    if (disponibles === 0) {
      this.equipoSugerido.set(null);
      this.errorAsignar.set(
        'El laboratorio se encuentra al 100% de saturación (0 puestos libres). No es posible asignar en este instante.',
      );
    } else {
      // Consultar puesto sugerido por horas de uso
      this.ocupacionService.sugerirEquipoBalanceado(this.salaSeleccionadaId()).subscribe({
        next: (res) => {
          this.equipoSugerido.set(res.equipo);
          if (!res.equipo) {
            this.errorAsignar.set('No hay puestos de cómputo disponibles en esta sala.');
          }
        },
        error: (err) => {
          this.equipoSugerido.set(null);
          this.errorAsignar.set(err?.error?.message || 'No hay puestos disponibles.');
        },
      });
    }

    this.modalAsignarVisible.set(true);
  }

  limpiarFormAsignar() {
    this.busquedaRegistro.set('');
    this.estudianteEncontrado.set(null);
    this.errorAsignar.set(null);
    this.alertaSancion.set(null);
    this.alertaSesionPrevia.set(null);
    this.observacionesAsignar.set('');
    this.mostrarFormNuevoEstudiante.set(false);
    this.erroresNuevoEstudiante.set({});
  }

  buscarEstudiante() {
    const reg = this.busquedaRegistro().trim();
    if (!reg) return;

    this.buscandoEstudiante.set(true);
    this.errorAsignar.set(null);
    this.alertaSancion.set(null);
    this.alertaSesionPrevia.set(null);
    this.estudianteEncontrado.set(null);

    this.ocupacionService.buscarEstudiantePorRegistro(reg).subscribe({
      next: (res) => {
        this.buscandoEstudiante.set(false);
        this.estudianteEncontrado.set(res.estudiante);

        if (res.sancionado) {
          this.alertaSancion.set(
            `El estudiante presenta sanción técnica activa: ${res.motivo_sancion || 'Investigación en curso'}`,
          );
        }

        if (res.sesion_activa) {
          const sesion = res.sesion_activa;
          this.alertaSesionPrevia.set(
            `El estudiante ya tiene una sesión activa en ${sesion.computadora?.codigo_equipo} (${sesion.computadora?.sala?.codigo_sala || ''}). No puede tener dos sesiones simultáneas.`,
          );
        }
      },
      error: (err) => {
        this.buscandoEstudiante.set(false);
        if (err.status === 404) {
          this.errorAsignar.set(
            `Estudiante con RU ${reg} no registrado. Puede registrarlo inmediatamente con el botón inferior.`,
          );
        } else {
          this.errorAsignar.set(err?.error?.message || 'Error al buscar estudiante');
        }
      },
    });
  }

  activarRegistroNuevoEstudiante() {
    this.mostrarFormNuevoEstudiante.set(true);
    this.formNuevoEstudiante = {
      registro: this.busquedaRegistro().trim(),
      ci: '',
      nombres: '',
      apellidos: '',
      correo: '',
      id_carrera: this.carreras()[0]?.id_carrera || 1,
    };
    this.erroresNuevoEstudiante.set({});
  }

  guardarNuevoEstudiante() {
    const errores: Record<string, string> = {};
    if (!this.formNuevoEstudiante.registro.trim()) errores['registro'] = 'El registro es obligatorio';
    if (!this.formNuevoEstudiante.ci.trim()) errores['ci'] = 'La cédula es obligatoria';
    if (!this.formNuevoEstudiante.nombres.trim()) errores['nombres'] = 'Los nombres son obligatorios';
    if (!this.formNuevoEstudiante.apellidos.trim()) errores['apellidos'] = 'Los apellidos son obligatorios';
    if (!this.formNuevoEstudiante.id_carrera) errores['carrera'] = 'Debe seleccionar una carrera';

    if (Object.keys(errores).length > 0) {
      this.erroresNuevoEstudiante.set(errores);
      return;
    }

    const payload = {
      registro: this.formNuevoEstudiante.registro.trim(),
      ci: this.formNuevoEstudiante.ci.trim(),
      nombres: this.formNuevoEstudiante.nombres.trim(),
      apellidos: this.formNuevoEstudiante.apellidos.trim(),
      correo: this.formNuevoEstudiante.correo?.trim() || undefined,
      id_carrera: Number(this.formNuevoEstudiante.id_carrera),
    };

    this.ocupacionService.registrarEstudiante(payload).subscribe({
      next: (est) => {
        this.estudianteEncontrado.set(est);
        this.mostrarFormNuevoEstudiante.set(false);
        this.busquedaRegistro.set(est.registro);
        this.errorAsignar.set(null);
      },
      error: (err) => {
        this.errorAsignar.set(err?.error?.message || 'Error al registrar estudiante');
      },
    });
  }

  confirmarAsignacion() {
    const estudiante = this.estudianteEncontrado();
    if (!estudiante) {
      this.errorAsignar.set('Debe buscar y seleccionar un estudiante válido');
      return;
    }

    if (this.alertaSancion()) {
      this.errorAsignar.set('No se puede asignar puesto a un estudiante sancionado');
      return;
    }

    if (this.alertaSesionPrevia()) {
      this.errorAsignar.set('El estudiante ya cuenta con otra sesión activa');
      return;
    }

    const payload: any = {
      id_sala: Number(this.salaSeleccionadaId()),
      registro_estudiante: estudiante.registro,
      id_motivo: Number(this.motivoSeleccionado()),
      asignacion_automatica: this.esAsignacionAutomatica(),
      observaciones: this.observacionesAsignar().trim() || undefined,
    };

    if (!this.esAsignacionAutomatica() && this.computadoraSeleccionada()) {
      payload.id_computadora = Number(this.computadoraSeleccionada()?.id_computadora);
    }

    this.guardandoAsignacion.set(true);
    this.ocupacionService.asignarEquipo(payload).subscribe({
      next: (res) => {
        this.guardandoAsignacion.set(false);
        this.modalAsignarVisible.set(false);
        this.mensajeExito.set(res.mensaje || 'Puesto asignado con éxito');
        this.cargarEstadoSala(this.salaSeleccionadaId());
        setTimeout(() => this.mensajeExito.set(null), 4000);
      },
      error: (err) => {
        this.guardandoAsignacion.set(false);
        this.errorAsignar.set(err?.error?.message || 'Error al asignar equipo');
      },
    });
  }

  // ================= MODAL LIBERAR EQUIPO =================
  abrirModalLiberar(pc: ComputadoraOcupacionItem, event?: MouseEvent) {
    if (event) event.stopPropagation();
    if (pc.estado_actual !== 'OCUPADA') return;
    this.computadoraALiberar.set(pc);
    this.observacionesLiberar.set('');
    this.errorLiberar.set(null);
    this.modalLiberarVisible.set(true);
  }

  confirmarLiberacion() {
    const pc = this.computadoraALiberar();
    if (!pc) return;

    this.guardandoLiberacion.set(true);
    this.ocupacionService
      .liberarEquipo({
        id_computadora: pc.id_computadora,
        observaciones: this.observacionesLiberar().trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.guardandoLiberacion.set(false);
          this.modalLiberarVisible.set(false);
          let msg = res.mensaje || 'Puesto liberado exitosamente';
          if (res.cola_pendiente_conteo > 0) {
            msg += ` — ¡Atención: Hay ${res.cola_pendiente_conteo} estudiante(s) en cola de espera!`;
          }
          this.mensajeExito.set(msg);
          this.cargarEstadoSala(this.salaSeleccionadaId());
          setTimeout(() => this.mensajeExito.set(null), 5000);
        },
        error: (err) => {
          this.guardandoLiberacion.set(false);
          this.errorLiberar.set(err?.error?.message || 'Error al liberar puesto');
        },
      });
  }

  // ================= MODAL DETALLE SESIÓN =================
  abrirModalDetalle(pc: ComputadoraOcupacionItem, event?: MouseEvent) {
    if (event) event.stopPropagation();
    this.computadoraDetalle.set(pc);
    this.modalDetalleVisible.set(true);
  }

  // ================= MODAL COLA DE ESPERA =================
  abrirModalCola() {
    this.modalColaVisible.set(true);
    this.cargarCola();
  }

  cargarCola() {
    this.cargandoCola.set(true);
    this.errorCola.set(null);
    this.ocupacionService.obtenerColaSala(this.salaSeleccionadaId()).subscribe({
      next: (cola) => {
        this.listaCola.set(cola);
        this.cargandoCola.set(false);
      },
      error: () => {
        this.cargandoCola.set(false);
        this.errorCola.set('Error al cargar cola de espera');
      },
    });
  }

  agregarACola() {
    const reg = this.nuevoRegistroCola().trim();
    if (!reg) return;

    this.guardandoCola.set(true);
    this.errorCola.set(null);
    this.ocupacionService
      .encolarEstudiante({
        id_sala: this.salaSeleccionadaId(),
        registro_estudiante: reg,
      })
      .subscribe({
        next: () => {
          this.guardandoCola.set(false);
          this.nuevoRegistroCola.set('');
          this.cargarCola();
          this.refrescarEstadoSilencioso(this.salaSeleccionadaId());
        },
        error: (err) => {
          this.guardandoCola.set(false);
          this.errorCola.set(err?.error?.message || 'No se pudo agregar a la cola');
        },
      });
  }

  cancelarTurnoCola(item: ColaEsperaItem) {
    this.ocupacionService.cancelarTurnoCola(item.id_cola).subscribe({
      next: () => {
        this.cargarCola();
        this.refrescarEstadoSilencioso(this.salaSeleccionadaId());
      },
      error: (err) => {
        this.errorCola.set(err?.error?.message || 'No se pudo cancelar turno');
      },
    });
  }

  asignarInmediatoDesdeCola(item: ColaEsperaItem) {
    const kpis = this.estadoSala()?.kpis;
    if (!kpis || kpis.disponibles === 0) {
      this.errorCola.set(
        '¡Laboratorio al 100% de saturación! No existen puestos disponibles actualmente. Debe esperar a que un estudiante concluya su sesión activa para poder asignar.',
      );
      return;
    }

    this.modalColaVisible.set(false);
    this.abrirModalAsignarAutomatico();
    this.busquedaRegistro.set(item.registro_estudiante);
    this.buscarEstudiante();
  }
}
