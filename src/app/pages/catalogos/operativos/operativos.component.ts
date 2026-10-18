import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CatalogosService,
  HorarioItem,
  MotivoItem,
} from '../../../core/services/catalogos.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ConfirmModalComponent,
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
} from '../../../shared/components';

@Component({
  selector: 'app-operativos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmModalComponent,
    PaginationComponent,
    ModalAlertComponent,
    TableCardComponent,
  ],
  templateUrl: './operativos.component.html',
  styleUrls: ['./operativos.component.css'],
})
export class OperativosComponent implements OnInit {
  pestanaActiva = signal<'horarios' | 'motivos'>('horarios');
  readonly limite = 15;

  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  // ==========================================
  // ESTADO HORARIOS
  // ==========================================
  horarios = signal<HorarioItem[]>([]);
  horariosTotal = signal<number>(0);
  horarioPagina = signal<number>(1);
  filtroEstadoHorario = 'TODOS';

  mostrarModalHorario = signal<boolean>(false);
  editandoHorarioId = signal<number | null>(null);
  guardandoHorario = signal<boolean>(false);
  modalHorarioError = signal<string | null>(null);

  horarioForm = {
    turno: '',
    hora_inicio: '',
    hora_fin: '',
  };

  horarioErrors = signal<{ turno?: string; hora_inicio?: string; hora_fin?: string }>({});

  // ==========================================
  // ESTADO MOTIVOS
  // ==========================================
  motivos = signal<MotivoItem[]>([]);
  motivosTotal = signal<number>(0);
  motivoPagina = signal<number>(1);
  busquedaMotivo = '';
  filtroTipoMotivo = 'TODOS';
  filtroEstadoMotivo = 'TODOS';

  mostrarModalMotivo = signal<boolean>(false);
  editandoMotivoId = signal<number | null>(null);
  guardandoMotivo = signal<boolean>(false);
  modalMotivoError = signal<string | null>(null);

  motivoForm = {
    descrip: '',
    tipo: '',
  };

  motivoErrors = signal<{ descrip?: string; tipo?: string }>({});

  // ==========================================
  // CONFIRMACIÓN
  // ==========================================
  mostrarConfirmarEliminar = signal<boolean>(false);
  confirmacionTitulo = '';
  confirmacionMensaje = '';
  elementoAEliminar: { tipo: 'horario' | 'motivo'; id: number; nombre: string } | null = null;

  constructor(
    private catalogosService: CatalogosService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarHorarios();
    this.cargarMotivos();
  }

  puedeGestionar(): boolean {
    return this.authService.hasPermission('CAT_HORARIOS_GESTIONAR');
  }

  cambiarPestana(pestana: 'horarios' | 'motivos'): void {
    this.pestanaActiva.set(pestana);
    this.successMsg.set(null);
    this.errorMsg.set(null);
  }

  formatHora(hora: string): string {
    if (!hora) return '—';
    return hora.substring(0, 5);
  }

  // ==========================================
  // LÓGICA HORARIOS
  // ==========================================
  cargarHorarios(): void {
    const activoParam =
      this.filtroEstadoHorario === 'TODOS'
        ? undefined
        : this.filtroEstadoHorario === 'ACTIVOS';

    this.catalogosService
      .getHorarios({
        activo: activoParam,
        pagina: this.horarioPagina(),
        limite: this.limite,
      })
      .subscribe({
        next: (res) => {
          this.horarios.set(res.items);
          this.horariosTotal.set(res.total);
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error al cargar franjas horarias');
        },
      });
  }

  ejecutarBusquedaHorarios(): void {
    this.horarioPagina.set(1);
    this.cargarHorarios();
  }

  limpiarFiltrosHorarios(): void {
    this.filtroEstadoHorario = 'TODOS';
    this.horarioPagina.set(1);
    this.cargarHorarios();
  }

  cambiarPaginaHorario(p: number): void {
    this.horarioPagina.set(p);
    this.cargarHorarios();
  }

  abrirModalCrearHorario(): void {
    this.editandoHorarioId.set(null);
    this.horarioForm = { turno: 'MAÑANA', hora_inicio: '07:00', hora_fin: '12:00' };
    this.horarioErrors.set({});
    this.modalHorarioError.set(null);
    this.mostrarModalHorario.set(true);
  }

  abrirModalEditarHorario(h: HorarioItem): void {
    this.editandoHorarioId.set(h.id_horario);
    this.horarioForm = {
      turno: h.turno,
      hora_inicio: h.hora_inicio.substring(0, 5),
      hora_fin: h.hora_fin.substring(0, 5),
    };
    this.horarioErrors.set({});
    this.modalHorarioError.set(null);
    this.mostrarModalHorario.set(true);
  }

  cerrarModalHorario(): void {
    this.mostrarModalHorario.set(false);
    this.modalHorarioError.set(null);
    this.horarioErrors.set({});
  }

  validarHorario(): boolean {
    const errs: { turno?: string; hora_inicio?: string; hora_fin?: string } = {};

    if (!this.horarioForm.turno) {
      errs.turno = 'Seleccione el turno correspondiente (MAÑANA, TARDE o NOCHE)';
    }

    if (!this.horarioForm.hora_inicio) {
      errs.hora_inicio = 'La hora de inicio es requerida';
    }

    if (!this.horarioForm.hora_fin) {
      errs.hora_fin = 'La hora de finalización es requerida';
    } else if (
      this.horarioForm.hora_inicio &&
      this.horarioForm.hora_inicio >= this.horarioForm.hora_fin
    ) {
      errs.hora_fin = 'La hora de fin debe ser posterior a la hora de inicio';
    }

    this.horarioErrors.set(errs);
    return Object.keys(errs).length === 0;
  }

  guardarHorario(): void {
    if (!this.validarHorario()) return;

    this.guardandoHorario.set(true);
    this.modalHorarioError.set(null);

    const formatTime = (t: string) => (t.length === 5 ? `${t}:00` : t);

    const payload = {
      turno: this.horarioForm.turno.toUpperCase(),
      hora_inicio: formatTime(this.horarioForm.hora_inicio),
      hora_fin: formatTime(this.horarioForm.hora_fin),
    };

    const id = this.editandoHorarioId();
    const obs = id
      ? this.catalogosService.actualizarHorario(id, payload)
      : this.catalogosService.crearHorario(payload);

    obs.subscribe({
      next: () => {
        this.guardandoHorario.set(false);
        this.cerrarModalHorario();
        this.successMsg.set(
          id ? 'Franja horaria actualizada correctamente' : 'Franja horaria creada exitosamente',
        );
        this.cargarHorarios();
      },
      error: (err) => {
        this.guardandoHorario.set(false);
        this.modalHorarioError.set(
          err.error?.message || 'Error al guardar la franja horaria',
        );
      },
    });
  }

  abrirConfirmacionEliminarHorario(h: HorarioItem): void {
    this.elementoAEliminar = {
      tipo: 'horario',
      id: h.id_horario,
      nombre: `${h.turno} (${this.formatHora(h.hora_inicio)} - ${this.formatHora(h.hora_fin)})`,
    };
    this.confirmacionTitulo = 'Desactivar Franja Horaria';
    this.confirmacionMensaje = `¿Está seguro de que desea cambiar el estado de la franja horaria ${this.elementoAEliminar.nombre}?`;
    this.mostrarConfirmarEliminar.set(true);
  }

  // ==========================================
  // LÓGICA MOTIVOS
  // ==========================================
  cargarMotivos(): void {
    const tipoParam = this.filtroTipoMotivo === 'TODOS' ? undefined : this.filtroTipoMotivo;
    const activoParam =
      this.filtroEstadoMotivo === 'TODOS'
        ? undefined
        : this.filtroEstadoMotivo === 'ACTIVOS';

    this.catalogosService
      .getMotivos({
        tipo: tipoParam,
        busqueda: this.busquedaMotivo.trim() || undefined,
        activo: activoParam,
        pagina: this.motivoPagina(),
        limite: this.limite,
      })
      .subscribe({
        next: (res) => {
          this.motivos.set(res.items);
          this.motivosTotal.set(res.total);
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error al cargar motivos de uso');
        },
      });
  }

  ejecutarBusquedaMotivos(): void {
    this.motivoPagina.set(1);
    this.cargarMotivos();
  }

  limpiarFiltrosMotivos(): void {
    this.busquedaMotivo = '';
    this.filtroTipoMotivo = 'TODOS';
    this.filtroEstadoMotivo = 'TODOS';
    this.motivoPagina.set(1);
    this.cargarMotivos();
  }

  cambiarPaginaMotivo(p: number): void {
    this.motivoPagina.set(p);
    this.cargarMotivos();
  }

  abrirModalCrearMotivo(): void {
    this.editandoMotivoId.set(null);
    this.motivoForm = { descrip: '', tipo: 'ACADEMICO' };
    this.motivoErrors.set({});
    this.modalMotivoError.set(null);
    this.mostrarModalMotivo.set(true);
  }

  abrirModalEditarMotivo(m: MotivoItem): void {
    this.editandoMotivoId.set(m.id_motivo);
    this.motivoForm = { descrip: m.descrip, tipo: m.tipo };
    this.motivoErrors.set({});
    this.modalMotivoError.set(null);
    this.mostrarModalMotivo.set(true);
  }

  cerrarModalMotivo(): void {
    this.mostrarModalMotivo.set(false);
    this.modalMotivoError.set(null);
    this.motivoErrors.set({});
  }

  validarMotivo(): boolean {
    const errs: { descrip?: string; tipo?: string } = {};

    if (!this.motivoForm.descrip || !this.motivoForm.descrip.trim()) {
      errs.descrip = 'La descripción del motivo es obligatoria';
    } else if (this.motivoForm.descrip.trim().length > 100) {
      errs.descrip = 'La descripción no puede exceder 100 caracteres';
    }

    if (!this.motivoForm.tipo) {
      errs.tipo = 'Seleccione una categoría de uso (ACADEMICO, LIBRE, ADMINISTRATIVO)';
    }

    this.motivoErrors.set(errs);
    return Object.keys(errs).length === 0;
  }

  guardarMotivo(): void {
    if (!this.validarMotivo()) return;

    this.guardandoMotivo.set(true);
    this.modalMotivoError.set(null);

    const payload = {
      descrip: this.motivoForm.descrip.trim(),
      tipo: this.motivoForm.tipo.toUpperCase(),
    };

    const id = this.editandoMotivoId();
    const obs = id
      ? this.catalogosService.actualizarMotivo(id, payload)
      : this.catalogosService.crearMotivo(payload);

    obs.subscribe({
      next: () => {
        this.guardandoMotivo.set(false);
        this.cerrarModalMotivo();
        this.successMsg.set(
          id ? 'Motivo actualizado correctamente' : 'Motivo creado exitosamente',
        );
        this.cargarMotivos();
      },
      error: (err) => {
        this.guardandoMotivo.set(false);
        this.modalMotivoError.set(
          err.error?.message || 'Error al guardar el motivo de uso',
        );
      },
    });
  }

  abrirConfirmacionEliminarMotivo(m: MotivoItem): void {
    this.elementoAEliminar = {
      tipo: 'motivo',
      id: m.id_motivo,
      nombre: m.descrip,
    };
    this.confirmacionTitulo = 'Desactivar Motivo de Uso';
    this.confirmacionMensaje = `¿Está seguro de que desea cambiar el estado del motivo "${m.descrip}"?`;
    this.mostrarConfirmarEliminar.set(true);
  }

  ejecutarEliminacion(): void {
    if (!this.elementoAEliminar) return;

    const { tipo, id, nombre } = this.elementoAEliminar;
    this.mostrarConfirmarEliminar.set(false);

    if (tipo === 'horario') {
      this.catalogosService.eliminarHorario(id).subscribe({
        next: () => {
          this.successMsg.set(`Franja horaria "${nombre}" desactivada o eliminada correctamente`);
          this.cargarHorarios();
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error al procesar la baja del horario');
        },
      });
    } else {
      this.catalogosService.eliminarMotivo(id).subscribe({
        next: () => {
          this.successMsg.set(`Motivo de uso "${nombre}" desactivado o eliminado correctamente`);
          this.cargarMotivos();
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error al procesar la baja del motivo');
        },
      });
    }
  }
}
