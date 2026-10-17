import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  UsuariosService,
  UsuarioItem,
  RolItem,
  CrearUsuarioPayload,
  ActualizarUsuarioPayload,
} from '../../core/services/usuarios.service';
import { ConfirmModalComponent } from '../../shared/components/confirm-modal/confirm-modal.component';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [CommonModule, FormsModule, ConfirmModalComponent],
  template: `
    <!-- HEADER -->
    <div class="page-header">
      <div>
        <h2 class="page-title">Usuarios</h2>
      </div>

      <div class="header-actions">
        <button class="citef-btn citef-btn-primary" (click)="abrirModalCrear()">
          <i class="bi bi-person-plus"></i>
          <span>Nuevo Usuario</span>
        </button>
      </div>
    </div>

    <!-- MENSAJES DE ALERTA -->
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
          <!-- Búsqueda -->
          <div class="filter-field-main">
            <label class="filter-label">Búsqueda</label>
            <div class="search-input-wrapper">
              <i class="bi bi-search search-icon"></i>
              <input
                type="text"
                class="citef-input search-input"
                [(ngModel)]="busqueda"
                name="busqueda"
                placeholder="Nombre, apellido o correo..."
              />
            </div>
          </div>

          <!-- Filtro Estado -->
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

          <!-- Filtro Rol -->
          <div class="filter-field">
            <label class="filter-label">Rol</label>
            <select
              class="citef-select"
              [(ngModel)]="filtroRol"
              name="filtroRol"
            >
              <option value="TODOS">Todos los roles</option>
              <option *ngFor="let r of listaRoles()" [value]="r.nombre">
                {{ r.nombre }}
              </option>
            </select>
          </div>

          <!-- Botones de Acción de Filtro -->
          <div class="filter-buttons">
            <button type="submit" class="citef-btn citef-btn-primary">
              <i class="bi bi-search"></i>
              <span>Buscar</span>
            </button>
            <button
              type="button"
              class="citef-btn citef-btn-outline"
              (click)="limpiarFiltros()"
              title="Restablecer filtros"
            >
              <i class="bi bi-arrow-counterclockwise"></i>
              <span>Limpiar</span>
            </button>
          </div>
        </div>
      </form>
    </div>

    <!-- TABLA DE USUARIOS -->
    <div class="citef-card p-0">
      <div class="table-responsive">
        <table class="citef-table">
          <thead>
            <tr>
              <th class="sortable text-center" style="width: 70px" (click)="ordenarPor('id_usuario')">
                <span>ID</span>
                <i class="bi" [class]="iconoOrden('id_usuario')"></i>
              </th>
              <th class="sortable" (click)="ordenarPor('nombres')">
                <span>Nombre Completo</span>
                <i class="bi" [class]="iconoOrden('nombres')"></i>
              </th>
              <th class="sortable" (click)="ordenarPor('correo_institucional')">
                <span>Correo Electrónico</span>
                <i class="bi" [class]="iconoOrden('correo_institucional')"></i>
              </th>
              <th>Teléfono</th>
              <th>Roles</th>
              <th class="sortable text-center" style="width: 110px" (click)="ordenarPor('activo')">
                <span>Estado</span>
                <i class="bi" [class]="iconoOrden('activo')"></i>
              </th>
              <th class="text-center" style="width: 120px">Acciones</th>
            </tr>
          </thead>
          <tbody>
            <tr *ngFor="let u of usuariosPaginados()">
              <td class="text-center">
                <span class="text-muted font-monospace">#{{ u.id_usuario }}</span>
              </td>
              <td>
                <strong class="user-fullname">{{ u.nombres }} {{ u.apellidos }}</strong>
              </td>
              <td>
                <span class="user-email">{{ u.correo_institucional }}</span>
              </td>
              <td>{{ u.telefono || '—' }}</td>
              <td>
                <div class="roles-badges">
                  <span *ngFor="let r of u.roles" class="badge-role">
                    {{ r.nombre }}
                  </span>
                </div>
              </td>
              <td class="text-center">
                <span
                  class="citef-badge"
                  [class.citef-badge-success]="u.activo"
                  [class.citef-badge-danger]="!u.activo"
                >
                  {{ u.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
              <td class="text-center">
                <div class="action-buttons">
                  <button
                    type="button"
                    class="btn-icon btn-edit"
                    title="Editar datos de usuario"
                    (click)="abrirModalEditar(u)"
                  >
                    <i class="bi bi-pencil"></i>
                  </button>

                  <button
                    type="button"
                    class="btn-icon btn-delete"
                    [title]="u.activo ? 'Desactivar usuario' : 'Eliminar usuario'"
                    (click)="abrirConfirmacionEliminar(u)"
                  >
                    <i class="bi bi-trash3"></i>
                  </button>
                </div>
              </td>
            </tr>

            <tr *ngIf="usuariosPaginados().length === 0">
              <td colspan="7" class="empty-row">
                <div class="empty-state">
                  <i class="bi bi-inbox"></i>
                  <p>No se encontraron usuarios</p>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- BARRA DE PAGINACIÓN -->
      <div class="pagination-bar" *ngIf="totalFiltrados() > 0">
        <div class="pagination-info">
          Mostrando {{ inicioRegistro() }}–{{ finRegistro() }} de {{ totalFiltrados() }} registros
        </div>

        <div class="pagination-controls">
          <button
            type="button"
            class="citef-btn citef-btn-outline citef-btn-xs"
            [disabled]="paginaActual() === 1"
            (click)="cambiarPagina(paginaActual() - 1)"
          >
            <i class="bi bi-chevron-left"></i>
            <span>Anterior</span>
          </button>

          <span class="page-indicator">
            {{ paginaActual() }} / {{ totalPaginas() }}
          </span>

          <button
            type="button"
            class="citef-btn citef-btn-outline citef-btn-xs"
            [disabled]="paginaActual() === totalPaginas()"
            (click)="cambiarPagina(paginaActual() + 1)"
          >
            <span>Siguiente</span>
            <i class="bi bi-chevron-right"></i>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL: CREAR USUARIO -->
    <div *ngIf="mostrarModalCrear()" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Nuevo Usuario</h3>
          <button type="button" class="btn-close" (click)="mostrarModalCrear.set(false)">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <form (ngSubmit)="guardarNuevoUsuario()" class="modal-form">
          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label">Nombres <span class="req">*</span></label>
              <input
                type="text"
                class="citef-input"
                [(ngModel)]="nuevoUsuario.nombres"
                name="nombres"
                placeholder="Ej: Juan Carlos"
                required
              />
            </div>
            <div class="form-group col-6">
              <label class="form-label">Apellidos <span class="req">*</span></label>
              <input
                type="text"
                class="citef-input"
                [(ngModel)]="nuevoUsuario.apellidos"
                name="apellidos"
                placeholder="Ej: Pérez Rodríguez"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label">Correo Electrónico <span class="req">*</span></label>
              <input
                type="email"
                class="citef-input"
                [(ngModel)]="nuevoUsuario.correo_institucional"
                name="correo"
                placeholder="usuario@gmail.com"
                required
              />
            </div>
            <div class="form-group col-6">
              <label class="form-label">Teléfono</label>
              <input
                type="text"
                class="citef-input"
                [(ngModel)]="nuevoUsuario.telefono"
                name="telefono"
                placeholder="Ej: 71234567"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Contraseña Inicial <span class="req">*</span></label>
            <input
              type="password"
              class="citef-input"
              [(ngModel)]="nuevoUsuario.password"
              name="password"
              placeholder="Mínimo 6 caracteres"
              required
            />
          </div>

          <div class="form-group">
            <label class="form-label">Roles <span class="req">*</span></label>
            <div class="roles-chips-container">
              <div
                *ngFor="let r of listaRoles()"
                class="role-chip"
                [class.active]="esRolSeleccionadoNuevo(r.id_rol)"
                (click)="toggleRolNuevo(r.id_rol)"
              >
                <i class="bi" [class.bi-check-square-fill]="esRolSeleccionadoNuevo(r.id_rol)" [class.bi-square]="!esRolSeleccionadoNuevo(r.id_rol)"></i>
                <span>{{ r.nombre }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="citef-btn citef-btn-outline"
              (click)="mostrarModalCrear.set(false)"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="citef-btn citef-btn-primary"
              [disabled]="guardando() || !nuevoUsuario.correo_institucional || !nuevoUsuario.password || nuevoUsuario.roles_ids.length === 0"
            >
              <i class="bi bi-check2"></i>
              <span>{{ guardando() ? 'Guardando...' : 'Crear Usuario' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL: EDITAR USUARIO -->
    <div *ngIf="mostrarModalEditar()" class="modal-backdrop">
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">Editar Usuario</h3>
          <button type="button" class="btn-close" (click)="mostrarModalEditar.set(false)">
            <i class="bi bi-x-lg"></i>
          </button>
        </div>

        <form *ngIf="usuarioAEditar" (ngSubmit)="guardarEdicionUsuario()" class="modal-form">
          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label">Nombres <span class="req">*</span></label>
              <input
                type="text"
                class="citef-input"
                [(ngModel)]="usuarioAEditar.nombres"
                name="editNombres"
                required
              />
            </div>
            <div class="form-group col-6">
              <label class="form-label">Apellidos <span class="req">*</span></label>
              <input
                type="text"
                class="citef-input"
                [(ngModel)]="usuarioAEditar.apellidos"
                name="editApellidos"
                required
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group col-6">
              <label class="form-label">Correo Electrónico</label>
              <input
                type="email"
                class="citef-input bg-light"
                [value]="usuarioAEditar.correo"
                disabled
              />
            </div>
            <div class="form-group col-6">
              <label class="form-label">Teléfono</label>
              <input
                type="text"
                class="citef-input"
                [(ngModel)]="usuarioAEditar.telefono"
                name="editTelefono"
              />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Estado de la Cuenta</label>
            <select
              class="citef-select"
              [(ngModel)]="usuarioAEditar.activo"
              name="editActivo"
            >
              <option [ngValue]="true">Activo</option>
              <option [ngValue]="false">Inactivo</option>
            </select>
          </div>

          <div class="form-group">
            <label class="form-label">Roles Asignados <span class="req">*</span></label>
            <div class="roles-chips-container">
              <div
                *ngFor="let r of listaRoles()"
                class="role-chip"
                [class.active]="esRolSeleccionadoEditar(r.id_rol)"
                (click)="toggleRolEditar(r.id_rol)"
              >
                <i class="bi" [class.bi-check-square-fill]="esRolSeleccionadoEditar(r.id_rol)" [class.bi-square]="!esRolSeleccionadoEditar(r.id_rol)"></i>
                <span>{{ r.nombre }}</span>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button
              type="button"
              class="citef-btn citef-btn-outline"
              (click)="mostrarModalEditar.set(false)"
            >
              Cancelar
            </button>
            <button
              type="submit"
              class="citef-btn citef-btn-primary"
              [disabled]="guardando() || usuarioAEditar.roles_ids.length === 0"
            >
              <i class="bi bi-check2"></i>
              <span>{{ guardando() ? 'Guardando...' : 'Guardar Cambios' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>

    <!-- MODAL REUTILIZABLE DE CONFIRMACIÓN DE ELIMINACIÓN -->
    <app-confirm-modal
      [visible]="mostrarModalConfirmarEliminar()"
      title="Confirmar Baja de Usuario"
      [message]="'¿Está seguro de que desea dar de baja al usuario ' + (usuarioAEliminar?.correo_institucional || '') + '? Su estado pasará a inactivo.'"
      confirmBtnText="Desactivar"
      cancelBtnText="Cancelar"
      [isDanger]="true"
      (confirmed)="ejecutarEliminacion()"
      (cancelled)="mostrarModalConfirmarEliminar.set(false)"
    ></app-confirm-modal>
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

      /* Filter Card */
      .filter-card {
        padding: 1.25rem;
      }

      .filter-grid {
        display: grid;
        grid-template-columns: 2fr 1fr 1fr auto;
        gap: 1rem;
        align-items: flex-end;
      }

      .filter-field-main,
      .filter-field {
        display: flex;
        flex-direction: column;
      }

      .filter-label {
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        color: var(--citef-text-secondary, #64748b);
        margin-bottom: 0.35rem;
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
        color: var(--citef-text-muted, #94a3b8);
        pointer-events: none;
      }

      .search-input {
        padding-left: 2.25rem;
      }

      .filter-buttons {
        display: flex;
        gap: 0.5rem;
      }

      /* Table Styles */
      .table-responsive {
        overflow-x: auto;
      }

      .user-fullname {
        font-size: 0.875rem;
        color: var(--citef-text-primary, #1e293b);
      }

      .user-email {
        font-size: 0.875rem;
        color: var(--citef-primary, #002855);
      }

      .roles-badges {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }

      .badge-role {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        font-size: 0.75rem;
        font-weight: 600;
        border-radius: 4px;
        background-color: #f1f5f9;
        color: var(--citef-text-primary, #1e293b);
        border: 1px solid #e2e8f0;
      }

      /* Action Buttons */
      .action-buttons {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
      }

      .btn-icon {
        width: 32px;
        height: 32px;
        border-radius: 6px;
        border: 1px solid transparent;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 0.95rem;
        cursor: pointer;
        transition: all 0.15s ease;
        background: transparent;
      }

      .btn-edit {
        color: var(--citef-primary, #002855);
        border-color: #cbd5e1;
      }

      .btn-edit:hover {
        background-color: #f0f7ff;
        border-color: var(--citef-primary, #002855);
      }

      .btn-delete {
        color: var(--citef-danger, #ef4444);
        border-color: #fecaca;
      }

      .btn-delete:hover {
        background-color: #fee2e2;
        border-color: var(--citef-danger, #ef4444);
      }

      .empty-state {
        padding: 3rem 1rem;
        text-align: center;
        color: var(--citef-text-muted, #94a3b8);
      }

      .empty-state i {
        font-size: 2rem;
        margin-bottom: 0.5rem;
        display: block;
      }

      /* Pagination */
      .pagination-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 0.85rem 1.25rem;
        border-top: 1px solid var(--citef-border, #e2e8f0);
        background: #f8fafc;
      }

      .pagination-info {
        font-size: 0.8rem;
        color: var(--citef-text-secondary, #64748b);
      }

      .pagination-controls {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .page-indicator {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--citef-text-primary, #1e293b);
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
        max-width: 540px;
        background: #ffffff;
        border-radius: var(--citef-radius-lg, 12px);
        box-shadow: var(--citef-shadow-lg);
        padding: 1.75rem;
        max-height: 90vh;
        overflow-y: auto;
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

      .btn-close:hover {
        color: var(--citef-text-primary, #1e293b);
      }

      .form-row {
        display: flex;
        gap: 1rem;
      }

      .col-6 {
        flex: 1;
      }

      .form-group {
        margin-bottom: 1rem;
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

      /* Roles Chips Container */
      .roles-chips-container {
        display: flex;
        flex-wrap: wrap;
        gap: 0.5rem;
      }

      .role-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.45rem 0.75rem;
        border-radius: 6px;
        border: 1px solid var(--citef-border, #e2e8f0);
        background: #f8fafc;
        cursor: pointer;
        font-size: 0.825rem;
        font-weight: 500;
        user-select: none;
        transition: all 0.15s ease;
      }

      .role-chip:hover {
        background-color: #f1f5f9;
      }

      .role-chip.active {
        background-color: #f0f7ff;
        border-color: var(--citef-primary, #002855);
        color: var(--citef-primary, #002855);
        font-weight: 600;
      }

      .modal-footer {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1.25rem;
        padding-top: 1rem;
        border-top: 1px solid var(--citef-border, #e2e8f0);
      }

      .bg-light {
        background-color: #f8fafc;
        cursor: not-allowed;
      }

      @media (max-width: 768px) {
        .filter-grid {
          grid-template-columns: 1fr;
        }
        .form-row {
          flex-direction: column;
          gap: 0;
        }
      }
    `,
  ],
})
export class UsuariosComponent implements OnInit {
  todosLosUsuarios = signal<UsuarioItem[]>([]);
  listaRoles = signal<RolItem[]>([]);

  // Filtros
  busqueda = '';
  filtroEstado = 'TODOS';
  filtroRol = 'TODOS';

  // Lista filtrada efectiva
  usuariosFiltrados = signal<UsuarioItem[]>([]);

  // Ordenamiento
  columnaOrden = signal<string>('id_usuario');
  direccionOrden = signal<'asc' | 'desc'>('desc');

  // Paginación
  paginaActual = signal<number>(1);
  tamanoPagina = 10;

  // Mensajes de Alerta
  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  // Modales
  mostrarModalCrear = signal<boolean>(false);
  mostrarModalEditar = signal<boolean>(false);
  mostrarModalConfirmarEliminar = signal<boolean>(false);
  guardando = signal<boolean>(false);

  // Formulario Nuevo
  nuevoUsuario: CrearUsuarioPayload = {
    nombres: '',
    apellidos: '',
    correo_institucional: '',
    password: '',
    telefono: '',
    roles_ids: [],
  };

  // Formulario Editar
  usuarioAEditar: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
    correo: string;
    telefono: string;
    roles_ids: number[];
    activo: boolean;
  } | null = null;

  // Usuario para eliminar/desactivar
  usuarioAEliminar: UsuarioItem | null = null;

  constructor(private usuariosService: UsuariosService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    this.usuariosService.getUsuarios().subscribe({
      next: (data) => {
        this.todosLosUsuarios.set(data);
        this.ejecutarBusqueda();
      },
      error: () => this.showError('Error al sincronizar usuarios con la base de datos.'),
    });

    this.usuariosService.getRoles().subscribe({
      next: (data) => this.listaRoles.set(data),
      error: () => this.showError('Error al cargar catálogo de roles.'),
    });
  }

  ejecutarBusqueda() {
    let list = [...this.todosLosUsuarios()];

    // Búsqueda por texto
    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.nombres.toLowerCase().includes(q) ||
          u.apellidos.toLowerCase().includes(q) ||
          u.correo_institucional.toLowerCase().includes(q),
      );
    }

    // Filtro por Estado
    if (this.filtroEstado === 'ACTIVOS') {
      list = list.filter((u) => u.activo);
    } else if (this.filtroEstado === 'INACTIVOS') {
      list = list.filter((u) => !u.activo);
    }

    // Filtro por Rol
    if (this.filtroRol !== 'TODOS') {
      list = list.filter((u) =>
        u.roles.some((r) => r.nombre === this.filtroRol),
      );
    }

    // Ordenamiento
    const col = this.columnaOrden();
    const dir = this.direccionOrden();
    list.sort((a: any, b: any) => {
      let valA = a[col];
      let valB = b[col];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    this.usuariosFiltrados.set(list);
    this.paginaActual.set(1);
  }

  limpiarFiltros() {
    this.busqueda = '';
    this.filtroEstado = 'TODOS';
    this.filtroRol = 'TODOS';
    this.ejecutarBusqueda();
  }

  totalFiltrados = computed(() => this.usuariosFiltrados().length);

  totalPaginas = computed(() => {
    const total = this.totalFiltrados();
    return total === 0 ? 1 : Math.ceil(total / this.tamanoPagina);
  });

  usuariosPaginados = computed(() => {
    const list = this.usuariosFiltrados();
    const pag = this.paginaActual();
    const tam = this.tamanoPagina;
    const start = (pag - 1) * tam;
    return list.slice(start, start + tam);
  });

  inicioRegistro = computed(() => {
    if (this.totalFiltrados() === 0) return 0;
    return (this.paginaActual() - 1) * this.tamanoPagina + 1;
  });

  finRegistro = computed(() => {
    return Math.min(
      this.paginaActual() * this.tamanoPagina,
      this.totalFiltrados(),
    );
  });

  ordenarPor(columna: string) {
    if (this.columnaOrden() === columna) {
      this.direccionOrden.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.columnaOrden.set(columna);
      this.direccionOrden.set('asc');
    }
    this.ejecutarBusqueda();
  }

  iconoOrden(columna: string): string {
    if (this.columnaOrden() !== columna) {
      return 'bi-arrow-down-up text-muted';
    }
    return this.direccionOrden() === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  cambiarPagina(nueva: number) {
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
    }
  }

  // Creación de Usuario
  abrirModalCrear() {
    this.nuevoUsuario = {
      nombres: '',
      apellidos: '',
      correo_institucional: '',
      password: '',
      telefono: '',
      roles_ids: [],
    };
    this.mostrarModalCrear.set(true);
  }

  esRolSeleccionadoNuevo(idRol: number): boolean {
    return this.nuevoUsuario.roles_ids.includes(idRol);
  }

  toggleRolNuevo(idRol: number) {
    const idx = this.nuevoUsuario.roles_ids.indexOf(idRol);
    if (idx >= 0) {
      this.nuevoUsuario.roles_ids.splice(idx, 1);
    } else {
      this.nuevoUsuario.roles_ids.push(idRol);
    }
  }

  guardarNuevoUsuario() {
    if (this.nuevoUsuario.roles_ids.length === 0) {
      this.showError('Seleccione al menos un rol.');
      return;
    }

    this.guardando.set(true);
    this.usuariosService.crearUsuario(this.nuevoUsuario).subscribe({
      next: (creado) => {
        this.guardando.set(false);
        this.mostrarModalCrear.set(false);
        this.showSuccess(`Usuario ${creado.correo_institucional} creado exitosamente.`);
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando.set(false);
        const msg = err.error?.message || 'Error al crear usuario.';
        this.showError(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  // Edición de Usuario
  abrirModalEditar(u: UsuarioItem) {
    this.usuarioAEditar = {
      id_usuario: u.id_usuario,
      nombres: u.nombres,
      apellidos: u.apellidos,
      correo: u.correo_institucional,
      telefono: u.telefono || '',
      roles_ids: (u.roles || []).map((r) => r.id_rol),
      activo: u.activo,
    };
    this.mostrarModalEditar.set(true);
  }

  esRolSeleccionadoEditar(idRol: number): boolean {
    return this.usuarioAEditar ? this.usuarioAEditar.roles_ids.includes(idRol) : false;
  }

  toggleRolEditar(idRol: number) {
    if (!this.usuarioAEditar) return;
    const idx = this.usuarioAEditar.roles_ids.indexOf(idRol);
    if (idx >= 0) {
      this.usuarioAEditar.roles_ids.splice(idx, 1);
    } else {
      this.usuarioAEditar.roles_ids.push(idRol);
    }
  }

  guardarEdicionUsuario() {
    if (!this.usuarioAEditar) return;

    if (this.usuarioAEditar.roles_ids.length === 0) {
      this.showError('El usuario debe conservar al menos un rol asignado.');
      return;
    }

    this.guardando.set(true);
    const payload: ActualizarUsuarioPayload = {
      nombres: this.usuarioAEditar.nombres,
      apellidos: this.usuarioAEditar.apellidos,
      telefono: this.usuarioAEditar.telefono,
      activo: this.usuarioAEditar.activo,
      roles_ids: this.usuarioAEditar.roles_ids,
    };

    this.usuariosService.actualizarUsuario(this.usuarioAEditar.id_usuario, payload).subscribe({
      next: (act) => {
        this.guardando.set(false);
        this.mostrarModalEditar.set(false);
        this.showSuccess(`Datos de ${act.correo_institucional} actualizados.`);
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando.set(false);
        const msg = err.error?.message || 'Error al actualizar usuario.';
        this.showError(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  // Eliminación / Desactivación
  abrirConfirmacionEliminar(u: UsuarioItem) {
    this.usuarioAEliminar = u;
    this.mostrarModalConfirmarEliminar.set(true);
  }

  ejecutarEliminacion() {
    if (!this.usuarioAEliminar) return;

    const id = this.usuarioAEliminar.id_usuario;
    const correo = this.usuarioAEliminar.correo_institucional;
    this.mostrarModalConfirmarEliminar.set(false);

    this.usuariosService.eliminarUsuario(id).subscribe({
      next: () => {
        this.showSuccess(`Usuario ${correo} dado de baja correctamente.`);
        this.cargarDatos();
      },
      error: () => {
        // En caso de fallo con delete, intentar cambiar estado a false
        this.usuariosService.cambiarEstado(id, false).subscribe({
          next: () => {
            this.showSuccess(`Usuario ${correo} desactivado correctamente.`);
            this.cargarDatos();
          },
          error: () => this.showError('No se pudo desactivar el usuario.'),
        });
      },
    });
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
