import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './recuperar-password.component.html',
  styleUrls: ['./recuperar-password.component.css'],
})
export class RecuperarPasswordComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);

  tokenUrl: string | null = null;
  correo = '';
  nuevaPassword = '';
  confirmarPassword = '';

  loading = signal(false);
  errorMessage = signal<string | null>(null);
  correoEnviado = signal(false);
  passwordRestablecida = signal(false);

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      this.tokenUrl = params['token'] || null;
    });
  }

  enviarSolicitud() {
    this.errorMessage.set(null);
    this.loading.set(true);

    this.authService.solicitarRecuperacion(this.correo).subscribe({
      next: () => {
        this.loading.set(false);
        this.correoEnviado.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message || 'Error al procesar la solicitud.';
        this.errorMessage.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  cambiarPassword() {
    this.errorMessage.set(null);

    if (this.nuevaPassword !== this.confirmarPassword) {
      this.errorMessage.set('Las contraseñas no coinciden.');
      return;
    }

    if (this.nuevaPassword.length < 6) {
      this.errorMessage.set('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (!this.tokenUrl) {
      this.errorMessage.set('Token no válido o inexistente.');
      return;
    }

    this.loading.set(true);
    this.authService.resetPassword(this.tokenUrl, this.nuevaPassword).subscribe({
      next: () => {
        this.loading.set(false);
        this.passwordRestablecida.set(true);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message || 'El enlace de recuperación es inválido o ha expirado.';
        this.errorMessage.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
