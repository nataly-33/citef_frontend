import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CatalogosService,
  CarreraItem,
  MateriaItem,
} from '../../../core/services/catalogos.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ConfirmModalComponent,
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
} from '../../../shared/components';

@Component({
  selector: 'app-academicos',
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
        <h2 class="page-title">Catálogos Académicos</h2>
        <p class="page-subtitle">
          Administración de Carreras, Semestres y Materias de la FCEE
        </p>
      </div>

      <div class="header-actions">
        <button
          *ngIf="pestanaActiva() === 'carreras' && puedeGestionar()"
          class="citef-btn citef-btn-primary"
          (click)="abrirModalCrearCarrera()"
        >
          <i class="bi bi-plus-circle"></i>
          <span>Nueva Carrera</span>
        </button>

        <button
          *ngIf="pestanaActiva() === 'materias' && puedeGestionar()"
          class="citef-btn citef-btn-primary"
          (click)="abrirModalCrearMateria()"
        >
          <i class="bi bi-plus-circle"></i>
          <span>Nueva Materia</span>
        </button>
      </div>
    </div>

    <!-- TABS DE NAVEGACIÓN -->
    <div class="nav-tabs-container mb-4">
      <button
        type="button"
        class="tab-btn"
        [class.active]="pestanaActiva() === 'carreras'"
        (click)="cambiarPestana('carreras')"
      >
        <i class="bi bi-mortarboard me-2"></i>
        <span>Carreras</span>
        <span class="tab-badge" *ngIf="carrerasTotal() > 0">{{ carrerasTotal() }}</span>
      </button>

      <button
        type="button"
        class="tab-btn"
        [class.active]="pestanaActiva() === 'materias'"
        (click)="cambiarPestana('materias')"
      >
        <i class="bi bi-journal-bookmark me-2"></i>
        <span>Materias</span>
        <span class="tab-badge" *ngIf="materiasTotal() > 0">{{ materiasTotal() }}</span>
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
    <!-- PESTAÑA 1: GESTIÓN DE CARRERAS -->
    <!-- ======================================================== -->
    <section *ngIf="pestanaActiva() === 'carreras'">
      <!-- FILTROS CARRERAS -->
      <div class="citef-card filter-card mb-4">
        <form (ngSubmit)="ejecutarBusquedaCarreras()" class="filter-form">
          <div class="filter-grid">
            <div class="filter-field-main">
              <label class="filter-label">Búsqueda</label>
              <div class="search-input-wrapper">
                <i class="bi bi-search search-icon"></i>
                <input
                  type="text"
                  class="citef-input search-input"
                  [(ngModel)]="busquedaCarrera"
                  name="busquedaCarrera"
                  placeholder="Código o nombre de carrera..."
                />
              </div>
            </div>

            <div class="filter-field">
              <label class="filter-label">Estado</label>
              <select
                class="citef-select"
                [(ngModel)]="filtroEstadoCarrera"
                name="filtroEstadoCarrera"
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
                (click)="limpiarFiltrosCarreras()"
              >
                <i class="bi bi-arrow-counterclockwise"></i>
                <span>Limpiar</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <!-- TABLA DE CARRERAS -->
      <app-table-card
        title="Catálogo de Carreras"
        [subtitle]="'Total registradas: ' + carrerasTotal()"
      >
        <table class="citef-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 70px">ID</th>
              <th style="width: 140px">Código</th>
              <th>Nombre de la Carrera</th>
              <th class="text-center" style="width: 120px">Estado</th>
              <th class="text-center" style="width: 120px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let c of carreras()">
              <td class="text-center text-muted font-monospace">#{{ c.id_carrera }}</td>
              <td>
                <span class="badge-code font-monospace">{{ c.codigo }}</span>
              </td>
              <td>
                <strong class="career-title">{{ c.nombre }}</strong>
              </td>
              <td class="text-center">
                <span
                  class="citef-badge"
                  [class.citef-badge-success]="c.activo"
                  [class.citef-badge-danger]="!c.activo"
                >
                  {{ c.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="text-center">
                <div class="action-buttons" *ngIf="puedeGestionar()">
                  <button
                    type="button"
                    class="btn-icon btn-edit"
                    title="Editar carrera"
                    (click)="abrirModalEditarCarrera(c)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    class="btn-icon btn-delete"
                    [title]="c.activo ? 'Desactivar carrera' : 'Eliminar carrera'"
                    (click)="abrirConfirmacionEliminarCarrera(c)"
                  >
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
                <span *ngIf="!puedeGestionar()" class="text-muted small">
                  <i class="bi bi-lock me-1"></i>Lectura
                </span>
              </td>
            </tr>

            <tr *ngIf="carreras().length === 0">
              <td colspan="5" class="empty-row">
                <div class="empty-state">
                  <i class="bi bi-mortarboard"></i>
                  <p>No se encontraron carreras registradas</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- PAGINACIÓN COMPARTIDA DE 15 FILAS -->
        <div card-footer>
          <app-pagination
            [paginaActual]="carreraPagina()"
            [totalRegistros]="carrerasTotal()"
            [tamanoPagina]="limite"
            etiqueta="carreras"
            (paginaCambiada)="cambiarPaginaCarrera($event)"
          ></app-pagination>
        </div>
      </app-table-card>
    </section>

    <!-- ======================================================== -->
    <!-- PESTAÑA 2: GESTIÓN DE MATERIAS -->
    <!-- ======================================================== -->
    <section *ngIf="pestanaActiva() === 'materias'">
      <!-- FILTROS MATERIAS -->
      <div class="citef-card filter-card mb-4">
        <form (ngSubmit)="ejecutarBusquedaMaterias()" class="filter-form">
          <div class="filter-grid">
            <div class="filter-field">
              <label class="filter-label">Filtrar por Carrera</label>
              <select
                class="citef-select"
                [(ngModel)]="filtroCarreraMateria"
                name="filtroCarreraMateria"
                (change)="ejecutarBusquedaMaterias()"
              >
                <option [ngValue]="null">Todas las carreras</option>
                <option *ngFor="let car of listaCarrerasTodas()" [ngValue]="car.id_carrera">
                  {{ car.codigo }} - {{ car.nombre }}
                </option>
              </select>
            </div>

            <div class="filter-field-main">
              <label class="filter-label">Búsqueda</label>
              <div class="search-input-wrapper">
                <i class="bi bi-search search-icon"></i>
                <input
                  type="text"
                  class="citef-input search-input"
                  [(ngModel)]="busquedaMateria"
                  name="busquedaMateria"
                  placeholder="Sigla o nombre de materia..."
                />
              </div>
            </div>

            <div class="filter-field">
              <label class="filter-label">Semestre / Nivel</label>
              <select
                class="citef-select"
                [(ngModel)]="filtroSemestreMateria"
                name="filtroSemestreMateria"
              >
                <option [ngValue]="null">Todos los semestres</option>
                <option *ngFor="let s of semestresLista" [ngValue]="s">
                  Semestre {{ s }}
                </option>
              </select>
            </div>

            <div class="filter-field">
              <label class="filter-label">Estado</label>
              <select
                class="citef-select"
                [(ngModel)]="filtroEstadoMateria"
                name="filtroEstadoMateria"
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
                (click)="limpiarFiltrosMaterias()"
              >
                <i class="bi bi-arrow-counterclockwise"></i>
                <span>Limpiar</span>
              </button>
            </div>
          </div>
        </form>
      </div>

      <!-- TABLA DE MATERIAS -->
      <app-table-card
        title="Catálogo de Materias"
        [subtitle]="'Total registradas: ' + materiasTotal()"
      >
        <table class="citef-table">
          <thead>
            <tr>
              <th class="text-center" style="width: 70px">ID</th>
              <th style="width: 120px">Sigla</th>
              <th>Materia</th>
              <th class="text-center" style="width: 110px">Semestre</th>
              <th>Carrera</th>
              <th class="text-center" style="width: 110px">Estado</th>
              <th class="text-center" style="width: 120px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let m of materias()">
              <td class="text-center text-muted font-monospace">#{{ m.id_materia }}</td>
              <td>
                <span class="badge-code font-monospace">{{ m.sigla }}</span>
              </td>
              <td>
                <strong class="subject-title">{{ m.nombre }}</strong>
              </td>
              <td class="text-center">
                <span class="badge-semester">Semestre {{ m.semestre_nivel }}</span>
              </td>
              <td>
                <span class="career-label">
                  {{ m.carrera ? m.carrera.nombre : '—' }}
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
                    title="Editar materia"
                    (click)="abrirModalEditarMateria(m)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    class="btn-icon btn-delete"
                    [title]="m.activo ? 'Desactivar materia' : 'Eliminar materia'"
                    (click)="abrirConfirmacionEliminarMateria(m)"
                  >
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
                <span *ngIf="!puedeGestionar()" class="text-muted small">
                  <i class="bi bi-lock me-1"></i>Lectura
                </span>
              </td>
            </tr>

            <tr *ngIf="materias().length === 0">
              <td colspan="7" class="empty-row">
                <div class="empty-state">
                  <i class="bi bi-journal-x"></i>
                  <p>No se encontraron materias registradas</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <!-- PAGINACIÓN COMPARTIDA DE 15 FILAS -->
        <div card-footer>
          <app-pagination
            [paginaActual]="materiaPagina()"
            [totalRegistros]="materiasTotal()"
            [tamanoPagina]="limite"
            etiqueta="materias"
            (paginaCambiada)="cambiarPaginaMateria($event)"
          ></app-pagination>
        </div>
      </app-table-card>
    </section>

    <!-- ======================================================== -->
    <!-- MODAL: CREAR / EDITAR CARRERA -->
    <!-- ======================================================== -->
    <div *ngIf="mostrarModalCarrera()" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ editandoCarreraId() ? 'Editar Carrera' : 'Nueva Carrera' }}
          </h3>
          <button type="button" class="btn-close" (click)="cerrarModalCarrera()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <!-- Alerta de Error dentro del Modal -->
        <app-modal-alert
          [mensaje]="modalCarreraError()"
          (cerrar)="modalCarreraError.set(null)"
        ></app-modal-alert>

        <form (ngSubmit)="guardarCarrera()" class="modal-form" novalidate>
          <div class="form-group">
            <label class="form-label">Código de Carrera <span class="req">*</span></label>
            <input
              type="text"
              class="citef-input"
              [class.input-error]="carreraErrors().codigo"
              [(ngModel)]="carreraForm.codigo"
              name="codigo"
              placeholder="Ej: 186-5"
            />
            <div class="field-error-text" *ngIf="carreraErrors().codigo">
              <i class="bi bi-exclamation-circle-fill me-1"></i>
              <span>{{ carreraErrors().codigo }}</span>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Nombre de la Carrera <span class="req">*</span></label>
            <input
              type="text"
              class="citef-input"
              [class.input-error]="carreraErrors().nombre"
              [(ngModel)]="carreraForm.nombre"
              name="nombre"
              placeholder="Ej: Ingeniería Comercial"
            />
            <div class="field-error-text" *ngIf="carreraErrors().nombre">
              <i class="bi bi-exclamation-circle-fill me-1"></i>
              <span>{{ carreraErrors().nombre }}</span>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="citef-btn citef-btn-secondary"
              (click)="cerrarModalCarrera()"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="citef-btn citef-btn-primary"
              [disabled]="guardandoCarrera()"
            >
              <i class="bi bi-check2"></i>
              <span>{{ guardandoCarrera() ? 'Guardando...' : 'Guardar' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- ======================================================== -->
    <!-- MODAL: CREAR / EDITAR MATERIA -->
    <!-- ======================================================== -->
    <div *ngIf="mostrarModalMateria()" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ editandoMateriaId() ? 'Editar Materia' : 'Nueva Materia' }}
          </h3>
          <button type="button" class="btn-close" (click)="cerrarModalMateria()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <!-- Alerta de Error dentro del Modal -->
        <app-modal-alert
          [mensaje]="modalMateriaError()"
          (cerrar)="modalMateriaError.set(null)"
        ></app-modal-alert>

        <form (ngSubmit)="guardarMateria()" class="modal-form" novalidate>
          <div class="form-group">
            <label class="form-label">Carrera Perteneciente <span class="req">*</span></label>
            <select
              class="citef-select"
              [class.input-error]="materiaErrors().id_carrera"
              [(ngModel)]="materiaForm.id_carrera"
              name="id_carrera"
            >
              <option [ngValue]="null" disabled>Seleccione una carrera...</option>
              <option *ngFor="let c of listaCarrerasTodas()" [ngValue]="c.id_carrera">
                {{ c.codigo }} - {{ c.nombre }}
              </option>
            </select>
            <div class="field-error-text" *ngIf="materiaErrors().id_carrera">
              <i class="bi bi-exclamation-circle-fill me-1"></i>
              <span>{{ materiaErrors().id_carrera }}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label">Sigla <span class="req">*</span></label>
              <input
                type="text"
                class="citef-input"
                [class.input-error]="materiaErrors().sigla"
                [(ngModel)]="materiaForm.sigla"
                name="sigla"
                placeholder="Ej: MAT101"
              />
              <div class="field-error-text" *ngIf="materiaErrors().sigla">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                <span>{{ materiaErrors().sigla }}</span>
              </div>
            </div>

            <div class="form-group col-6">
              <label class="form-label">Semestre / Nivel <span class="req">*</span></label>
              <select
                class="citef-select"
                [class.input-error]="materiaErrors().semestre_nivel"
                [(ngModel)]="materiaForm.semestre_nivel"
                name="semestre_nivel"
              >
                <option [ngValue]="null" disabled>Seleccione semestre...</option>
                <option *ngFor="let s of semestresLista" [ngValue]="s">
                  Semestre {{ s }}
                </option>
              </select>
              <div class="field-error-text" *ngIf="materiaErrors().semestre_nivel">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                <span>{{ materiaErrors().semestre_nivel }}</span>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Nombre de la Materia <span class="req">*</span></label>
            <input
              type="text"
              class="citef-input"
              [class.input-error]="materiaErrors().nombre"
              [(ngModel)]="materiaForm.nombre"
              name="nombre"
              placeholder="Ej: Álgebra Lineal"
            />
            <div class="field-error-text" *ngIf="materiaErrors().nombre">
              <i class="bi bi-exclamation-circle-fill me-1"></i>
              <span>{{ materiaErrors().nombre }}</span>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="citef-btn citef-btn-secondary"
              (click)="cerrarModalMateria()"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="citef-btn citef-btn-primary"
              [disabled]="guardandoMateria()"
            >
              <i class="bi bi-check2"></i>
              <span>{{ guardandoMateria() ? 'Guardando...' : 'Guardar' }}</span>
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

      /* BADGES & TYPOGRAPHY */
      .badge-code {
        background: #f1f5f9;
        color: #0f172a;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8125rem;
        font-weight: 700;
        border: 1px solid #e2e8f0;
      }

      .badge-semester {
        background: #f8fafc;
        color: #475569;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8rem;
        font-weight: 600;
        border: 1px solid #cbd5e1;
      }

      .career-title,
      .subject-title {
        color: #0f172a;
        font-weight: 600;
      }

      .career-label {
        color: #475569;
        font-size: 0.85rem;
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
export class AcademicosComponent implements OnInit {
  pestanaActiva = signal<'carreras' | 'materias'>('carreras');
  readonly limite = 15;
  readonly semestresLista = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Global messages
  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  // ==========================================
  // ESTADO CARRERAS
  // ==========================================
  carreras = signal<CarreraItem[]>([]);
  carrerasTotal = signal<number>(0);
  carreraPagina = signal<number>(1);
  busquedaCarrera = '';
  filtroEstadoCarrera = 'TODOS';

  mostrarModalCarrera = signal<boolean>(false);
  editandoCarreraId = signal<number | null>(null);
  guardandoCarrera = signal<boolean>(false);
  modalCarreraError = signal<string | null>(null);

  carreraForm = {
    codigo: '',
    nombre: '',
  };

  carreraErrors = signal<{ codigo?: string; nombre?: string }>({});

  // ==========================================
  // ESTADO MATERIAS
  // ==========================================
  materias = signal<MateriaItem[]>([]);
  materiasTotal = signal<number>(0);
  materiaPagina = signal<number>(1);
  listaCarrerasTodas = signal<CarreraItem[]>([]);

  filtroCarreraMateria: number | null = null;
  busquedaMateria = '';
  filtroSemestreMateria: number | null = null;
  filtroEstadoMateria = 'TODOS';

  mostrarModalMateria = signal<boolean>(false);
  editandoMateriaId = signal<number | null>(null);
  guardandoMateria = signal<boolean>(false);
  modalMateriaError = signal<string | null>(null);

  materiaForm = {
    sigla: '',
    nombre: '',
    semestre_nivel: null as number | null,
    id_carrera: null as number | null,
  };

  materiaErrors = signal<{
    sigla?: string;
    nombre?: string;
    semestre_nivel?: string;
    id_carrera?: string;
  }>({});

  // ==========================================
  // CONFIRMACIÓN DE ELIMINACIÓN
  // ==========================================
  mostrarConfirmarEliminar = signal<boolean>(false);
  confirmacionTitulo = '';
  confirmacionMensaje = '';
  elementoAEliminar: { tipo: 'carrera' | 'materia'; id: number; nombre: string } | null = null;

  constructor(
    private catalogosService: CatalogosService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarCarreras();
    this.cargarListaCarrerasDropdown();
    this.cargarMaterias();
  }

  puedeGestionar(): boolean {
    return this.authService.hasPermission('CAT_ACADEMICOS_GESTIONAR');
  }

  cambiarPestana(pestana: 'carreras' | 'materias'): void {
    this.pestanaActiva.set(pestana);
    this.successMsg.set(null);
    this.errorMsg.set(null);
  }

  // ==========================================
  // LÓGICA CARRERAS
  // ==========================================
  cargarCarreras(): void {
    const activoParam =
      this.filtroEstadoCarrera === 'TODOS'
        ? undefined
        : this.filtroEstadoCarrera === 'ACTIVOS';

    this.catalogosService
      .getCarreras({
        busqueda: this.busquedaCarrera.trim() || undefined,
        activo: activoParam,
        pagina: this.carreraPagina(),
        limite: this.limite,
      })
      .subscribe({
        next: (res) => {
          this.carreras.set(res.items);
          this.carrerasTotal.set(res.total);
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error al cargar catálogo de carreras');
        },
      });
  }

  cargarListaCarrerasDropdown(): void {
    this.catalogosService.getCarrerasTodas().subscribe({
      next: (res) => this.listaCarrerasTodas.set(res),
      error: () => {},
    });
  }

  ejecutarBusquedaCarreras(): void {
    this.carreraPagina.set(1);
    this.cargarCarreras();
  }

  limpiarFiltrosCarreras(): void {
    this.busquedaCarrera = '';
    this.filtroEstadoCarrera = 'TODOS';
    this.carreraPagina.set(1);
    this.cargarCarreras();
  }

  cambiarPaginaCarrera(p: number): void {
    this.carreraPagina.set(p);
    this.cargarCarreras();
  }

  abrirModalCrearCarrera(): void {
    this.editandoCarreraId.set(null);
    this.carreraForm = { codigo: '', nombre: '' };
    this.carreraErrors.set({});
    this.modalCarreraError.set(null);
    this.mostrarModalCarrera.set(true);
  }

  abrirModalEditarCarrera(c: CarreraItem): void {
    this.editandoCarreraId.set(c.id_carrera);
    this.carreraForm = { codigo: c.codigo, nombre: c.nombre };
    this.carreraErrors.set({});
    this.modalCarreraError.set(null);
    this.mostrarModalCarrera.set(true);
  }

  cerrarModalCarrera(): void {
    this.mostrarModalCarrera.set(false);
    this.modalCarreraError.set(null);
    this.carreraErrors.set({});
  }

  validarCarrera(): boolean {
    const errs: { codigo?: string; nombre?: string } = {};
    if (!this.carreraForm.codigo || !this.carreraForm.codigo.trim()) {
      errs.codigo = 'El código de la carrera es obligatorio (ej: 186-5)';
    } else if (this.carreraForm.codigo.trim().length > 20) {
      errs.codigo = 'El código no puede exceder 20 caracteres';
    }

    if (!this.carreraForm.nombre || !this.carreraForm.nombre.trim()) {
      errs.nombre = 'El nombre de la carrera es obligatorio';
    } else if (this.carreraForm.nombre.trim().length > 100) {
      errs.nombre = 'El nombre no puede exceder 100 caracteres';
    }

    this.carreraErrors.set(errs);
    return Object.keys(errs).length === 0;
  }

  guardarCarrera(): void {
    if (!this.validarCarrera()) return;

    this.guardandoCarrera.set(true);
    this.modalCarreraError.set(null);

    const payload = {
      codigo: this.carreraForm.codigo.trim().toUpperCase(),
      nombre: this.carreraForm.nombre.trim(),
    };

    const id = this.editandoCarreraId();
    const obs = id
      ? this.catalogosService.actualizarCarrera(id, payload)
      : this.catalogosService.crearCarrera(payload);

    obs.subscribe({
      next: () => {
        this.guardandoCarrera.set(false);
        this.cerrarModalCarrera();
        this.successMsg.set(
          id ? 'Carrera actualizada correctamente' : 'Carrera creada exitosamente',
        );
        this.cargarCarreras();
        this.cargarListaCarrerasDropdown();
      },
      error: (err) => {
        this.guardandoCarrera.set(false);
        this.modalCarreraError.set(
          err.error?.message || 'Error al guardar la carrera en el servidor',
        );
      },
    });
  }

  abrirConfirmacionEliminarCarrera(c: CarreraItem): void {
    this.elementoAEliminar = {
      tipo: 'carrera',
      id: c.id_carrera,
      nombre: c.nombre,
    };
    this.confirmacionTitulo = 'Desactivar Carrera Universitaria';
    this.confirmacionMensaje = `¿Está seguro de que desea cambiar el estado o desactivar la carrera "${c.nombre}" (${c.codigo})?`;
    this.mostrarConfirmarEliminar.set(true);
  }

  // ==========================================
  // LÓGICA MATERIAS
  // ==========================================
  cargarMaterias(): void {
    const activoParam =
      this.filtroEstadoMateria === 'TODOS'
        ? undefined
        : this.filtroEstadoMateria === 'ACTIVOS';

    this.catalogosService
      .getMaterias({
        id_carrera: this.filtroCarreraMateria || undefined,
        semestre_nivel: this.filtroSemestreMateria || undefined,
        busqueda: this.busquedaMateria.trim() || undefined,
        activo: activoParam,
        pagina: this.materiaPagina(),
        limite: this.limite,
      })
      .subscribe({
        next: (res) => {
          this.materias.set(res.items);
          this.materiasTotal.set(res.total);
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error al cargar catálogo de materias');
        },
      });
  }

  ejecutarBusquedaMaterias(): void {
    this.materiaPagina.set(1);
    this.cargarMaterias();
  }

  limpiarFiltrosMaterias(): void {
    this.filtroCarreraMateria = null;
    this.busquedaMateria = '';
    this.filtroSemestreMateria = null;
    this.filtroEstadoMateria = 'TODOS';
    this.materiaPagina.set(1);
    this.cargarMaterias();
  }

  cambiarPaginaMateria(p: number): void {
    this.materiaPagina.set(p);
    this.cargarMaterias();
  }

  abrirModalCrearMateria(): void {
    this.editandoMateriaId.set(null);
    this.materiaForm = {
      sigla: '',
      nombre: '',
      semestre_nivel: null,
      id_carrera: this.filtroCarreraMateria || null,
    };
    this.materiaErrors.set({});
    this.modalMateriaError.set(null);
    this.mostrarModalMateria.set(true);
  }

  abrirModalEditarMateria(m: MateriaItem): void {
    this.editandoMateriaId.set(m.id_materia);
    this.materiaForm = {
      sigla: m.sigla,
      nombre: m.nombre,
      semestre_nivel: m.semestre_nivel,
      id_carrera: m.id_carrera,
    };
    this.materiaErrors.set({});
    this.modalMateriaError.set(null);
    this.mostrarModalMateria.set(true);
  }

  cerrarModalMateria(): void {
    this.mostrarModalMateria.set(false);
    this.modalMateriaError.set(null);
    this.materiaErrors.set({});
  }

  validarMateria(): boolean {
    const errs: {
      sigla?: string;
      nombre?: string;
      semestre_nivel?: string;
      id_carrera?: string;
    } = {};

    if (!this.materiaForm.id_carrera) {
      errs.id_carrera = 'Debe seleccionar una carrera de la lista';
    }

    if (!this.materiaForm.sigla || !this.materiaForm.sigla.trim()) {
      errs.sigla = 'La sigla de la materia es obligatoria (ej: MAT101)';
    } else if (this.materiaForm.sigla.trim().length > 20) {
      errs.sigla = 'La sigla no puede superar 20 caracteres';
    }

    if (!this.materiaForm.semestre_nivel) {
      errs.semestre_nivel = 'Debe especificar el semestre (1 al 10)';
    }

    if (!this.materiaForm.nombre || !this.materiaForm.nombre.trim()) {
      errs.nombre = 'El nombre de la materia es obligatorio';
    } else if (this.materiaForm.nombre.trim().length > 150) {
      errs.nombre = 'El nombre no puede superar 150 caracteres';
    }

    this.materiaErrors.set(errs);
    return Object.keys(errs).length === 0;
  }

  guardarMateria(): void {
    if (!this.validarMateria()) return;

    this.guardandoMateria.set(true);
    this.modalMateriaError.set(null);

    const payload = {
      sigla: this.materiaForm.sigla.trim().toUpperCase(),
      nombre: this.materiaForm.nombre.trim(),
      semestre_nivel: Number(this.materiaForm.semestre_nivel),
      id_carrera: Number(this.materiaForm.id_carrera),
    };

    const id = this.editandoMateriaId();
    const obs = id
      ? this.catalogosService.actualizarMateria(id, payload)
      : this.catalogosService.crearMateria(payload);

    obs.subscribe({
      next: () => {
        this.guardandoMateria.set(false);
        this.cerrarModalMateria();
        this.successMsg.set(
          id ? 'Materia actualizada correctamente' : 'Materia creada exitosamente',
        );
        this.cargarMaterias();
      },
      error: (err) => {
        this.guardandoMateria.set(false);
        this.modalMateriaError.set(
          err.error?.message || 'Error al guardar la materia en el servidor',
        );
      },
    });
  }

  abrirConfirmacionEliminarMateria(m: MateriaItem): void {
    this.elementoAEliminar = {
      tipo: 'materia',
      id: m.id_materia,
      nombre: `${m.sigla} - ${m.nombre}`,
    };
    this.confirmacionTitulo = 'Desactivar Materia Universitaria';
    this.confirmacionMensaje = `¿Está seguro de que desea cambiar el estado o desactivar la materia "${m.nombre}" (${m.sigla})?`;
    this.mostrarConfirmarEliminar.set(true);
  }

  // ==========================================
  // CONFIRMACIÓN GENERAL
  // ==========================================
  ejecutarEliminacion(): void {
    if (!this.elementoAEliminar) return;

    const { tipo, id, nombre } = this.elementoAEliminar;
    this.mostrarConfirmarEliminar.set(false);

    if (tipo === 'carrera') {
      this.catalogosService.eliminarCarrera(id).subscribe({
        next: () => {
          this.successMsg.set(`Carrera "${nombre}" eliminada o desactivada correctamente`);
          this.cargarCarreras();
          this.cargarListaCarrerasDropdown();
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error al procesar la baja de la carrera');
        },
      });
    } else {
      this.catalogosService.eliminarMateria(id).subscribe({
        next: () => {
          this.successMsg.set(`Materia "${nombre}" eliminada o desactivada correctamente`);
          this.cargarMaterias();
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error al procesar la baja de la materia');
        },
      });
    }
  }
}
