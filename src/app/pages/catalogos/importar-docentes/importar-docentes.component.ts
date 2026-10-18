import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DocentesService,
  DocenteItem,
} from '../../../core/services/docentes.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ConfirmModalComponent,
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
} from '../../../shared/components';

@Component({
  selector: 'app-importar-docentes',
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
        <h2 class="page-title">Padrón Docente</h2>
        <p class="page-subtitle">
          Carga masiva y administración del cuerpo docente facultativo de la FCEE
        </p>
      </div>

      <div class="header-actions">
        <button
          type="button"
          class="citef-btn citef-btn-outline"
          (click)="descargarPlantilla()"
          title="Descargar archivo modelo con formato oficial"
        >
          <i class="bi bi-download"></i>
          <span>Plantilla CSV</span>
        </button>

        <button
          *ngIf="puedeGestionar()"
          class="citef-btn citef-btn-primary"
          (click)="abrirModalCrearDocente()"
        >
          <i class="bi bi-person-plus"></i>
          <span>Nuevo Docente</span>
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

    <!-- SECCIÓN DRAG & DROP DE IMPORTACIÓN MASIVA -->
    <section class="citef-card upload-card mb-4" *ngIf="puedeGestionar()">
      <div class="upload-header">
        <div class="upload-header-text">
          <h3 class="upload-title">
            <i class="bi bi-file-earmark-spreadsheet me-2 text-primary"></i>
            Importación Masiva de Docentes (.xlsx, .xls, .csv)
          </h3>
          <p class="upload-desc">
            Arrastre o seleccione el archivo con las columnas requeridas:
            <code>codigo, nombres, apellidos, correo, telefono</code>. Validación transaccional automática.
          </p>
        </div>
      </div>

      <div
        class="drop-zone"
        [class.drag-over]="isDragging()"
        (dragover)="onDragOver($event)"
        (dragleave)="onDragLeave($event)"
        (drop)="onFileDropped($event)"
        (click)="fileInput.click()"
      >
        <input
          #fileInput
          type="file"
          class="d-none"
          accept=".xlsx,.xls,.csv"
          (change)="onFileSelected($event)"
        />

        <div class="drop-zone-content" *ngIf="!archivoSeleccionado()">
          <i class="bi bi-cloud-arrow-up drop-icon"></i>
          <p class="drop-primary-text">
            Haga clic o arrastre su archivo Excel o CSV aquí
          </p>
          <span class="drop-secondary-text">Formatos válidos: .xlsx, .xls o .csv (Máx. 10MB)</span>
        </div>

        <div class="drop-zone-selected" *ngIf="archivoSeleccionado()">
          <i class="bi bi-file-earmark-check drop-file-icon"></i>
          <div class="file-info">
            <strong class="file-name">{{ archivoSeleccionado()?.name }}</strong>
            <span class="file-size">{{ formatTamano(archivoSeleccionado()?.size || 0) }}</span>
          </div>
          <button
            type="button"
            class="btn-remove-file"
            (click)="removerArchivo($event)"
            title="Quitar archivo"
          >
            <i class="bi bi-x-circle"></i>
          </button>
        </div>
      </div>

      <div class="upload-actions" *ngIf="archivoSeleccionado()">
        <button
          type="button"
          class="citef-btn citef-btn-primary"
          [disabled]="procesandoImportacion()"
          (click)="ejecutarImportacion()"
        >
          <i class="bi bi-upload"></i>
          <span>{{ procesandoImportacion() ? 'Procesando archivo...' : 'Procesar e Importar al Padrón' }}</span>
        </button>

        <button
          type="button"
          class="citef-btn citef-btn-secondary"
          [disabled]="procesandoImportacion()"
          (click)="removerArchivo($event)"
        >
          <span>Cancelar</span>
        </button>
      </div>
    </section>

    <!-- BARRA DE FILTROS Y BÚSQUEDA -->
    <div class="citef-card filter-card mb-4">
      <form (ngSubmit)="ejecutarBusqueda()" class="filter-form">
        <div class="filter-grid">
          <div class="filter-field-main">
            <label class="filter-label">Búsqueda</label>
            <div class="search-input-wrapper">
              <i class="bi bi-search search-icon"></i>
              <input
                type="text"
                class="citef-input search-input"
                [(ngModel)]="busqueda"
                name="busqueda"
                placeholder="Código, nombre, apellido o correo institucional..."
              />
            </div>
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

    <!-- TABLA DE PADRÓN DOCENTE -->
    <app-table-card
      title="Cuerpo Docente Facultativo"
      [subtitle]="'Total docentes registrados: ' + docentesTotal()"
    >
      <table class="citef-table">
        <thead>
          <tr>
            <th style="width: 140px">Código</th>
            <th>Nombre Completo</th>
            <th>Correo Electrónico</th>
            <th style="width: 140px">Teléfono</th>
            <th class="text-center" style="width: 120px">Estado</th>
            <th class="text-center" style="width: 120px">Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let d of docentes()">
            <td>
              <span class="badge-code font-monospace">{{ d.codigo }}</span>
            </td>
            <td>
              <strong class="docente-fullname">{{ d.nombres }} {{ d.apellidos }}</strong>
            </td>
            <td>
              <span class="docente-email font-monospace">{{ d.correo }}</span>
            </td>
            <td>{{ d.telefono || '—' }}</td>
            <td class="text-center">
              <span
                class="citef-badge"
                [class.citef-badge-success]="d.activo"
                [class.citef-badge-danger]="!d.activo"
              >
                {{ d.activo ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td class="text-center">
              <div class="action-buttons" *ngIf="puedeGestionar()">
                <button
                  type="button"
                  class="btn-icon btn-edit"
                  title="Editar docente"
                  (click)="abrirModalEditarDocente(d)"
                >
                  <i class="bi bi-pencil"></i>
                </button>
                <button
                  type="button"
                  class="btn-icon btn-delete"
                  [title]="d.activo ? 'Desactivar docente' : 'Eliminar docente'"
                  (click)="abrirConfirmacionEliminarDocente(d)"
                >
                  <i class="bi bi-trash3"></i>
                </button>
              </div>
              <span *ngIf="!puedeGestionar()" class="text-muted small">
                <i class="bi bi-lock me-1"></i>Lectura
              </span>
            </td>
          </tr>

          <tr *ngIf="docentes().length === 0">
            <td colspan="6" class="empty-row">
              <div class="empty-state">
                <i class="bi bi-people"></i>
                <p>No se encontraron docentes en el catálogo</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- PAGINACIÓN COMPARTIDA DE 15 FILAS -->
      <div card-footer>
        <app-pagination
          [paginaActual]="docentePagina()"
          [totalRegistros]="docentesTotal()"
          [tamanoPagina]="limite"
          etiqueta="docentes"
          (paginaCambiada)="cambiarPaginaDocente($event)"
        ></app-pagination>
      </div>
    </app-table-card>

    <!-- ======================================================== -->
    <!-- MODAL: CREAR / EDITAR DOCENTE INDIVIDUAL -->
    <!-- ======================================================== -->
    <div *ngIf="mostrarModalDocente()" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ editandoCodigo() ? 'Editar Docente' : 'Nuevo Docente' }}
          </h3>
          <button type="button" class="btn-close" (click)="cerrarModalDocente()">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <app-modal-alert
          [mensaje]="modalDocenteError()"
          (cerrar)="modalDocenteError.set(null)"
        ></app-modal-alert>

        <form (ngSubmit)="guardarDocente()" class="modal-form" novalidate>
          <div class="form-group" *ngIf="!editandoCodigo()">
            <label class="form-label">Código Docente UAGRM <span class="req">*</span></label>
            <input
              type="text"
              class="citef-input"
              [class.input-error]="docenteErrors().codigo"
              [(ngModel)]="docenteForm.codigo"
              name="codigo"
              placeholder="Ej: DOC-2026-01"
            />
            <div class="field-error-text" *ngIf="docenteErrors().codigo">
              <i class="bi bi-exclamation-circle-fill me-1"></i>
              <span>{{ docenteErrors().codigo }}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label">Nombres <span class="req">*</span></label>
              <input
                type="text"
                class="citef-input"
                [class.input-error]="docenteErrors().nombres"
                [(ngModel)]="docenteForm.nombres"
                name="nombres"
                placeholder="Nombres completos"
              />
              <div class="field-error-text" *ngIf="docenteErrors().nombres">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                <span>{{ docenteErrors().nombres }}</span>
              </div>
            </div>

            <div class="form-group col-6">
              <label class="form-label">Apellidos <span class="req">*</span></label>
              <input
                type="text"
                class="citef-input"
                [class.input-error]="docenteErrors().apellidos"
                [(ngModel)]="docenteForm.apellidos"
                name="apellidos"
                placeholder="Apellidos completos"
              />
              <div class="field-error-text" *ngIf="docenteErrors().apellidos">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                <span>{{ docenteErrors().apellidos }}</span>
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label">Correo Electrónico <span class="req">*</span></label>
              <input
                type="email"
                class="citef-input"
                [class.input-error]="docenteErrors().correo"
                [(ngModel)]="docenteForm.correo"
                name="correo"
                placeholder="docente@uagrm.edu.bo"
              />
              <div class="field-error-text" *ngIf="docenteErrors().correo">
                <i class="bi bi-exclamation-circle-fill me-1"></i>
                <span>{{ docenteErrors().correo }}</span>
              </div>
            </div>

            <div class="form-group col-6">
              <label class="form-label">Teléfono / Celular</label>
              <input
                type="text"
                class="citef-input"
                [(ngModel)]="docenteForm.telefono"
                name="telefono"
                placeholder="Ej: 71234567"
              />
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="citef-btn citef-btn-secondary"
              (click)="cerrarModalDocente()"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="citef-btn citef-btn-primary"
              [disabled]="guardandoDocente()"
            >
              <i class="bi bi-check2"></i>
              <span>{{ guardandoDocente() ? 'Guardando...' : 'Guardar' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL DE CONFIRMACIÓN -->
    <app-confirm-modal
      [visible]="mostrarConfirmarEliminar()"
      title="Desactivar Docente"
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

      /* UPLOAD CARD */
      .upload-card {
        padding: 1.5rem;
        border: 1px solid #cbd5e1;
      }

      .upload-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--citef-primary, #002855);
        margin: 0 0 0.35rem 0;
      }

      .upload-desc {
        font-size: 0.84rem;
        color: #475569;
        margin: 0 0 1rem 0;
      }

      .upload-desc code {
        background: #f1f5f9;
        color: #0f172a;
        padding: 0.15rem 0.4rem;
        border-radius: 4px;
        font-size: 0.8rem;
      }

      .drop-zone {
        border: 2px dashed #94a3b8;
        border-radius: var(--citef-radius-md, 8px);
        padding: 2rem 1.5rem;
        text-align: center;
        background: #f8fafc;
        cursor: pointer;
        transition: all 0.2s ease-in-out;
      }

      .drop-zone:hover,
      .drop-zone.drag-over {
        border-color: var(--citef-primary, #002855);
        background: #eff6ff;
      }

      .drop-icon {
        font-size: 2.75rem;
        color: #0284c7;
        margin-bottom: 0.5rem;
        display: inline-block;
      }

      .drop-primary-text {
        font-size: 0.95rem;
        font-weight: 600;
        color: #1e293b;
        margin: 0 0 0.25rem 0;
      }

      .drop-secondary-text {
        font-size: 0.8rem;
        color: #64748b;
      }

      .drop-zone-selected {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 1rem;
      }

      .drop-file-icon {
        font-size: 2.25rem;
        color: #16a34a;
      }

      .file-info {
        text-align: left;
      }

      .file-name {
        display: block;
        font-size: 0.95rem;
        color: #0f172a;
      }

      .file-size {
        font-size: 0.8rem;
        color: #64748b;
      }

      .btn-remove-file {
        background: transparent;
        border: none;
        color: #dc2626;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.25rem;
        line-height: 1;
      }

      .btn-remove-file:hover {
        color: #b91c1c;
      }

      .upload-actions {
        display: flex;
        gap: 0.75rem;
        margin-top: 1.25rem;
        justify-content: flex-end;
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

      /* TABLE CONTENT */
      .badge-code {
        background: #f1f5f9;
        color: #0f172a;
        padding: 0.2rem 0.5rem;
        border-radius: 4px;
        font-size: 0.8125rem;
        font-weight: 700;
        border: 1px solid #e2e8f0;
      }

      .docente-fullname {
        color: #0f172a;
        font-weight: 600;
      }

      .docente-email {
        color: #334155;
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
export class ImportarDocentesComponent implements OnInit {
  readonly limite = 15;

  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  // ESTADO TABLA DOCENTES
  docentes = signal<DocenteItem[]>([]);
  docentesTotal = signal<number>(0);
  docentePagina = signal<number>(1);
  busqueda = '';
  filtroEstado = 'TODOS';

  // ESTADO CARGA MASIVA DRAG & DROP
  archivoSeleccionado = signal<File | null>(null);
  isDragging = signal<boolean>(false);
  procesandoImportacion = signal<boolean>(false);

  // MODAL CREAR / EDITAR
  mostrarModalDocente = signal<boolean>(false);
  editandoCodigo = signal<string | null>(null);
  guardandoDocente = signal<boolean>(false);
  modalDocenteError = signal<string | null>(null);

  docenteForm = {
    codigo: '',
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
  };

  docenteErrors = signal<{
    codigo?: string;
    nombres?: string;
    apellidos?: string;
    correo?: string;
  }>({});

  // CONFIRMACIÓN
  mostrarConfirmarEliminar = signal<boolean>(false);
  confirmacionMensaje = '';
  docenteAEliminar: DocenteItem | null = null;

  constructor(
    private docentesService: DocentesService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarDocentes();
  }

  puedeGestionar(): boolean {
    return this.authService.hasPermission('CAT_IMPORTAR_DOCENTES');
  }

  formatTamano(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ==========================================
  // CARGA DE LISTA
  // ==========================================
  cargarDocentes(): void {
    const activoParam =
      this.filtroEstado === 'TODOS'
        ? undefined
        : this.filtroEstado === 'ACTIVOS';

    this.docentesService
      .getDocentes({
        busqueda: this.busqueda.trim() || undefined,
        activo: activoParam,
        pagina: this.docentePagina(),
        limite: this.limite,
      })
      .subscribe({
        next: (res) => {
          this.docentes.set(res.items);
          this.docentesTotal.set(res.total);
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error al cargar padrón docente');
        },
      });
  }

  ejecutarBusqueda(): void {
    this.docentePagina.set(1);
    this.cargarDocentes();
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroEstado = 'TODOS';
    this.docentePagina.set(1);
    this.cargarDocentes();
  }

  cambiarPaginaDocente(p: number): void {
    this.docentePagina.set(p);
    this.cargarDocentes();
  }

  descargarPlantilla(): void {
    this.docentesService.descargarPlantillaCsv();
  }

  // ==========================================
  // DRAG & DROP Y SUBIDA
  // ==========================================
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDropped(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);

    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      this.validarYAsignarArchivo(e.dataTransfer.files[0]);
    }
  }

  onFileSelected(e: Event): void {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.validarYAsignarArchivo(target.files[0]);
    }
  }

  validarYAsignarArchivo(file: File): void {
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const permitidas = ['.xlsx', '.xls', '.csv'];

    if (!permitidas.includes(extension)) {
      this.errorMsg.set('Solo se admiten libros de Excel (.xlsx, .xls) o archivos .csv');
      this.archivoSeleccionado.set(null);
      return;
    }

    this.errorMsg.set(null);
    this.archivoSeleccionado.set(file);
  }

  removerArchivo(e?: Event): void {
    if (e) e.stopPropagation();
    this.archivoSeleccionado.set(null);
  }

  ejecutarImportacion(): void {
    const file = this.archivoSeleccionado();
    if (!file) return;

    this.procesandoImportacion.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    this.docentesService.importarExcel(file).subscribe({
      next: (res) => {
        this.procesandoImportacion.set(false);
        this.archivoSeleccionado.set(null);
        this.successMsg.set(
          `Carga masiva exitosa: Se importaron/procesaron ${res.totalImportados} docentes correctamente.`,
        );
        this.cargarDocentes();
      },
      error: (err) => {
        this.procesandoImportacion.set(false);
        this.errorMsg.set(
          err.error?.message ||
            'Error al procesar el archivo. Verifique la estructura de columnas y que no contenga filas duplicadas.',
        );
      },
    });
  }

  // ==========================================
  // MODAL CREAR / EDITAR INDIVIDUAL
  // ==========================================
  abrirModalCrearDocente(): void {
    this.editandoCodigo.set(null);
    this.docenteForm = {
      codigo: '',
      nombres: '',
      apellidos: '',
      correo: '',
      telefono: '',
    };
    this.docenteErrors.set({});
    this.modalDocenteError.set(null);
    this.mostrarModalDocente.set(true);
  }

  abrirModalEditarDocente(d: DocenteItem): void {
    this.editandoCodigo.set(d.codigo);
    this.docenteForm = {
      codigo: d.codigo,
      nombres: d.nombres,
      apellidos: d.apellidos,
      correo: d.correo,
      telefono: d.telefono || '',
    };
    this.docenteErrors.set({});
    this.modalDocenteError.set(null);
    this.mostrarModalDocente.set(true);
  }

  cerrarModalDocente(): void {
    this.mostrarModalDocente.set(false);
    this.modalDocenteError.set(null);
    this.docenteErrors.set({});
  }

  validarDocente(): boolean {
    const errs: {
      codigo?: string;
      nombres?: string;
      apellidos?: string;
      correo?: string;
    } = {};

    if (!this.editandoCodigo()) {
      if (!this.docenteForm.codigo || !this.docenteForm.codigo.trim()) {
        errs.codigo = 'El código docente UAGRM es obligatorio';
      }
    }

    if (!this.docenteForm.nombres || !this.docenteForm.nombres.trim()) {
      errs.nombres = 'Los nombres son requeridos';
    }

    if (!this.docenteForm.apellidos || !this.docenteForm.apellidos.trim()) {
      errs.apellidos = 'Los apellidos son requeridos';
    }

    if (!this.docenteForm.correo || !this.docenteForm.correo.trim()) {
      errs.correo = 'El correo electrónico es requerido';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.docenteForm.correo.trim())) {
        errs.correo = 'Ingrese un formato de correo electrónico válido';
      }
    }

    this.docenteErrors.set(errs);
    return Object.keys(errs).length === 0;
  }

  guardarDocente(): void {
    if (!this.validarDocente()) return;

    this.guardandoDocente.set(true);
    this.modalDocenteError.set(null);

    const payload = {
      codigo: this.docenteForm.codigo.trim(),
      nombres: this.docenteForm.nombres.trim(),
      apellidos: this.docenteForm.apellidos.trim(),
      correo: this.docenteForm.correo.trim().toLowerCase(),
      telefono: this.docenteForm.telefono ? this.docenteForm.telefono.trim() : undefined,
    };

    const codigo = this.editandoCodigo();
    const obs = codigo
      ? this.docentesService.actualizarDocente(codigo, payload)
      : this.docentesService.crearDocente(payload);

    obs.subscribe({
      next: () => {
        this.guardandoDocente.set(false);
        this.cerrarModalDocente();
        this.successMsg.set(
          codigo ? 'Datos de docente actualizados' : 'Docente registrado exitosamente',
        );
        this.cargarDocentes();
      },
      error: (err) => {
        this.guardandoDocente.set(false);
        this.modalDocenteError.set(
          err.error?.message || 'Error al guardar docente en el servidor',
        );
      },
    });
  }

  abrirConfirmacionEliminarDocente(d: DocenteItem): void {
    this.docenteAEliminar = d;
    this.confirmacionMensaje = `¿Está seguro de que desea cambiar el estado o desactivar al docente ${d.nombres} ${d.apellidos} (${d.codigo})?`;
    this.mostrarConfirmarEliminar.set(true);
  }

  ejecutarEliminacion(): void {
    if (!this.docenteAEliminar) return;

    const { codigo, nombres, apellidos } = this.docenteAEliminar;
    this.mostrarConfirmarEliminar.set(false);

    this.docentesService.eliminarDocente(codigo).subscribe({
      next: () => {
        this.successMsg.set(`Docente ${nombres} ${apellidos} desactivado o eliminado correctamente`);
        this.cargarDocentes();
      },
      error: (err) => {
        this.errorMsg.set(err.error?.message || 'Error al procesar la baja del docente');
      },
    });
  }
}
