import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface CarreraItem {
  id_carrera: number;
  codigo: string;
  nombre: string;
  activo: boolean;
  materias?: MateriaItem[];
  creado_en?: string;
  actualizado_en?: string;
}

export interface MateriaItem {
  id_materia: number;
  sigla: string;
  nombre: string;
  semestre_nivel: number;
  id_carrera: number;
  activo: boolean;
  carrera?: CarreraItem;
  creado_en?: string;
  actualizado_en?: string;
}

export interface HorarioItem {
  id_horario: number;
  turno: string;
  hora_inicio: string;
  hora_fin: string;
  activo: boolean;
  creado_en?: string;
}

export interface MotivoItem {
  id_motivo: number;
  descrip: string;
  tipo: string;
  activo: boolean;
  creado_en?: string;
}

export interface PaginatedResponse<T> {
  total: number;
  pagina: number;
  limite: number;
  paginas_totales: number;
  items: T[];
}

@Injectable({
  providedIn: 'root',
})
export class CatalogosService {
  private readonly apiUrl = 'http://localhost:3000/api/v1/catalogos';

  constructor(private http: HttpClient) {}

  // ==========================================
  // CARRERAS (CU5)
  // ==========================================
  getCarreras(params?: {
    busqueda?: string;
    activo?: boolean;
    pagina?: number;
    limite?: number;
  }): Observable<PaginatedResponse<CarreraItem>> {
    let httpParams = new HttpParams();
    if (params?.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    if (params?.activo !== undefined) httpParams = httpParams.set('activo', String(params.activo));
    if (params?.pagina) httpParams = httpParams.set('pagina', String(params.pagina));
    if (params?.limite) httpParams = httpParams.set('limite', String(params.limite));

    return this.http.get<PaginatedResponse<CarreraItem>>(`${this.apiUrl}/carreras`, {
      params: httpParams,
    });
  }

  getCarrerasTodas(): Observable<CarreraItem[]> {
    return this.http.get<CarreraItem[]>(`${this.apiUrl}/carreras/todas`);
  }

  getCarrera(id: number): Observable<CarreraItem> {
    return this.http.get<CarreraItem>(`${this.apiUrl}/carreras/${id}`);
  }

  crearCarrera(payload: { codigo: string; nombre: string; activo?: boolean }): Observable<CarreraItem> {
    return this.http.post<CarreraItem>(`${this.apiUrl}/carreras`, payload);
  }

  actualizarCarrera(
    id: number,
    payload: { codigo?: string; nombre?: string; activo?: boolean },
  ): Observable<CarreraItem> {
    return this.http.put<CarreraItem>(`${this.apiUrl}/carreras/${id}`, payload);
  }

  cambiarEstadoCarrera(id: number, activo: boolean): Observable<CarreraItem> {
    return this.http.patch<CarreraItem>(`${this.apiUrl}/carreras/${id}/estado`, { activo });
  }

  eliminarCarrera(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/carreras/${id}`);
  }

  // ==========================================
  // MATERIAS (CU5)
  // ==========================================
  getMaterias(params?: {
    id_carrera?: number;
    busqueda?: string;
    activo?: boolean;
    semestre_nivel?: number;
    pagina?: number;
    limite?: number;
  }): Observable<PaginatedResponse<MateriaItem>> {
    let httpParams = new HttpParams();
    if (params?.id_carrera) httpParams = httpParams.set('id_carrera', String(params.id_carrera));
    if (params?.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    if (params?.activo !== undefined) httpParams = httpParams.set('activo', String(params.activo));
    if (params?.semestre_nivel !== undefined && params?.semestre_nivel !== null) {
      httpParams = httpParams.set('semestre', String(params.semestre_nivel));
      httpParams = httpParams.set('semestre_nivel', String(params.semestre_nivel));
    }
    if (params?.pagina) httpParams = httpParams.set('pagina', String(params.pagina));
    if (params?.limite) httpParams = httpParams.set('limite', String(params.limite));

    return this.http.get<PaginatedResponse<MateriaItem>>(`${this.apiUrl}/materias`, {
      params: httpParams,
    });
  }

  getMateria(id: number): Observable<MateriaItem> {
    return this.http.get<MateriaItem>(`${this.apiUrl}/materias/${id}`);
  }

  crearMateria(payload: {
    sigla: string;
    nombre: string;
    semestre_nivel: number;
    id_carrera: number;
    activo?: boolean;
  }): Observable<MateriaItem> {
    return this.http.post<MateriaItem>(`${this.apiUrl}/materias`, payload);
  }

  actualizarMateria(
    id: number,
    payload: {
      sigla?: string;
      nombre?: string;
      semestre_nivel?: number;
      id_carrera?: number;
      activo?: boolean;
    },
  ): Observable<MateriaItem> {
    return this.http.put<MateriaItem>(`${this.apiUrl}/materias/${id}`, payload);
  }

  cambiarEstadoMateria(id: number, activo: boolean): Observable<MateriaItem> {
    return this.http.patch<MateriaItem>(`${this.apiUrl}/materias/${id}/estado`, { activo });
  }

  eliminarMateria(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/materias/${id}`);
  }

  // ==========================================
  // HORARIOS OPERATIVOS (CU6)
  // ==========================================
  getHorarios(params?: {
    activo?: boolean;
    pagina?: number;
    limite?: number;
  }): Observable<PaginatedResponse<HorarioItem>> {
    let httpParams = new HttpParams();
    if (params?.activo !== undefined) httpParams = httpParams.set('activo', String(params.activo));
    if (params?.pagina) httpParams = httpParams.set('pagina', String(params.pagina));
    if (params?.limite) httpParams = httpParams.set('limite', String(params.limite));

    return this.http.get<PaginatedResponse<HorarioItem>>(`${this.apiUrl}/horarios`, {
      params: httpParams,
    });
  }

  getHorariosTodos(): Observable<HorarioItem[]> {
    return this.http.get<HorarioItem[]>(`${this.apiUrl}/horarios/todos`);
  }

  getHorario(id: number): Observable<HorarioItem> {
    return this.http.get<HorarioItem>(`${this.apiUrl}/horarios/${id}`);
  }

  crearHorario(payload: {
    turno: string;
    hora_inicio: string;
    hora_fin: string;
    activo?: boolean;
  }): Observable<HorarioItem> {
    return this.http.post<HorarioItem>(`${this.apiUrl}/horarios`, payload);
  }

  actualizarHorario(
    id: number,
    payload: {
      turno?: string;
      hora_inicio?: string;
      hora_fin?: string;
      activo?: boolean;
    },
  ): Observable<HorarioItem> {
    return this.http.put<HorarioItem>(`${this.apiUrl}/horarios/${id}`, payload);
  }

  cambiarEstadoHorario(id: number, activo: boolean): Observable<HorarioItem> {
    return this.http.patch<HorarioItem>(`${this.apiUrl}/horarios/${id}/estado`, { activo });
  }

  eliminarHorario(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/horarios/${id}`);
  }

  // ==========================================
  // MOTIVOS DE USO (CU6)
  // ==========================================
  getMotivos(params?: {
    tipo?: string;
    activo?: boolean;
    busqueda?: string;
    pagina?: number;
    limite?: number;
  }): Observable<PaginatedResponse<MotivoItem>> {
    let httpParams = new HttpParams();
    if (params?.tipo) httpParams = httpParams.set('tipo', params.tipo);
    if (params?.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    if (params?.activo !== undefined) httpParams = httpParams.set('activo', String(params.activo));
    if (params?.pagina) httpParams = httpParams.set('pagina', String(params.pagina));
    if (params?.limite) httpParams = httpParams.set('limite', String(params.limite));

    return this.http.get<PaginatedResponse<MotivoItem>>(`${this.apiUrl}/motivos`, {
      params: httpParams,
    });
  }

  getMotivosTodos(): Observable<MotivoItem[]> {
    return this.http.get<MotivoItem[]>(`${this.apiUrl}/motivos/todos`);
  }

  getMotivo(id: number): Observable<MotivoItem> {
    return this.http.get<MotivoItem>(`${this.apiUrl}/motivos/${id}`);
  }

  crearMotivo(payload: {
    descrip: string;
    tipo: string;
    activo?: boolean;
  }): Observable<MotivoItem> {
    return this.http.post<MotivoItem>(`${this.apiUrl}/motivos`, payload);
  }

  actualizarMotivo(
    id: number,
    payload: {
      descrip?: string;
      tipo?: string;
      activo?: boolean;
    },
  ): Observable<MotivoItem> {
    return this.http.put<MotivoItem>(`${this.apiUrl}/motivos/${id}`, payload);
  }

  cambiarEstadoMotivo(id: number, activo: boolean): Observable<MotivoItem> {
    return this.http.patch<MotivoItem>(`${this.apiUrl}/motivos/${id}/estado`, { activo });
  }

  eliminarMotivo(id: number): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/motivos/${id}`);
  }
}
