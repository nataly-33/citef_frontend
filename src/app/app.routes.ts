import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { RecuperarPasswordComponent } from './pages/recuperar-password/recuperar-password.component';
import { ShellComponent } from './layout/shell/shell.component';
import { UsuariosComponent } from './pages/usuarios/usuarios.component';
import { RolesComponent } from './pages/roles/roles.component';
import { AuditoriaComponent } from './pages/auditoria/auditoria.component';
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
      { path: '', redirectTo: 'usuarios', pathMatch: 'full' },
    ],
  },
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '**', redirectTo: 'login' },
];
