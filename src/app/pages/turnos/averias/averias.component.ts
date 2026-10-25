import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TurnosService,
  AveriaEquipo,
  ReportarAveriaDto,
  UltimoUsuarioComputadoraResponse,
} from '../../../core/services/turnos.service';
import {
  InfraestructuraService,
  SalaItem,
  ComputadoraItem,
} from '../../../core/services/infraestructura.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ConfirmModalComponent,
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
  SelectorComputadoraModalComponent,
} from '../../../shared/components';

@Component({
  selector: 'app-averias',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmModalComponent,
    PaginationComponent,
    ModalAlertComponent,
    TableCardComponent,
    SelectorComputadoraModalComponent,
  ],
  templateUrl: './averias.component.html',
  styleUrls: ['./averias.component.css'],
})
export class AveriasComponent implements OnInit {
  private readonly turnosService = inject(TurnosService);
  private readonly infraService = inject(InfraestructuraService);
  readonly authService = inject(AuthService);

  // Estados reactivos de tabla
  cargando = signal<boolean>(false);
  cargandoComputadoras = signal<boolean>(false);
  consultandoContexto = signal<boolean>(false);
  averias = signal<AveriaEquipo[]>([]);
  totalRegistros = signal<number>(0);
  paginaActual = signal<number>(1);
  readonly limite = 15;

  // Catálogos
  salas = signal<SalaItem[]>([]);
  computadorasSala = signal<ComputadoraItem[]>([]);

  // Filtros de búsqueda
  filtroBusqueda = signal<string>('');
  filtroSala = signal<number | null>(null);
  filtroGravedad = signal<string>('TODOS');
  filtroEstado = signal<string>('TODOS');

  // Mensajes de alerta global
  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  // Modales
  mostrarModalReportar = signal<boolean>(false);
  mostrarModalCambiarEstado = signal<boolean>(false);
  mostrarModalDetalle = signal<boolean>(false);
  mostrarModalEditar = signal<boolean>(false);
  mostrarConfirmEliminar = signal<boolean>(false);
  mostrarModalPlano = signal<boolean>(false);

  abrirModalPlano(): void {
    if (!this.reporteForm.id_sala) return;
    this.mostrarModalPlano.set(true);
  }

  onComputadoraSeleccionadaEnPlano(pc: ComputadoraItem): void {
    this.reporteForm.id_computadora = Number(pc.id_computadora);
    this.alCambiarComputadoraReporte(Number(pc.id_computadora));
    this.mostrarModalPlano.set(false);
  }

  // Formulario Reportar Avería (CU22)
  reporteForm = {
    id_sala: null as number | null,
    id_computadora: null as number | null,
    tipo_falla: 'HARDWARE' as 'HARDWARE' | 'SOFTWARE' | 'RED' | 'PERIFERICO',
    gravedad: 'MEDIA' as 'BAJA' | 'MEDIA' | 'CRITICA',
    descrip_falla: '',
    registro_ultimo_estudiante: '' as string,
    id_reserva: null as number | null,
  };
  formErrorsReporte = signal<{ [key: string]: string }>({});
  modalAlertReporte = signal<string | null>(null);

  // Auto-vinculación contextual
  contextoComputadora = signal<UltimoUsuarioComputadoraResponse | null>(null);

  // Formulario Cambiar Estado
  estadoForm = {
    estado: 'EN_TALLER' as 'PENDIENTE_REVISION' | 'EN_TALLER' | 'REPARADO' | 'DESCARTADO',
    solucion_tecnica: '',
  };
  formErrorsEstado = signal<{ [key: string]: string }>({});
  modalAlertEstado = signal<string | null>(null);

  // Selección de registro
  averiaSeleccionada = signal<AveriaEquipo | null>(null);
  averiaAEliminar = signal<AveriaEquipo | null>(null);

  // Formulario Editar
  editarForm = {
    tipo_falla: 'HARDWARE' as 'HARDWARE' | 'SOFTWARE' | 'RED' | 'PERIFERICO',
    gravedad: 'MEDIA' as 'BAJA' | 'MEDIA' | 'CRITICA',
    descrip_falla: '',
  };

  ngOnInit(): void {
    this.cargarSalas();
    this.cargarAverias();
  }

  cargarSalas(): void {
    this.infraService.getSalas({ activo: true }).subscribe({
      next: (res) => this.salas.set(res || []),
      error: () => this.salas.set([]),
    });
  }

  cargarAverias(): void {
    this.cargando.set(true);
    this.turnosService
      .getAverias({
        pagina: this.paginaActual(),
        limite: this.limite,
        id_sala: this.filtroSala() || undefined,
        gravedad: this.filtroGravedad(),
        estado: this.filtroEstado(),
        busqueda: this.filtroBusqueda().trim() || undefined,
      })
      .subscribe({
        next: (resp) => {
          this.averias.set(resp?.data || (resp as any)?.items || []);
          this.totalRegistros.set(resp?.total || 0);
          this.cargando.set(false);
        },
        error: (err) => {
          console.error('Error al cargar averías', err);
          this.averias.set([]);
          this.totalRegistros.set(0);
          this.cargando.set(false);
        },
      });
  }

  aplicarFiltros(): void {
    this.paginaActual.set(1);
    this.cargarAverias();
  }

  limpiarFiltros(): void {
    this.filtroBusqueda.set('');
    this.filtroSala.set(null);
    this.filtroGravedad.set('TODOS');
    this.filtroEstado.set('TODOS');
    this.paginaActual.set(1);
    this.cargarAverias();
  }

  cambiarPagina(p: number): void {
    this.paginaActual.set(p);
    this.cargarAverias();
  }

  // ================= MODAL REPORTAR AVERÍA =================
  abrirModalReportar(): void {
    this.formErrorsReporte.set({});
    this.modalAlertReporte.set(null);
    this.contextoComputadora.set(null);
    this.computadorasSala.set([]);

    const primeraSala = this.salas().length > 0 ? this.salas()[0].id_sala : null;
    this.reporteForm = {
      id_sala: primeraSala,
      id_computadora: null,
      tipo_falla: 'HARDWARE',
      gravedad: 'MEDIA',
      descrip_falla: '',
      registro_ultimo_estudiante: '',
      id_reserva: null,
    };

    if (primeraSala) {
      this.alCambiarSalaReporte(primeraSala);
    }

    this.mostrarModalReportar.set(true);
  }

  cerrarModalReportar(): void {
    this.mostrarModalReportar.set(false);
  }

  alCambiarSalaReporte(idSala: number | null): void {
    this.reporteForm.id_computadora = null;
    this.contextoComputadora.set(null);
    this.computadorasSala.set([]);

    if (!idSala) return;

    this.cargandoComputadoras.set(true);
    this.infraService.getComputadorasPorSala(Number(idSala)).subscribe({
      next: (res) => {
        this.computadorasSala.set(res?.computadoras || []);
        this.cargandoComputadoras.set(false);
      },
      error: () => {
        this.computadorasSala.set([]);
        this.cargandoComputadoras.set(false);
      },
    });
  }

  alCambiarComputadoraReporte(idComputadora: number | null): void {
    this.contextoComputadora.set(null);
    this.reporteForm.registro_ultimo_estudiante = '';
    this.reporteForm.id_reserva = null;

    if (!idComputadora) return;

    this.consultandoContexto.set(true);
    this.turnosService.getUltimoUsuarioComputadora(Number(idComputadora)).subscribe({
      next: (ctx) => {
        this.consultandoContexto.set(false);
        this.contextoComputadora.set(ctx);
        if (ctx?.ultimo_estudiante?.registro) {
          this.reporteForm.registro_ultimo_estudiante = ctx.ultimo_estudiante.registro;
        }
        if (ctx?.reserva_reciente?.id_reserva) {
          this.reporteForm.id_reserva = ctx.reserva_reciente.id_reserva;
        }
      },
      error: (err) => {
        console.warn('No se pudo precargar contexto de computadora', err);
        this.consultandoContexto.set(false);
        this.contextoComputadora.set(null);
      },
    });
  }

  confirmarReporteAveria(): void {
    this.formErrorsReporte.set({});
    this.modalAlertReporte.set(null);

    const errores: { [key: string]: string } = {};
    if (!this.reporteForm.id_sala) {
      errores['id_sala'] = 'Debe seleccionar la sala o laboratorio.';
    }
    if (!this.reporteForm.id_computadora) {
      errores['id_computadora'] = 'Debe seleccionar la computadora averiada.';
    }
    if (!this.reporteForm.descrip_falla.trim()) {
      errores['descrip_falla'] = 'Debe describir con detalle la falla técnica detectada.';
    }

    if (Object.keys(errores).length > 0) {
      this.formErrorsReporte.set(errores);
      return;
    }

    const payload: ReportarAveriaDto = {
      id_sala: Number(this.reporteForm.id_sala),
      id_computadora: Number(this.reporteForm.id_computadora),
      tipo_falla: this.reporteForm.tipo_falla,
      gravedad: this.reporteForm.gravedad,
      descrip_falla: this.reporteForm.descrip_falla.trim(),
      registro_ultimo_estudiante: this.reporteForm.registro_ultimo_estudiante.trim() || undefined,
      id_reserva: this.reporteForm.id_reserva ? Number(this.reporteForm.id_reserva) : undefined,
    };

    this.cargando.set(true);
    this.turnosService.reportarAveria(payload).subscribe({
      next: (averiaCreada) => {
        this.cargando.set(false);
        this.mostrarModalReportar.set(false);
        this.mensajeExito.set(
          `Avería #${averiaCreada.id_averia} reportada con éxito. Equipo marcado EN_MANTENIMIENTO.`,
        );
        setTimeout(() => this.mensajeExito.set(null), 4500);
        this.cargarAverias();
      },
      error: (err) => {
        this.cargando.set(false);
        this.modalAlertReporte.set(
          err?.error?.message || 'Error al reportar la avería en el servidor. Intente nuevamente.',
        );
      },
    });
  }

  // ================= MODAL CAMBIAR ESTADO =================
  abrirModalCambiarEstado(a: AveriaEquipo): void {
    this.averiaSeleccionada.set(a);
    this.estadoForm = {
      estado: a.estado as any,
      solucion_tecnica: a.solucion_tecnica || '',
    };
    this.formErrorsEstado.set({});
    this.modalAlertEstado.set(null);
    this.mostrarModalCambiarEstado.set(true);
  }

  cerrarModalCambiarEstado(): void {
    this.mostrarModalCambiarEstado.set(false);
  }

  confirmarCambioEstado(): void {
    const a = this.averiaSeleccionada();
    if (!a) return;

    this.formErrorsEstado.set({});
    this.modalAlertEstado.set(null);

    if (this.estadoForm.estado === 'REPARADO' && !this.estadoForm.solucion_tecnica.trim()) {
      this.formErrorsEstado.set({
        solucion_tecnica: 'Para marcar como REPARADO debe registrar la solución técnica aplicada.',
      });
      return;
    }

    this.cargando.set(true);
    this.turnosService
      .cambiarEstadoAveria(a.id_averia, {
        estado: this.estadoForm.estado,
        solucion_tecnica: this.estadoForm.solucion_tecnica.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.mostrarModalCambiarEstado.set(false);
          this.mensajeExito.set(`Estado de Avería #${a.id_averia} actualizado a ${this.estadoForm.estado}.`);
          setTimeout(() => this.mensajeExito.set(null), 4000);
          this.cargarAverias();
        },
        error: (err) => {
          this.cargando.set(false);
          this.modalAlertEstado.set(err?.error?.message || 'Error al cambiar estado de la avería.');
        },
      });
  }

  // ================= MODAL VER DETALLE =================
  verDetalleAveria(a: AveriaEquipo): void {
    this.averiaSeleccionada.set(a);
    this.mostrarModalDetalle.set(true);
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle.set(false);
  }

  // ================= MODAL EDITAR =================
  abrirModalEditar(a: AveriaEquipo): void {
    this.averiaSeleccionada.set(a);
    this.editarForm = {
      tipo_falla: a.tipo_falla,
      gravedad: a.gravedad,
      descrip_falla: a.descrip_falla,
    };
    this.mostrarModalEditar.set(true);
  }

  cerrarModalEditar(): void {
    this.mostrarModalEditar.set(false);
  }

  guardarEdicion(): void {
    const a = this.averiaSeleccionada();
    if (!a) return;

    this.cargando.set(true);
    this.turnosService
      .actualizarAveria(a.id_averia, {
        tipo_falla: this.editarForm.tipo_falla,
        gravedad: this.editarForm.gravedad,
        descrip_falla: this.editarForm.descrip_falla.trim(),
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.mostrarModalEditar.set(false);
          this.mensajeExito.set(`Avería #${a.id_averia} modificada correctamente.`);
          setTimeout(() => this.mensajeExito.set(null), 3500);
          this.cargarAverias();
        },
        error: (err) => {
          this.cargando.set(false);
          this.mensajeError.set(err?.error?.message || 'Error al actualizar avería.');
          setTimeout(() => this.mensajeError.set(null), 4000);
        },
      });
  }

  // ================= ELIMINAR / DESCARTAR =================
  solicitarEliminar(a: AveriaEquipo): void {
    this.averiaAEliminar.set(a);
    this.mostrarConfirmEliminar.set(true);
  }

  confirmarEliminar(): void {
    const a = this.averiaAEliminar();
    if (!a) return;

    this.cargando.set(true);
    this.turnosService.eliminarAveria(a.id_averia).subscribe({
      next: () => {
        this.cargando.set(false);
        this.mostrarConfirmEliminar.set(false);
        this.averiaAEliminar.set(null);
        this.mensajeExito.set(`Incidencia #${a.id_averia} eliminada exitosamente.`);
        setTimeout(() => this.mensajeExito.set(null), 3500);
        this.cargarAverias();
      },
      error: (err) => {
        this.cargando.set(false);
        this.mostrarConfirmEliminar.set(false);
        this.mensajeError.set(err?.error?.message || 'No se pudo eliminar la avería.');
        setTimeout(() => this.mensajeError.set(null), 4000);
      },
    });
  }

  cancelarEliminar(): void {
    this.mostrarConfirmEliminar.set(false);
    this.averiaAEliminar.set(null);
  }
}
