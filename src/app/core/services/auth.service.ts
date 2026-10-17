import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { Router } from '@angular/router';

export interface UsuarioSession {
  id_usuario: number;
  correo_institucional: string;
  nombres: string;
  apellidos: string;
  roles: string[];
  permisos: string[];
}

export interface LoginResponse {
  access_token: string;
  usuario: UsuarioSession;
}

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly apiUrl = 'http://localhost:3000/api/v1/auth';
  private readonly TOKEN_KEY = 'citef_access_token';
  private readonly USER_KEY = 'citef_user_session';

  currentUser = signal<UsuarioSession | null>(this.getStoredUser());
  token = signal<string | null>(this.getStoredToken());
  isAuthenticated = computed(() => !!this.token());

  constructor(private http: HttpClient, private router: Router) {}

  login(correo: string, password: string): Observable<LoginResponse> {
    return this.http.post<LoginResponse>(`${this.apiUrl}/login`, { correo, password }).pipe(
      tap((res) => {
        localStorage.setItem(this.TOKEN_KEY, res.access_token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(res.usuario));
        this.token.set(res.access_token);
        this.currentUser.set(res.usuario);
      }),
    );
  }

  solicitarRecuperacion(correo: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/recuperar-password`, { correo });
  }

  resetPassword(token: string, nueva_password: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/reset-password`, { token, nueva_password });
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.token.set(null);
    this.currentUser.set(null);
    this.router.navigate(['/login']);
  }

  hasRole(rol: string): boolean {
    const user = this.currentUser();
    return !!user && user.roles.includes(rol);
  }

  private getStoredToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  private getStoredUser(): UsuarioSession | null {
    const raw = localStorage.getItem(this.USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }
}
