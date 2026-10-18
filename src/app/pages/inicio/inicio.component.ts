import { Component, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-inicio',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css'],
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
