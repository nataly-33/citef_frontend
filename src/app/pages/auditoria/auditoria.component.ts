import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AuditoriaService,
  BitacoraItem,
} from '../../core/services/auditoria.service';
import {
  PaginationComponent,
  TableCardComponent,
} from '../../shared/components';

@Component({
  selector: 'app-auditoria',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, TableCardComponent],
  template: `
    <div class="page-header">
      <div>
        <h2 class="page-title">Bitácora de Auditoría</h2>
      </div>

      <div class="header-actions">
        <button class="citef-btn citef-btn-outline" (click)="cargarDatos()">
          <i class="bi bi-arrow-clockwise"></i>
          <span>Refrescar</span>
        </button>
      </div>
    </div>

    <!-- BARRA DE FILTROS DINÁMICOS -->
    <div class="citef-card filter-card mb-4">
      <div class="filter-grid">
        <div class="search-field">
          <label class="filter-label">Usuario / Correo</label>
          <div class="search-input-wrapper">
            <i class="bi bi-person-search search-icon"></i>
            <input
              type="text"
              class="citef-input search-input"
              [(ngModel)]="filtroCorreo"
              (keyup.enter)="aplicarFiltros()"
              placeholder="Filtrar por correo de usuario..."
            />
          </div>
        </div>

        <div class="filter-field">
          <label class="filter-label">Tabla Afectada</label>
          <select
            class="citef-select"
            [(ngModel)]="filtroTabla"
            (change)="aplicarFiltros()"
          >
            <option value="">Todas las tablas</option>
            <option value="usuario">usuario</option>
            <option value="rol">rol</option>
            <option value="rol_permiso">rol_permiso</option>
            <option value="token_recuperacion">token_recuperacion</option>
          </select>
        </div>

        <div class="filter-field">
          <label class="filter-label">Acción Operativa</label>
          <select
            class="citef-select"
            [(ngModel)]="filtroAccion"
            (change)="aplicarFiltros()"
          >
            <option value="">Todas las acciones</option>
            <option value="LOGIN">LOGIN</option>
            <option value="INSERT">INSERT (Creación)</option>
            <option value="UPDATE">UPDATE (Modificación)</option>
            <option value="CAMBIO_ESTADO">CAMBIO_ESTADO</option>
            <option value="RESET_PASSWORD">RESET_PASSWORD</option>
            <option value="SOLICITUD_RECUPERACION_PASSWORD">SOLICITUD_RECUPERACION</option>
          </select>
        </div>

        <div class="filter-actions-col">
          <button class="citef-btn citef-btn-primary" (click)="aplicarFiltros()">
            <i class="bi bi-funnel-fill"></i>
            <span>Filtrar</span>
          </button>
          <button class="citef-btn citef-btn-secondary" (click)="limpiarFiltros()">
            <i class="bi bi-arrow-counterclockwise me-1"></i>
            <span>Limpiar</span>
          </button>
        </div>
      </div>
    </div>

    <!-- TABLA DE EVENTOS DE AUDITORÍA CON COMPONENTES COMPARTIDOS -->
    <app-table-card>
      <table class="citef-table">
        <thead>
          <tr>
            <th class="sortable text-center" style="width: 75px" (click)="ordenarPor('id_auditoria')">
              <span>ID</span>
              <i class="bi" [class]="iconoOrden('id_auditoria')"></i>
            </th>
            <th class="sortable" style="width: 205px; white-space: nowrap;" (click)="ordenarPor('fecha_hora')">
              <span>Fecha y Hora</span>
              <i class="bi" [class]="iconoOrden('fecha_hora')"></i>
            </th>
            <th style="width: 140px">Acción</th>
            <th style="width: 150px">Tabla / Entidad</th>
            <th class="text-center" style="width: 110px">Registro ID</th>
            <th>Usuario Responsable</th>
            <th style="width: 130px">IP Cliente</th>
            <th class="text-center" style="width: 110px">Detalle</th>
          </tr>
        </thead>
        <tbody>
          <tr *ngFor="let item of listaAuditoria()">
            <td class="text-center">
              <span class="text-muted font-monospace">#{{ item.id_auditoria }}</span>
            </td>
            <td style="white-space: nowrap;">
              <div class="date-cell">
                <i class="bi bi-calendar-event text-muted me-1"></i>
                <span class="date-text"><strong>{{ item.fecha_hora | date: 'dd/MM/yyyy' }}</strong> {{ item.fecha_hora | date: 'HH:mm:ss' }}</span>
              </div>
            </td>
            <td>
              <span
                class="citef-badge"
                [class.citef-badge-success]="item.accion === 'INSERT'"
                [class.citef-badge-info]="item.accion === 'LOGIN' || item.accion === 'UPDATE'"
                [class.citef-badge-warning]="item.accion.includes('PASSWORD') || item.accion === 'CAMBIO_ESTADO'"
                [class.citef-badge-danger]="item.accion === 'DELETE'"
              >
                <i class="bi" [class]="iconoAccion(item.accion)"></i>
                {{ item.accion }}
              </span>
            </td>
            <td>
              <code class="table-name-code">{{ item.tabla_afectada }}</code>
            </td>
            <td class="text-center">
              <span class="badge text-bg-light border font-monospace">
                {{ item.id_registro_afectado }}
              </span>
            </td>
            <td>
              <div class="audit-user-cell">
                <i class="bi bi-person-fill text-muted me-1"></i>
                <span>{{ item.correo_usuario || 'Sistema / Público' }}</span>
              </div>
            </td>
            <td>
              <code class="ip-code">{{ item.ip_cliente || '127.0.0.1' }}</code>
            </td>
            <td class="text-center">
              <button
                type="button"
                class="citef-btn citef-btn-outline citef-btn-xs"
                (click)="abrirDetalle(item)"
                title="Ver snapshot JSON de cambios"
              >
                <i class="bi bi-file-earmark-code"></i>
                <span>Ver JSON</span>
              </button>
            </td>
          </tr>
          <tr *ngIf="listaAuditoria().length === 0">
            <td colspan="8" class="empty-state-cell">
              <div class="empty-state">
                <i class="bi bi-clock-history"></i>
                <p>No se encontraron registros de auditoría para los criterios seleccionados</p>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <!-- PAGINACIÓN COMPARTIDA -->
      <div card-footer>
        <app-pagination
          [paginaActual]="paginaActual()"
          [totalRegistros]="totalRegistros()"
          [tamanoPagina]="tamanoPagina"
          etiqueta="registros de auditoría"
          (paginaCambiada)="cambiarPagina($event)"
        ></app-pagination>
      </div>
    </app-table-card>

    <!-- MODAL: INSPECCIÓN FORENSE DE CAMBIOS EN JSON -->
    <div *ngIf="itemSeleccionado()" class="modal-backdrop">
      <div class="modal-card citef-card modal-lg">
        <div class="modal-header">
          <div class="modal-title-group">
            <div class="modal-icon-badge">
              <i class="bi bi-code-slash"></i>
            </div>
            <div>
              <h3 class="modal-title">Inspección de Cambios de Registro</h3>
              <p class="modal-subtitle">
                Evento #{{ itemSeleccionado()?.id_auditoria }} · Tabla:
                <strong>{{ itemSeleccionado()?.tabla_afectada }}</strong> · Registro ID:
                <strong>{{ itemSeleccionado()?.id_registro_afectado }}</strong>
              </p>
            </div>
          </div>
          <button class="modal-close-btn" (click)="itemSeleccionado.set(null)">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <div class="diff-container">
          <div class="diff-box">
            <div class="diff-header diff-header-old">
              <i class="bi bi-dash-circle me-1"></i>
              <span>Estado Anterior (Valores Previos)</span>
            </div>
            <pre class="json-code-block">{{ itemSeleccionado()?.valores_anteriores | json }}</pre>
          </div>

          <div class="diff-box">
            <div class="diff-header diff-header-new">
              <i class="bi bi-plus-circle me-1"></i>
              <span>Estado Nuevo (Valores Guardados)</span>
            </div>
            <pre class="json-code-block">{{ itemSeleccionado()?.valores_nuevos | json }}</pre>
          </div>
        </div>

        <div class="modal-footer">
          <button
            type="button"
            class="citef-btn citef-btn-primary"
            (click)="itemSeleccionado.set(null)"
          >
            Cerrar Detalle
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .page-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.5rem;
      }

      .page-title {
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--citef-primary);
        letter-spacing: -0.02em;
      }

      .page-subtitle {
        font-size: 0.85rem;
        color: var(--citef-text-secondary);
        margin-top: 0.15rem;
      }

      /* Filter Card */
      .filter-card {
        padding: 1.25rem 1.5rem;
      }

      .filter-grid {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr auto;
        gap: 1rem;
        align-items: flex-end;
      }

      .filter-label {
        display: block;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--citef-text-muted);
        margin-bottom: 0.4rem;
        letter-spacing: 0.03em;
      }

      .search-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-icon {
        position: absolute;
        left: 0.75rem;
        color: var(--citef-text-muted);
        pointer-events: none;
      }

      .search-input {
        padding-left: 2.25rem;
      }

      .filter-actions-col {
        display: flex;
        gap: 0.5rem;
      }

      /* Table Details */
      .th-content {
        display: flex;
        align-items: center;
        gap: 0.4rem;
      }

      .date-cell {
        display: inline-flex;
        align-items: center;
        gap: 0.35rem;
        white-space: nowrap;
        line-height: 1.2;
      }

      .date-text {
        font-size: 0.8125rem;
        color: var(--citef-text-primary);
      }

      .table-name-code {
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--citef-primary);
      }

      .audit-user-cell {
        display: flex;
        align-items: center;
        font-size: 0.825rem;
      }

      .ip-code {
        font-size: 0.75rem;
        color: #475569;
        background: #f1f5f9;
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
      }

      .empty-state {
        padding: 3rem 1rem;
        text-align: center;
        color: var(--citef-text-muted);
      }

      .empty-state i {
        font-size: 2.5rem;
        margin-bottom: 0.5rem;
        display: block;
      }

      /* Pagination */
      .pagination-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.85rem 1.5rem;
        border-top: 1px solid var(--citef-border);
        background: #f8fafc;
      }

      .pagination-info {
        font-size: 0.8rem;
        color: var(--citef-text-secondary);
      }

      .pagination-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .page-indicator {
        font-size: 0.8rem;
        font-weight: 600;
      }

      /* JSON Diff Modal */
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.6);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 1rem;
      }

      .modal-card {
        width: 100%;
        max-width: 840px;
        background: #ffffff;
        border-radius: var(--citef-radius-lg);
        box-shadow: var(--citef-shadow-lg);
        padding: 2rem;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 1.5rem;
      }

      .modal-title-group {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .modal-icon-badge {
        width: 42px;
        height: 42px;
        border-radius: 10px;
        background: #e0edff;
        color: var(--citef-primary);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.25rem;
      }

      .modal-title {
        font-size: 1.2rem;
        font-weight: 800;
        color: var(--citef-primary);
      }

      .modal-subtitle {
        font-size: 0.8rem;
        color: var(--citef-text-muted);
      }

      .modal-close-btn {
        background: transparent;
        border: none;
        color: var(--citef-text-muted);
        font-size: 1.2rem;
        cursor: pointer;
        padding: 0.25rem;
      }

      .diff-container {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1.5rem;
      }

      .diff-box {
        border: 1px solid var(--citef-border);
        border-radius: var(--citef-radius-sm);
        overflow: hidden;
      }

      .diff-header {
        padding: 0.5rem 0.75rem;
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        display: flex;
        align-items: center;
      }

      .diff-header-old {
        background-color: #fef2f2;
        color: #991b1b;
        border-bottom: 1px solid #fee2e2;
      }

      .diff-header-new {
        background-color: #f0fdf4;
        color: #166534;
        border-bottom: 1px solid #dcfce7;
      }

      .json-code-block {
        margin: 0;
        padding: 0.75rem;
        font-size: 0.75rem;
        font-family: monospace;
        background-color: #f8fafc;
        max-height: 320px;
        overflow-y: auto;
        white-space: pre-wrap;
        word-break: break-all;
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
      }

      @media (max-width: 768px) {
        .filter-grid, .diff-container {
          grid-template-columns: 1fr;
        }
      }
    `,
  ],
})
export class AuditoriaComponent implements OnInit {
  listaAuditoria = signal<BitacoraItem[]>([]);
  totalRegistros = signal<number>(0);
  totalPaginas = signal<number>(1);
  paginaActual = signal<number>(1);
  tamanoPagina = 15;

  // Filtros
  filtroTabla = '';
  filtroAccion = '';
  filtroCorreo = '';

  // Ordenamiento
  columnaOrden = signal<string>('fecha_hora');
  direccionOrden = signal<'asc' | 'desc'>('desc');

  // Modal Detalle
  itemSeleccionado = signal<BitacoraItem | null>(null);

  inicioRegistro = computed(() => {
    if (this.totalRegistros() === 0) return 0;
    return (this.paginaActual() - 1) * this.tamanoPagina + 1;
  });

  finRegistro = computed(() => {
    return Math.min(
      this.paginaActual() * this.tamanoPagina,
      this.totalRegistros(),
    );
  });

  constructor(private auditoriaService: AuditoriaService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    this.auditoriaService
      .getBitacora({
        tabla: this.filtroTabla || undefined,
        accion: this.filtroAccion || undefined,
        correo: this.filtroCorreo ? this.filtroCorreo.trim() : undefined,
        pagina: this.paginaActual(),
        limite: this.tamanoPagina,
        ordenColumna: this.columnaOrden(),
        ordenDireccion: this.direccionOrden(),
      })
      .subscribe({
        next: (res) => {
          this.listaAuditoria.set(res.items);
          this.totalRegistros.set(res.total);
          this.totalPaginas.set(res.paginas_totales || 1);
        },
      });
  }

  aplicarFiltros() {
    this.paginaActual.set(1);
    this.cargarDatos();
  }

  limpiarFiltros() {
    this.filtroTabla = '';
    this.filtroAccion = '';
    this.filtroCorreo = '';
    this.paginaActual.set(1);
    this.cargarDatos();
  }

  cambiarPagina(nueva: number) {
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
      this.cargarDatos();
    }
  }

  ordenarPor(columna: string) {
    if (this.columnaOrden() === columna) {
      this.direccionOrden.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.columnaOrden.set(columna);
      this.direccionOrden.set('desc');
    }
    this.cargarDatos();
  }

  iconoOrden(columna: string): string {
    if (this.columnaOrden() !== columna) {
      return 'bi-arrow-down-up text-muted';
    }
    return this.direccionOrden() === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  iconoAccion(accion: string): string {
    if (accion === 'LOGIN') return 'bi-box-arrow-in-right';
    if (accion === 'INSERT') return 'bi-plus-circle-fill';
    if (accion === 'UPDATE') return 'bi-pencil-fill';
    if (accion === 'RESET_PASSWORD' || accion.includes('PASSWORD')) return 'bi-key-fill';
    if (accion === 'CAMBIO_ESTADO') return 'bi-toggle-on';
    return 'bi-activity';
  }

  abrirDetalle(item: BitacoraItem) {
    this.itemSeleccionado.set(item);
  }
}
