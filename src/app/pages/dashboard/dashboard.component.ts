import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UsuarioSession } from '../../core/services/auth.service';
import {
  UsuariosService,
  UsuarioItem,
  RolItem,
  CrearUsuarioPayload,
} from '../../core/services/usuarios.service';
import {
  AuditoriaService,
  BitacoraItem,
} from '../../core/services/auditoria.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="dashboard-layout">
      <!-- Barra Superior / Navbar Institucional -->
      <header class="top-navbar">
        <div class="navbar-brand">
          <div class="brand-crest">
            <span class="crest-uagrm">UAGRM</span>
            <span class="crest-fcee">FCEE</span>
          </div>
          <div class="brand-text">
            <span class="brand-title">CITEF</span>
            <span class="brand-subtitle">Gestión de Laboratorios</span>
          </div>
        </div>

        <div class="user-panel">
          <div class="user-info" *ngIf="currentUser()">
            <span class="user-name">{{ currentUser()?.nombres }}</span>
            <div class="user-meta">
              <span class="citef-badge citef-badge-info">{{ currentUser()?.roles?.[0] }}</span>
              <span class="user-email">{{ currentUser()?.correo_institucional }}</span>
            </div>
          </div>
          <button class="citef-btn citef-btn-outline btn-sm" (click)="onLogout()">
            Cerrar Sesión
          </button>
        </div>
      </header>

      <!-- Contenedor Principal -->
      <main class="main-content">
        <!-- Navegación por Pestañas del Módulo 1 -->
        <div class="tabs-container">
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'usuarios'"
            (click)="setTab('usuarios')"
          >
            👥 CU1: Gestión de Usuarios
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'roles'"
            (click)="setTab('roles')"
          >
            🛡️ CU3: Roles y Permisos (RBAC)
          </button>
          <button
            class="tab-btn"
            [class.active]="activeTab() === 'auditoria'"
            (click)="setTab('auditoria')"
          >
            📜 CU4: Bitácora de Auditoría
          </button>
        </div>

        <!-- Feedback de Notificaciones -->
        <div *ngIf="successMsg()" class="alert-box alert-success">
          {{ successMsg() }}
        </div>
        <div *ngIf="errorMsg()" class="alert-box alert-danger">
          {{ errorMsg() }}
        </div>

        <!-- ======================================================== -->
        <!-- TAB 1: GESTIÓN DE USUARIOS (CU1)                          -->
        <!-- ======================================================== -->
        <section *ngIf="activeTab() === 'usuarios'" class="tab-content">
          <div class="section-toolbar">
            <div class="search-box">
              <input
                type="text"
                class="citef-input search-input"
                [(ngModel)]="busquedaUsuarios"
                (keyup.enter)="cargarUsuarios()"
                placeholder="Buscar por nombre o correo institucional..."
              />
              <button class="citef-btn citef-btn-primary" (click)="cargarUsuarios()">
                Buscar
              </button>
            </div>

            <button
              class="citef-btn citef-btn-secondary"
              (click)="abrirModalCrearUsuario()"
            >
              + Nuevo Usuario
            </button>
          </div>

          <!-- Tabla de Usuarios -->
          <div class="citef-card table-card">
            <table class="citef-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Nombres y Apellidos</th>
                  <th>Correo Institucional</th>
                  <th>Teléfono</th>
                  <th>Roles Asignados</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let u of listaUsuarios()">
                  <td>{{ u.id_usuario }}</td>
                  <td>
                    <strong>{{ u.nombres }} {{ u.apellidos }}</strong>
                  </td>
                  <td>{{ u.correo_institucional }}</td>
                  <td>{{ u.telefono || '—' }}</td>
                  <td>
                    <span
                      *ngFor="let r of u.roles"
                      class="citef-badge citef-badge-info role-tag"
                    >
                      {{ r.nombre }}
                    </span>
                  </td>
                  <td>
                    <span
                      class="citef-badge"
                      [class.citef-badge-success]="u.activo"
                      [class.citef-badge-danger]="!u.activo"
                    >
                      {{ u.activo ? 'ACTIVO' : 'INACTIVO' }}
                    </span>
                  </td>
                  <td class="actions-cell">
                    <button
                      class="citef-btn citef-btn-outline btn-xs"
                      (click)="toggleEstado(u)"
                    >
                      {{ u.activo ? 'Desactivar' : 'Activar' }}
                    </button>
                    <button
                      class="citef-btn citef-btn-outline btn-xs"
                      (click)="abrirModalPassword(u)"
                    >
                      Clave
                    </button>
                  </td>
                </tr>
                <tr *ngIf="listaUsuarios().length === 0">
                  <td colspan="7" class="empty-state">No se encontraron usuarios</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <!-- ======================================================== -->
        <!-- TAB 2: ROLES Y PERMISOS (CU3)                             -->
        <!-- ======================================================== -->
        <section *ngIf="activeTab() === 'roles'" class="tab-content">
          <div class="roles-grid">
            <div *ngFor="let r of listaRoles()" class="citef-card role-card">
              <div class="role-header">
                <h3>{{ r.nombre }}</h3>
                <span class="citef-badge citef-badge-success">Activo</span>
              </div>
              <p class="role-desc">{{ r.descrip }}</p>

              <div class="permissions-list">
                <span class="perm-header">Permisos Asociados ({{ r.permisos.length }}):</span>
                <div class="perm-chips">
                  <span
                    *ngFor="let p of r.permisos"
                    class="perm-chip"
                    [title]="p.descrip"
                  >
                    {{ p.codigo }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- ======================================================== -->
        <!-- TAB 3: BITÁCORA DE AUDITORÍA (CU4)                       -->
        <!-- ======================================================== -->
        <section *ngIf="activeTab() === 'auditoria'" class="tab-content">
          <div class="section-toolbar">
            <div class="audit-filters">
              <input
                type="text"
                class="citef-input"
                [(ngModel)]="filtroTabla"
                placeholder="Tabla (ej: usuario)"
              />
              <input
                type="text"
                class="citef-input"
                [(ngModel)]="filtroAccion"
                placeholder="Acción (ej: LOGIN, INSERT)"
              />
              <input
                type="text"
                class="citef-input"
                [(ngModel)]="filtroCorreo"
                placeholder="Correo usuario"
              />
              <button class="citef-btn citef-btn-primary" (click)="cargarAuditoria()">
                Filtrar
              </button>
            </div>
            <button class="citef-btn citef-btn-outline" (click)="cargarAuditoria()">
              🔄 Refrescar
            </button>
          </div>

          <div class="citef-card table-card">
            <table class="citef-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Acción</th>
                  <th>Tabla Afectada</th>
                  <th>ID Registro</th>
                  <th>Usuario Responsable</th>
                  <th>IP Cliente</th>
                  <th>Detalle JSON</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let item of listaAuditoria()">
                  <td>{{ item.fecha_hora | date: 'dd/MM/yyyy HH:mm:ss' }}</td>
                  <td>
                    <span
                      class="citef-badge"
                      [class.citef-badge-success]="item.accion === 'INSERT'"
                      [class.citef-badge-info]="item.accion === 'UPDATE' || item.accion === 'LOGIN'"
                      [class.citef-badge-warning]="item.accion === 'RESET_PASSWORD' || item.accion === 'CAMBIO_ESTADO'"
                      [class.citef-badge-danger]="item.accion === 'DELETE'"
                    >
                      {{ item.accion }}
                    </span>
                  </td>
                  <td><strong>{{ item.tabla_afectada }}</strong></td>
                  <td>#{{ item.id_registro_afectado }}</td>
                  <td>
                    {{ item.correo_usuario || 'Sistema' }}
                  </td>
                  <td><code>{{ item.ip_cliente || 'local' }}</code></td>
                  <td>
                    <details class="json-details">
                      <summary>Ver Cambios</summary>
                      <div class="json-viewer">
                        <div *ngIf="item.valores_anteriores">
                          <strong>Anterior:</strong>
                          <pre>{{ item.valores_anteriores | json }}</pre>
                        </div>
                        <div *ngIf="item.valores_nuevos">
                          <strong>Nuevo:</strong>
                          <pre>{{ item.valores_nuevos | json }}</pre>
                        </div>
                      </div>
                    </details>
                  </td>
                </tr>
                <tr *ngIf="listaAuditoria().length === 0">
                  <td colspan="7" class="empty-state">No hay registros de auditoría</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </main>

      <!-- ======================================================== -->
      <!-- MODAL: CREAR USUARIO (CU1)                               -->
      <!-- ======================================================== -->
      <div *ngIf="mostrarModalCrear()" class="modal-backdrop">
        <div class="modal-card citef-card">
          <div class="modal-header">
            <h3>Registrar Nuevo Usuario Institucional</h3>
            <button class="close-btn" (click)="mostrarModalCrear.set(false)">×</button>
          </div>

          <form (ngSubmit)="guardarNuevoUsuario()" class="modal-form">
            <div class="form-row">
              <div class="form-group">
                <label>Nombres</label>
                <input
                  type="text"
                  class="citef-input"
                  [(ngModel)]="nuevoUsuario.nombres"
                  name="nombres"
                  required
                />
              </div>
              <div class="form-group">
                <label>Apellidos</label>
                <input
                  type="text"
                  class="citef-input"
                  [(ngModel)]="nuevoUsuario.apellidos"
                  name="apellidos"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label>Correo Institucional (&#64;uagrm.edu.bo)</label>
              <input
                type="email"
                class="citef-input"
                [(ngModel)]="nuevoUsuario.correo_institucional"
                name="correo_institucional"
                placeholder="ejemplo@uagrm.edu.bo"
                required
              />
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Contraseña Inicial</label>
                <input
                  type="password"
                  class="citef-input"
                  [(ngModel)]="nuevoUsuario.password"
                  name="password"
                  required
                />
              </div>
              <div class="form-group">
                <label>Teléfono</label>
                <input
                  type="text"
                  class="citef-input"
                  [(ngModel)]="nuevoUsuario.telefono"
                  name="telefono"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Asignación de Roles</label>
              <div class="roles-checkboxes">
                <label *ngFor="let r of listaRoles()" class="checkbox-label">
                  <input
                    type="checkbox"
                    [value]="r.id_rol"
                    (change)="toggleRolSeleccion(r.id_rol)"
                  />
                  {{ r.nombre }}
                </label>
              </div>
            </div>

            <div class="modal-actions">
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
                [disabled]="!nuevoUsuario.correo_institucional || !nuevoUsuario.password"
              >
                Guardar Usuario
              </button>
            </div>
          </form>
        </div>
      </div>

      <!-- ======================================================== -->
      <!-- MODAL: CAMBIAR CONTRASEÑA (ADMIN CU1)                   -->
      <!-- ======================================================== -->
      <div *ngIf="mostrarModalPass()" class="modal-backdrop">
        <div class="modal-card citef-card">
          <div class="modal-header">
            <h3>Restablecer Contraseña (Administrador)</h3>
            <button class="close-btn" (click)="mostrarModalPass.set(false)">×</button>
          </div>

          <p class="modal-info">
            Usuario: <strong>{{ usuarioSeleccionado?.correo_institucional }}</strong>
          </p>

          <form (ngSubmit)="guardarNuevaPassword()" class="modal-form">
            <div class="form-group">
              <label>Nueva Contraseña</label>
              <input
                type="password"
                class="citef-input"
                [(ngModel)]="nuevaPasswordAdmin"
                name="nuevaPasswordAdmin"
                placeholder="Mínimo 6 caracteres"
                required
              />
            </div>

            <div class="modal-actions">
              <button
                type="button"
                class="citef-btn citef-btn-outline"
                (click)="mostrarModalPass.set(false)"
              >
                Cancelar
              </button>
              <button type="submit" class="citef-btn citef-btn-primary">
                Actualizar Clave
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .dashboard-layout {
        min-height: 100vh;
        background-color: var(--citef-bg-main);
        display: flex;
        flex-direction: column;
      }

      .top-navbar {
        height: 64px;
        background-color: var(--citef-bg-surface);
        border-bottom: 2px solid var(--citef-border);
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 0 2rem;
        box-shadow: var(--citef-shadow);
      }

      .navbar-brand {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .brand-crest {
        display: flex;
        gap: 0.35rem;
      }

      .crest-uagrm {
        background-color: var(--citef-primary);
        color: var(--citef-text-inverse);
        padding: 0.2rem 0.5rem;
        font-weight: 800;
        font-size: 0.8rem;
        border-radius: var(--citef-radius-sm);
      }

      .crest-fcee {
        background-color: var(--citef-secondary);
        color: var(--citef-text-inverse);
        padding: 0.2rem 0.5rem;
        font-weight: 800;
        font-size: 0.8rem;
        border-radius: var(--citef-radius-sm);
      }

      .brand-title {
        font-weight: 800;
        font-size: 1.15rem;
        color: var(--citef-primary);
        display: block;
        line-height: 1.2;
      }

      .brand-subtitle {
        font-size: 0.75rem;
        color: var(--citef-text-secondary);
      }

      .user-panel {
        display: flex;
        align-items: center;
        gap: 1.5rem;
      }

      .user-info {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
      }

      .user-name {
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--citef-text-primary);
      }

      .user-meta {
        display: flex;
        align-items: center;
        gap: 0.5rem;
      }

      .user-email {
        font-size: 0.75rem;
        color: var(--citef-text-muted);
      }

      .btn-sm {
        padding: 0.35rem 0.75rem;
        font-size: 0.8rem;
      }

      .btn-xs {
        padding: 0.2rem 0.5rem;
        font-size: 0.75rem;
      }

      .main-content {
        flex: 1;
        padding: 2rem;
        max-width: 1280px;
        margin: 0 auto;
        width: 100%;
      }

      .tabs-container {
        display: flex;
        gap: 0.5rem;
        margin-bottom: 1.5rem;
        border-bottom: 1px solid var(--citef-border);
        padding-bottom: 0.5rem;
      }

      .tab-btn {
        padding: 0.65rem 1.25rem;
        background: transparent;
        border: none;
        font-weight: 600;
        font-size: 0.9rem;
        color: var(--citef-text-secondary);
        border-radius: var(--citef-radius-sm);
        cursor: pointer;
        transition: all 0.2s;
      }

      .tab-btn:hover {
        background-color: #e2e8f0;
        color: var(--citef-text-primary);
      }

      .tab-btn.active {
        background-color: var(--citef-primary);
        color: var(--citef-text-inverse);
      }

      .section-toolbar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1rem;
        gap: 1rem;
      }

      .search-box {
        display: flex;
        gap: 0.5rem;
        flex: 1;
        max-width: 500px;
      }

      .audit-filters {
        display: flex;
        gap: 0.5rem;
        flex: 1;
      }

      .table-card {
        padding: 0;
        overflow-x: auto;
      }

      .role-tag {
        margin-right: 0.3rem;
      }

      .actions-cell {
        display: flex;
        gap: 0.4rem;
      }

      .empty-state {
        text-align: center;
        padding: 2rem !important;
        color: var(--citef-text-muted);
      }

      /* Roles Grid */
      .roles-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
        gap: 1.5rem;
      }

      .role-card {
        display: flex;
        flex-direction: column;
        gap: 0.75rem;
      }

      .role-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .role-header h3 {
        font-size: 1.1rem;
        color: var(--citef-primary);
      }

      .role-desc {
        font-size: 0.85rem;
        color: var(--citef-text-secondary);
      }

      .perm-header {
        font-size: 0.8rem;
        font-weight: 700;
        color: var(--citef-text-muted);
        text-transform: uppercase;
        display: block;
        margin-bottom: 0.4rem;
      }

      .perm-chips {
        display: flex;
        flex-wrap: wrap;
        gap: 0.35rem;
      }

      .perm-chip {
        font-size: 0.7rem;
        background-color: var(--citef-bg-main);
        border: 1px solid var(--citef-border);
        padding: 0.2rem 0.4rem;
        border-radius: 4px;
        font-family: monospace;
      }

      /* JSON Details */
      .json-details summary {
        cursor: pointer;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--citef-primary);
      }

      .json-viewer {
        background-color: #f1f5f9;
        padding: 0.5rem;
        border-radius: 4px;
        font-size: 0.75rem;
        margin-top: 0.4rem;
        max-width: 320px;
      }

      .json-viewer pre {
        white-space: pre-wrap;
        word-break: break-all;
      }

      /* Modal */
      .modal-backdrop {
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(15, 23, 42, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal-card {
        width: 100%;
        max-width: 520px;
        background: var(--citef-bg-surface);
        border-radius: var(--citef-radius-lg);
        padding: 2rem;
      }

      .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 1.25rem;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        cursor: pointer;
        color: var(--citef-text-muted);
      }

      .modal-form {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
      }

      .roles-checkboxes {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
        margin-top: 0.25rem;
      }

      .checkbox-label {
        font-size: 0.85rem;
        display: flex;
        align-items: center;
        gap: 0.4rem;
        cursor: pointer;
      }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 0.75rem;
        margin-top: 1rem;
      }

      .modal-info {
        font-size: 0.85rem;
        margin-bottom: 1rem;
      }

      .alert-box {
        padding: 0.75rem 1rem;
        border-radius: var(--citef-radius-sm);
        font-size: 0.85rem;
        margin-bottom: 1rem;
      }

      .alert-success {
        background-color: var(--citef-success-bg);
        color: var(--citef-success);
      }

      .alert-danger {
        background-color: var(--citef-danger-bg);
        color: var(--citef-danger);
      }
    `,
  ],
})
export class DashboardComponent implements OnInit {
  activeTab = signal<'usuarios' | 'roles' | 'auditoria'>('usuarios');

  currentUser = signal<UsuarioSession | null>(null);

  // Listados
  listaUsuarios = signal<UsuarioItem[]>([]);
  listaRoles = signal<RolItem[]>([]);
  listaAuditoria = signal<BitacoraItem[]>([]);

  // Filtros
  busquedaUsuarios = '';
  filtroTabla = '';
  filtroAccion = '';
  filtroCorreo = '';

  // Mensajes feedback
  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  // Modales
  mostrarModalCrear = signal(false);
  mostrarModalPass = signal(false);

  // Objeto nuevo usuario
  nuevoUsuario: CrearUsuarioPayload = {
    nombres: '',
    apellidos: '',
    correo_institucional: '',
    password: '',
    telefono: '',
    roles_ids: [],
  };

  // Cambio de password por admin
  usuarioSeleccionado: UsuarioItem | null = null;
  nuevaPasswordAdmin = '';

  constructor(
    private authService: AuthService,
    private usuariosService: UsuariosService,
    private auditoriaService: AuditoriaService,
  ) {}

  ngOnInit(): void {
    this.currentUser.set(this.authService.currentUser());
    this.cargarUsuarios();
    this.cargarRoles();
  }

  setTab(tab: 'usuarios' | 'roles' | 'auditoria') {
    this.activeTab.set(tab);
    this.limpiarMensajes();
    if (tab === 'usuarios') this.cargarUsuarios();
    if (tab === 'roles') this.cargarRoles();
    if (tab === 'auditoria') this.cargarAuditoria();
  }

  cargarUsuarios() {
    this.usuariosService
      .getUsuarios({ busqueda: this.busquedaUsuarios })
      .subscribe({
        next: (data) => this.listaUsuarios.set(data),
        error: (err) => this.showError('Error al cargar la lista de usuarios'),
      });
  }

  cargarRoles() {
    this.usuariosService.getRoles().subscribe({
      next: (data) => this.listaRoles.set(data),
      error: (err) => this.showError('Error al cargar los roles'),
    });
  }

  cargarAuditoria() {
    this.auditoriaService
      .getBitacora({
        tabla: this.filtroTabla || undefined,
        accion: this.filtroAccion || undefined,
        correo: this.filtroCorreo || undefined,
        limite: 50,
      })
      .subscribe({
        next: (res) => this.listaAuditoria.set(res.items),
        error: (err) => this.showError('Error al consultar la bitácora de auditoría'),
      });
  }

  toggleEstado(u: UsuarioItem) {
    const nuevoEstado = !u.activo;
    this.usuariosService.cambiarEstado(u.id_usuario, nuevoEstado).subscribe({
      next: () => {
        this.showSuccess(`Estado del usuario ${u.correo_institucional} actualizado.`);
        this.cargarUsuarios();
      },
      error: () => this.showError('No se pudo cambiar el estado del usuario'),
    });
  }

  abrirModalCrearUsuario() {
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

  toggleRolSeleccion(idRol: number) {
    const idx = this.nuevoUsuario.roles_ids.indexOf(idRol);
    if (idx >= 0) {
      this.nuevoUsuario.roles_ids.splice(idx, 1);
    } else {
      this.nuevoUsuario.roles_ids.push(idRol);
    }
  }

  guardarNuevoUsuario() {
    if (this.nuevoUsuario.roles_ids.length === 0) {
      this.showError('Debe seleccionar al menos un rol.');
      return;
    }

    this.usuariosService.crearUsuario(this.nuevoUsuario).subscribe({
      next: () => {
        this.mostrarModalCrear.set(false);
        this.showSuccess('Usuario creado exitosamente con auditoría registrada.');
        this.cargarUsuarios();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al crear el usuario';
        this.showError(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  abrirModalPassword(u: UsuarioItem) {
    this.usuarioSeleccionado = u;
    this.nuevaPasswordAdmin = '';
    this.mostrarModalPass.set(true);
  }

  guardarNuevaPassword() {
    if (!this.usuarioSeleccionado) return;
    this.usuariosService
      .cambiarPassword(this.usuarioSeleccionado.id_usuario, this.nuevaPasswordAdmin)
      .subscribe({
        next: () => {
          this.mostrarModalPass.set(false);
          this.showSuccess('Contraseña actualizada correctamente por el administrador.');
        },
        error: (err) => this.showError('Error al actualizar la contraseña'),
      });
  }

  onLogout() {
    this.authService.logout();
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

  private limpiarMensajes() {
    this.successMsg.set(null);
    this.errorMsg.set(null);
  }
}
