import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface BitacoraItem {
  id_auditoria: number;
  id_usuario: number | null;
  correo_usuario: string | null;
  accion: string;
  tabla_afectada: string;
  id_registro_afectado: string;
  valores_anteriores: Record<string, any> | null;
  valores_nuevos: Record<string, any> | null;
  ip_cliente: string | null;
  fecha_hora: string;
  usuario?: {
    nombres: string;
    apellidos: string;
    correo_institucional: string;
  };
}

export interface BitacoraResponse {
  total: number;
  pagina: number;
  limite: number;
  paginas_totales: number;
  items: BitacoraItem[];
}

@Injectable({
  providedIn: 'root',
})
export class AuditoriaService {
  private readonly apiUrl = 'http://localhost:3000/api/v1/auditoria';

  constructor(private http: HttpClient) {}

  getBitacora(params?: {
    tabla?: string;
    accion?: string;
    correo?: string;
    pagina?: number;
    limite?: number;
    ordenColumna?: string;
    ordenDireccion?: 'asc' | 'desc';
  }): Observable<BitacoraResponse> {
    let httpParams = new HttpParams();
    if (params?.tabla) httpParams = httpParams.set('tabla', params.tabla);
    if (params?.accion) httpParams = httpParams.set('accion', params.accion);
    if (params?.correo) httpParams = httpParams.set('correo', params.correo);
    if (params?.pagina) httpParams = httpParams.set('pagina', String(params.pagina));
    if (params?.limite) httpParams = httpParams.set('limite', String(params.limite));
    if (params?.ordenColumna) httpParams = httpParams.set('ordenColumna', params.ordenColumna);
    if (params?.ordenDireccion) httpParams = httpParams.set('ordenDireccion', params.ordenDireccion.toUpperCase());

    return this.http.get<BitacoraResponse>(this.apiUrl, { params: httpParams });
  }
}
