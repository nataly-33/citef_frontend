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
    } else if (authService.hasPermission('SEG_AUDITORIA_VER')) {
      router.navigate(['/admin/auditoria']);
    } else {
      router.navigate(['/login']);
    }
    return false;
  };
};
