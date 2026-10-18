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
  template: `
    <!-- HEADER -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Turnos de Auxiliares</h2>
        <p class="page-subtitle">
          Asignación semestral fija (6 meses) de franjas horarias a becarios auxiliares de sala
        </p>
      </div>

      <div class="header-actions">
        <button
          *ngIf="puedeGestionar()"
          class="citef-btn citef-btn-primary"
          (click)="abrirModalCrear()"
        >
          <i class="bi bi-calendar-plus"></i>
          <span>Asignar Turno</span>
        </button>
      </div>
    </div>

    <!-- MENSAJES DE ALERTA GLOBALES -->
    <div *ngIf="successMsg()" class="alert-banner alert-success">
      <i class="bi bi-check-circle-fill"></i>
      <span>{{ successMsg() }}</span>
    </div>

    <div *ngIf="errorMsg()" class="alert-banner alert-danger">
      <i class="bi bi-exclamation-triangle-fill"></i>
      <span>{{ errorMsg() }}</span>
    </div>

    <!-- BARRA DE FILTROS Y BÚSQUEDA -->
    <div class="citef-card filter-card mb-4">
      <form (ngSubmit)="ejecutarBusqueda()" class="filter-form">
        <div class="filter-grid">
          <div class="filter-field">
            <label class="filter-label">Semestre</label>
            <input
              type="text"
              class="citef-input"
              [(ngModel)]="filtroSemestre"
              name="filtroSemestre"
              placeholder="Ej: 1-2026"
            />
          </div>

          <div class="filter-field">
            <label class="filter-label">Auxiliar</label>
            <select
              class="citef-select"
              [(ngModel)]="filtroUsuario"
              name="filtroUsuario"
            >
              <option [ngValue]="null">Todos los auxiliares</option>
              <option *ngFor="let aux of auxiliaresDisponibles()" [ngValue]="aux.id_usuario">
                {{ aux.nombres }} {{ aux.apellidos }}
              </option>
            </select>
          </div>

          <div class="filter-field">
            <label class="filter-label">Estado</label>
            <select
              class="citef-select"
              [(ngModel)]="filtroEstado"
              name="filtroEstado"
            >
              <option value="TODOS">Todos</option>
              <option value="ACTIVOS">Activos</option>
              <option value="INACTIVOS">Inactivos</option>
            </select>
          </div>

          <div class="filter-actions">
            <button type="submit" class="citef-btn citef-btn-primary">
              <i class="bi bi-funnel"></i>
              <span>Buscar</span>
            </button>
            <button
              type="button"
              class="citef-btn citef-btn-secondary"
              (click)="limpiarFiltros()"
            >
              <i class="bi bi-arrow-counterclockwise"></i>
              <span>Limpiar</span>
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- TABLA DE ASIGNACIONES DE TURNOS -->
    <app-table-card
      title="Asignaciones de Guardia Semestrales"
      [subtitle]="'Total asignaciones registradas: ' + asignacionesTotal()"
    >
      <table class="citef-table">
        <thead>
          <tr>
            <th class="text-center" style="width: 70px">ID</th>
            <th>Auxiliar Becario</th>
            <th style="width: 170px">Turno Asignado</th>
            <th class="text-center" style="width: 120px">Semestre</th>
            <th class="text-center">Período de Vigencia (6 Meses)</th>
            <th class="text-center" style="width: 120px">Estado</th>
            <th class="text-center" style="width: 120px">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let a of asignaciones()">
            <td class="text-center text-muted font-monospace">#{{ a.id_asignacion_turno }}</td>
            <td>
              <strong class="user-fullname">
                {{ a.usuario ? a.usuario.nombres + ' ' + a.usuario.apellidos : 'ID: ' + a.id_usuario }}
              </strong>
              <div class="user-email" *ngIf="a.usuario?.correo_institucional">
                {{ a.usuario?.correo_institucional }}
              </div>
            </td>
            <td>
              <span
                class="shift-badge font-monospace"
                [ngClass]="'shift-' + (a.horario?.turno?.toLowerCase() || 'mañana')"
              >
                {{ a.horario?.turno || 'TURNO' }}
              </span>
              <div class="shift-hours" *ngIf="a.horario">
                {{ formatHora(a.horario.hora_inicio) }} – {{ formatHora(a.horario.hora_fin) }}
              </div>
            </td>
            <td class="text-center">
              <span class="badge-semester font-monospace">{{ a.semestre }}</span>
            </td>
            <td class="text-center">
              <span class="date-range font-monospace">
                <i class="bi bi-calendar3 me-1 text-muted"></i>
                {{ a.fecha_inicio }} <span class="text-muted">al</span> {{ a.fecha_fin }}
              </span>
            </td>
            <td class="text-center">
              <span
                class="citef-badge"
                [class.citef-badge-success]="a.activo"
                [class.citef-badge-danger]="!a.activo"
              >
                {{ a.activo ? 'Vigente' : 'Inactivo' }}
              </span>
            </td>
            <td class="text-center">
              <div class="action-buttons" *ngIf="puedeGestionar()">
                <button
                  type="button"
                  class="btn-icon btn-edit"
                  title="Editar asignación"
                  (click)="abrirModalEditar(a)"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  type="button"
                  class="btn-icon btn-delete"
                  [title]="a.activo ? 'Desactivar asignación' : 'Eliminar asignación'"
                  (click)="abrirConfirmacionEliminar(a)"
                >
                  <i class="bi bi-trash3"></i>
                </button>
              </div>
              <span *ngIf="!puedeGestionar()" class="text-muted small">
                <i class="bi bi-lock me-1"></i>Lectura
              </span>
            </td>
          </tr>

          <tr *ngIf="asignaciones().length === 0">
            <td colspan="7" class="empty-row">
              <div class="empty-state">
                <i class="bi bi-calendar-x"></i>
                <p>No se encontraron turnos asignados</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- PAGINACIÓN COMPARTIDA DE 15 FILAS -->
      <div card-footer>
        <app-pagination
          [paginaActual]="asignacionPagina()"
          [totalRegistros]="asignacionesTotal()"
          [tamanoPagina]="limite"
          etiqueta="turnos"
          (paginaCambiada)="cambiarPagina($event)"
        ></app-pagination>
      </div>
    </app-table-card>

    <!-- ======================================================== -->
    <!-- MODAL: CREAR / EDITAR ASIGNACIÓN DE TURNO -->
    <!-- ======================================================== -->
    <div *ngIf="mostrarModal()" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ editandoId() ? 'Editar Asignación de Turno' : 'Asignar Turno Semestral a Auxiliar' }}
          </h3>
          <button type="button" class="btn-close" (click)="cerrarModal()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <app-modal-alert
          [mensaje]="modalError()"
          (cerrar)="modalError.set(null)"
        ></app-modal-alert>

        <form (ngSubmit)="guardarAsignacion()" class="modal-form" novalidate>
          <div class="form-group">
            <label class="form-label">Auxiliar Becario <span class="req">*</span></label>
            <select
              class="citef-select"
              [class.input-error]="formErrors().id_usuario"
              [(ngModel)]="turnoForm.id_usuario"
              name="id_usuario"
            >
              <option [ngValue]="null" disabled>Seleccione auxiliar habilitado...</option>
              <option *ngFor="let aux of auxiliaresDisponibles()" [ngValue]="aux.id_usuario">
                {{ aux.nombres }} {{ aux.apellidos }} ({{ aux.correo_institucional }})
              </option>
            </select>
            <div class="field-error-text" *ngIf="formErrors().id_usuario">
              <i class="bi bi-exclamation-circle-fill me-1"></i>
              <span>{{ formErrors().id_usuario }}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label">Franja Horaria / Turno <span class="req">*</span></label>
              <select
                class="citef-select"
                [class.input-error]="formErrors().id_horario"
                [(ngModel)]="turnoForm.id_horario"
                name="id_horario"
              >
                <option [ngValue]="null" disabled>Seleccione horario...</option>
                <option *ngFor="let h of listaHorarios()" [ngValue]="h.id_horario">
                  {{ h.turno }} ({{ formatHora(h.hora_inicio) }} - {{ formatHora(h.hora_fin) }})
                </option>
              </select>
              <div class="field-error-text" *ngIf="formErrors().id_horario">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                <span>{{ formErrors().id_horario }}</span>
              </div>
            </div>

            <div class="form-group col-6">
              <label class="form-label">Semestre Operativo <span class="req">*</span></label>
              <input
                type="text"
                class="citef-input"
                [class.input-error]="formErrors().semestre"
                [(ngModel)]="turnoForm.semestre"
                name="semestre"
                placeholder="Ej: 1-2026"
              />
              <div class="field-error-text" *ngIf="formErrors().semestre">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                <span>{{ formErrors().semestre }}</span>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label">Fecha de Inicio <span class="req">*</span></label>
              <input
                type="date"
                class="citef-input"
                [class.input-error]="formErrors().fecha_inicio"
                [(ngModel)]="turnoForm.fecha_inicio"
                name="fecha_inicio"
                (change)="calcularFechaFin()"
              />
              <div class="field-error-text" *ngIf="formErrors().fecha_inicio">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                <span>{{ formErrors().fecha_inicio }}</span>
              </div>
            </div>

            <div class="form-group col-6">
              <label class="form-label">Fecha de Conclusión (6 Meses) <span class="req">*</span></label>
              <input
                type="date"
                class="citef-input"
                [class.input-error]="formErrors().fecha_fin"
                [(ngModel)]="turnoForm.fecha_fin"
                name="fecha_fin"
              />
              <div class="field-error-text" *ngIf="formErrors().fecha_fin">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                <span>{{ formErrors().fecha_fin }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="citef-btn citef-btn-secondary"
              (click)="cerrarModal()"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="citef-btn citef-btn-primary"
              [disabled]="guardando()"
            >
              <i class="bi bi-check2"></i>
              <span>{{ guardando() ? 'Guardando...' : 'Asignar Turno' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL DE CONFIRMACIÓN -->
    <app-confirm-modal
      [visible]="mostrarConfirmarEliminar()"
      title="Desactivar Asignación de Turno"
      [message]="confirmacionMensaje"
      [isDanger]="true"
      confirmBtnText="Sí, Desactivar"
      cancelBtnText="Cancelar"
      (confirmed)="ejecutarEliminacion()"
      (cancelled)="mostrarConfirmarEliminar.set(false)"
    ></app-confirm-modal>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
        gap: 1rem;
        flex-wrap: wrap;
      }

      .page-title {
        font-size: 1.6rem;
        font-weight: 700;
        color: var(--citef-primary, #002855);
        margin: 0;
      }

      .page-subtitle {
        font-size: 0.875rem;
        color: var(--citef-text-secondary, #64748b);
        margin: 0.25rem 0 0 0;
      }

      .header-actions {
        display: flex;
        gap: 0.75rem;
      }

      /* ALERT BANNERS */
      .alert-banner {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.75rem 1.25rem;
        border-radius: var(--citef-radius-sm, 6px);
        margin-bottom: 1.25rem;
        font-size: 0.875rem;
        font-weight: 500;
      }

      .alert-success {
        background-color: #f0fdf4;
        color: #16a34a;
        border: 1px solid #bbf7d0;
      }

      .alert-danger {
        background-color: #fef2f2;
        color: #dc2626;
        border: 1px solid #fecaca;
      }

      /* FILTERS */
      .filter-card {
        padding: 1.25rem;
      }

      .filter-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
        align-items: flex-end;
      }

      .filter-field {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .filter-label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: var(--citef-text-secondary, #64748b);
      }

      .filter-actions {
        display: flex;
        gap: 0.5rem;
        align-items: flex-end;
      }

      /* TABLE CONTENT */
      .user-fullname {
        color: #0f172a;
        font-weight: 600;
      }

      .user-email {
        font-size: 0.8rem;
        color: #64748b;
      }

      .shift-badge {
        display: inline-block;
        padding: 0.2rem 0.55rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .shift-mañana {
        background: #fef3c7;
        color: #92400e;
        border: 1px solid #fde68a;
      }

      .shift-tarde {
        background: #fed7aa;
        color: #9a3412;
        border: 1px solid #fdba74;
      }

      .shift-noche {
        background: #e2e8f0;
        color: #1e293b;
        border: 1px solid #cbd5e1;
      }

      .shift-hours {
        font-size: 0.775rem;
        color: #64748b;
        margin-top: 0.2rem;
        font-family: monospace;
      }

      .badge-semester {
        background: #f1f5f9;
        color: #0f172a;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8125rem;
        font-weight: 700;
        border: 1px solid #e2e8f0;
      }

      .date-range {
        font-size: 0.8125rem;
        color: #334155;
      }

      /* ACTION BUTTONS */
      .action-buttons {
        display: flex;
        justify-content: center;
        gap: 0.4rem;
      }

      .btn-icon {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 30px;
        height: 30px;
        border-radius: var(--citef-radius-sm, 6px);
        border: 1px solid #cbd5e1;
        background: #ffffff;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
        font-size: 0.875rem;
      }

      .btn-edit {
        color: #0284c7;
      }

      .btn-edit:hover {
        background: #e0f2fe;
        border-color: #0284c7;
      }

      .btn-delete {
        color: #dc2626;
      }

      .btn-delete:hover {
        background: #fee2e2;
        border-color: #dc2626;
      }

      .empty-row {
        text-align: center;
        padding: 3rem 1rem !important;
      }

      .empty-state {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 0.5rem;
        color: #94a3b8;
      }

      .empty-state i {
        font-size: 2.5rem;
      }

      /* MODAL */
      .modal-backdrop {
        position: fixed;
        inset: 0;
        background: rgba(15, 23, 42, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1050;
        padding: 1rem;
        animation: fadeIn 0.15s ease-in-out;
      }

      .modal-card {
        background: #ffffff;
        border-radius: var(--citef-radius-md, 8px);
        box-shadow: var(--citef-shadow-lg);
        width: 100%;
        max-width: 540px;
        overflow: hidden;
        animation: scaleUp 0.15s ease-in-out;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.15rem 1.5rem;
        border-bottom: 1px solid var(--citef-border, #e2e8f0);
      }

      .modal-title {
        font-size: 1.15rem;
        font-weight: 700;
        color: var(--citef-primary, #002855);
        margin: 0;
      }

      .btn-close {
        background: transparent;
        border: none;
        cursor: pointer;
        font-size: 1.1rem;
        color: #94a3b8;
        padding: 0.25rem;
      }

      .btn-close:hover {
        color: #0f172a;
      }

      .modal-form {
        padding: 1.5rem;
        display: flex;
        flex-direction: column;
        gap: 1.1rem;
      }

      .form-row {
        display: flex;
        gap: 1rem;
      }

      .col-6 {
        flex: 1;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .form-label {
        font-size: 0.8125rem;
        font-weight: 600;
        color: #334155;
      }

      .req {
        color: #dc2626;
      }

      .field-error-text {
        font-size: 0.775rem;
        color: #dc2626;
        font-weight: 500;
        display: flex;
        align-items: center;
        margin-top: 0.2rem;
      }

      .input-error {
        border-color: #dc2626 !important;
        background-color: #fffbfa;
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        padding-top: 1rem;
        border-top: 1px solid var(--citef-border, #e2e8f0);
        margin-top: 0.5rem;
      }

      @keyframes fadeIn {
        from {
          opacity: 0;
        }
        to {
          opacity: 1;
        }
      }

      @keyframes scaleUp {
        from {
          transform: scale(0.97);
        }
        to {
          transform: scale(1);
        }
      }
    `,
  ],
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
