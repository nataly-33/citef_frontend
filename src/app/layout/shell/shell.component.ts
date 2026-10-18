import { Component, computed, signal, inject, OnInit } from '@angular/core';
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
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css'],
})
export class ShellComponent implements OnInit {
  private authService = inject(AuthService);
  private router = inject(Router);

  sidebarAbierto = signal(false);
  mostrarUserMenu = signal(false);

  currentUser = computed(() => this.authService.currentUser());

  ngOnInit(): void {
    // Sincronizar perfil y permisos actualizados desde el backend
    this.authService.recargarPerfil().subscribe({
      error: () => {
        // En caso de sesión expirada o token inválido
      },
    });
  }

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

  // Navegación limpia y reactiva según permisos y roles RBAC
  navItems = computed<NavItem[]>(() => {
    const items: NavItem[] = [
      {
        ruta: '/admin/inicio',
        texto: 'Inicio / Panel',
        icono: 'bi-house-door',
      },
    ];

    // Ver usuarios
    if (
      this.authService.hasAnyPermission([
        'SEG_USUARIOS_VER',
        'SEG_USUARIOS_CREAR',
        'SEG_USUARIOS_EDITAR',
      ])
    ) {
      items.push({
        ruta: '/admin/usuarios',
        texto: 'Usuarios',
        icono: 'bi-people',
      });
    }

    // Gestionar roles y matriz RBAC
    if (this.authService.hasPermission('SEG_ROLES_GESTIONAR')) {
      items.push({
        ruta: '/admin/roles',
        texto: 'Roles y Permisos',
        icono: 'bi-shield-check',
      });
    }

    // Bitácora de auditoría
    if (this.authService.hasPermission('SEG_AUDITORIA_VER')) {
      items.push({
        ruta: '/admin/auditoria',
        texto: 'Bitácora de Auditoría',
        icono: 'bi-clock-history',
      });
    }

    // MÓDULO 2: Catálogos Académicos
    if (this.authService.hasPermission('CAT_ACADEMICOS_GESTIONAR')) {
      items.push({
        ruta: '/admin/catalogos/academicos',
        texto: 'Catálogos Académicos',
        icono: 'bi-journal-bookmark',
      });
    }

    // MÓDULO 2: Parámetros Operativos
    if (this.authService.hasPermission('CAT_HORARIOS_GESTIONAR')) {
      items.push({
        ruta: '/admin/catalogos/operativos',
        texto: 'Parámetros Operativos',
        icono: 'bi-sliders',
      });
    }

    // MÓDULO 2: Padrón Docente
    if (this.authService.hasPermission('CAT_IMPORTAR_DOCENTES')) {
      items.push({
        ruta: '/admin/catalogos/docentes',
        texto: 'Padrón Docente',
        icono: 'bi-file-earmark-spreadsheet',
      });
    }

    // MÓDULO 2: Turnos de Auxiliares
    if (this.authService.hasPermission('CAT_ASIGNAR_TURNOS')) {
      items.push({
        ruta: '/admin/catalogos/turnos',
        texto: 'Turnos Auxiliares',
        icono: 'bi-calendar-week',
      });
    }

    // MÓDULO 3: Infraestructura y Recursos Físicos
    if (
      this.authService.hasAnyPermission([
        'INFRA_LABS_GESTIONAR',
        'INFRA_SALAS_CONFIGURAR',
      ])
    ) {
      items.push({
        ruta: '/admin/infraestructura/salas',
        texto: 'Salas y Laboratorios',
        icono: 'bi-building',
      });
      items.push({
        ruta: '/admin/infraestructura/cuadricula',
        texto: 'Editor de Cuadrícula',
        icono: 'bi-grid-3x3',
      });
    }

    if (this.authService.hasPermission('INFRA_INVENTARIO_GESTIONAR')) {
      items.push({
        ruta: '/admin/infraestructura/perifericos',
        texto: 'Inventario Periféricos',
        icono: 'bi-motherboard',
      });
    }

    return items;
  });

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
