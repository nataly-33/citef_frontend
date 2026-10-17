import { Component, computed, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

interface NavItem {
  ruta: string;
  texto: string;
  icono: string;
}

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="shell-container">
      <!-- TOPBAR INSTITUCIONAL FCEE -->
      <header class="topbar">
        <div class="topbar-left">
          <button class="menu-toggle d-lg-none" (click)="toggleSidebar()">
            <i class="bi bi-list"></i>
          </button>
          
          <div class="brand">
            <img src="assets/logoTransparente.png" alt="Logo FCEE UAGRM" class="brand-logo" />
            <div class="brand-text">
              <span class="brand-name">CITEF</span>
              <span class="brand-sub">Facultad de Ciencias Económicas y Empresariales</span>
            </div>
          </div>
        </div>

        <div class="topbar-right">
          <!-- User Pill con Avatar de Iniciales y Dropdown -->
          <div class="user-pill-container">
            <button class="user-pill" (click)="toggleUserMenu()">
              <span class="avatar">{{ iniciales() }}</span>
              <div class="user-info d-none d-md-flex">
                <span class="user-name">{{ currentUser()?.nombres }}</span>
                <span class="user-role">{{ primerRol() }}</span>
              </div>
              <i class="bi bi-chevron-down ms-1"></i>
            </button>

            <!-- Menú desplegable -->
            <div *ngIf="mostrarUserMenu()" class="user-dropdown">
              <div class="dropdown-header">
                <p class="dropdown-name">{{ currentUser()?.nombres }} {{ currentUser()?.apellidos }}</p>
                <p class="dropdown-email">{{ currentUser()?.correo_institucional }}</p>
                <span class="role-badge">{{ primerRol() }}</span>
              </div>
              <div class="dropdown-divider"></div>
              <button class="dropdown-action" (click)="cerrarSesion()">
                <i class="bi bi-box-arrow-right"></i>
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <!-- CUERPO PRINCIPAL (SIDEBAR + CONTENIDO) -->
      <div class="shell-body">
        <!-- SIDEBAR -->
        <aside class="sidebar" [class.open]="sidebarAbierto()">
          <nav class="sidebar-nav">
            <a
              *ngFor="let item of navItems"
              class="nav-link"
              [routerLink]="item.ruta"
              routerLinkActive="active"
              (click)="cerrarSidebarMobile()"
            >
              <i class="bi" [class]="item.icono"></i>
              <span class="link-text">{{ item.texto }}</span>
            </a>
          </nav>
        </aside>

        <!-- CONTENIDO DINÁMICO DE PÁGINA -->
        <main class="main-content">
          <div class="content-wrapper">
            <router-outlet></router-outlet>
          </div>

          <!-- FOOTER INSTITUCIONAL -->
          <footer class="app-footer">
            <div class="footer-content">
              <img src="assets/logoTransparente.png" alt="FCEE" class="footer-logo" />
              <span>Universidad Autónoma Gabriel René Moreno · Facultad de Ciencias Económicas y Empresariales</span>
            </div>
          </footer>
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .shell-container {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background-color: var(--citef-bg-main, #f8fafc);
      }

      /* TOPBAR */
      .topbar {
        background-color: var(--citef-primary, #002855);
        color: #ffffff;
        height: 60px;
        padding: 0 1.5rem;
        display: flex;
        align-items: center;
        justify-content: space-between;
        position: sticky;
        top: 0;
        z-index: 1030;
        box-shadow: 0 2px 8px rgba(0, 40, 85, 0.2);
      }

      .topbar-left {
        display: flex;
        align-items: center;
        gap: 1rem;
      }

      .menu-toggle {
        background: transparent;
        border: none;
        color: #ffffff;
        font-size: 1.5rem;
        cursor: pointer;
        padding: 0.25rem;
      }

      .brand {
        display: flex;
        align-items: center;
        gap: 0.75rem;
      }

      .brand-logo {
        height: 38px;
        width: 38px;
        object-fit: contain;
        background: #ffffff;
        border-radius: 6px;
        padding: 2px;
      }

      .brand-text {
        display: flex;
        flex-direction: column;
        line-height: 1.15;
      }

      .brand-name {
        font-size: 1.1rem;
        font-weight: 800;
        letter-spacing: 0.03em;
        color: #ffffff;
      }

      .brand-sub {
        font-size: 0.7rem;
        color: rgba(255, 255, 255, 0.8);
      }

      /* USER PILL */
      .user-pill-container {
        position: relative;
      }

      .user-pill {
        display: flex;
        align-items: center;
        gap: 0.6rem;
        background: rgba(255, 255, 255, 0.12);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: #ffffff;
        border-radius: 9999px;
        padding: 0.25rem 0.85rem 0.25rem 0.35rem;
        cursor: pointer;
        transition: background-color 0.2s;
      }

      .user-pill:hover {
        background: rgba(255, 255, 255, 0.2);
      }

      .avatar {
        width: 32px;
        height: 32px;
        border-radius: 50%;
        background-color: var(--citef-secondary, #a81124);
        color: #ffffff;
        display: flex;
        align-items: center;
        justify-content: center;
        font-weight: 700;
        font-size: 0.8rem;
      }

      .user-info {
        display: flex;
        flex-direction: column;
        align-items: flex-start;
        line-height: 1.1;
      }

      .user-name {
        font-size: 0.825rem;
        font-weight: 600;
      }

      .user-role {
        font-size: 0.675rem;
        color: rgba(255, 255, 255, 0.75);
      }

      .user-dropdown {
        position: absolute;
        right: 0;
        top: calc(100% + 8px);
        width: 240px;
        background: #ffffff;
        border-radius: var(--citef-radius, 8px);
        box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1);
        padding: 1rem;
        z-index: 1050;
      }

      .dropdown-header {
        margin-bottom: 0.5rem;
      }

      .dropdown-name {
        font-weight: 700;
        font-size: 0.875rem;
        color: var(--citef-text-primary, #1e293b);
        margin: 0;
      }

      .dropdown-email {
        font-size: 0.75rem;
        color: var(--citef-text-muted, #94a3b8);
        margin: 0.15rem 0 0.5rem 0;
      }

      .role-badge {
        display: inline-block;
        padding: 0.15rem 0.5rem;
        font-size: 0.7rem;
        font-weight: 600;
        border-radius: 4px;
        background: #e0edff;
        color: var(--citef-primary, #002855);
      }

      .dropdown-divider {
        height: 1px;
        background: var(--citef-border, #e2e8f0);
        margin: 0.75rem 0;
      }

      .dropdown-action {
        width: 100%;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.5rem 0.75rem;
        background: transparent;
        border: none;
        color: var(--citef-danger, #ef4444);
        font-size: 0.85rem;
        font-weight: 600;
        border-radius: 6px;
        cursor: pointer;
        transition: background-color 0.15s;
      }

      .dropdown-action:hover {
        background-color: var(--citef-danger-bg, #fef2f2);
      }

      /* SHELL BODY */
      .shell-body {
        display: flex;
        flex: 1;
        min-height: calc(100vh - 60px);
      }

      /* SIDEBAR */
      .sidebar {
        width: 230px;
        background-color: #ffffff;
        border-right: 1px solid var(--citef-border, #e2e8f0);
        display: flex;
        flex-direction: column;
        flex-shrink: 0;
        transition: transform 0.25s ease-in-out;
      }

      .sidebar-nav {
        flex: 1;
        padding: 1.25rem 0.75rem;
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .nav-link {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        padding: 0.65rem 0.85rem;
        font-size: 0.875rem;
        font-weight: 500;
        color: var(--citef-text-secondary, #64748b);
        border-radius: var(--citef-radius-sm, 6px);
        text-decoration: none;
        transition: all 0.15s ease;
      }

      .nav-link:hover {
        background-color: #f1f5f9;
        color: var(--citef-text-primary, #1e293b);
      }

      .nav-link.active {
        background-color: #f0f7ff;
        color: var(--citef-primary, #002855);
        font-weight: 700;
        border-left: 3px solid var(--citef-primary, #002855);
      }

      .nav-link i {
        font-size: 1.15rem;
      }

      .link-text {
        flex: 1;
      }

      /* MAIN CONTENT & FOOTER */
      .main-content {
        flex: 1;
        display: flex;
        flex-direction: column;
        overflow-x: hidden;
      }

      .content-wrapper {
        flex: 1;
        padding: 1.5rem 2rem;
        max-width: 1400px;
        width: 100%;
        margin: 0 auto;
      }

      .app-footer {
        padding: 0.85rem 2rem;
        border-top: 1px solid var(--citef-border, #e2e8f0);
        background: #ffffff;
        font-size: 0.75rem;
        color: var(--citef-text-muted, #94a3b8);
      }

      .footer-content {
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 0.6rem;
        text-align: center;
      }

      .footer-logo {
        height: 20px;
        width: 20px;
        object-fit: contain;
      }

      @media (max-width: 991px) {
        .sidebar {
          position: fixed;
          top: 60px;
          bottom: 0;
          left: 0;
          z-index: 1020;
          transform: translateX(-100%);
          box-shadow: var(--citef-shadow-lg);
        }

        .sidebar.open {
          transform: translateX(0);
        }

        .content-wrapper {
          padding: 1rem;
        }
      }
    `,
  ],
})
export class ShellComponent {
  private authService = inject(AuthService);
  private router = inject(Router);

  sidebarAbierto = signal(false);
  mostrarUserMenu = signal(false);

  currentUser = computed(() => this.authService.currentUser());

  iniciales = computed(() => {
    const user = this.currentUser();
    if (!user) return 'CI';
    const n = user.nombres ? user.nombres[0] : '';
    const a = user.apellidos ? user.apellidos[0] : '';
    return (n + a).toUpperCase() || 'CI';
  });

  primerRol = computed(() => {
    const roles = this.currentUser()?.roles;
    return roles && roles.length > 0 ? roles[0] : 'USUARIO';
  });

  // Navegación limpia sin números de módulos ni CU
  navItems: NavItem[] = [
    { ruta: '/admin/usuarios', texto: 'Usuarios', icono: 'bi-people' },
    { ruta: '/admin/roles', texto: 'Roles y Permisos', icono: 'bi-shield-check' },
    { ruta: '/admin/auditoria', texto: 'Bitácora de Auditoría', icono: 'bi-clock-history' },
  ];

  toggleSidebar() {
    this.sidebarAbierto.update((v) => !v);
  }

  cerrarSidebarMobile() {
    this.sidebarAbierto.set(false);
  }

  toggleUserMenu() {
    this.mostrarUserMenu.update((v) => !v);
  }

  cerrarSesion() {
    this.mostrarUserMenu.set(false);
    this.authService.logout();
  }
}
