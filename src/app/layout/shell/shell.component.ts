import { Component, computed, signal, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router, NavigationEnd } from '@angular/router';
import { filter } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

export interface NavSubItem {
  ruta: string;
  texto: string;
  icono: string;
}

export interface NavModuleGroup {
  id: string;
  titulo: string;
  icono: string;
  rutaDirecta?: string;
  items: NavSubItem[];
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
  readonly router = inject(Router);

  sidebarAbierto = signal(false);
  mostrarUserMenu = signal(false);
  modulosAbiertos = signal<{ [key: string]: boolean }>({});

  currentUser = computed(() => this.authService.currentUser());

  ngOnInit(): void {
    this.authService.recargarPerfil().subscribe({
      error: () => {},
    });

    // Auto-abrir el módulo que contenga la ruta actual
    this.autoExpandirModuloRuta(this.router.url);

    this.router.events
      .pipe(filter((event): event is NavigationEnd => event instanceof NavigationEnd))
      .subscribe((event) => {
        this.autoExpandirModuloRuta(event.urlAfterRedirects || event.url);
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

  // Agrupación ejecutiva por módulo con nombres cortos (1-2 palabras)
  navGroups = computed<NavModuleGroup[]>(() => {
    const groups: NavModuleGroup[] = [
      {
        id: 'inicio',
        titulo: 'Inicio',
        icono: 'bi-house-door',
        rutaDirecta: '/admin/inicio',
        items: [],
      },
    ];

    // MÓDULO: Seguridad
    const itemsSeguridad: NavSubItem[] = [];
    if (
      this.authService.hasAnyPermission([
        'SEG_USUARIOS_VER',
        'SEG_USUARIOS_CREAR',
        'SEG_USUARIOS_EDITAR',
      ])
    ) {
      itemsSeguridad.push({
        ruta: '/admin/usuarios',
        texto: 'Usuarios',
        icono: 'bi-people',
      });
    }
    if (this.authService.hasPermission('SEG_ROLES_GESTIONAR')) {
      itemsSeguridad.push({
        ruta: '/admin/roles',
        texto: 'Roles y Permisos',
        icono: 'bi-shield-check',
      });
    }
    if (this.authService.hasPermission('SEG_AUDITORIA_VER')) {
      itemsSeguridad.push({
        ruta: '/admin/auditoria',
        texto: 'Auditoría',
        icono: 'bi-clock-history',
      });
    }
    if (itemsSeguridad.length > 0) {
      groups.push({
        id: 'seguridad',
        titulo: 'Seguridad',
        icono: 'bi-shield-lock',
        items: itemsSeguridad,
      });
    }

    // MÓDULO: Catálogos
    const itemsCatalogos: NavSubItem[] = [];
    if (this.authService.hasPermission('CAT_ACADEMICOS_GESTIONAR')) {
      itemsCatalogos.push({
        ruta: '/admin/catalogos/academicos',
        texto: 'Académicos',
        icono: 'bi-journal-bookmark',
      });
    }
    if (this.authService.hasPermission('CAT_HORARIOS_GESTIONAR')) {
      itemsCatalogos.push({
        ruta: '/admin/catalogos/operativos',
        texto: 'Parámetros',
        icono: 'bi-sliders',
      });
    }
    if (this.authService.hasPermission('CAT_IMPORTAR_DOCENTES')) {
      itemsCatalogos.push({
        ruta: '/admin/catalogos/docentes',
        texto: 'Docentes',
        icono: 'bi-file-earmark-spreadsheet',
      });
    }
    if (this.authService.hasPermission('CAT_ASIGNAR_TURNOS')) {
      itemsCatalogos.push({
        ruta: '/admin/catalogos/turnos',
        texto: 'Turnos',
        icono: 'bi-calendar-week',
      });
    }
    if (itemsCatalogos.length > 0) {
      groups.push({
        id: 'catalogos',
        titulo: 'Catálogos',
        icono: 'bi-folder2-open',
        items: itemsCatalogos,
      });
    }

    // MÓDULO: Infraestructura
    const itemsInfra: NavSubItem[] = [];
    if (
      this.authService.hasAnyPermission([
        'INFRA_LABS_GESTIONAR',
        'INFRA_SALAS_CONFIGURAR',
      ])
    ) {
      itemsInfra.push({
        ruta: '/admin/infraestructura/salas',
        texto: 'Salas',
        icono: 'bi-building',
      });
      itemsInfra.push({
        ruta: '/admin/infraestructura/cuadricula',
        texto: 'Cuadrícula',
        icono: 'bi-grid-3x3',
      });
    }
    if (this.authService.hasPermission('INFRA_INVENTARIO_GESTIONAR')) {
      itemsInfra.push({
        ruta: '/admin/infraestructura/perifericos',
        texto: 'Periféricos',
        icono: 'bi-motherboard',
      });
    }
    if (itemsInfra.length > 0) {
      groups.push({
        id: 'infraestructura',
        titulo: 'Infraestructura',
        icono: 'bi-building',
        items: itemsInfra,
      });
    }

    // MÓDULO: Monitoreo
    const itemsMonitoreo: NavSubItem[] = [];
    if (
      this.authService.hasAnyPermission([
        'TIEMPOREAL_MONITOREAR',
        'TIEMPOREAL_ASIGNAR',
      ])
    ) {
      itemsMonitoreo.push({
        ruta: '/admin/ocupacion/monitoreo',
        texto: 'Salas en Vivo',
        icono: 'bi-speedometer2',
      });
    }
    if (this.authService.hasPermission('TIEMPOREAL_ASISTENCIAS')) {
      itemsMonitoreo.push({
        ruta: '/admin/ocupacion/asistencias',
        texto: 'Asistencias',
        icono: 'bi-card-checklist',
      });
    }
    if (itemsMonitoreo.length > 0) {
      groups.push({
        id: 'monitoreo',
        titulo: 'Monitoreo',
        icono: 'bi-display',
        items: itemsMonitoreo,
      });
    }

    // MÓDULO: Reservas
    const itemsReservas: NavSubItem[] = [];
    if (
      this.authService.hasAnyPermission([
        'RESERVAS_CONSULTAR',
        'RESERVAS_SOLICITAR',
        'RESERVAS_GESTIONAR',
      ])
    ) {
      itemsReservas.push({
        ruta: '/admin/reservas/calendario',
        texto: 'Calendario',
        icono: 'bi-calendar3',
      });
    }
    if (this.authService.hasPermission('RESERVAS_GESTIONAR')) {
      itemsReservas.push({
        ruta: '/admin/reservas/gestion',
        texto: 'Bandeja',
        icono: 'bi-inbox-fill',
      });
    }
    if (itemsReservas.length > 0) {
      groups.push({
        id: 'reservas',
        titulo: 'Reservas',
        icono: 'bi-calendar-check',
        items: itemsReservas,
      });
    }

    // MÓDULO: Guardias
    const itemsGuardias: NavSubItem[] = [];
    if (this.authService.hasPermission('TURNOS_APERTURA_CIERRE')) {
      itemsGuardias.push({
        ruta: '/admin/turnos/guardia',
        texto: 'Guardias y Relevos',
        icono: 'bi-shield-check',
      });
    }
    if (this.authService.hasPermission('TURNOS_INCIDENCIAS_REPORTAR')) {
      itemsGuardias.push({
        ruta: '/admin/turnos/averias',
        texto: 'Averías',
        icono: 'bi-tools',
      });
    }
    if (this.authService.hasPermission('TURNOS_OBJETOS_EXTRAVIADOS')) {
      itemsGuardias.push({
        ruta: '/admin/turnos/objetos',
        texto: 'Objetos Extraviados',
        icono: 'bi-box-seam',
      });
    }
    if (itemsGuardias.length > 0) {
      groups.push({
        id: 'guardias',
        titulo: 'Guardias',
        icono: 'bi-person-badge',
        items: itemsGuardias,
      });
    }

    // MÓDULO: Soporte Técnico y Mantenimiento RAMS (CU24 y CU25)
    const itemsSoporte: NavSubItem[] = [];
    if (
      this.authService.hasAnyPermission([
        'SOPORTE_MANTENIMIENTO_REGISTRAR',
        'SOPORTE_RETORNO_CONFIRMAR',
      ])
    ) {
      itemsSoporte.push({
        ruta: '/admin/soporte/taller',
        texto: 'Bandeja Taller',
        icono: 'bi-wrench-adjustable',
      });
    }
    if (
      this.authService.hasAnyPermission([
        'SOPORTE_MANTENIMIENTO_REGISTRAR',
        'REPORTES_DINAMICOS',
      ])
    ) {
      itemsSoporte.push({
        ruta: '/admin/soporte/rams',
        texto: 'Métricas RAMS',
        icono: 'bi-speedometer2',
      });
    }
    if (itemsSoporte.length > 0) {
      groups.push({
        id: 'soporte',
        titulo: 'Soporte',
        icono: 'bi-tools',
        items: itemsSoporte,
      });
    }

    return groups;
  });

  isModuloAbierto(id: string): boolean {
    const estado = this.modulosAbiertos()[id];
    if (estado !== undefined) return estado;
    return this.moduloContieneRutaActiva(id);
  }

  moduloContieneRutaActiva(id: string): boolean {
    const grupo = this.navGroups().find((g) => g.id === id);
    if (!grupo || !grupo.items || grupo.items.length === 0) return false;
    const url = this.router.url;
    return grupo.items.some((item) => url.startsWith(item.ruta));
  }

  toggleModulo(id: string): void {
    const actual = this.isModuloAbierto(id);
    this.modulosAbiertos.update((prev) => ({
      ...prev,
      [id]: !actual,
    }));
  }

  private autoExpandirModuloRuta(url: string): void {
    const grupo = this.navGroups().find((g) =>
      g.items?.some((item) => url.startsWith(item.ruta)),
    );
    if (grupo) {
      this.modulosAbiertos.update((prev) => ({
        ...prev,
        [grupo.id]: true,
      }));
    }
  }

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
