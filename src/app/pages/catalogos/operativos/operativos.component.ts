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
  template: `
    <!-- HEADER -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Parámetros Operativos</h2>
        <p class="page-subtitle">
          Configuración de Franjas Horarias y Motivos de Uso Autorizados
        </p>
      </div>

      <div class="header-actions">
        <button
          *ngIf="pestanaActiva() === 'horarios' && puedeGestionar()"
          class="citef-btn citef-btn-primary"
          (click)="abrirModalCrearHorario()"
        >
          <i class="bi bi-clock-history"></i>
          <span>Nueva Franja Horaria</span>
        </button>

        <button
          *ngIf="pestanaActiva() === 'motivos' && puedeGestionar()"
          class="citef-btn citef-btn-primary"
          (click)="abrirModalCrearMotivo()"
        >
          <i class="bi bi-tag"></i>
          <span>Nuevo Motivo de Uso</span>
        </button>
      </div>
    </div>

    <!-- TABS DE NAVEGACIÓN -->
    <div class="nav-tabs-container mb-4">
      <button
        type="button"
        class="tab-btn"
        [class.active]="pestanaActiva() === 'horarios'"
        (click)="cambiarPestana('horarios')"
      >
        <i class="bi bi-clock me-2"></i>
        <span>Franjas Horarias</span>
        <span class="tab-badge" *ngIf="horariosTotal() > 0">{{ horariosTotal() }}</span>
      </button>

      <button
        type="button"
        class="tab-btn"
        [class.active]="pestanaActiva() === 'motivos'"
        (click)="cambiarPestana('motivos')"
      >
        <i class="bi bi-bookmarks me-2"></i>
        <span>Motivos de Uso</span>
        <span class="tab-badge" *ngIf="motivosTotal() > 0">{{ motivosTotal() }}</span>
      </button>
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

    <!-- ======================================================== -->
    <!-- PESTAÑA 1: FRANJAS HORARIAS -->
    <!-- ======================================================== -->
    <section *ngIf="pestanaActiva() === 'horarios'">
      <!-- FILTROS HORARIOS -->
      <div class="citef-card filter-card mb-4">
        <form (ngSubmit)="ejecutarBusquedaHorarios()" class="filter-form">
          <div class="filter-grid">
            <div class="filter-field">
              <label class="filter-label">Estado</label>
              <select
                class="citef-select"
                [(ngModel)]="filtroEstadoHorario"
                name="filtroEstadoHorario"
              >
                <option value="TODOS">Todos</option>
                <option value="ACTIVOS">Activos</option>
                <option value="INACTIVOS">Inactivos</option>
              </select>
            </div>

            <div class="filter-actions">
              <button type="submit" class="citef-btn citef-btn-primary">
                <i class="bi bi-funnel"></i>
                <span>Filtrar</span>
              </button>
              <button
                type="button"
                class="citef-btn citef-btn-secondary"
                (click)="limpiarFiltrosHorarios()"
              >
                <i class="bi bi-arrow-counterclockwise"></i>
                <span>Restablecer</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <!-- TABLA DE FRANJAS HORARIAS -->
      <app-table-card
        title="Franjas Horarias Operativas"
        [subtitle]="'Total registradas: ' + horariosTotal()"
      >
        <table class="citef-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 70px">ID</th>
              <th style="width: 160px">Turno</th>
              <th class="text-center" style="width: 140px">Hora Inicio</th>
              <th class="text-center" style="width: 140px">Hora Fin</th>
              <th class="text-center">Intervalo de Operación</th>
              <th class="text-center" style="width: 120px">Estado</th>
              <th class="text-center" style="width: 120px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let h of horarios()">
              <td class="text-center text-muted font-monospace">#{{ h.id_horario }}</td>
              <td>
                <span class="shift-badge font-monospace" [ngClass]="'shift-' + h.turno.toLowerCase()">
                  {{ h.turno }}
                </span>
              </td>
              <td class="text-center font-monospace">
                <i class="bi bi-clock me-1 text-muted"></i>
                {{ formatHora(h.hora_inicio) }}
              </td>
              <td class="text-center font-monospace">
                <i class="bi bi-clock me-1 text-muted"></i>
                {{ formatHora(h.hora_fin) }}
              </td>
              <td class="text-center">
                <span class="range-badge">
                  {{ formatHora(h.hora_inicio) }} – {{ formatHora(h.hora_fin) }}
                </span>
              </td>
              <td class="text-center">
                <span
                  class="citef-badge"
                  [class.citef-badge-success]="h.activo"
                  [class.citef-badge-danger]="!h.activo"
                >
                  {{ h.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="text-center">
                <div class="action-buttons" *ngIf="puedeGestionar()">
                  <button
                    type="button"
                    class="btn-icon btn-edit"
                    title="Editar horario"
                    (click)="abrirModalEditarHorario(h)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    class="btn-icon btn-delete"
                    [title]="h.activo ? 'Desactivar horario' : 'Eliminar horario'"
                    (click)="abrirConfirmacionEliminarHorario(h)"
                  >
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
                <span *ngIf="!puedeGestionar()" class="text-muted small">
                  <i class="bi bi-lock me-1"></i>Lectura
                </span>
              </td>
            </tr>

            <tr *ngIf="horarios().length === 0">
              <td colspan="7" class="empty-row">
                <div class="empty-state">
                  <i class="bi bi-clock-history"></i>
                  <p>No se encontraron franjas horarias configuradas</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- PAGINACIÓN COMPARTIDA DE 15 FILAS -->
        <div card-footer>
          <app-pagination
            [paginaActual]="horarioPagina()"
            [totalRegistros]="horariosTotal()"
            [tamanoPagina]="limite"
            etiqueta="horarios"
            (paginaCambiada)="cambiarPaginaHorario($event)"
          ></app-pagination>
        </div>
      </app-table-card>
    </section>

    <!-- ======================================================== -->
    <!-- PESTAÑA 2: MOTIVOS DE USO -->
    <!-- ======================================================== -->
    <section *ngIf="pestanaActiva() === 'motivos'">
      <!-- FILTROS MOTIVOS -->
      <div class="citef-card filter-card mb-4">
        <form (ngSubmit)="ejecutarBusquedaMotivos()" class="filter-form">
          <div class="filter-grid">
            <div class="filter-field-main">
              <label class="filter-label">Búsqueda</label>
              <div class="search-input-wrapper">
                <i class="bi bi-search search-icon"></i>
                <input
                  type="text"
                  class="citef-input search-input"
                  [(ngModel)]="busquedaMotivo"
                  name="busquedaMotivo"
                  placeholder="Descripción del motivo..."
                />
              </div>
            </div>

            <div class="filter-field">
              <label class="filter-label">Tipo de Uso</label>
              <select
                class="citef-select"
                [(ngModel)]="filtroTipoMotivo"
                name="filtroTipoMotivo"
              >
                <option value="TODOS">Todos los tipos</option>
                <option value="ACADEMICO">Académico</option>
                <option value="LIBRE">Libre</option>
                <option value="ADMINISTRATIVO">Administrativo</option>
              </select>
            </div>

            <div class="filter-field">
              <label class="filter-label">Estado</label>
              <select
                class="citef-select"
                [(ngModel)]="filtroEstadoMotivo"
                name="filtroEstadoMotivo"
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
                (click)="limpiarFiltrosMotivos()"
              >
                <i class="bi bi-arrow-counterclockwise"></i>
                <span>Limpiar</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <!-- TABLA DE MOTIVOS DE USO -->
      <app-table-card
        title="Motivos de Uso Autorizados"
        [subtitle]="'Total registrados: ' + motivosTotal()"
      >
        <table class="citef-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 70px">ID</th>
              <th>Descripción</th>
              <th style="width: 170px">Tipo de Uso</th>
              <th class="text-center" style="width: 120px">Estado</th>
              <th class="text-center" style="width: 120px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let m of motivos()">
              <td class="text-center text-muted font-monospace">#{{ m.id_motivo }}</td>
              <td>
                <strong class="career-title">{{ m.descrip }}</strong>
              </td>
              <td>
                <span
                  class="badge-type"
                  [ngClass]="'badge-type-' + m.tipo.toLowerCase()"
                >
                  {{ m.tipo }}
                </span>
              </td>
              <td class="text-center">
                <span
                  class="citef-badge"
                  [class.citef-badge-success]="m.activo"
                  [class.citef-badge-danger]="!m.activo"
                >
                  {{ m.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="text-center">
                <div class="action-buttons" *ngIf="puedeGestionar()">
                  <button
                    type="button"
                    class="btn-icon btn-edit"
                    title="Editar motivo"
                    (click)="abrirModalEditarMotivo(m)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    class="btn-icon btn-delete"
                    [title]="m.activo ? 'Desactivar motivo' : 'Eliminar motivo'"
                    (click)="abrirConfirmacionEliminarMotivo(m)"
                  >
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
                <span *ngIf="!puedeGestionar()" class="text-muted small">
                  <i class="bi bi-lock me-1"></i>Lectura
                </span>
              </td>
            </tr>

            <tr *ngIf="motivos().length === 0">
              <td colspan="5" class="empty-row">
                <div class="empty-state">
                  <i class="bi bi-bookmarks"></i>
                  <p>No se encontraron motivos de uso registrados</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- PAGINACIÓN COMPARTIDA DE 15 FILAS -->
        <div card-footer>
          <app-pagination
            [paginaActual]="motivoPagina()"
            [totalRegistros]="motivosTotal()"
            [tamanoPagina]="limite"
            etiqueta="motivos"
            (paginaCambiada)="cambiarPaginaMotivo($event)"
          ></app-pagination>
        </div>
      </app-table-card>
    </section>

    <!-- ======================================================== -->
    <!-- MODAL: CREAR / EDITAR HORARIO -->
    <!-- ======================================================== -->
    <div *ngIf="mostrarModalHorario()" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ editandoHorarioId() ? 'Editar Franja Horaria' : 'Nueva Franja Horaria' }}
          </h3>
          <button type="button" class="btn-close" (click)="cerrarModalHorario()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <app-modal-alert
          [mensaje]="modalHorarioError()"
          (cerrar)="modalHorarioError.set(null)"
        ></app-modal-alert>

        <form (ngSubmit)="guardarHorario()" class="modal-form" novalidate>
          <div class="form-group">
            <label class="form-label">Turno Operativo <span class="req">*</span></label>
            <select
              class="citef-select"
              [class.input-error]="horarioErrors().turno"
              [(ngModel)]="horarioForm.turno"
              name="turno"
            >
              <option value="" disabled>Seleccione turno...</option>
              <option value="MAÑANA">MAÑANA</option>
              <option value="TARDE">TARDE</option>
              <option value="NOCHE">NOCHE</option>
            </select>
            <div class="field-error-text" *ngIf="horarioErrors().turno">
              <i class="bi bi-exclamation-circle-fill me-1"></i>
              <span>{{ horarioErrors().turno }}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label">Hora de Inicio <span class="req">*</span></label>
              <input
                type="time"
                step="1"
                class="citef-input"
                [class.input-error]="horarioErrors().hora_inicio"
                [(ngModel)]="horarioForm.hora_inicio"
                name="hora_inicio"
              />
              <div class="field-error-text" *ngIf="horarioErrors().hora_inicio">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                <span>{{ horarioErrors().hora_inicio }}</span>
              </div>
            </div>

            <div class="form-group col-6">
              <label class="form-label">Hora de Fin <span class="req">*</span></label>
              <input
                type="time"
                step="1"
                class="citef-input"
                [class.input-error]="horarioErrors().hora_fin"
                [(ngModel)]="horarioForm.hora_fin"
                name="hora_fin"
              />
              <div class="field-error-text" *ngIf="horarioErrors().hora_fin">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                <span>{{ horarioErrors().hora_fin }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="citef-btn citef-btn-secondary"
              (click)="cerrarModalHorario()"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="citef-btn citef-btn-primary"
              [disabled]="guardandoHorario()"
            >
              <i class="bi bi-check2"></i>
              <span>{{ guardandoHorario() ? 'Guardando...' : 'Guardar' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL: CREAR / EDITAR MOTIVO -->
    <!-- ======================================================== -->
    <div *ngIf="mostrarModalMotivo()" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ editandoMotivoId() ? 'Editar Motivo de Uso' : 'Nuevo Motivo de Uso' }}
          </h3>
          <button type="button" class="btn-close" (click)="cerrarModalMotivo()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <app-modal-alert
          [mensaje]="modalMotivoError()"
          (cerrar)="modalMotivoError.set(null)"
        ></app-modal-alert>

        <form (ngSubmit)="guardarMotivo()" class="modal-form" novalidate>
          <div class="form-group">
            <label class="form-label">Descripción del Motivo <span class="req">*</span></label>
            <input
              type="text"
              class="citef-input"
              [class.input-error]="motivoErrors().descrip"
              [(ngModel)]="motivoForm.descrip"
              name="descrip"
              placeholder="Ej: Clase Práctica, Examen de Grado..."
            />
            <div class="field-error-text" *ngIf="motivoErrors().descrip">
              <i class="bi bi-exclamation-circle-fill me-1"></i>
              <span>{{ motivoErrors().descrip }}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Tipo de Uso <span class="req">*</span></label>
            <select
              class="citef-select"
              [class.input-error]="motivoErrors().tipo"
              [(ngModel)]="motivoForm.tipo"
              name="tipo"
            >
              <option value="" disabled>Seleccione categoría...</option>
              <option value="ACADEMICO">Académico</option>
              <option value="LIBRE">Libre / Investigación</option>
              <option value="ADMINISTRATIVO">Administrativo / Soporte</option>
            </select>
            <div class="field-error-text" *ngIf="motivoErrors().tipo">
              <i class="bi bi-exclamation-circle-fill me-1"></i>
              <span>{{ motivoErrors().tipo }}</span>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="citef-btn citef-btn-secondary"
              (click)="cerrarModalMotivo()"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="citef-btn citef-btn-primary"
              [disabled]="guardandoMotivo()"
            >
              <i class="bi bi-check2"></i>
              <span>{{ guardandoMotivo() ? 'Guardando...' : 'Guardar' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL DE CONFIRMACIÓN -->
    <app-confirm-modal
      [visible]="mostrarConfirmarEliminar()"
      [title]="confirmacionTitulo"
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

      /* TABS */
      .nav-tabs-container {
        display: flex;
        gap: 0.5rem;
        border-bottom: 2px solid var(--citef-border, #e2e8f0);
        padding-bottom: 0.25rem;
      }

      .tab-btn {
        display: inline-flex;
        align-items: center;
        padding: 0.65rem 1.25rem;
        font-size: 0.875rem;
        font-weight: 600;
        border: none;
        background: transparent;
        color: var(--citef-text-secondary, #64748b);
        border-bottom: 3px solid transparent;
        cursor: pointer;
        transition: all 0.15s ease-in-out;
        border-radius: 6px 6px 0 0;
      }

      .tab-btn:hover {
        color: var(--citef-primary, #002855);
        background: #f1f5f9;
      }

      .tab-btn.active {
        color: var(--citef-primary, #002855);
        border-bottom-color: var(--citef-primary, #002855);
        background: #ffffff;
      }

      .tab-badge {
        font-size: 0.75rem;
        font-weight: 700;
        padding: 0.15rem 0.45rem;
        background: #e2e8f0;
        color: #334155;
        border-radius: 12px;
        margin-left: 0.5rem;
      }

      .tab-btn.active .tab-badge {
        background: #e0f2fe;
        color: #0369a1;
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

      .filter-field-main {
        grid-column: span 1;
      }

      @media (min-width: 992px) {
        .filter-field-main {
          grid-column: span 2;
        }
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

      .search-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-icon {
        position: absolute;
        left: 0.75rem;
        color: #94a3b8;
        pointer-events: none;
      }

      .search-input {
        padding-left: 2.25rem;
      }

      .filter-actions {
        display: flex;
        gap: 0.5rem;
        align-items: flex-end;
      }

      /* BADGES */
      .shift-badge {
        display: inline-block;
        padding: 0.25rem 0.65rem;
        border-radius: 4px;
        font-size: 0.775rem;
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

      .range-badge {
        font-size: 0.8125rem;
        color: #0369a1;
        background: #f0f9ff;
        padding: 0.2rem 0.6rem;
        border-radius: 4px;
        border: 1px solid #bae6fd;
        font-weight: 600;
      }

      .badge-type {
        display: inline-block;
        padding: 0.2rem 0.55rem;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 700;
      }

      .badge-type-academico {
        background: #e0f2fe;
        color: #0369a1;
        border: 1px solid #bae6fd;
      }

      .badge-type-libre {
        background: #dcfce7;
        color: #15803d;
        border: 1px solid #bbf7d0;
      }

      .badge-type-administrativo {
        background: #f3e8ff;
        color: #6b21a8;
        border: 1px solid #e9d5ff;
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
        max-width: 520px;
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
