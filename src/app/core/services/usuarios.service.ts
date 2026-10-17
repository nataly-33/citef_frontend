import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface RolItem {
  id_rol: number;
  nombre: string;
  descrip: string;
  activo: boolean;
  permisos: Array<{ id_permiso: number; codigo: string; modulo: string; descrip: string }>;
}

export interface UsuarioItem {
  id_usuario: number;
  correo_institucional: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  activo: boolean;
  creado_en: string;
  actualizado_en: string;
  roles: RolItem[];
}

export interface CrearUsuarioPayload {
  correo_institucional: string;
  password: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  roles_ids: number[];
}

export interface ActualizarUsuarioPayload {
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  activo?: boolean;
  roles_ids?: number[];
}

@Injectable({
  providedIn: 'root',
})
export class UsuariosService {
  private readonly apiUrl = 'http://localhost:3000/api/v1';

  constructor(private http: HttpClient) {}

  getUsuarios(params?: { activo?: boolean; busqueda?: string }): Observable<UsuarioItem[]> {
    let httpParams = new HttpParams();
    if (params?.activo !== undefined) {
      httpParams = httpParams.set('activo', String(params.activo));
    }
    if (params?.busqueda) {
      httpParams = httpParams.set('busqueda', params.busqueda);
    }
    return this.http.get<UsuarioItem[]>(`${this.apiUrl}/usuarios`, { params: httpParams });
  }

  getUsuario(id: number): Observable<UsuarioItem> {
    return this.http.get<UsuarioItem>(`${this.apiUrl}/usuarios/${id}`);
  }

  crearUsuario(payload: CrearUsuarioPayload): Observable<UsuarioItem> {
    return this.http.post<UsuarioItem>(`${this.apiUrl}/usuarios`, payload);
  }

  actualizarUsuario(id: number, payload: ActualizarUsuarioPayload): Observable<UsuarioItem> {
    return this.http.put<UsuarioItem>(`${this.apiUrl}/usuarios/${id}`, payload);
  }

  cambiarEstado(id: number, activo: boolean): Observable<any> {
    return this.http.patch(`${this.apiUrl}/usuarios/${id}/estado`, { activo });
  }

  eliminarUsuario(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/usuarios/${id}`);
  }

  cambiarPassword(id: number, nueva_password: string): Observable<any> {
    return this.http.patch(`${this.apiUrl}/usuarios/${id}/cambiar-password`, { nueva_password });
  }

  // Métodos de Roles (CU3)
  getRoles(): Observable<RolItem[]> {
    return this.http.get<RolItem[]>(`${this.apiUrl}/roles`);
  }

  getPermisos(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/roles/permisos`);
  }

  crearRol(payload: { nombre: string; descrip: string; permisos_ids?: number[] }): Observable<RolItem> {
    return this.http.post<RolItem>(`${this.apiUrl}/roles`, payload);
  }

  actualizarPermisosRol(id: number, permisos_ids: number[]): Observable<RolItem> {
    return this.http.put<RolItem>(`${this.apiUrl}/roles/${id}/permisos`, { permisos_ids });
  }
}
