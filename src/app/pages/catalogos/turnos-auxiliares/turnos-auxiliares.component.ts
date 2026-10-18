import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TurnosAuxiliaresService,
  AsignacionTurnoItem,
  AuxiliarUsuario,
  CrearAsignacionPayload,
} from '../../../core/services/turnos-auxiliares.service';
import {
  CatalogosService,
  HorarioItem,
} from '../../../core/services/catalogos.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ConfirmModalComponent,
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
} from '../../../shared/components';

@Component({
  selector: 'app-turnos-auxiliares',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmModalComponent,
    PaginationComponent,
    ModalAlertComponent,
    TableCardComponent,
  ],
  templateUrl: './turnos-auxiliares.component.html',
  styleUrls: ['./turnos-auxiliares.component.css'],
})
export class TurnosAuxiliaresComponent implements OnInit {
  readonly limite = 15;

  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  // ESTADO TABLA ASIGNACIONES
  asignaciones = signal<AsignacionTurnoItem[]>([]);
  asignacionesTotal = signal<number>(0);
  asignacionPagina = signal<number>(1);

  filtroSemestre = '';
  filtroUsuario: number | null = null;
  filtroEstado = 'TODOS';

  auxiliaresDisponibles = signal<AuxiliarUsuario[]>([]);
  listaHorarios = signal<HorarioItem[]>([]);

  // MODAL CREAR / EDITAR
  mostrarModal = signal<boolean>(false);
  editandoId = signal<number | null>(null);
  guardando = signal<boolean>(false);
  modalError = signal<string | null>(null);

  turnoForm = {
    id_usuario: null as number | null,
    id_horario: null as number | null,
    semestre: '1-2026',
    fecha_inicio: '',
    fecha_fin: '',
  };

  formErrors = signal<{
    id_usuario?: string;
    id_horario?: string;
    semestre?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
  }>({});

  // CONFIRMACIÓN
  mostrarConfirmarEliminar = signal<boolean>(false);
  confirmacionMensaje = '';
  asignacionAEliminar: AsignacionTurnoItem | null = null;

  constructor(
    private turnosService: TurnosAuxiliaresService,
    private catalogosService: CatalogosService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarAsignaciones();
    this.cargarAuxiliares();
    this.cargarHorarios();
  }

  puedeGestionar(): boolean {
    return this.authService.hasPermission('CAT_ASIGNAR_TURNOS');
  }

  formatHora(h?: string): string {
    if (!h) return '—';
    return h.substring(0, 5);
  }

  cargarAuxiliares(): void {
    this.turnosService.getAuxiliaresDisponibles().subscribe({
      next: (res) => this.auxiliaresDisponibles.set(res),
      error: () => {},
    });
  }

  cargarHorarios(): void {
    this.catalogosService.getHorariosTodos().subscribe({
      next: (res) => this.listaHorarios.set(res),
      error: () => {},
    });
  }

  cargarAsignaciones(): void {
    const activoParam =
      this.filtroEstado === 'TODOS'
        ? undefined
        : this.filtroEstado === 'ACTIVOS';

    this.turnosService
      .getAsignaciones({
        semestre: this.filtroSemestre.trim() || undefined,
        id_usuario: this.filtroUsuario || undefined,
        activo: activoParam,
        pagina: this.asignacionPagina(),
        limite: this.limite,
      })
      .subscribe({
        next: (res) => {
          this.asignaciones.set(res.items);
          this.asignacionesTotal.set(res.total);
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error al cargar asignaciones de turnos');
        },
      });
  }

  ejecutarBusqueda(): void {
    this.asignacionPagina.set(1);
    this.cargarAsignaciones();
  }

  limpiarFiltros(): void {
    this.filtroSemestre = '';
    this.filtroUsuario = null;
    this.filtroEstado = 'TODOS';
    this.asignacionPagina.set(1);
    this.cargarAsignaciones();
  }

  cambiarPagina(p: number): void {
    this.asignacionPagina.set(p);
    this.cargarAsignaciones();
  }

  calcularFechaFin(): void {
    if (this.turnoForm.fecha_inicio) {
      const fecha = new Date(this.turnoForm.fecha_inicio);
      if (!isNaN(fecha.getTime())) {
        fecha.setMonth(fecha.getMonth() + 6);
        const y = fecha.getFullYear();
        const m = String(fecha.getMonth() + 1).padStart(2, '0');
        const d = String(fecha.getDate()).padStart(2, '0');
        this.turnoForm.fecha_fin = `${y}-${m}-${d}`;
      }
    }
  }

  abrirModalCrear(): void {
    this.cargarAuxiliares();
    this.cargarHorarios();
    this.editandoId.set(null);
    const hoy = new Date();
    const hoyStr = hoy.toISOString().split('T')[0];

    this.turnoForm = {
      id_usuario: null,
      id_horario: null,
      semestre: '1-2026',
      fecha_inicio: hoyStr,
      fecha_fin: '',
    };
    this.calcularFechaFin();

    this.formErrors.set({});
    this.modalError.set(null);
    this.mostrarModal.set(true);
  }

  abrirModalEditar(a: AsignacionTurnoItem): void {
    this.cargarAuxiliares();
    this.cargarHorarios();
    this.editandoId.set(a.id_asignacion_turno);
    this.turnoForm = {
      id_usuario: a.id_usuario,
      id_horario: a.id_horario,
      semestre: a.semestre,
      fecha_inicio: a.fecha_inicio,
      fecha_fin: a.fecha_fin,
    };
    this.formErrors.set({});
    this.modalError.set(null);
    this.mostrarModal.set(true);
  }

  cerrarModal(): void {
    this.mostrarModal.set(false);
    this.modalError.set(null);
    this.formErrors.set({});
  }

  validar(): boolean {
    const errs: {
      id_usuario?: string;
      id_horario?: string;
      semestre?: string;
      fecha_inicio?: string;
      fecha_fin?: string;
    } = {};

    if (!this.turnoForm.id_usuario) {
      errs.id_usuario = 'Debe seleccionar un auxiliar becario habilitado';
    }

    if (!this.turnoForm.id_horario) {
      errs.id_horario = 'Debe seleccionar una franja horaria para el turno';
    }

    if (!this.turnoForm.semestre || !this.turnoForm.semestre.trim()) {
      errs.semestre = 'El semestre de gestión es requerido (ej: 1-2026)';
    }

    if (!this.turnoForm.fecha_inicio) {
      errs.fecha_inicio = 'La fecha de inicio de gestión es obligatoria';
    }

    if (!this.turnoForm.fecha_fin) {
      errs.fecha_fin = 'La fecha de finalización es obligatoria';
    } else if (
      this.turnoForm.fecha_inicio &&
      this.turnoForm.fecha_inicio >= this.turnoForm.fecha_fin
    ) {
      errs.fecha_fin = 'La fecha de fin debe ser posterior a la fecha de inicio';
    }

    this.formErrors.set(errs);
    return Object.keys(errs).length === 0;
  }

  guardarAsignacion(): void {
    if (!this.validar()) return;

    this.guardando.set(true);
    this.modalError.set(null);

    const payload: CrearAsignacionPayload = {
      id_usuario: Number(this.turnoForm.id_usuario),
      id_horario: Number(this.turnoForm.id_horario),
      semestre: this.turnoForm.semestre.trim(),
      fecha_inicio: this.turnoForm.fecha_inicio,
      fecha_fin: this.turnoForm.fecha_fin,
    };

    const id = this.editandoId();
    const obs = id
      ? this.turnosService.actualizarAsignacion(id, payload)
      : this.turnosService.crearAsignacion(payload);

    obs.subscribe({
      next: () => {
        this.guardando.set(false);
        this.cerrarModal();
        this.successMsg.set(
          id ? 'Asignación de turno actualizada correctamente' : 'Turno asignado exitosamente',
        );
        this.cargarAsignaciones();
      },
      error: (err) => {
        this.guardando.set(false);
        this.modalError.set(
          err.error?.message ||
            'Error al asignar el turno. Verifique que no exista superposición de horarios en el semestre.',
        );
      },
    });
  }

  abrirConfirmacionEliminar(a: AsignacionTurnoItem): void {
    this.asignacionAEliminar = a;
    const nombreAux = a.usuario
      ? `${a.usuario.nombres} ${a.usuario.apellidos}`
      : `Auxiliar #${a.id_usuario}`;
    const turno = a.horario ? a.horario.turno : 'Turno';

    this.confirmacionMensaje = `¿Está seguro de que desea desactivar o dar de baja el turno de "${turno}" (${a.semestre}) asignado a ${nombreAux}?`;
    this.mostrarConfirmarEliminar.set(true);
  }

  ejecutarEliminacion(): void {
    if (!this.asignacionAEliminar) return;

    const id = this.asignacionAEliminar.id_asignacion_turno;
    this.mostrarConfirmarEliminar.set(false);

    this.turnosService.eliminarAsignacion(id).subscribe({
      next: () => {
        this.successMsg.set('Asignación de turno desactivada o eliminada correctamente');
        this.cargarAsignaciones();
      },
      error: (err) => {
        this.errorMsg.set(err.error?.message || 'Error al procesar la baja de la asignación');
      },
    });
  }
}
