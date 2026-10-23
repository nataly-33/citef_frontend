import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RecuperarPasswordComponent } from './pages/recuperar-password/recuperar-password.component';
import { ShellComponent } from './layout/shell/shell.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { RolesComponent } from './pages/roles/roles.component';
import { AuditoriaComponent } from './pages/auditoria/auditoria.component';
import { AcademicosComponent } from './pages/catalogos/academicos/academicos.component';
import { OperativosComponent } from './pages/catalogos/operativos/operativos.component';
import { ImportarDocentesComponent } from './pages/catalogos/importar-docentes/importar-docentes.component';
import { TurnosAuxiliaresComponent } from './pages/catalogos/turnos-auxiliares/turnos-auxiliares.component';
import { SalasComponent } from './pages/infraestructura/salas/salas.component';
import { EditorCuadriculaComponent } from './pages/infraestructura/editor-cuadricula/editor-cuadricula.component';
import { InventarioPerifericosComponent } from './pages/infraestructura/inventario-perifericos/inventario-perifericos.component';
import { MonitorSalaComponent } from './pages/ocupacion/monitor-sala/monitor-sala.component';
import { AsistenciasComponent } from './pages/ocupacion/asistencias/asistencias.component';
import { InicioComponent } from './pages/inicio/inicio.component';
import { CalendarioReservasComponent } from './pages/reservas/calendario/calendario-reservas.component';
import { BandejaGestionReservasComponent } from './pages/reservas/gestion/bandeja-gestion-reservas.component';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  { path: 'recuperar-password', component: RecuperarPasswordComponent },
  {
    path: 'admin',
    component: ShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: 'inicio',
        component: InicioComponent,
      },
      {
        path: 'usuarios',
        component: UsuariosComponent,
        canActivate: [
          permissionGuard([
            'SEG_USUARIOS_VER',
            'SEG_USUARIOS_CREAR',
            'SEG_USUARIOS_EDITAR',
          ]),
        ],
      },
      {
        path: 'roles',
        component: RolesComponent,
        canActivate: [permissionGuard(['SEG_ROLES_GESTIONAR'])],
      },
      {
        path: 'auditoria',
        component: AuditoriaComponent,
        canActivate: [permissionGuard(['SEG_AUDITORIA_VER'])],
      },
      // MÓDULO 2: Catálogos y Parámetros Operativos
      {
        path: 'catalogos/academicos',
        component: AcademicosComponent,
        canActivate: [permissionGuard(['CAT_ACADEMICOS_GESTIONAR'])],
      },
      {
        path: 'catalogos/operativos',
        component: OperativosComponent,
        canActivate: [permissionGuard(['CAT_HORARIOS_GESTIONAR'])],
      },
      {
        path: 'catalogos/docentes',
        component: ImportarDocentesComponent,
        canActivate: [permissionGuard(['CAT_IMPORTAR_DOCENTES'])],
      },
      {
        path: 'catalogos/turnos',
        component: TurnosAuxiliaresComponent,
        canActivate: [permissionGuard(['CAT_ASIGNAR_TURNOS'])],
      },
      // MÓDULO 3: Infraestructura y Recursos Físicos
      {
        path: 'infraestructura/salas',
        component: SalasComponent,
        canActivate: [
          permissionGuard(['INFRA_LABS_GESTIONAR', 'INFRA_SALAS_CONFIGURAR']),
        ],
      },
      {
        path: 'infraestructura/cuadricula/:id',
        component: EditorCuadriculaComponent,
        canActivate: [permissionGuard(['INFRA_SALAS_CONFIGURAR'])],
      },
      {
        path: 'infraestructura/cuadricula',
        component: EditorCuadriculaComponent,
        canActivate: [permissionGuard(['INFRA_SALAS_CONFIGURAR'])],
      },
      {
        path: 'infraestructura/perifericos',
        component: InventarioPerifericosComponent,
        canActivate: [permissionGuard(['INFRA_INVENTARIO_GESTIONAR'])],
      },
      // MÓDULO 4: Ocupación y Monitoreo en Tiempo Real
      {
        path: 'ocupacion/monitoreo',
        component: MonitorSalaComponent,
        canActivate: [
          permissionGuard(['TIEMPOREAL_MONITOREAR', 'TIEMPOREAL_ASIGNAR']),
        ],
      },
      {
        path: 'ocupacion/asistencias',
        component: AsistenciasComponent,
        canActivate: [permissionGuard(['TIEMPOREAL_ASISTENCIAS'])],
      },
      // MÓDULO 5: Reservas Académicas y Disponibilidad
      {
        path: 'reservas/calendario',
        component: CalendarioReservasComponent,
        canActivate: [
          permissionGuard([
            'RESERVAS_CONSULTAR',
            'RESERVAS_SOLICITAR',
            'RESERVAS_GESTIONAR',
          ]),
        ],
      },
      {
        path: 'reservas/gestion',
        component: BandejaGestionReservasComponent,
        canActivate: [permissionGuard(['RESERVAS_GESTIONAR'])],
      },
      {
        path: 'reservas',
        redirectTo: 'reservas/calendario',
        pathMatch: 'full',
      },
      // Aliases directos para facilidad de navegación
      { path: 'academicos', redirectTo: 'catalogos/academicos', pathMatch: 'full' },
      { path: 'operativos', redirectTo: 'catalogos/operativos', pathMatch: 'full' },
      { path: 'docentes', redirectTo: 'catalogos/docentes', pathMatch: 'full' },
      { path: 'turnos-auxiliares', redirectTo: 'catalogos/turnos', pathMatch: 'full' },
      { path: 'salas', redirectTo: 'infraestructura/salas', pathMatch: 'full' },
      { path: 'cuadricula', redirectTo: 'infraestructura/cuadricula', pathMatch: 'full' },
      { path: 'perifericos', redirectTo: 'infraestructura/perifericos', pathMatch: 'full' },
      { path: 'monitoreo', redirectTo: 'ocupacion/monitoreo', pathMatch: 'full' },
      { path: 'asistencias', redirectTo: 'ocupacion/asistencias', pathMatch: 'full' },
      { path: 'calendario', redirectTo: 'reservas/calendario', pathMatch: 'full' },
      { path: 'gestion-reservas', redirectTo: 'reservas/gestion', pathMatch: 'full' },
      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },
  { path: 'infraestructura/cuadricula/:id', redirectTo: 'admin/infraestructura/cuadricula/:id', pathMatch: 'full' },
  { path: 'infraestructura/salas', redirectTo: 'admin/infraestructura/salas', pathMatch: 'full' },
  { path: 'infraestructura/perifericos', redirectTo: 'admin/infraestructura/perifericos', pathMatch: 'full' },
  { path: 'ocupacion/monitoreo', redirectTo: 'admin/ocupacion/monitoreo', pathMatch: 'full' },
  { path: 'ocupacion/asistencias', redirectTo: 'admin/ocupacion/asistencias', pathMatch: 'full' },
  { path: 'reservas/calendario', redirectTo: 'admin/reservas/calendario', pathMatch: 'full' },
  { path: 'reservas/gestion', redirectTo: 'admin/reservas/gestion', pathMatch: 'full' },
  { path: 'reservas', redirectTo: 'admin/reservas/calendario', pathMatch: 'full' },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
