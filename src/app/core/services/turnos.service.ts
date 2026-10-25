import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ChecklistApertura {
  luces: boolean;
  orden_limpieza: boolean;
  aire_acondicionado: boolean;
  proyector: boolean;
  pcs_encendidas: number;
  observaciones?: string;
}

export interface ChecklistCierre {
  luces_apagadas: boolean;
  aire_apagado: boolean;
  orden_verificado: boolean;
  proyector_apagado: boolean;
  pcs_apagadas: boolean;
  observaciones?: string;
}

export interface JornadaTurno {
  id_jornada: number;
  id_usuario_auxiliar: number;
  id_sala: number;
  id_asignar_turno?: number | null;
  fecha: string;
  hora_apertura: string;
  hora_cierre?: string | null;
  checklist_apertura: ChecklistApertura;
  checklist_cierre?: ChecklistCierre | null;
  cant_estudiantes_atendidos: number;
  cant_averias_reportadas: number;
  cant_objetos_custodiados: number;
  obs_cierre?: string | null;
  estado: 'EN_CURSO' | 'CERRADO_NORMAL' | 'CERRADO_CON_NOVEDADES' | 'RELEVADO';
  sala?: {
    id_sala: number;
    codigo_sala: string;
    nombre: string;
  };
  usuario_auxiliar?: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
    correo_institucional?: string;
  };
}

export interface ActaRelevo {
  id_acta_relevo: number;
  id_jornada_saliente: number;
  id_usuario_saliente: number;
  id_usuario_entrante: number;
  fecha_hora_relevo: string;
  cant_equipos_operativos: number;
  cant_averias_pend: number;
  cant_objetos_custodia: number;
  novedades?: string;
  aceptado_por_entrante: boolean;
  fecha_hora_conformidad?: string | null;
  obs_discrepancia?: string | null;
  usuario_saliente?: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
    correo_institucional?: string;
  };
  usuario_entrante?: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
    correo_institucional?: string;
  };
  jornada_saliente?: JornadaTurno;
}

export interface AveriaEquipo {
  id_averia: number;
  id_computadora: number;
  id_sala: number;
  id_usuario_reporta: number;
  registro_ultimo_estudiante?: string | null;
  id_reserva?: number | null;
  id_jornada?: number | null;
  tipo_falla: 'HARDWARE' | 'SOFTWARE' | 'RED' | 'PERIFERICO';
  descrip_falla: string;
  gravedad: 'BAJA' | 'MEDIA' | 'CRITICA';
  estado: 'PENDIENTE_REVISION' | 'EN_TALLER' | 'REPARADO' | 'DESCARTADO';
  fecha_reporte: string;
  solucion_tecnica?: string | null;
  fecha_solucion?: string | null;
  computadora?: {
    id_computadora: number;
    codigo_equipo: string;
  };
  sala?: {
    id_sala: number;
    codigo_sala: string;
    nombre: string;
  };
  usuario_reporta?: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
  };
  estudiante?: {
    registro: string;
    nombres: string;
    apellidos: string;
  };
}

export interface ObjetoExtraviado {
  id_objeto: number;
  id_sala: number;
  id_jornada_hallazgo?: number | null;
  id_usuario_registro: number;
  categoria: 'ELECTRONICA' | 'DOCUMENTO' | 'PRENDA' | 'MATERIAL_ESTUDIO' | 'OTRO';
  descrip_detallada: string;
  lugar_exacto: string;
  fecha_hora_hallazgo: string;
  estado: 'BAJO_CUSTODIA' | 'DEVUELTO' | 'DONADO_ARCHIVO';
  registro_estudiante_receptor?: string | null;
  nombre_estudiante_receptor?: string | null;
  id_usuario_entrega?: number | null;
  fecha_hora_devolucion?: string | null;
  obs_devolucion?: string | null;
  sala?: {
    id_sala: number;
    codigo_sala: string;
    nombre: string;
  };
  usuario_registro?: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
  };
  usuario_entrega?: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
  };
  estudiante_receptor?: {
    registro: string;
    nombres: string;
    apellidos: string;
    carrera?: string;
  };
}

export interface UltimoUsuarioComputadoraResponse {
  id_computadora: number;
  codigo_equipo: string;
  ultimo_estudiante?: {
    registro: string;
    nombres: string;
    apellidos: string;
    hora_inicio?: string;
    hora_fin?: string;
  } | null;
  reserva_reciente?: {
    id_reserva: number;
    codigo_docente: string;
    docente_nombre: string;
    materia_nombre: string;
    fecha: string;
    hora_inicio: string;
    hora_fin: string;
  } | null;
}

export interface PaginacionJornadas {
  data: JornadaTurno[];
  items?: JornadaTurno[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface PaginacionActas {
  data: ActaRelevo[];
  items?: ActaRelevo[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface PaginacionAverias {
  data: AveriaEquipo[];
  items?: AveriaEquipo[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface PaginacionObjetos {
  data: ObjetoExtraviado[];
  items?: ObjetoExtraviado[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface AbrirTurnoDto {
  id_sala: number;
  checklist_apertura: ChecklistApertura;
}

export interface CerrarTurnoDto {
  checklist_cierre: ChecklistCierre;
  obs_cierre?: string;
  id_usuario_entrante?: number;
}

export interface CrearActaRelevoDto {
  id_usuario_entrante: number;
  cant_equipos_operativos?: number;
  novedades?: string;
}

export interface FirmarActaDto {
  obs_discrepancia?: string;
  conforme?: boolean;
  aceptado?: boolean;
}

export interface ReportarAveriaDto {
  id_computadora: number;
  id_sala: number;
  tipo_falla: 'HARDWARE' | 'SOFTWARE' | 'RED' | 'PERIFERICO';
  descrip_falla: string;
  gravedad: 'BAJA' | 'MEDIA' | 'CRITICA';
  registro_ultimo_estudiante?: string;
  id_reserva?: number;
}

export interface RegistrarObjetoDto {
  id_sala: number;
  categoria: 'ELECTRONICA' | 'DOCUMENTO' | 'PRENDA' | 'MATERIAL_ESTUDIO' | 'OTRO';
  descrip_detallada: string;
  lugar_exacto: string;
}

export interface DevolverObjetoDto {
  registro_estudiante_receptor: string;
  nombre_estudiante_receptor?: string;
  obs_devolucion?: string;
}

export interface SalaDashboardItem {
  id_sala: number;
  codigo_sala: string;
  nombre: string;
  piso: number;
  cant_estudiantes: number;
  estado_operativo: string;
  guardia_activa: boolean;
  jornada: {
    id_jornada: number;
    hora_apertura: string;
    auxiliar?: {
      id_usuario: number;
      nombres: string;
      apellidos: string;
      correo?: string;
    };
    cant_estudiantes_atendidos: number;
    cant_averias_reportadas: number;
    cant_objetos_custodiados: number;
  } | null;
}

export interface AuxiliarParaRelevo {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  correo_institucional?: string;
}

@Injectable({
  providedIn: 'root',
})
export class TurnosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/v1/turnos';

  // ===================== CU21: TURNOS Y GUARDIAS =====================

  abrirTurno(payload: AbrirTurnoDto): Observable<JornadaTurno> {
    return this.http.post<JornadaTurno>(`${this.apiUrl}/apertura`, payload);
  }

  cerrarTurno(idJornada: number, payload: CerrarTurnoDto): Observable<JornadaTurno> {
    return this.http.post<JornadaTurno>(`${this.apiUrl}/${idJornada}/cierre`, payload);
  }

  getJornadaActiva(): Observable<JornadaTurno | null> {
    return this.http.get<JornadaTurno | null>(`${this.apiUrl}/activa`);
  }

  getDashboardSalas(): Observable<SalaDashboardItem[]> {
    return this.http.get<SalaDashboardItem[]>(`${this.apiUrl}/dashboard-salas`);
  }

  getAuxiliaresParaRelevo(): Observable<AuxiliarParaRelevo[]> {
    return this.http.get<AuxiliarParaRelevo[]>(`${this.apiUrl}/auxiliares`);
  }

  getJornadas(params?: {
    pagina?: number;
    limite?: number;
    fecha?: string;
    id_sala?: number;
    estado?: string;
    busqueda?: string;
  }): Observable<PaginacionJornadas> {
    let httpParams = new HttpParams();
    if (params?.pagina) {
      httpParams = httpParams.set('page', params.pagina.toString()).set('pagina', params.pagina.toString());
    }
    if (params?.limite) {
      httpParams = httpParams.set('limit', params.limite.toString()).set('limite', params.limite.toString());
    }
    if (params?.fecha) httpParams = httpParams.set('fecha', params.fecha);
    if (params?.id_sala) httpParams = httpParams.set('id_sala', params.id_sala.toString());
    if (params?.estado && params.estado !== 'TODOS') httpParams = httpParams.set('estado', params.estado);
    if (params?.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);

    return this.http.get<PaginacionJornadas>(`${this.apiUrl}/jornadas`, { params: httpParams });
  }

  actualizarObservacionJornada(idJornada: number, obs: string): Observable<JornadaTurno> {
    return this.http.patch<JornadaTurno>(`${this.apiUrl}/${idJornada}/observaciones`, { obs });
  }

  eliminarJornada(idJornada: number): Observable<{ success: boolean; mensaje: string }> {
    return this.http.delete<{ success: boolean; mensaje: string }>(`${this.apiUrl}/${idJornada}`);
  }

  // ===================== CU21: ACTAS DE RELEVO =====================

  crearActaRelevo(idJornada: number, payload: CrearActaRelevoDto): Observable<ActaRelevo> {
    return this.http.post<ActaRelevo>(`${this.apiUrl}/${idJornada}/acta-relevo`, payload);
  }

  firmarActaRelevo(idActa: number, payload: FirmarActaDto): Observable<ActaRelevo> {
    return this.http.post<ActaRelevo>(`${this.apiUrl}/actas/${idActa}/firmar`, payload);
  }

  getActas(params?: {
    pagina?: number;
    limite?: number;
    id_sala?: number;
    fecha?: string;
    solo_pendientes_firma?: boolean;
    busqueda?: string;
  }): Observable<PaginacionActas> {
    let httpParams = new HttpParams();
    if (params?.pagina) {
      httpParams = httpParams.set('page', params.pagina.toString()).set('pagina', params.pagina.toString());
    }
    if (params?.limite) {
      httpParams = httpParams.set('limit', params.limite.toString()).set('limite', params.limite.toString());
    }
    if (params?.id_sala) httpParams = httpParams.set('id_sala', params.id_sala.toString());
    if (params?.fecha) httpParams = httpParams.set('fecha', params.fecha);
    if (params?.solo_pendientes_firma) httpParams = httpParams.set('solo_pendientes_firma', 'true');
    if (params?.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);

    return this.http.get<PaginacionActas>(`${this.apiUrl}/actas`, { params: httpParams });
  }

  getActaById(idActa: number): Observable<ActaRelevo> {
    return this.http.get<ActaRelevo>(`${this.apiUrl}/actas/${idActa}`);
  }

  actualizarActa(idActa: number, payload: Partial<ActaRelevo>): Observable<ActaRelevo> {
    return this.http.patch<ActaRelevo>(`${this.apiUrl}/actas/${idActa}`, payload);
  }

  eliminarActa(idActa: number): Observable<{ success: boolean; mensaje: string }> {
    return this.http.delete<{ success: boolean; mensaje: string }>(`${this.apiUrl}/actas/${idActa}`);
  }

  // ===================== CU22: AVERÍAS TÉCNICAS =====================

  reportarAveria(payload: ReportarAveriaDto): Observable<AveriaEquipo> {
    return this.http.post<AveriaEquipo>(`${this.apiUrl}/averias`, payload);
  }

  getAverias(params?: {
    pagina?: number;
    limite?: number;
    id_sala?: number;
    gravedad?: string;
    estado?: string;
    busqueda?: string;
  }): Observable<PaginacionAverias> {
    let httpParams = new HttpParams();
    if (params?.pagina) {
      httpParams = httpParams.set('page', params.pagina.toString()).set('pagina', params.pagina.toString());
    }
    if (params?.limite) {
      httpParams = httpParams.set('limit', params.limite.toString()).set('limite', params.limite.toString());
    }
    if (params?.id_sala) httpParams = httpParams.set('id_sala', params.id_sala.toString());
    if (params?.gravedad && params.gravedad !== 'TODOS') httpParams = httpParams.set('gravedad', params.gravedad);
    if (params?.estado && params.estado !== 'TODOS') httpParams = httpParams.set('estado', params.estado);
    if (params?.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);

    return this.http.get<PaginacionAverias>(`${this.apiUrl}/averias`, { params: httpParams });
  }

  getAveriaById(id: number): Observable<AveriaEquipo> {
    return this.http.get<AveriaEquipo>(`${this.apiUrl}/averias/${id}`);
  }

  cambiarEstadoAveria(
    id: number,
    payload: { estado: string; solucion_tecnica?: string },
  ): Observable<AveriaEquipo> {
    return this.http.patch<AveriaEquipo>(`${this.apiUrl}/averias/${id}/estado`, payload);
  }

  actualizarAveria(id: number, payload: Partial<AveriaEquipo>): Observable<AveriaEquipo> {
    return this.http.put<AveriaEquipo>(`${this.apiUrl}/averias/${id}`, payload);
  }

  eliminarAveria(id: number): Observable<{ success: boolean; mensaje: string }> {
    return this.http.delete<{ success: boolean; mensaje: string }>(`${this.apiUrl}/averias/${id}`);
  }

  getUltimoUsuarioComputadora(idComputadora: number): Observable<UltimoUsuarioComputadoraResponse> {
    return this.http.get<UltimoUsuarioComputadoraResponse>(
      `${this.apiUrl}/averias/ultimo-usuario/${idComputadora}`,
    );
  }

  // ===================== CU23: OBJETOS EXTRAVIADOS =====================

  registrarObjeto(payload: RegistrarObjetoDto): Observable<ObjetoExtraviado> {
    return this.http.post<ObjetoExtraviado>(`${this.apiUrl}/objetos`, payload);
  }

  devolverObjeto(id: number, payload: DevolverObjetoDto): Observable<ObjetoExtraviado> {
    return this.http.post<ObjetoExtraviado>(`${this.apiUrl}/objetos/${id}/devolver`, payload);
  }

  getObjetos(params?: {
    pagina?: number;
    limite?: number;
    categoria?: string;
    estado?: string;
    busqueda?: string;
    id_sala?: number;
  }): Observable<PaginacionObjetos> {
    let httpParams = new HttpParams();
    if (params?.pagina) {
      httpParams = httpParams.set('page', params.pagina.toString()).set('pagina', params.pagina.toString());
    }
    if (params?.limite) {
      httpParams = httpParams.set('limit', params.limite.toString()).set('limite', params.limite.toString());
    }
    if (params?.categoria && params.categoria !== 'TODOS') httpParams = httpParams.set('categoria', params.categoria);
    if (params?.estado && params.estado !== 'TODOS') httpParams = httpParams.set('estado', params.estado);
    if (params?.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    if (params?.id_sala) httpParams = httpParams.set('id_sala', params.id_sala.toString());

    return this.http.get<PaginacionObjetos>(`${this.apiUrl}/objetos`, { params: httpParams });
  }

  getObjetoById(id: number): Observable<ObjetoExtraviado> {
    return this.http.get<ObjetoExtraviado>(`${this.apiUrl}/objetos/${id}`);
  }

  actualizarObjeto(id: number, payload: Partial<ObjetoExtraviado>): Observable<ObjetoExtraviado> {
    return this.http.put<ObjetoExtraviado>(`${this.apiUrl}/objetos/${id}`, payload);
  }

  eliminarObjeto(id: number): Observable<{ success: boolean; mensaje: string }> {
    return this.http.delete<{ success: boolean; mensaje: string }>(`${this.apiUrl}/objetos/${id}`);
  }
}
