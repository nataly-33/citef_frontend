import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';

export interface DocenteSimple {
  codigo: string;
  id_usuario?: number;
  nombres?: string;
  apellidos?: string;
  correo?: string;
  departamento_academico?: string;
  usuario?: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
    correo_institucional: string;
  };
}

export interface MateriaSimple {
  id_materia: number;
  sigla: string;
  nombre: string;
}

export interface SalaSimple {
  id_sala: number;
  codigo_sala: string;
  nombre: string;
  piso: number;
  cant_estudiantes: number;
  estado_operativo: string;
  activo: boolean;
}

export interface ReservaSala {
  id_reserva: number;
  id_sala: number;
  codigo_docente: string;
  id_materia: number;
  id_usuario_administrador?: number | null;
  fecha_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  tema_practica: string;
  cant_estimada_alumnos: number;
  estado: 'PENDIENTE' | 'APROBADA' | 'EN_CURSO' | 'RECHAZADA' | 'CANCELADA' | 'FINALIZADA';
  tipo_reserva?: 'CLASE' | 'EXAMEN';
  editada?: boolean;
  notificacion_docente?: string | null;
  id_lote_recurrente?: string | null;
  id_grupo_multisala?: string | null;
  cant_total_alumnos?: number | null;
  salas_grupo?: Array<{
    id_sala: number;
    codigo_sala: string;
    nombre: string;
    capacidad: number;
    cant_asignada: number;
  }> | null;
  obs_resolucion?: string | null;
  creado_en: string;
  actualizado_en: string;
  sala?: SalaSimple;
  docente?: DocenteSimple;
  materia?: MateriaSimple;
  administrador?: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
    correo_institucional: string;
  } | null;
}

export interface SolicitarReservaDto {
  id_sala: number;
  ids_salas?: number[];
  codigo_docente: string;
  id_materia: number;
  fecha_reserva: string;
  hora_inicio: string;
  hora_fin: string;
  tema_practica: string;
  cant_estimada_alumnos: number;
  tipo_reserva?: 'CLASE' | 'EXAMEN';
  fecha_fin_semestre?: string;
  dias_semana?: number[];
}

export interface EditarReservaDto {
  id_sala?: number;
  ids_salas?: number[];
  fecha_reserva?: string;
  hora_inicio?: string;
  hora_fin?: string;
  tema_practica?: string;
  cant_estimada_alumnos?: number;
  tipo_reserva?: 'CLASE' | 'EXAMEN';
  obs_edicion?: string;
}

export interface ResponderReservaDto {
  accion: 'APROBAR' | 'RECHAZAR';
  obs_resolucion?: string;
  aprobar_todas_recurrentes?: boolean;
}

export interface ConsultarReservasFiltroDto {
  id_sala?: number;
  fecha_desde?: string;
  fecha_hasta?: string;
  estado?: string;
  codigo_docente?: string;
  busqueda?: string;
  pagina?: number;
  limite?: number;
}

export interface PaginacionReservas {
  data: ReservaSala[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface ResultadoValidacionDisponibilidad {
  disponible: boolean;
  mensaje: string;
  reservaConflicto?: {
    id_reserva: number;
    codigo_docente: string;
    docente_nombre?: string;
    materia_nombre?: string;
    hora_inicio: string;
    hora_fin: string;
    estado: string;
  };
}

@Injectable({
  providedIn: 'root',
})
export class ReservasService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/v1/reservas';
  private readonly wsUrl = 'http://localhost:3000/ws/reservas';
  private socket: Socket | null = null;
  private reservasActualizadasSubject = new Subject<any>();

  constructor() {
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

      this.socket.on('reservas_actualizadas', (data: any) => {
        this.reservasActualizadasSubject.next(data);
      });
    } catch {
      // Silencioso en caso de no disponibilidad temporal de red
    }
  }

  onReservasActualizadas(): Observable<any> {
    return this.reservasActualizadasSubject.asObservable();
  }

  /**
   * CU16: Solicitar nueva reserva de aula de cómputo
   */
  solicitar(dto: SolicitarReservaDto): Observable<ReservaSala> {
    return this.http.post<ReservaSala>(this.apiUrl, dto);
  }

  /**
   * Modificar / Editar reserva académica existente
   */
  editar(id: number, dto: EditarReservaDto): Observable<ReservaSala> {
    return this.http.patch<ReservaSala>(`${this.apiUrl}/${id}`, dto);
  }

  /**
   * CU17: Listado general paginado de reservas con filtros
   */
  listar(filtros: ConsultarReservasFiltroDto): Observable<PaginacionReservas> {
    let params = new HttpParams();
    if (filtros.id_sala) params = params.set('id_sala', filtros.id_sala.toString());
    if (filtros.fecha_desde) params = params.set('fecha_desde', filtros.fecha_desde);
    if (filtros.fecha_hasta) params = params.set('fecha_hasta', filtros.fecha_hasta);
    if (filtros.estado) params = params.set('estado', filtros.estado);
    if (filtros.codigo_docente) params = params.set('codigo_docente', filtros.codigo_docente);
    if (filtros.busqueda) params = params.set('busqueda', filtros.busqueda);
    if (filtros.pagina) params = params.set('pagina', filtros.pagina.toString());
    if (filtros.limite) params = params.set('limite', filtros.limite.toString());

    return this.http.get<PaginacionReservas>(this.apiUrl, { params });
  }

  /**
   * CU17: Obtener reservas en rango de fechas para el calendario visual
   */
  obtenerParaCalendario(
    id_sala?: number,
    fecha_desde?: string,
    fecha_hasta?: string,
  ): Observable<ReservaSala[]> {
    let params = new HttpParams();
    if (id_sala) params = params.set('id_sala', id_sala.toString());
    if (fecha_desde) params = params.set('fecha_desde', fecha_desde);
    if (fecha_hasta) params = params.set('fecha_hasta', fecha_hasta);

    return this.http.get<ReservaSala[]>(`${this.apiUrl}/calendario`, { params });
  }

  /**
   * CU18: Validar no-solapamiento horario en tiempo real
   */
  validarDisponibilidad(
    id_sala: number,
    fecha: string,
    hora_inicio: string,
    hora_fin: string,
    cant_alumnos?: number,
    excluir_id?: number,
  ): Observable<ResultadoValidacionDisponibilidad> {
    let params = new HttpParams()
      .set('id_sala', id_sala.toString())
      .set('fecha', fecha)
      .set('hora_inicio', hora_inicio)
      .set('hora_fin', hora_fin);

    if (cant_alumnos) params = params.set('cant_alumnos', cant_alumnos.toString());
    if (excluir_id) params = params.set('excluir_id', excluir_id.toString());

    return this.http.get<ResultadoValidacionDisponibilidad>(
      `${this.apiUrl}/validar-disponibilidad`,
      { params },
    );
  }

  /**
   * Obtener detalle de una reserva por su ID
   */
  obtenerPorId(id: number): Observable<ReservaSala> {
    return this.http.get<ReservaSala>(`${this.apiUrl}/${id}`);
  }

  /**
   * CU20: Gestionar reserva por Jefatura (Aprobar / Rechazar)
   */
  gestionar(id: number, dto: ResponderReservaDto): Observable<ReservaSala> {
    return this.http.patch<ReservaSala>(`${this.apiUrl}/${id}/gestionar`, dto);
  }

  /**
   * Marcar notificación o aviso de modificación como leído
   */
  marcarLeida(id: number): Observable<ReservaSala> {
    return this.http.patch<ReservaSala>(`${this.apiUrl}/${id}/marcar-leida`, {});
  }

  /**
   * CU19: Cancelar reserva de sala
   */
  cancelar(id: number, motivo: string): Observable<ReservaSala> {
    return this.http.patch<ReservaSala>(`${this.apiUrl}/${id}/cancelar`, {
      motivo,
    });
  }
}
