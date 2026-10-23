import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

export interface EstudianteItem {
  registro: string;
  ci: string;
  nombres: string;
  apellidos: string;
  correo?: string | null;
  id_carrera: number;
  carrera?: { id_carrera: number; nombre: string; codigo: string };
  sancionado: boolean;
  motivo_sancion?: string | null;
}

export interface SesionActivaItem {
  id_asignacion: number;
  registro_estudiante: string;
  estudiante_nombres: string;
  carrera_nombre: string;
  motivo_descrip: string;
  auxiliar_nombre: string;
  fecha_hora_inicio: string;
  minutos_transcurridos: number;
  asignacion_automatica: boolean;
}

export interface ComputadoraOcupacionItem {
  id_computadora: number;
  codigo_equipo: string;
  posicion_fila: number;
  posicion_columna: number;
  estado_actual: 'DISPONIBLE' | 'OCUPADA' | 'RESERVADA' | 'EN_MANTENIMIENTO' | 'EN_CLASE';
  maquina_docente: boolean;
  ip_red?: string | null;
  horas_uso_acumuladas: number;
  perifericos_conteo: number;
  sesion_activa: SesionActivaItem | null;
}

export interface KpisSalaOcupacion {
  total_puestos: number;
  disponibles: number;
  ocupadas: number;
  reservadas: number;
  en_clase?: number;
  mantenimiento: number;
  porcentaje_ocupacion: number;
  saturada: boolean;
  cola_pendiente_conteo: number;
  wq_estimado_min: number;
}

export interface SalaOcupacionEstado {
  sala: {
    id_sala: number;
    codigo_sala: string;
    nombre: string;
    piso: number;
    cant_estudiantes: number;
    filas_cuadricula: number;
    columnas_cuadricula: number;
    estado_operativo: string;
  };
  kpis: KpisSalaOcupacion;
  computadoras: ComputadoraOcupacionItem[];
}

export interface ColaEsperaItem {
  id_cola: number;
  id_sala: number;
  registro_estudiante: string;
  estudiante: EstudianteItem;
  fecha_hora_llegada: string;
  tiempo_espera_estimado_min: number;
  tiempo_espera_real_min?: number | null;
  estado_cola: string;
}

export interface AsistenciaItem {
  id_asignacion: number;
  fecha_hora_inicio: string;
  fecha_hora_fin: string | null;
  minutos_permanencia: number | null;
  estado: string;
  asignacion_automatica: boolean;
  observaciones: string | null;
  computadora: {
    id_computadora: number;
    codigo_equipo: string;
  };
  sala: {
    id_sala: number;
    codigo_sala: string;
    nombre: string;
  };
  estudiante: {
    registro: string;
    ci: string;
    nombre_completo: string;
    carrera: string;
  };
  motivo: string;
  auxiliar: string;
}

export interface RespuestaAsistencias {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  data: AsistenciaItem[];
}

export interface FiltroAsistenciasDto {
  id_sala?: number;
  id_carrera?: number;
  id_motivo?: number;
  fecha_inicio?: string;
  fecha_fin?: string;
  termino?: string;
  estado?: string;
  page?: number;
  limit?: number;
}

@Injectable({
  providedIn: 'root',
})
export class OcupacionService {
  private readonly apiUrl = 'http://localhost:3000/api/v1/ocupacion';
  private readonly wsUrl = 'http://localhost:3000/ws/ocupacion';
  private socket: Socket | null = null;
  private estadoSalaSubject = new Subject<SalaOcupacionEstado>();
  private socketConectadoSubject = new Subject<boolean>();

  constructor(private http: HttpClient) {
    this.iniciarSocket();
  }

  // ================= WEBSOCKET EN VIVO =================
  private iniciarSocket() {
    try {
      this.socket = io(this.wsUrl, {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 2000,
      });

      this.socket.on('connect', () => {
        this.socketConectadoSubject.next(true);
      });

      this.socket.on('disconnect', () => {
        this.socketConectadoSubject.next(false);
      });

      this.socket.on('estado_sala_actualizado', (data: SalaOcupacionEstado) => {
        this.estadoSalaSubject.next(data);
      });
    } catch {
      this.socketConectadoSubject.next(false);
    }
  }

  suscribirSala(idSala: number) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('suscribir_sala', { id_sala: idSala });
    }
  }

  desuscribirSala(idSala: number) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('desuscribir_sala', { id_sala: idSala });
    }
  }

  onEstadoSalaActualizado(): Observable<SalaOcupacionEstado> {
    return this.estadoSalaSubject.asObservable();
  }

  onSocketConectado(): Observable<boolean> {
    return this.socketConectadoSubject.asObservable();
  }

  // ================= ENDPOINTS REST =================
  obtenerEstadoSala(idSala: number): Observable<SalaOcupacionEstado> {
    return this.http.get<SalaOcupacionEstado>(`${this.apiUrl}/salas/${idSala}`);
  }

  sugerirEquipoBalanceado(idSala: number): Observable<{ equipo: ComputadoraOcupacionItem | null }> {
    return this.http.get<{ equipo: ComputadoraOcupacionItem | null }>(
      `${this.apiUrl}/salas/${idSala}/sugerir-equipo`,
    );
  }

  asignarEquipo(payload: {
    id_sala: number;
    id_computadora?: number;
    registro_estudiante: string;
    id_motivo: number;
    asignacion_automatica?: boolean;
    observaciones?: string;
  }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/asignar`, payload);
  }

  liberarEquipo(payload: { id_computadora: number; observaciones?: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/liberar`, payload);
  }

  buscarEstudiantePorRegistro(registro: string): Observable<{
    estudiante: EstudianteItem;
    sesion_activa: any | null;
    sancionado: boolean;
    motivo_sancion?: string | null;
  }> {
    return this.http.get<any>(`${this.apiUrl}/estudiantes/${encodeURIComponent(registro)}`);
  }

  autocompletarEstudiantes(termino: string): Observable<EstudianteItem[]> {
    return this.http.get<EstudianteItem[]>(`${this.apiUrl}/estudiantes/buscar`, {
      params: { termino },
    });
  }

  registrarEstudiante(payload: {
    registro: string;
    ci: string;
    nombres: string;
    apellidos: string;
    correo?: string;
    id_carrera: number;
  }): Observable<EstudianteItem> {
    return this.http.post<EstudianteItem>(`${this.apiUrl}/estudiantes`, payload);
  }

  obtenerColaSala(idSala: number): Observable<ColaEsperaItem[]> {
    return this.http.get<ColaEsperaItem[]>(`${this.apiUrl}/salas/${idSala}/cola`);
  }

  encolarEstudiante(payload: { id_sala: number; registro_estudiante: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/cola`, payload);
  }

  cancelarTurnoCola(idCola: number): Observable<any> {
    return this.http.delete<any>(`${this.apiUrl}/cola/${idCola}`);
  }

  consultarAsistencias(filtro: FiltroAsistenciasDto): Observable<RespuestaAsistencias> {
    let params = new HttpParams();
    if (filtro.id_sala) params = params.set('id_sala', String(filtro.id_sala));
    if (filtro.id_carrera) params = params.set('id_carrera', String(filtro.id_carrera));
    if (filtro.id_motivo) params = params.set('id_motivo', String(filtro.id_motivo));
    if (filtro.fecha_inicio) params = params.set('fecha_inicio', filtro.fecha_inicio);
    if (filtro.fecha_fin) params = params.set('fecha_fin', filtro.fecha_fin);
    if (filtro.termino) params = params.set('termino', filtro.termino);
    if (filtro.estado) params = params.set('estado', filtro.estado);
    if (filtro.page) params = params.set('page', String(filtro.page));
    if (filtro.limit) params = params.set('limit', String(filtro.limit));

    return this.http.get<RespuestaAsistencias>(`${this.apiUrl}/asistencias`, { params });
  }

  descargarReporteCsv(filtro: FiltroAsistenciasDto): void {
    let params = new HttpParams();
    if (filtro.id_sala) params = params.set('id_sala', String(filtro.id_sala));
    if (filtro.id_carrera) params = params.set('id_carrera', String(filtro.id_carrera));
    if (filtro.id_motivo) params = params.set('id_motivo', String(filtro.id_motivo));
    if (filtro.fecha_inicio) params = params.set('fecha_inicio', filtro.fecha_inicio);
    if (filtro.fecha_fin) params = params.set('fecha_fin', filtro.fecha_fin);
    if (filtro.termino) params = params.set('termino', filtro.termino);
    if (filtro.estado) params = params.set('estado', filtro.estado);

    const url = `${this.apiUrl}/asistencias/exportar?${params.toString()}`;
    window.open(url, '_blank');
  }

  liberarSalaPorCatedra(idSala: number, motivo?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/salas/${idSala}/liberar-por-catedra`, { motivo });
  }

  finalizarCatedra(idSala: number, motivo?: string): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/salas/${idSala}/finalizar-catedra`, { motivo });
  }
}
