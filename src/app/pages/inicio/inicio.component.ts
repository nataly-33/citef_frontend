import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="inicio-container">
      <!-- CABECERA INSTITUCIONAL DE BIENVENIDA -->
      <div class="welcome-banner">
        <div class="welcome-text">
          <div class="institutional-tag">
            <i class="bi bi-mortarboard-fill me-1"></i>
            Facultad de Ciencias Económicas y Empresariales · UAGRM
          </div>
          <h1 class="welcome-title">
            Bienvenido al Sistema CITEF, {{ usuario()?.nombres }}
          </h1>
          <p class="welcome-sub">
            Centro de Información y Tecnología · Plataforma Integral de Gestión y Control de Laboratorios
          </p>
        </div>

        <div class="welcome-badge-box">
          <span class="role-chip" [ngClass]="roleClass()">
            <i class="bi" [ngClass]="roleIcon()"></i>
            {{ primerRol() }}
          </span>
          <span class="status-indicator">
            <span class="status-dot"></span> Sesión Activa
          </span>
        </div>
      </div>

      <!-- TARJETA DE PERFIL INSTITUCIONAL -->
      <div class="profile-card">
        <div class="profile-header">
          <div class="profile-avatar">
            {{ iniciales() }}
          </div>
          <div class="profile-info">
            <h3 class="profile-name">{{ usuario()?.nombres }} {{ usuario()?.apellidos }}</h3>
            <span class="profile-email">
              <i class="bi bi-envelope me-1"></i>{{ usuario()?.correo_institucional }}
            </span>
          </div>
        </div>

        <div class="profile-meta-grid">
          <div class="meta-item">
            <span class="meta-label">ID de Cuenta</span>
            <span class="meta-val">#{{ usuario()?.id_usuario }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Rol Institucional</span>
            <span class="meta-val">{{ primerRol() }}</span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Estado de Acceso</span>
            <span class="meta-val text-success">
              <i class="bi bi-check-circle-fill me-1"></i>Habilitado
            </span>
          </div>
          <div class="meta-item">
            <span class="meta-label">Permisos Asignados</span>
            <span class="meta-val">{{ usuario()?.permisos?.length || 0 }} privilegios</span>
          </div>
        </div>
      </div>

      <!-- SECCIÓN ESPECÍFICA POR ROL -->

      <!-- 1. VISTA DOCENTE -->
      <div *ngIf="esDocente()" class="role-section">
        <div class="section-title-box">
          <i class="bi bi-person-workspace text-primary fs-4"></i>
          <div>
            <h2 class="section-title">Panel del Docente</h2>
            <p class="section-desc">Accesos y estado de servicios académicos para reservas y laboratorios</p>
          </div>
        </div>

        <div class="module-cards-grid">
          <div class="module-card">
            <div class="card-icon bg-indigo">
              <i class="bi bi-calendar-check"></i>
            </div>
            <div class="card-body">
              <span class="module-code">Módulo 5</span>
              <h3 class="card-title">Reserva de Salas de Cómputo</h3>
              <p class="card-desc">
                Solicitud y programación de salas de computación para clases prácticas, evaluaciones parciales y talleres formativos.
              </p>
              <span class="badge-status-upcoming">
                <i class="bi bi-clock-history me-1"></i>Próximo Módulo a Habilitar
              </span>
            </div>
          </div>

          <div class="module-card">
            <div class="card-icon bg-emerald">
              <i class="bi bi-person-lines-fill"></i>
            </div>
            <div class="card-body">
              <span class="module-code">Módulo 4</span>
              <h3 class="card-title">Asistencias en Laboratorio</h3>
              <p class="card-desc">
                Registro y seguimiento de asistencia de estudiantes matriculados durante las sesiones prácticas de sus asignaturas.
              </p>
              <span class="badge-status-upcoming">
                <i class="bi bi-clock-history me-1"></i>Próximo Módulo a Habilitar
              </span>
            </div>
          </div>

          <div class="module-card">
            <div class="card-icon bg-blue">
              <i class="bi bi-bar-chart-line"></i>
            </div>
            <div class="card-body">
              <span class="module-code">Módulo 7</span>
              <h3 class="card-title">Reportes y Estadísticas</h3>
              <p class="card-desc">
                Consulta de historial de ocupación, reservas ejecutadas e informes de desempeño de sus grupos curriculares.
              </p>
              <span class="badge-status-upcoming">
                <i class="bi bi-clock-history me-1"></i>Próximo Módulo a Habilitar
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 2. VISTA AUXILIAR -->
      <div *ngIf="esAuxiliar()" class="role-section">
        <div class="section-title-box">
          <i class="bi bi-display text-primary fs-4"></i>
          <div>
            <h2 class="section-title">Panel del Auxiliar de Laboratorio</h2>
            <p class="section-desc">Herramientas operativas de gestión de puestos, asistencias e incidencias</p>
          </div>
        </div>

        <div class="module-cards-grid">
          <div class="module-card">
            <div class="card-icon bg-emerald">
              <i class="bi bi-pc-display"></i>
            </div>
            <div class="card-body">
              <span class="module-code">Módulo 4</span>
              <h3 class="card-title">Control de Ocupación en Tiempo Real</h3>
              <p class="card-desc">
                Asignación de puestos libres, monitoreo de sesiones y liberación de máquinas para estudiantes de la FCEE.
              </p>
              <span class="badge-status-upcoming">
                <i class="bi bi-clock-history me-1"></i>Próximo Módulo a Habilitar
              </span>
            </div>
          </div>

          <div class="module-card">
            <div class="card-icon bg-amber">
              <i class="bi bi-clock"></i>
            </div>
            <div class="card-body">
              <span class="module-code">Módulo 6</span>
              <h3 class="card-title">Gestión de Turnos e Incidencias</h3>
              <p class="card-desc">
                Apertura y cierre de jornada, reporte de fallas de hardware/software y registro de objetos extraviados.
              </p>
              <span class="badge-status-upcoming">
                <i class="bi bi-clock-history me-1"></i>Próximo Módulo a Habilitar
              </span>
            </div>
          </div>

          <div class="module-card">
            <div class="card-icon bg-blue">
              <i class="bi bi-box-seam"></i>
            </div>
            <div class="card-body">
              <span class="module-code">Módulo 3</span>
              <h3 class="card-title">Inventario y Salas de Cómputo</h3>
              <p class="card-desc">
                Verificación de periféricos, CPUs y estado físico del equipamiento de cada laboratorio del CITEF.
              </p>
              <span class="badge-status-upcoming">
                <i class="bi bi-clock-history me-1"></i>Próximo Módulo a Habilitar
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- 3. VISTA ADMINISTRADOR -->
      <div *ngIf="esAdmin()" class="role-section">
        <div class="section-title-box">
          <i class="bi bi-shield-check text-primary fs-4"></i>
          <div>
            <h2 class="section-title">Accesos de Gestión Central</h2>
            <p class="section-desc">Módulos activos y operativos configurados en el Sistema CITEF</p>
          </div>
        </div>

        <div class="admin-quick-links">
          <a routerLink="/admin/usuarios" class="admin-card-link">
            <i class="bi bi-people-fill"></i>
            <div class="link-text">
              <strong>Gestión de Usuarios</strong>
              <span>Altas, bajas, roles y contraseñas</span>
            </div>
            <i class="bi bi-chevron-right ms-auto"></i>
          </a>

          <a routerLink="/admin/roles" class="admin-card-link">
            <i class="bi bi-shield-lock-fill"></i>
            <div class="link-text">
              <strong>Roles y Permisos (RBAC)</strong>
              <span>Matriz de privilegios institucionales</span>
            </div>
            <i class="bi bi-chevron-right ms-auto"></i>
          </a>

          <a routerLink="/admin/auditoria" class="admin-card-link">
            <i class="bi bi-clock-history"></i>
            <div class="link-text">
              <strong>Bitácora de Auditoría</strong>
              <span>Trazabilidad transaccional forense</span>
            </div>
            <i class="bi bi-chevron-right ms-auto"></i>
          </a>

          <a routerLink="/admin/catalogos/academicos" class="admin-card-link">
            <i class="bi bi-journal-bookmark-fill"></i>
            <div class="link-text">
              <strong>Catálogos Académicos</strong>
              <span>Carreras FCEE y materias multigrupo</span>
            </div>
            <i class="bi bi-chevron-right ms-auto"></i>
          </a>

          <a routerLink="/admin/catalogos/operativos" class="admin-card-link">
            <i class="bi bi-sliders"></i>
            <div class="link-text">
              <strong>Parámetros Operativos</strong>
              <span>Franjas horarias y motivos de uso</span>
            </div>
            <i class="bi bi-chevron-right ms-auto"></i>
          </a>

          <a routerLink="/admin/catalogos/docentes" class="admin-card-link">
            <i class="bi bi-file-earmark-spreadsheet-fill"></i>
            <div class="link-text">
              <strong>Padrón Docente</strong>
              <span>Importación Excel/CSV y credenciales</span>
            </div>
            <i class="bi bi-chevron-right ms-auto"></i>
          </a>

          <a routerLink="/admin/catalogos/turnos" class="admin-card-link">
            <i class="bi bi-calendar-week-fill"></i>
            <div class="link-text">
              <strong>Turnos de Auxiliares</strong>
              <span>Asignación semestral fija por 6 meses</span>
            </div>
            <i class="bi bi-chevron-right ms-auto"></i>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .inicio-container {
        display: flex;
        flex-direction: column;
        gap: 1.5rem;
      }

      /* BANNER DE BIENVENIDA */
      .welcome-banner {
        background: linear-gradient(135deg, #002855 0%, #001733 100%);
        border-radius: var(--citef-radius-lg);
        padding: 2rem;
        color: #ffffff;
        display: flex;
        justify-content: space-between;
        align-items: center;
        flex-wrap: wrap;
        gap: 1.5rem;
        box-shadow: 0 4px 12px rgba(0, 40, 85, 0.15);
        border-left: 6px solid var(--citef-primary);
      }

      .institutional-tag {
        font-size: 0.8rem;
        font-weight: 700;
        color: #f1f5f9;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 0.5rem;
        opacity: 0.9;
      }

      .welcome-title {
        font-size: 1.75rem;
        font-weight: 800;
        margin: 0 0 0.5rem 0;
        color: #ffffff;
      }

      .welcome-sub {
        font-size: 0.95rem;
        margin: 0;
        color: rgba(255, 255, 255, 0.8);
      }

      .welcome-badge-box {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 0.5rem;
      }

      .role-chip {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.4rem 1rem;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 0.85rem;
        letter-spacing: 0.5px;
      }

      .role-admin {
        background: #fee2e2;
        color: #991b1b;
      }

      .role-docente {
        background: #e0e7ff;
        color: #3730a3;
      }

      .role-auxiliar {
        background: #d1fae5;
        color: #065f46;
      }

      .role-tecnico {
        background: #fef3c7;
        color: #92400e;
      }

      .role-default {
        background: #f1f5f9;
        color: #334155;
      }

      .status-indicator {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.8rem;
        color: #86efac;
      }

      .status-dot {
        width: 8px;
        height: 8px;
        background-color: #22c55e;
        border-radius: 50%;
        display: inline-block;
        box-shadow: 0 0 6px #22c55e;
      }

      /* TARJETA DE PERFIL */
      .profile-card {
        background: var(--citef-bg-surface);
        border: 1px solid var(--citef-border);
        border-radius: var(--citef-radius-lg);
        padding: 1.5rem;
        box-shadow: var(--citef-shadow);
      }

      .profile-header {
        display: flex;
        align-items: center;
        gap: 1.25rem;
        padding-bottom: 1.25rem;
        border-bottom: 1px solid var(--citef-border);
        margin-bottom: 1.25rem;
      }

      .profile-avatar {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background: linear-gradient(135deg, var(--citef-primary) 0%, #7f0d1b 100%);
        color: #ffffff;
        font-weight: 800;
        font-size: 1.25rem;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 2px 6px rgba(168, 17, 36, 0.25);
      }

      .profile-name {
        font-size: 1.2rem;
        font-weight: 800;
        margin: 0 0 0.25rem 0;
        color: var(--citef-text-primary);
      }

      .profile-email {
        font-size: 0.85rem;
        color: var(--citef-text-secondary);
      }

      .profile-meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
        gap: 1rem;
      }

      .meta-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }

      .meta-label {
        font-size: 0.75rem;
        font-weight: 700;
        text-transform: uppercase;
        color: var(--citef-text-muted);
        letter-spacing: 0.4px;
      }

      .meta-val {
        font-size: 0.95rem;
        font-weight: 600;
        color: var(--citef-text-primary);
      }

      /* SECCIONES ESPECÍFICAS */
      .role-section {
        display: flex;
        flex-direction: column;
        gap: 1rem;
      }

      .section-title-box {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding-bottom: 0.5rem;
        border-bottom: 2px solid var(--citef-border);
      }

      .section-title {
        font-size: 1.2rem;
        font-weight: 800;
        color: var(--citef-text-primary);
        margin: 0;
      }

      .section-desc {
        font-size: 0.85rem;
        color: var(--citef-text-secondary);
        margin: 0;
      }

      /* GRID DE TARJETAS DE MÓDULOS */
      .module-cards-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 1.25rem;
      }

      .module-card {
        background: var(--citef-bg-surface);
        border: 1px solid var(--citef-border);
        border-radius: var(--citef-radius-lg);
        padding: 1.5rem;
        display: flex;
        gap: 1.25rem;
        box-shadow: var(--citef-shadow);
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .module-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 6px 16px rgba(0, 0, 0, 0.08);
      }

      .card-icon {
        width: 48px;
        height: 48px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.5rem;
        flex-shrink: 0;
      }

      .bg-indigo {
        background-color: #e0e7ff;
        color: #4338ca;
      }

      .bg-emerald {
        background-color: #d1fae5;
        color: #047857;
      }

      .bg-amber {
        background-color: #fef3c7;
        color: #b45309;
      }

      .bg-blue {
        background-color: #dbeafe;
        color: #1d4ed8;
      }

      .card-body {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      .module-code {
        font-size: 0.75rem;
        font-weight: 800;
        color: var(--citef-primary);
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .card-title {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--citef-text-primary);
        margin: 0;
      }

      .card-desc {
        font-size: 0.85rem;
        color: var(--citef-text-secondary);
        margin: 0 0 0.5rem 0;
        line-height: 1.4;
      }

      .badge-status-upcoming {
        display: inline-flex;
        align-items: center;
        font-size: 0.75rem;
        font-weight: 600;
        color: #64748b;
        background-color: #f1f5f9;
        padding: 0.25rem 0.6rem;
        border-radius: 6px;
        align-self: flex-start;
      }

      /* ENLACES RÁPIDOS DE ADMINISTRADOR */
      .admin-quick-links {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
        gap: 1rem;
      }

      .admin-card-link {
        background: var(--citef-bg-surface);
        border: 1px solid var(--citef-border);
        border-radius: var(--citef-radius-md);
        padding: 1.25rem 1.5rem;
        display: flex;
        align-items: center;
        gap: 1rem;
        text-decoration: none;
        color: var(--citef-text-primary);
        box-shadow: var(--citef-shadow);
        transition: all 0.2s;
      }

      .admin-card-link > i:first-child {
        font-size: 1.6rem;
        color: var(--citef-primary);
      }

      .admin-card-link:hover {
        border-color: var(--citef-primary);
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(168, 17, 36, 0.1);
      }

      .admin-card-link .link-text {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
      }

      .admin-card-link .link-text strong {
        font-size: 0.95rem;
      }

      .admin-card-link .link-text span {
        font-size: 0.8rem;
        color: var(--citef-text-secondary);
      }

      @media (max-width: 768px) {
        .welcome-banner {
          flex-direction: column;
          align-items: flex-start;
        }
        .welcome-badge-box {
          align-items: flex-start;
        }
      }
    `,
  ],
})
export class InicioComponent {
  usuario = computed(() => this.authService.currentUser());

  primerRol = computed(() => {
    const roles = this.usuario()?.roles;
    return roles && roles.length > 0 ? roles[0] : 'USUARIO';
  });

  iniciales = computed(() => {
    const u = this.usuario();
    if (!u) return 'U';
    const n = u.nombres ? u.nombres.charAt(0) : '';
    const a = u.apellidos ? u.apellidos.charAt(0) : '';
    return (n + a).toUpperCase() || 'U';
  });

  constructor(private authService: AuthService) {}

  esAdmin(): boolean {
    return this.authService.hasRole('ADMINISTRADOR');
  }

  esDocente(): boolean {
    return this.authService.hasRole('DOCENTE') && !this.esAdmin();
  }

  esAuxiliar(): boolean {
    return this.authService.hasRole('AUXILIAR') && !this.esAdmin();
  }

  roleClass(): string {
    const r = this.primerRol();
    if (r === 'ADMINISTRADOR') return 'role-admin';
    if (r === 'DOCENTE') return 'role-docente';
    if (r === 'AUXILIAR') return 'role-auxiliar';
    if (r === 'TECNICO') return 'role-tecnico';
    return 'role-default';
  }

  roleIcon(): string {
    const r = this.primerRol();
    if (r === 'ADMINISTRADOR') return 'bi-shield-shaded';
    if (r === 'DOCENTE') return 'bi-mortarboard-fill';
    if (r === 'AUXILIAR') return 'bi-display';
    if (r === 'TECNICO') return 'bi-tools';
    return 'bi-person';
  }
}
