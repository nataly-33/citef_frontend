import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-recuperar-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="recovery-wrapper">
      <div class="recovery-card">
        <!-- Logo y Encabezado -->
        <div class="header">
          <img src="assets/logoTransparente.png" alt="Logo FCEE" class="recovery-logo" />
          <h2 class="title">Recuperación de Contraseña</h2>
          <p class="subtitle">Plataforma CITEF · FCEE UAGRM</p>
        </div>

        <div class="divider"></div>

        <!-- Alertas de Error -->
        <div *ngIf="errorMessage()" class="alert-banner alert-danger">
          <i class="bi bi-exclamation-triangle-fill"></i>
          <span>{{ errorMessage() }}</span>
        </div>

        <!-- MODO 1: SOLICITAR ENLACE POR CORREO -->
        <div *ngIf="!tokenUrl && !correoEnviado()">
          <p class="description">
            Ingrese su correo electrónico registrado. Le enviaremos un enlace seguro para restablecer su contraseña.
          </p>

          <form (ngSubmit)="enviarSolicitud()" class="form-container">
            <div class="form-group">
              <label class="form-label" for="email">Correo Electrónico</label>
              <div class="input-icon-wrapper">
                <i class="bi bi-envelope icon"></i>
                <input
                  type="email"
                  id="email"
                  class="citef-input with-icon"
                  [(ngModel)]="correo"
                  name="email"
                  placeholder="ejemplo@gmail.com"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              class="citef-btn citef-btn-primary btn-block"
              [disabled]="loading() || !correo"
            >
              <i class="bi bi-send me-1"></i>
              <span>{{ loading() ? 'Enviando...' : 'Enviar Enlace de Recuperación' }}</span>
            </button>
          </form>
        </div>

        <!-- MODO 1: CORREO ENVIADO CON ÉXITO -->
        <div *ngIf="!tokenUrl && correoEnviado()" class="success-box">
          <div class="success-icon">
            <i class="bi bi-envelope-check"></i>
          </div>
          <h3 class="success-title">Enlace Enviado</h3>
          <p class="success-desc">
            Hemos enviado un enlace a <strong>{{ correo }}</strong>. Revise su bandeja de entrada (y la carpeta de spam o correo no deseado) para restablecer su contraseña.
          </p>
          <a routerLink="/login" class="citef-btn citef-btn-primary btn-block mt-3">
            <i class="bi bi-arrow-left me-1"></i>
            <span>Volver al Inicio de Sesión</span>
          </a>
        </div>

        <!-- MODO 2: RESTABLECER CONTRASEÑA CON TOKEN -->
        <div *ngIf="tokenUrl && !passwordRestablecida()">
          <p class="description">
            Ingrese su nueva contraseña de acceso al sistema.
          </p>

          <form (ngSubmit)="cambiarPassword()" class="form-container">
            <div class="form-group">
              <label class="form-label" for="newPass">Nueva Contraseña</label>
              <div class="input-icon-wrapper">
                <i class="bi bi-lock icon"></i>
                <input
                  type="password"
                  id="newPass"
                  class="citef-input with-icon"
                  [(ngModel)]="nuevaPassword"
                  name="newPass"
                  placeholder="Mínimo 6 caracteres"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label" for="confirmPass">Confirmar Contraseña</label>
              <div class="input-icon-wrapper">
                <i class="bi bi-shield-lock icon"></i>
                <input
                  type="password"
                  id="confirmPass"
                  class="citef-input with-icon"
                  [(ngModel)]="confirmarPassword"
                  name="confirmPass"
                  placeholder="Repita la nueva contraseña"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              class="citef-btn citef-btn-primary btn-block"
              [disabled]="loading() || !nuevaPassword || !confirmarPassword"
            >
              <i class="bi bi-check2-circle me-1"></i>
              <span>{{ loading() ? 'Actualizando...' : 'Restablecer Contraseña' }}</span>
            </button>
          </form>
        </div>

        <!-- MODO 2: CONTRASEÑA ACTUALIZADA CON ÉXITO -->
        <div *ngIf="tokenUrl && passwordRestablecida()" class="success-box">
          <div class="success-icon">
            <i class="bi bi-shield-check"></i>
          </div>
          <h3 class="success-title">Contraseña Actualizada</h3>
          <p class="success-desc">
            Su contraseña ha sido restablecida exitosamente. Ahora puede iniciar sesión con su nueva clave.
          </p>
          <a routerLink="/login" class="citef-btn citef-btn-primary btn-block mt-3">
            <i class="bi bi-box-arrow-in-right me-1"></i>
            <span>Iniciar Sesión</span>
          </a>
        </div>

        <!-- Enlace Inferior -->
        <div class="footer-link-box" *ngIf="!correoEnviado() && !passwordRestablecida()">
          <a routerLink="/login" class="back-link">
            <i class="bi bi-arrow-left"></i>
            <span>Volver al Inicio de Sesión</span>
          </a>
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .recovery-wrapper {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at 50% 20%, #002855 0%, #001733 100%);
        padding: 2rem 1.5rem;
      }

      .recovery-card {
        width: 100%;
        max-width: 460px;
        background: #ffffff;
        border-radius: var(--citef-radius-lg, 12px);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4);
        padding: 2.25rem;
      }

      .header {
        text-align: center;
      }

      .recovery-logo {
        height: 52px;
        width: 52px;
        object-fit: contain;
        margin-bottom: 0.75rem;
      }

      .title {
        font-size: 1.35rem;
        font-weight: 700;
        color: var(--citef-primary, #002855);
        margin: 0;
      }

      .subtitle {
        font-size: 0.8rem;
        color: var(--citef-text-secondary, #64748b);
        margin-top: 0.25rem;
      }

      .divider {
        height: 1px;
        background-color: var(--citef-border, #e2e8f0);
        margin: 1.25rem 0;
      }

      .description {
        font-size: 0.875rem;
        color: var(--citef-text-secondary, #64748b);
        margin-bottom: 1.25rem;
        line-height: 1.45;
        text-align: center;
      }

      .form-container {
        display: flex;
        flex-direction: column;
        gap: 1.15rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.35rem;
      }

      .form-label {
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--citef-text-secondary, #64748b);
      }

      .input-icon-wrapper {
        position: relative;
        display: flex;
        align-items: center;
      }

      .icon {
        position: absolute;
        left: 0.85rem;
        color: var(--citef-text-muted, #94a3b8);
        pointer-events: none;
      }

      .with-icon {
        padding-left: 2.35rem;
      }

      .btn-block {
        width: 100%;
        padding: 0.75rem;
        font-size: 0.95rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .alert-banner {
        display: flex;
        align-items: center;
        gap: 0.65rem;
        padding: 0.75rem 1rem;
        border-radius: var(--citef-radius-sm, 6px);
        font-size: 0.85rem;
        margin-bottom: 1.25rem;
      }

      .alert-danger {
        background-color: var(--citef-danger-bg, #fef2f2);
        color: var(--citef-danger, #ef4444);
        border: 1px solid #fecaca;
      }

      .success-box {
        text-align: center;
        padding: 1rem 0;
      }

      .success-icon {
        width: 56px;
        height: 56px;
        border-radius: 50%;
        background-color: #dcfce7;
        color: var(--citef-success, #16a34a);
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-size: 1.75rem;
        margin-bottom: 0.75rem;
      }

      .success-title {
        font-size: 1.2rem;
        font-weight: 700;
        color: var(--citef-text-primary, #1e293b);
        margin: 0 0 0.5rem 0;
      }

      .success-desc {
        font-size: 0.875rem;
        color: var(--citef-text-secondary, #64748b);
        line-height: 1.45;
        margin: 0;
      }

      .footer-link-box {
        margin-top: 1.5rem;
        text-align: center;
      }

      .back-link {
        display: inline-flex;
        align-items: center;
        gap: 0.4rem;
        font-size: 0.85rem;
        font-weight: 600;
        color: var(--citef-primary, #002855);
        text-decoration: none;
      }

      .back-link:hover {
        text-decoration: underline;
      }
    `,
  ],
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
