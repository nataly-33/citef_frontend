import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
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
