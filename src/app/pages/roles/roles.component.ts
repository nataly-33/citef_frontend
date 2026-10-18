import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  UsuariosService,
  RolItem,
} from '../../core/services/usuarios.service';
import {
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
} from '../../shared/components';

interface PermisoGrupo {
  modulo: string;
  permisos: Array<{
    id_permiso: number;
    codigo: string;
    modulo: string;
    descrip: string;
  }>;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    ModalAlertComponent,
    TableCardComponent,
  ],
  template: `
    <!-- HEADER -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Roles y Permisos</h2>
      </div>

      <div class="header-actions">
        <button class="citef-btn citef-btn-primary" (click)="abrirModalCrear()">
          <i class="bi bi-shield-plus"></i>
          <span>Nuevo Rol</span>
        </button>
      </div>
    </div>

    <!-- ALERTAS -->
    <div *ngIf="successMsg()" class="alert-banner alert-success">
      <i class="bi bi-check-circle-fill"></i>
      <span>{{ successMsg() }}</span>
    </div>

    <div *ngIf="errorMsg()" class="alert-banner alert-danger">
      <i class="bi bi-exclamation-triangle-fill"></i>
      <span>{{ errorMsg() }}</span>
    </div>

    <!-- TABLA DE ROLES -->
    <div class="citef-card p-0 mb-4">
      <div class="card-section-header">
        <h3 class="section-title">Roles Configurados</h3>
      </div>
      <div class="table-responsive">
        <table class="citef-table">
          <thead>
            <tr>
              <th style="width: 220px">Rol</th>
              <th>Descripción</th>
              <th class="text-center" style="width: 140px">Permisos</th>
              <th class="text-center" style="width: 110px">Estado</th>
              <th class="text-center" style="width: 140px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let r of listaRoles()">
              <td>
                <div class="role-identity">
                  <i class="bi bi-shield-lock text-primary"></i>
                  <strong>{{ r.nombre }}</strong>
                </div>
              </td>
              <td>{{ r.descrip }}</td>
              <td class="text-center">
                <span class="citef-badge citef-badge-info">
                  {{ r.permisos.length || 0 }} permisos
                </span>
              </td>
              <td class="text-center">
                <span class="citef-badge citef-badge-success">Activo</span>
              </td>
              <td class="text-center">
                <div class="action-buttons">
                  <button
                    type="button"
                    class="btn-icon btn-edit"
                    title="Configurar permisos del rol"
                    (click)="abrirModalEditar(r)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>
                  <button
                    type="button"
                    class="btn-icon btn-view"
                    [class.active]="rolSeleccionadoParaVer()?.id_rol === r.id_rol"
                    title="Ver permisos en matriz inferior"
                    (click)="seleccionarRolParaVer(r)"
                  >
                    <i class="bi bi-eye"></i>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- MATRIZ DE PERMISOS -->
    <div class="citef-card p-0">
      <div class="card-section-header filter-bar">
        <div>
          <h3 class="section-title">Matriz de Permisos</h3>
          <p class="section-subtitle" *ngIf="rolSeleccionadoParaVer()">
            Mostrando permisos para el rol <strong>{{ rolSeleccionadoParaVer()?.nombre }}</strong>
          </p>
        </div>

        <div class="filter-controls">
          <!-- Búsqueda rápida de permisos -->
          <div class="search-box">
            <i class="bi bi-search search-icon"></i>
            <input
              type="text"
              class="citef-input input-sm"
              [(ngModel)]="busquedaPermiso"
              placeholder="Buscar permiso..."
            />
          </div>

          <!-- Selector de rol para resaltar -->
          <select
            class="citef-select select-sm"
            [ngModel]="rolSeleccionadoParaVer()?.id_rol"
            (ngModelChange)="onCambioRolSelect($event)"
          >
            <option *ngFor="let r of listaRoles()" [value]="r.id_rol">
              {{ r.nombre }}
            </option>
          </select>
        </div>
      </div>

      <div class="table-responsive">
        <table class="citef-table">
          <thead>
            <tr>
              <th style="width: 200px">Módulo</th>
              <th style="width: 250px">Código</th>
              <th>Descripción</th>
              <th class="text-center" style="width: 140px">Asignado</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let p of permisosPaginados()">
              <td>
                <span class="badge-modulo">{{ p.modulo }}</span>
              </td>
              <td>
                <code class="perm-code">{{ p.codigo }}</code>
              </td>
              <td>{{ p.descrip }}</td>
              <td class="text-center">
                <span
                  *ngIf="tienePermisoRol(p.codigo)"
                  class="citef-badge citef-badge-success"
                >
                  <i class="bi bi-check-lg"></i> Asignado
                </span>
                <span
                  *ngIf="!tienePermisoRol(p.codigo)"
                  class="citef-badge citef-badge-secondary"
                >
                  No asignado
                </span>
              </td>
            </tr>

            <tr *ngIf="permisosFiltrados().length === 0">
              <td colspan="4" class="empty-row">
                <div class="empty-state">
                  <i class="bi bi-inbox"></i>
                  <p>No se encontraron permisos</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- PAGINACIÓN DE PERMISOS COMPARTIDA -->
      <app-pagination
        [paginaActual]="paginaActual()"
        [totalRegistros]="permisosFiltrados().length"
        [tamanoPagina]="tamanoPagina"
        etiqueta="permisos"
        (paginaCambiada)="cambiarPagina($event)"
      ></app-pagination>
    </div>

    <!-- MODAL: CREAR / CONFIGURAR PERMISOS DE ROL -->
    <div *ngIf="mostrarModal()" class="modal-backdrop">
      <div class="modal-card modal-lg">
        <div class="modal-header">
          <h3 class="modal-title">
            {{ esEdicion() ? 'Configurar Permisos: ' + modeloRol.nombre : 'Nuevo Rol' }}
          </h3>
          <button type="button" class="btn-close" (click)="mostrarModal.set(false)">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <!-- Alerta de Error dentro del Modal Roles usando componente compartido -->
        <app-modal-alert
          [mensaje]="modalErrorMsg()"
          (cerrar)="modalErrorMsg.set(null)"
        ></app-modal-alert>

        <form (ngSubmit)="guardarRol()" class="modal-form">
          <div class="form-row" *ngIf="!esEdicion()">
            <div class="form-group col-6">
              <label class="form-label">Nombre del Rol <span class="req">*</span></label>
              <input
                type="text"
                class="citef-input"
                [(ngModel)]="modeloRol.nombre"
                name="nombreRol"
                placeholder="Ej: SUPERVISOR"
                required
              />
            </div>
            <div class="form-group col-6">
              <label class="form-label">Descripción <span class="req">*</span></label>
              <input
                type="text"
                class="citef-input"
                [(ngModel)]="modeloRol.descrip"
                name="descripRol"
                placeholder="Ej: Control de salas y turnos"
                required
              />
            </div>
          </div>

          <div class="permissions-manager">
            <div class="manager-topbar">
              <span class="manager-label">
                Permisos seleccionados: <strong>{{ permisosSeleccionados.length }}</strong> de {{ catalogoPermisos().length }}
              </span>
              <div class="manager-actions">
                <button type="button" class="citef-btn citef-btn-outline citef-btn-xs" (click)="seleccionarTodosPermisos()">
                  Seleccionar Todos
                </button>
                <button type="button" class="citef-btn citef-btn-outline citef-btn-xs" (click)="desmarcarTodosPermisos()">
                  Limpiar
                </button>
              </div>
            </div>

            <div class="modules-accordion-list">
              <div *ngFor="let g of permisosAgrupados()" class="module-block">
                <div class="module-block-header">
                  <span class="module-block-title">{{ g.modulo }}</span>
                  <button
                    type="button"
                    class="btn-toggle-module"
                    (click)="toggleModuloCompleto(g)"
                  >
                    Alternar módulo
                  </button>
                </div>

                <div class="perm-checkbox-grid">
                  <label
                    *ngFor="let p of g.permisos"
                    class="perm-checkbox-item"
                    [class.active]="estaPermisoSeleccionado(p.id_permiso)"
                  >
                    <input
                      type="checkbox"
                      class="custom-check"
                      [checked]="estaPermisoSeleccionado(p.id_permiso)"
                      (change)="togglePermiso(p.id_permiso)"
                    />
                    <div class="perm-item-text">
                      <span class="code">{{ p.codigo }}</span>
                      <span class="desc">{{ p.descrip }}</span>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="citef-btn citef-btn-secondary"
              (click)="mostrarModal.set(false)"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="citef-btn citef-btn-primary"
              [disabled]="guardando() || (!esEdicion() && (!modeloRol.nombre || !modeloRol.descrip))"
            >
              <i class="bi bi-check2"></i>
              <span>{{ guardando() ? 'Guardando...' : 'Guardar Cambios' }}</span>
            </button>
          </div>
        </form>
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
        font-weight: 700;
        color: var(--citef-primary, #002855);
        margin: 0;
      }

      /* Alert Banners */
      .alert-banner {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.75rem 1rem;
        border-radius: var(--citef-radius-sm, 6px);
        font-size: 0.875rem;
        margin-bottom: 1.25rem;
      }

      .alert-success {
        background-color: var(--citef-success-bg, #f0fdf4);
        color: var(--citef-success, #16a34a);
        border: 1px solid #bbf7d0;
      }

      .alert-danger {
        background-color: var(--citef-danger-bg, #fef2f2);
        color: var(--citef-danger, #ef4444);
        border: 1px solid #fecaca;
      }

      .card-section-header {
        padding: 1rem 1.25rem;
        border-bottom: 1px solid var(--citef-border, #e2e8f0);
        background: #f8fafc;
      }

      .section-title {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--citef-text-primary, #1e293b);
        margin: 0;
      }

      .section-subtitle {
        font-size: 0.8rem;
        color: var(--citef-text-secondary, #64748b);
        margin: 0.2rem 0 0 0;
      }

      .filter-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1rem;
      }

      .filter-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .search-box {
        position: relative;
        display: flex;
        align-items: center;
      }

      .search-icon {
        position: absolute;
        left: 0.65rem;
        color: var(--citef-text-muted, #94a3b8);
        pointer-events: none;
        font-size: 0.85rem;
      }

      .input-sm {
        padding-left: 2rem;
        font-size: 0.825rem;
        padding-top: 0.4rem;
        padding-bottom: 0.4rem;
        width: 180px;
      }

      .select-sm {
        font-size: 0.825rem;
        padding-top: 0.4rem;
        padding-bottom: 0.4rem;
        min-width: 160px;
      }

      .role-identity {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.875rem;
      }

      .action-buttons {
        display: inline-flex;
        gap: 0.4rem;
      }

      .btn-icon {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: 1px solid #cbd5e1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.15s ease;
        background: transparent;
        color: var(--citef-text-secondary, #64748b);
      }

      .btn-edit:hover {
        background-color: #f0f7ff;
        border-color: var(--citef-primary, #002855);
        color: var(--citef-primary, #002855);
      }

      .btn-view:hover,
      .btn-view.active {
        background-color: #e0edff;
        border-color: var(--citef-primary, #002855);
        color: var(--citef-primary, #002855);
      }

      .badge-modulo {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: 4px;
        background-color: #f1f5f9;
        color: var(--citef-primary, #002855);
        border: 1px solid #e2e8f0;
      }

      .perm-code {
        font-family: monospace;
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--citef-text-primary, #1e293b);
      }

      .citef-badge-secondary {
        background: #f1f5f9;
        color: #94a3b8;
        border: 1px solid #e2e8f0;
      }

      .empty-state {
        padding: 2.5rem 1rem;
        text-align: center;
        color: var(--citef-text-muted, #94a3b8);
      }

      .empty-state i {
        font-size: 1.75rem;
        margin-bottom: 0.4rem;
        display: block;
      }

      /* Modal */
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.65);
        backdrop-filter: blur(2px);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        padding: 1rem;
      }

      .modal-card {
        width: 100%;
        background: #ffffff;
        border-radius: var(--citef-radius-lg, 12px);
        box-shadow: var(--citef-shadow-lg);
        padding: 1.75rem;
        max-height: 90vh;
        overflow-y: auto;
      }

      .modal-lg {
        max-width: 760px;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid var(--citef-border, #e2e8f0);
      }

      .modal-title {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--citef-text-primary, #1e293b);
        margin: 0;
      }

      .btn-close {
        background: transparent;
        border: none;
        font-size: 1.1rem;
        color: var(--citef-text-muted, #94a3b8);
        cursor: pointer;
      }

      .form-row {
        display: flex;
        gap: 1rem;
        margin-bottom: 1rem;
      }

      .col-6 {
        flex: 1;
      }

      .form-label {
        display: block;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--citef-text-secondary, #64748b);
        margin-bottom: 0.35rem;
      }

      .req {
        color: var(--citef-danger, #ef4444);
      }

      /* Permissions Manager in Modal */
      .permissions-manager {
        border: 1px solid var(--citef-border, #e2e8f0);
        border-radius: var(--citef-radius-sm, 6px);
        padding: 1rem;
        background: #f8fafc;
      }

      .manager-topbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.85rem;
      }

      .manager-label {
        font-size: 0.825rem;
        color: var(--citef-text-secondary, #64748b);
      }

      .manager-actions {
        display: flex;
        gap: 0.5rem;
      }

      .modules-accordion-list {
        max-height: 400px;
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 0.85rem;
        padding-right: 0.35rem;
      }

      .module-block {
        background: #ffffff;
        border: 1px solid var(--citef-border, #e2e8f0);
        border-radius: 6px;
        padding: 0.75rem;
      }

      .module-block-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 0.5rem;
        padding-bottom: 0.35rem;
        border-bottom: 1px solid #f1f5f9;
      }

      .module-block-title {
        font-size: 0.825rem;
        font-weight: 700;
        color: var(--citef-primary, #002855);
      }

      .btn-toggle-module {
        background: transparent;
        border: none;
        color: var(--citef-primary, #002855);
        font-size: 0.725rem;
        font-weight: 600;
        cursor: pointer;
        text-decoration: underline;
      }

      .perm-checkbox-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.4rem;
      }

      .perm-checkbox-item {
        display: flex;
        align-items: flex-start;
        gap: 0.5rem;
        padding: 0.4rem 0.55rem;
        border: 1px solid var(--citef-border, #e2e8f0);
        border-radius: 4px;
        background: #ffffff;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .perm-checkbox-item:hover {
        background-color: #f8fafc;
      }

      .perm-checkbox-item.active {
        background-color: #f0f7ff;
        border-color: var(--citef-primary, #002855);
      }

      .custom-check {
        margin-top: 0.15rem;
        cursor: pointer;
      }

      .perm-item-text {
        display: flex;
        flex-direction: column;
        line-height: 1.25;
      }

      .perm-item-text .code {
        font-family: monospace;
        font-size: 0.75rem;
        font-weight: 700;
        color: var(--citef-text-primary, #1e293b);
      }

      .perm-item-text .desc {
        font-size: 0.7rem;
        color: var(--citef-text-secondary, #64748b);
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.25rem;
        padding-top: 1rem;
        border-top: 1px solid var(--citef-border, #e2e8f0);
      }

      @media (max-width: 768px) {
        .perm-checkbox-grid {
          grid-template-columns: 1fr;
        }
        .filter-bar {
          flex-direction: column;
          align-items: flex-start;
        }
        .filter-controls {
          width: 100%;
          flex-direction: column;
          align-items: stretch;
        }
        .input-sm, .select-sm {
          width: 100%;
        }
      }
    `,
  ],
})
export class RolesComponent implements OnInit {
  listaRoles = signal<RolItem[]>([]);
  catalogoPermisos = signal<any[]>([]);
  rolSeleccionadoParaVer = signal<RolItem | null>(null);

  busquedaPermiso = '';

  // Modal
  mostrarModal = signal<boolean>(false);
  esEdicion = signal<boolean>(false);
  guardando = signal<boolean>(false);

  modeloRol = {
    id_rol: 0,
    nombre: '',
    descrip: '',
  };

  permisosSeleccionados: number[] = [];

  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);
  modalErrorMsg = signal<string | null>(null);

  constructor(private usuariosService: UsuariosService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    this.usuariosService.getRoles().subscribe({
      next: (data) => {
        this.listaRoles.set(data);
        if (data.length > 0 && !this.rolSeleccionadoParaVer()) {
          this.rolSeleccionadoParaVer.set(data[0]);
        }
      },
      error: () => this.showError('Error al sincronizar roles.'),
    });

    this.usuariosService.getPermisos().subscribe({
      next: (data) => this.catalogoPermisos.set(data),
      error: () => this.showError('Error al cargar catálogo de permisos.'),
    });
  }

  permisosAgrupados = computed<PermisoGrupo[]>(() => {
    const list = this.catalogoPermisos();
    const gruposMap = new Map<string, any[]>();

    for (const p of list) {
      const mod = p.modulo || 'General';
      if (!gruposMap.has(mod)) gruposMap.set(mod, []);
      gruposMap.get(mod)!.push(p);
    }

    const resultado: PermisoGrupo[] = [];
    gruposMap.forEach((permisos, modulo) => {
      resultado.push({ modulo, permisos });
    });
    return resultado;
  });

  permisosFiltrados = computed(() => {
    let list = this.catalogoPermisos();
    if (this.busquedaPermiso.trim()) {
      const q = this.busquedaPermiso.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.codigo.toLowerCase().includes(q) ||
          p.descrip.toLowerCase().includes(q) ||
          (p.modulo && p.modulo.toLowerCase().includes(q)),
      );
    }
    return list;
  });

  // Paginación de la matriz de permisos (máximo 15 registros por página)
  paginaActual = signal<number>(1);
  tamanoPagina = 15;

  totalPaginas = computed(() => {
    const total = this.permisosFiltrados().length;
    return total === 0 ? 1 : Math.ceil(total / this.tamanoPagina);
  });

  permisosPaginados = computed(() => {
    const list = this.permisosFiltrados();
    const pag = this.paginaActual();
    const start = (pag - 1) * this.tamanoPagina;
    return list.slice(start, start + this.tamanoPagina);
  });

  inicioRegistro = computed(() => {
    if (this.permisosFiltrados().length === 0) return 0;
    return (this.paginaActual() - 1) * this.tamanoPagina + 1;
  });

  finRegistro = computed(() => {
    return Math.min(
      this.paginaActual() * this.tamanoPagina,
      this.permisosFiltrados().length,
    );
  });

  cambiarPagina(nueva: number) {
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
    }
  }

  seleccionarRolParaVer(r: RolItem) {
    this.rolSeleccionadoParaVer.set(r);
  }

  onCambioRolSelect(idRol: any) {
    const r = this.listaRoles().find((x) => x.id_rol === Number(idRol));
    if (r) this.rolSeleccionadoParaVer.set(r);
  }

  tienePermisoRol(codigoPermiso: string): boolean {
    const r = this.rolSeleccionadoParaVer();
    if (!r || !r.permisos) return false;
    return r.permisos.some((p) => p.codigo === codigoPermiso);
  }

  abrirModalCrear() {
    this.esEdicion.set(false);
    this.modeloRol = { id_rol: 0, nombre: '', descrip: '' };
    this.permisosSeleccionados = [];
    this.modalErrorMsg.set(null);
    this.mostrarModal.set(true);
  }

  abrirModalEditar(r: RolItem) {
    this.esEdicion.set(true);
    this.modeloRol = { id_rol: r.id_rol, nombre: r.nombre, descrip: r.descrip };
    this.permisosSeleccionados = (r.permisos || []).map((p) => p.id_permiso);
    this.modalErrorMsg.set(null);
    this.mostrarModal.set(true);
  }

  estaPermisoSeleccionado(idPermiso: number): boolean {
    return this.permisosSeleccionados.includes(idPermiso);
  }

  togglePermiso(idPermiso: number) {
    const idx = this.permisosSeleccionados.indexOf(idPermiso);
    if (idx >= 0) {
      this.permisosSeleccionados.splice(idx, 1);
    } else {
      this.permisosSeleccionados.push(idPermiso);
    }
  }

  seleccionarTodosPermisos() {
    this.permisosSeleccionados = this.catalogoPermisos().map((p) => p.id_permiso);
  }

  desmarcarTodosPermisos() {
    this.permisosSeleccionados = [];
  }

  toggleModuloCompleto(g: PermisoGrupo) {
    const ids = g.permisos.map((p) => p.id_permiso);
    const todosMarcados = ids.every((id) => this.permisosSeleccionados.includes(id));

    if (todosMarcados) {
      this.permisosSeleccionados = this.permisosSeleccionados.filter((id) => !ids.includes(id));
    } else {
      for (const id of ids) {
        if (!this.permisosSeleccionados.includes(id)) {
          this.permisosSeleccionados.push(id);
        }
      }
    }
  }

  guardarRol() {
    this.guardando.set(true);
    this.modalErrorMsg.set(null);

    if (this.esEdicion()) {
      this.usuariosService
        .actualizarPermisosRol(this.modeloRol.id_rol, this.permisosSeleccionados)
        .subscribe({
          next: (act) => {
            this.guardando.set(false);
            this.mostrarModal.set(false);
            this.showSuccess(`Permisos del rol ${act.nombre} actualizados correctamente.`);
            this.cargarDatos();
          },
          error: (err) => {
            this.guardando.set(false);
            const msg = err.error?.message || 'Error al actualizar permisos del rol.';
            this.modalErrorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
          },
        });
    } else {
      this.usuariosService
        .crearRol({
          nombre: this.modeloRol.nombre.toUpperCase(),
          descrip: this.modeloRol.descrip,
          permisos_ids: this.permisosSeleccionados,
        })
        .subscribe({
          next: (nuevo) => {
            this.guardando.set(false);
            this.mostrarModal.set(false);
            this.showSuccess(`Rol ${nuevo.nombre} creado exitosamente.`);
            this.cargarDatos();
          },
          error: (err) => {
            this.guardando.set(false);
            const msg = err.error?.message || 'Error al crear el rol.';
            this.modalErrorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
          },
        });
    }
  }

  private showSuccess(msg: string) {
    this.successMsg.set(msg);
    this.errorMsg.set(null);
    setTimeout(() => this.successMsg.set(null), 4000);
  }

  private showError(msg: string) {
    this.errorMsg.set(msg);
    this.successMsg.set(null);
    setTimeout(() => this.errorMsg.set(null), 5000);
  }
}
