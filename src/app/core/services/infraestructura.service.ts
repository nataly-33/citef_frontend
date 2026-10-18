import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface SalaItem {
  id_sala: number;
  codigo_sala: string;
  nombre: string;
  piso: number;
  cant_estudiantes: number;
  maquina_docente: boolean;
  proyector: boolean;
  aire_acondicionado: boolean;
  filas_cuadricula: number;
  columnas_cuadricula: number;
  estado_operativo: string;
  activo: boolean;
  total_equipos?: number;
  equipos_disponibles?: number;
  equipos_ocupados?: number;
  equipos_en_mantenimiento?: number;
}

export interface ComputadoraItem {
  id_computadora: number;
  id_sala: number;
  codigo_equipo: string;
  maquina_docente: boolean;
  posicion_fila: number;
  posicion_columna: number;
  estado_actual: 'DISPONIBLE' | 'OCUPADA' | 'RESERVADA' | 'EN_MANTENIMIENTO';
  ip_red?: string | null;
  mac_address?: string | null;
  horas_uso_acumuladas: number;
  activo: boolean;
  perifericos?: PerifericoItem[];
  sala?: SalaItem;
}

export interface TipoPerifericoItem {
  id_tipo_periferico: number;
  nombre: string;
  activo: boolean;
}

export interface PerifericoItem {
  id_periferico: number;
  id_computadora: number | null;
  id_tipo_periferico: number;
  marca_modelo: string;
  numero_activo: string;
  condicion_fisica: 'BUENO' | 'REGULAR' | 'DANADO' | 'FALTANTE';
  activo: boolean;
  actualizado_en?: string;
  tipo?: TipoPerifericoItem;
  computadora?: ComputadoraItem | null;
}

export interface PerifericosPaginados {
  data: PerifericoItem[];
  total: number;
  pagina: number;
  limite: number;
  total_paginas: number;
}

@Injectable({
  providedIn: 'root',
})
export class InfraestructuraService {
  private readonly apiUrl = 'http://localhost:3000/api/v1';

  constructor(private http: HttpClient) {}

  // ================= SALAS =================
  getSalas(params?: {
    busqueda?: string;
    piso?: number;
    estado_operativo?: string;
    activo?: boolean;
  }): Observable<SalaItem[]> {
    let httpParams = new HttpParams();
    if (params?.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    if (params?.piso !== undefined && params.piso !== null) {
      httpParams = httpParams.set('piso', String(params.piso));
    }
    if (params?.estado_operativo) {
      httpParams = httpParams.set('estado_operativo', params.estado_operativo);
    }
    if (params?.activo !== undefined) {
      httpParams = httpParams.set('activo', String(params.activo));
    }
    return this.http.get<SalaItem[]>(`${this.apiUrl}/salas`, { params: httpParams });
  }

  getSala(id: number): Observable<SalaItem> {
    return this.http.get<SalaItem>(`${this.apiUrl}/salas/${id}`);
  }

  crearSala(payload: Partial<SalaItem>): Observable<SalaItem> {
    return this.http.post<SalaItem>(`${this.apiUrl}/salas`, payload);
  }

  actualizarSala(id: number, payload: Partial<SalaItem>): Observable<SalaItem> {
    return this.http.put<SalaItem>(`${this.apiUrl}/salas/${id}`, payload);
  }

  eliminarSala(id: number): Observable<SalaItem> {
    return this.http.delete<SalaItem>(`${this.apiUrl}/salas/${id}`);
  }

  getComputadorasPorSala(
    idSala: number,
  ): Observable<{ sala: SalaItem; computadoras: ComputadoraItem[] }> {
    return this.http.get<{ sala: SalaItem; computadoras: ComputadoraItem[] }>(
      `${this.apiUrl}/salas/${idSala}/computadoras`,
    );
  }

  guardarPosiciones(
    idSala: number,
    posiciones: Array<{ id_computadora: number; posicion_fila: number; posicion_columna: number }>,
  ): Observable<{ sala: SalaItem; computadoras: ComputadoraItem[] }> {
    return this.http.put<{ sala: SalaItem; computadoras: ComputadoraItem[] }>(
      `${this.apiUrl}/salas/${idSala}/posiciones`,
      { posiciones },
    );
  }

  // ================= COMPUTADORAS =================
  crearComputadora(payload: Partial<ComputadoraItem>): Observable<ComputadoraItem> {
    return this.http.post<ComputadoraItem>(`${this.apiUrl}/computadoras`, payload);
  }

  actualizarComputadora(id: number, payload: Partial<ComputadoraItem>): Observable<ComputadoraItem> {
    return this.http.put<ComputadoraItem>(`${this.apiUrl}/computadoras/${id}`, payload);
  }

  eliminarComputadora(id: number): Observable<ComputadoraItem> {
    return this.http.delete<ComputadoraItem>(`${this.apiUrl}/computadoras/${id}`);
  }

  // ================= PERIFERICOS =================
  getTiposPeriferico(): Observable<TipoPerifericoItem[]> {
    return this.http.get<TipoPerifericoItem[]>(`${this.apiUrl}/perifericos/tipos`);
  }

  getPerifericos(params?: {
    busqueda?: string;
    id_tipo_periferico?: number;
    id_sala?: number;
    condicion_fisica?: string;
    id_computadora?: number;
    en_bodega?: boolean;
    activo?: boolean;
    pagina?: number;
    limite?: number;
  }): Observable<PerifericosPaginados> {
    let httpParams = new HttpParams();
    if (params?.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    if (params?.id_tipo_periferico) {
      httpParams = httpParams.set('id_tipo_periferico', String(params.id_tipo_periferico));
    }
    if (params?.id_sala) {
      httpParams = httpParams.set('id_sala', String(params.id_sala));
    }
    if (params?.condicion_fisica) {
      httpParams = httpParams.set('condicion_fisica', params.condicion_fisica);
    }
    if (params?.id_computadora) {
      httpParams = httpParams.set('id_computadora', String(params.id_computadora));
    }
    if (params?.en_bodega) {
      httpParams = httpParams.set('en_bodega', 'true');
    }
    if (params?.activo !== undefined) {
      httpParams = httpParams.set('activo', String(params.activo));
    }
    if (params?.pagina) {
      httpParams = httpParams.set('pagina', String(params.pagina));
    }
    if (params?.limite) {
      httpParams = httpParams.set('limite', String(params.limite));
    }
    return this.http.get<PerifericosPaginados>(`${this.apiUrl}/perifericos`, {
      params: httpParams,
    });
  }

  registrarPeriferico(payload: Partial<PerifericoItem>): Observable<PerifericoItem> {
    return this.http.post<PerifericoItem>(`${this.apiUrl}/perifericos`, payload);
  }

  actualizarPeriferico(id: number, payload: Partial<PerifericoItem>): Observable<PerifericoItem> {
    return this.http.put<PerifericoItem>(`${this.apiUrl}/perifericos/${id}`, payload);
  }

  asignarPeriferico(id: number, idComputadora: number | null): Observable<PerifericoItem> {
    return this.http.patch<PerifericoItem>(`${this.apiUrl}/perifericos/${id}/asignar`, {
      id_computadora: idComputadora,
    });
  }

  eliminarPeriferico(id: number): Observable<PerifericoItem> {
    return this.http.delete<PerifericoItem>(`${this.apiUrl}/perifericos/${id}`);
  }
}
