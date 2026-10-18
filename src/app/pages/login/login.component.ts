import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  template: `
    <div class="login-wrapper">
      <div class="login-container">
        <!-- Tarjeta de Login Formal Institucional -->
        <div class="login-card citef-card">
          <!-- Encabezado con Logo Transparente FCEE -->
          <div class="institution-header">
            <div class="logo-circle">
              <img src="assets/logoTransparente.png" alt="Logo FCEE UAGRM" class="faculty-logo" />
            </div>
            <h1 class="system-title">CITEF</h1>
            <p class="system-subtitle">Centro de Información y Tecnología</p>
            <p class="faculty-name">Facultad de Ciencias Económicas y Empresariales · UAGRM</p>
          </div>

          <div class="divider"></div>

          <!-- Mensajes de Error o Alerta -->
          <div *ngIf="errorMessage()" class="alert-box alert-danger">
            <i class="bi bi-exclamation-octagon-fill me-2"></i>
            <span>{{ errorMessage() }}</span>
          </div>

          <!-- Formulario de Inicio de Sesión -->
          <form (ngSubmit)="onLogin()" #loginForm="ngForm" class="login-form">
            <div class="form-group">
              <label class="form-label" for="correo">
                <i class="bi bi-envelope-fill me-1 text-muted"></i>
                Correo Electrónico
              </label>
              <div class="input-icon-wrapper">
                <input
                  type="email"
                  id="correo"
                  name="correo"
                  class="citef-input"
                  [(ngModel)]="correo"
                  placeholder="ejemplo@gmail.com o usuario@uagrm.edu.bo"
                  required
                />
              </div>
            </div>

            <div class="form-group">
              <div class="label-with-link">
                <label class="form-label" for="password">
                  <i class="bi bi-shield-lock-fill me-1 text-muted"></i>
                  Contraseña
                </label>
                <a routerLink="/recuperar-password" class="forgot-link">¿Olvidó su contraseña?</a>
              </div>
              <div class="input-icon-wrapper">
                <input
                  type="password"
                  id="password"
                  name="password"
                  class="citef-input"
                  [(ngModel)]="password"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              class="citef-btn citef-btn-primary btn-submit"
              [disabled]="loading() || !correo || !password"
            >
              <i *ngIf="!loading()" class="bi bi-box-arrow-in-right me-2"></i>
              <span *ngIf="!loading()">Ingresar al Sistema</span>
              <span *ngIf="loading()">Validando credenciales...</span>
            </button>
          </form>

          <!-- Acceso Rápido para Evaluación y Tribunal -->
          <div class="demo-section">
            <span class="demo-heading">Accesos rápidos de evaluación:</span>
            <div class="demo-grid">
              <button
                type="button"
                class="demo-role-btn"
                (click)="setDemo('admin@uagrm.edu.bo', 'Admin123*')"
              >
                <i class="bi bi-shield-shaded text-primary"></i>
                <span>Administrador</span>
              </button>
              <button
                type="button"
                class="demo-role-btn"
                (click)="setDemo('docente@uagrm.edu.bo', 'Docente123*')"
              >
                <i class="bi bi-mortarboard-fill text-success"></i>
                <span>Docente</span>
              </button>
              <button
                type="button"
                class="demo-role-btn"
                (click)="setDemo('auxiliar@uagrm.edu.bo', 'Auxiliar123*')"
              >
                <i class="bi bi-display text-info"></i>
                <span>Auxiliar</span>
              </button>
              <button
                type="button"
                class="demo-role-btn"
                (click)="setDemo('tecnico@uagrm.edu.bo', 'Tecnico123*')"
              >
                <i class="bi bi-tools text-warning"></i>
                <span>Técnico</span>
              </button>
            </div>
          </div>
        </div>

        <div class="system-footer-note">
          Universidad Autónoma Gabriel René Moreno · Santa Cruz, Bolivia
        </div>
      </div>
    </div>
  `,
  styles: [
    `
      .login-wrapper {
        min-height: 100vh;
        display: flex;
        align-items: center;
        justify-content: center;
        background: radial-gradient(circle at 50% 20%, #002855 0%, #001733 100%);
        padding: 2rem 1.5rem;
      }

      .login-container {
        width: 100%;
        max-width: 460px;
        display: flex;
        flex-direction: column;
        align-items: center;
      }

      .login-card {
        width: 100%;
        border-radius: var(--citef-radius-lg);
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 8px 10px -6px rgba(0, 0, 0, 0.3);
        background: #ffffff;
        padding: 2.5rem 2.25rem;
      }

      .institution-header {
        text-align: center;
      }

      .logo-circle {
        width: 72px;
        height: 72px;
        margin: 0 auto 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        background-color: #ffffff;
        border-radius: 16px;
        box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
        border: 1px solid var(--citef-border);
        padding: 4px;
      }

      .faculty-logo {
        height: 100%;
        width: 100%;
        object-fit: contain;
      }

      .system-title {
        font-size: 1.85rem;
        font-weight: 800;
        color: var(--citef-primary);
        letter-spacing: -0.025em;
        line-height: 1.2;
      }

      .system-subtitle {
        font-size: 0.925rem;
        font-weight: 700;
        color: var(--citef-text-secondary);
        margin-top: 0.15rem;
      }

      .faculty-name {
        font-size: 0.775rem;
        color: var(--citef-text-muted);
        margin-top: 0.3rem;
      }

      .divider {
        height: 1px;
        background-color: var(--citef-border);
        margin: 1.5rem 0;
      }

      .login-form {
        display: flex;
        flex-direction: column;
        gap: 1.25rem;
      }

      .form-group {
        display: flex;
        flex-direction: column;
        gap: 0.4rem;
      }

      .form-label {
        font-size: 0.825rem;
        font-weight: 700;
        color: var(--citef-text-secondary);
        display: flex;
        align-items: center;
      }

      .label-with-link {
        display: flex;
        justify-content: space-between;
        align-items: center;
      }

      .forgot-link {
        font-size: 0.775rem;
        color: var(--citef-secondary);
        text-decoration: none;
        font-weight: 600;
      }

      .forgot-link:hover {
        text-decoration: underline;
      }

      .btn-submit {
        width: 100%;
        padding: 0.75rem;
        font-size: 0.95rem;
        margin-top: 0.5rem;
      }

      .alert-box {
        padding: 0.75rem 1rem;
        border-radius: var(--citef-radius-sm);
        font-size: 0.85rem;
        margin-bottom: 1.25rem;
        display: flex;
        align-items: center;
      }

      .alert-danger {
        background-color: var(--citef-danger-bg);
        color: var(--citef-danger);
        border: 1px solid #fecaca;
      }

      /* Demo Access Section */
      .demo-section {
        margin-top: 2rem;
        padding-top: 1.25rem;
        border-top: 1px dashed var(--citef-border);
      }

      .demo-heading {
        display: block;
        font-size: 0.725rem;
        color: var(--citef-text-muted);
        text-transform: uppercase;
        font-weight: 800;
        letter-spacing: 0.05em;
        text-align: center;
        margin-bottom: 0.75rem;
      }

      .demo-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 0.5rem;
      }

      .demo-role-btn {
        background-color: #f8fafc;
        border: 1px solid var(--citef-border);
        border-radius: var(--citef-radius-sm);
        padding: 0.5rem 0.65rem;
        font-size: 0.8rem;
        font-weight: 600;
        color: var(--citef-text-secondary);
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 0.5rem;
        transition: all 0.15s ease;
      }

      .demo-role-btn:hover {
        background-color: #ffffff;
        border-color: var(--citef-primary);
        color: var(--citef-primary);
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
      }

      .system-footer-note {
        margin-top: 1.5rem;
        font-size: 0.75rem;
        color: rgba(255, 255, 255, 0.5);
        text-align: center;
      }
    `,
  ],
})
export class LoginComponent {
  correo = '';
  password = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  constructor(private authService: AuthService, private router: Router) {}

  setDemo(correo: string, pass: string) {
    this.correo = correo;
    this.password = pass;
    this.errorMessage.set(null);
  }

  onLogin() {
    this.errorMessage.set(null);
    this.loading.set(true);

    this.authService.login(this.correo, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        if (this.authService.hasPermission('SEG_USUARIOS_VER')) {
          this.router.navigate(['/admin/usuarios']);
        } else {
          this.router.navigate(['/admin/inicio']);
        }
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err.error?.message || 'Error al autenticar con el servidor CITEF';
        this.errorMessage.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }
}
