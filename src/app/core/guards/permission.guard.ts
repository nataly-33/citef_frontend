import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const permissionGuard = (requiredPermisos: string[]): CanActivateFn => {
  return () => {
    const authService = inject(AuthService);
    const router = inject(Router);

    if (!authService.isAuthenticated()) {
      router.navigate(['/login']);
      return false;
    }

    if (authService.hasAnyPermission(requiredPermisos)) {
      return true;
    }

    // Redirigir a una ruta donde sí tenga permisos
    if (authService.hasAnyPermission(['SEG_USUARIOS_VER', 'SEG_USUARIOS_CREAR', 'SEG_USUARIOS_EDITAR'])) {
      router.navigate(['/admin/usuarios']);
    } else if (authService.hasPermission('SEG_ROLES_GESTIONAR')) {
      router.navigate(['/admin/roles']);
    } else if (authService.hasPermission('CAT_ACADEMICOS_GESTIONAR')) {
      router.navigate(['/admin/catalogos/academicos']);
    } else if (authService.hasPermission('CAT_HORARIOS_GESTIONAR')) {
      router.navigate(['/admin/catalogos/operativos']);
    } else if (authService.hasPermission('CAT_IMPORTAR_DOCENTES')) {
      router.navigate(['/admin/catalogos/docentes']);
    } else if (authService.hasPermission('CAT_ASIGNAR_TURNOS')) {
      router.navigate(['/admin/catalogos/turnos']);
    } else {
      router.navigate(['/admin/inicio']);
    }
    return false;
  };
};
