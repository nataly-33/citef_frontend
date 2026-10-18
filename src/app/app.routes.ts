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
      // Aliases directos para facilidad de navegación
      { path: 'academicos', redirectTo: 'catalogos/academicos', pathMatch: 'full' },
      { path: 'operativos', redirectTo: 'catalogos/operativos', pathMatch: 'full' },
      { path: 'docentes', redirectTo: 'catalogos/docentes', pathMatch: 'full' },
      { path: 'turnos-auxiliares', redirectTo: 'catalogos/turnos', pathMatch: 'full' },
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
