import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { HorarioItem, PaginatedResponse } from './catalogos.service';

export interface AuxiliarUsuario {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  correo_institucional: string;
}

export interface AsignacionTurnoItem {
  id_asignacion_turno: number;
  id_usuario: number;
  usuario?: AuxiliarUsuario;
  id_horario: number;
  horario?: HorarioItem;
  semestre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo: boolean;
  creado_en?: string;
}

export interface CrearAsignacionPayload {
  id_usuario: number;
  id_horario: number;
  semestre: string;
  fecha_inicio: string;
  fecha_fin: string;
  activo?: boolean;
}

@Injectable({
  providedIn: 'root',
})
export class TurnosAuxiliaresService {
  private readonly apiUrl = 'http://localhost:3000/api/v1/turnos-auxiliares';

  constructor(private http: HttpClient) {}

  getAsignaciones(params?: {
    semestre?: string;
    id_usuario?: number;
    activo?: boolean;
    pagina?: number;
    limite?: number;
  }): Observable<PaginatedResponse<AsignacionTurnoItem>> {
    let httpParams = new HttpParams();
    if (params?.semestre) httpParams = httpParams.set('semestre', params.semestre);
    if (params?.id_usuario) httpParams = httpParams.set('id_usuario', String(params.id_usuario));
    if (params?.activo !== undefined) httpParams = httpParams.set('activo', String(params.activo));
    if (params?.pagina) httpParams = httpParams.set('pagina', String(params.pagina));
    if (params?.limite) httpParams = httpParams.set('limite', String(params.limite));

    return this.http.get<PaginatedResponse<AsignacionTurnoItem>>(this.apiUrl, {
      params: httpParams,
    });
  }

  getAuxiliaresDisponibles(): Observable<AuxiliarUsuario[]> {
    return this.http.get<AuxiliarUsuario[]>(`${this.apiUrl}/auxiliares-disponibles`);
  }

  crearAsignacion(payload: CrearAsignacionPayload): Observable<AsignacionTurnoItem> {
    return this.http.post<AsignacionTurnoItem>(this.apiUrl, payload);
  }

  actualizarAsignacion(
    id: number,
    payload: Partial<CrearAsignacionPayload>,
  ): Observable<AsignacionTurnoItem> {
    return this.http.put<AsignacionTurnoItem>(`${this.apiUrl}/${id}`, payload);
  }

  cambiarEstado(id: number, activo: boolean): Observable<AsignacionTurnoItem> {
    return this.http.patch<AsignacionTurnoItem>(`${this.apiUrl}/${id}/estado`, { activo });
  }

  eliminarAsignacion(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/${id}`);
  }
}
