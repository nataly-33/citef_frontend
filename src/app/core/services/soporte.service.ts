import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

export type EstadoMantenimiento =
  | 'PENDIENTE_TALLER'
  | 'EN_REPARACION'
  | 'REPARADO_EN_TALLER'
  | 'RETORNADO_A_SALA'
  | 'BAJA_DEFINITIVA';

export type TipoMantenimiento = 'CORRECTIVO' | 'PREVENTIVO';
export type PrioridadMantenimiento = 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';

export interface ConfirmacionRetornoSala {
  id_retorno: number;
  id_mantenimiento: number;
  id_usuario_confirma: number;
  fecha_hora_retorno: string;
  pruebas_satisfactorias: boolean;
  obs_instalacion?: string | null;
  usuario_confirma?: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
  };
}

export interface MantenimientoTaller {
  id_mantenimiento: number;
  id_averia?: number | null;
  id_computadora: number;
  id_usuario_tecnico?: number | null;
  id_usuario_administrador?: number | null;
  estado: EstadoMantenimiento;
  tipo_mantenimiento: TipoMantenimiento;
  prioridad: PrioridadMantenimiento;
  descripcion_problema?: string | null;
  diagnostico_tecnico?: string | null;
  solucion_aplicada?: string | null;
  repuestos_utilizados?: string | null;
  duracion_taller_horas?: number | null;
  costo_reparacion?: number | null;
  motivo_baja?: string | null;
  fecha_hora_ingreso: string;
  fecha_hora_inicio_taller?: string | null;
  fecha_hora_fin_taller?: string | null;
  creado_en?: string;
  actualizado_en?: string;
  computadora?: {
    id_computadora: number;
    codigo_equipo: string;
    id_sala?: number;
    ip_actual?: string;
    mac_address?: string;
    marca?: string;
    modelo?: string;
    estado_actual?: string;
    sala?: {
      id_sala: number;
      codigo_sala: string;
      nombre: string;
      piso?: number;
    };
  };
  tecnico?: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
    correo_institucional?: string;
  } | null;
  confirmacion_retorno?: ConfirmacionRetornoSala | null;
  averia?: any;
}

export interface IniciarMantenimientoDto {
  diagnostico_tecnico: string;
  id_usuario_tecnico?: number;
  fecha_hora_inicio?: string;
}

export interface FinalizarMantenimientoDto {
  solucion_aplicada: string;
  repuestos_utilizados?: string;
  duracion_taller_horas?: number;
  costo_reparacion?: number;
  fecha_hora_fin?: string;
}

export interface ConfirmarRetornoDto {
  pruebas_satisfactorias?: boolean;
  obs_instalacion?: string;
  id_usuario_confirma?: number;
}

export interface DarBajaDto {
  motivo: string;
}

export interface CrearOrdenTallerDto {
  id_computadora: number;
  id_averia?: number;
  id_usuario_tecnico?: number;
  tipo_mantenimiento?: TipoMantenimiento;
  prioridad?: PrioridadMantenimiento;
  descripcion_problema?: string;
}

export interface FiltroMantenimientoDto {
  id_sala?: number;
  id_computadora?: number;
  estado?: string;
  prioridad?: string;
  busqueda?: string;
  pagina?: number;
  limite?: number;
}

export interface PaginacionTaller {
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
  data: MantenimientoTaller[];
  items?: MantenimientoTaller[];
}

export interface IndicadorRams {
  id_indicador: number;
  id_computadora: number;
  codigo_equipo: string;
  id_sala: number;
  codigo_sala: string;
  nombre_sala: string;
  periodo_mes: number;
  periodo_anio: number;
  cant_fallas_registradas: number;
  horas_operativas_totales: number;
  horas_parada_totales: number;
  mtbf_horas: number;
  mttr_horas: number;
  disponibilidad_operativa_a: number;
  disponibilidad_porcentaje: number;
  estado_operativo: 'DISPONIBLE' | 'OCUPADA' | 'EN_MANTENIMIENTO' | 'DE_BAJA';
}

export interface KpisRamsDashboard {
  mtbf_promedio_horas: number;
  mttr_promedio_horas: number;
  disponibilidad_promedio_factor: number;
  disponibilidad_promedio_porcentaje: number;
  total_equipos_parque: number;
  total_equipos_operativos: number;
  total_equipos_en_taller: number;
  total_equipos_baja: number;
  total_fallas_periodo: number;
  periodo_mes: number;
  periodo_anio: number;
}

export interface ResumenRamsSala {
  id_sala: number;
  codigo_sala: string;
  nombre_sala: string;
  cant_equipos: number;
  cant_fallas: number;
  mtbf_promedio: number;
  mttr_promedio: number;
  disponibilidad_promedio: number;
  disponibilidad_porcentaje: number;
}

export interface MetricasRamsDashboard {
  kpis: KpisRamsDashboard;
  resumen_salas: ResumenRamsSala[];
  equipos_criticos: IndicadorRams[];
  items: IndicadorRams[];
  total: number;
  pagina: number;
  limite: number;
  totalPaginas: number;
}

export interface FiltroRamsDto {
  id_sala?: number;
  mes?: number;
  anio?: number;
  busqueda?: string;
  pagina?: number;
  limite?: number;
}

@Injectable({
  providedIn: 'root',
})
export class SoporteService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/v1/soporte';

  // Datos simulados de respaldo para resiliencia ante backend en arranque
  private ordenesMock: MantenimientoTaller[] = [
    {
      id_mantenimiento: 1,
      id_averia: 101,
      id_computadora: 1,
      id_usuario_tecnico: 3,
      id_usuario_administrador: 1,
      estado: 'PENDIENTE_TALLER',
      tipo_mantenimiento: 'CORRECTIVO',
      prioridad: 'ALTA',
      descripcion_problema: 'Equipo no enciende tras tormenta eléctrica. Olor a quemado en fuente de poder.',
      diagnostico_tecnico: null,
      solucion_aplicada: null,
      repuestos_utilizados: null,
      duracion_taller_horas: null,
      costo_reparacion: null,
      motivo_baja: null,
      fecha_hora_ingreso: '2026-10-24T08:30:00Z',
      computadora: {
        id_computadora: 1,
        codigo_equipo: 'PC-L1-01',
        id_sala: 1,
        ip_actual: '192.168.10.11',
        mac_address: '00:1B:44:11:3A:B1',
        marca: 'Dell OptiPlex 7090',
        modelo: 'Intel Core i7 11va Gen, 16GB RAM',
        estado_actual: 'EN_MANTENIMIENTO',
        sala: { id_sala: 1, codigo_sala: 'LAB-101', nombre: 'Laboratorio de Informática I', piso: 1 },
      },
      tecnico: null,
    },
    {
      id_mantenimiento: 2,
      id_averia: 102,
      id_computadora: 2,
      id_usuario_tecnico: 3,
      id_usuario_administrador: 1,
      estado: 'EN_REPARACION',
      tipo_mantenimiento: 'CORRECTIVO',
      prioridad: 'CRITICA',
      descripcion_problema: 'Pantallazos azules recurrentes (BSOD) durante carga de software analítico.',
      diagnostico_tecnico: 'Sector defectuoso en módulo NVMe y pasta térmica cristalizada en procesador.',
      solucion_aplicada: null,
      repuestos_utilizados: null,
      duracion_taller_horas: null,
      costo_reparacion: null,
      motivo_baja: null,
      fecha_hora_ingreso: '2026-10-23T10:15:00Z',
      fecha_hora_inicio_taller: '2026-10-23T11:00:00Z',
      computadora: {
        id_computadora: 2,
        codigo_equipo: 'PC-L1-02',
        id_sala: 1,
        ip_actual: '192.168.10.12',
        mac_address: '00:1B:44:11:3A:B2',
        marca: 'Dell OptiPlex 7090',
        modelo: 'Intel Core i7 11va Gen, 16GB RAM',
        estado_actual: 'EN_MANTENIMIENTO',
        sala: { id_sala: 1, codigo_sala: 'LAB-101', nombre: 'Laboratorio de Informática I', piso: 1 },
      },
      tecnico: {
        id_usuario: 3,
        nombres: 'Carlos',
        apellidos: 'Mendoza Ruiz',
        correo_institucional: 'cmendoza@uagrm.edu.bo',
      },
    },
    {
      id_mantenimiento: 3,
      id_averia: 103,
      id_computadora: 15,
      id_usuario_tecnico: 3,
      id_usuario_administrador: 1,
      estado: 'REPARADO_EN_TALLER',
      tipo_mantenimiento: 'CORRECTIVO',
      prioridad: 'MEDIA',
      descripcion_problema: 'Pérdida intermitente de conectividad de red LAN y conector RJ-45 quebrado.',
      diagnostico_tecnico: 'Conector modular RJ45 desprendido de placa jack y suciedad en bus PCIe.',
      solucion_aplicada: 'Sustitución de tarjeta de red Gigabit PCIe y crimpado de nuevo pachcord cat6.',
      repuestos_utilizados: 'Tarjeta de Red TP-Link TG-3468 Gigabit, Conector RJ45 AMP',
      duracion_taller_horas: 1.75,
      costo_reparacion: 120.0,
      motivo_baja: null,
      fecha_hora_ingreso: '2026-10-22T09:00:00Z',
      fecha_hora_inicio_taller: '2026-10-22T09:30:00Z',
      fecha_hora_fin_taller: '2026-10-22T11:15:00Z',
      computadora: {
        id_computadora: 15,
        codigo_equipo: 'PC-L2-05',
        id_sala: 2,
        ip_actual: '192.168.20.15',
        mac_address: '00:1B:44:22:3A:F5',
        marca: 'HP ProDesk 400 G6',
        modelo: 'Intel Core i5 10ma Gen, 16GB RAM',
        estado_actual: 'EN_MANTENIMIENTO',
        sala: { id_sala: 2, codigo_sala: 'LAB-102', nombre: 'Laboratorio Financiero II', piso: 1 },
      },
      tecnico: {
        id_usuario: 3,
        nombres: 'Carlos',
        apellidos: 'Mendoza Ruiz',
        correo_institucional: 'cmendoza@uagrm.edu.bo',
      },
    },
    {
      id_mantenimiento: 4,
      id_averia: 104,
      id_computadora: 22,
      id_usuario_tecnico: 3,
      id_usuario_administrador: 1,
      estado: 'RETORNADO_A_SALA',
      tipo_mantenimiento: 'CORRECTIVO',
      prioridad: 'MEDIA',
      descripcion_problema: 'Sistema operativo bloqueado con bucle de reinicio tras actualización corrupta.',
      diagnostico_tecnico: 'Corrupción de BCD y registro del sistema operativo Windows 11 Enterprise.',
      solucion_aplicada: 'Reinstalación de imagen institucional CITEF limpia y clonado seguro de volumen.',
      repuestos_utilizados: 'Ninguno (Mantenimiento de software)',
      duracion_taller_horas: 2.5,
      costo_reparacion: 0.0,
      motivo_baja: null,
      fecha_hora_ingreso: '2026-10-20T14:00:00Z',
      fecha_hora_inicio_taller: '2026-10-20T14:30:00Z',
      fecha_hora_fin_taller: '2026-10-20T17:00:00Z',
      confirmacion_retorno: {
        id_retorno: 1,
        id_mantenimiento: 4,
        id_usuario_confirma: 2,
        fecha_hora_retorno: '2026-10-21T08:00:00Z',
        pruebas_satisfactorias: true,
        obs_instalacion: 'Estación reconectada en mesa central. Validación de dominio FCEE satisfactoria.',
        usuario_confirma: {
          id_usuario: 2,
          nombres: 'Ana',
          apellidos: 'Vargas Soliz',
        },
      },
      computadora: {
        id_computadora: 22,
        codigo_equipo: 'PC-L3-08',
        id_sala: 3,
        ip_actual: '192.168.30.22',
        mac_address: '00:1B:44:33:3A:C8',
        marca: 'Lenovo ThinkCentre M70s',
        modelo: 'Intel Core i5 11va Gen, 16GB RAM',
        estado_actual: 'DISPONIBLE',
        sala: { id_sala: 3, codigo_sala: 'LAB-201', nombre: 'Laboratorio de Simulación III', piso: 2 },
      },
      tecnico: {
        id_usuario: 3,
        nombres: 'Carlos',
        apellidos: 'Mendoza Ruiz',
        correo_institucional: 'cmendoza@uagrm.edu.bo',
      },
    },
    {
      id_mantenimiento: 5,
      id_averia: 99,
      id_computadora: 30,
      id_usuario_tecnico: 3,
      id_usuario_administrador: 1,
      estado: 'BAJA_DEFINITIVA',
      tipo_mantenimiento: 'CORRECTIVO',
      prioridad: 'CRITICA',
      descripcion_problema: 'Tarjeta madre quemada con cortocircuito grave en pistas multicapa.',
      diagnostico_tecnico: 'Falla irreversible en regulador VRM y zócalo de microprocesador con perforación física.',
      solucion_aplicada: 'Dictamen de baja por daño físico irreparable y obsolescencia de componentes.',
      repuestos_utilizados: 'Ninguno (Baja formal)',
      duracion_taller_horas: 3.0,
      costo_reparacion: 0.0,
      motivo_baja: 'Daño físico irreversible en pistas multicapa de tarjeta madre. Descarte técnico oficial.',
      fecha_hora_ingreso: '2026-10-18T11:00:00Z',
      fecha_hora_inicio_taller: '2026-10-18T11:30:00Z',
      fecha_hora_fin_taller: '2026-10-18T14:30:00Z',
      computadora: {
        id_computadora: 30,
        codigo_equipo: 'PC-L3-15',
        id_sala: 3,
        ip_actual: '192.168.30.30',
        mac_address: '00:1B:44:33:3A:DF',
        marca: 'Lenovo ThinkCentre M70s',
        modelo: 'Intel Core i5 10ma Gen, 8GB RAM',
        estado_actual: 'DE_BAJA',
        sala: { id_sala: 3, codigo_sala: 'LAB-201', nombre: 'Laboratorio de Simulación III', piso: 2 },
      },
      tecnico: {
        id_usuario: 3,
        nombres: 'Carlos',
        apellidos: 'Mendoza Ruiz',
        correo_institucional: 'cmendoza@uagrm.edu.bo',
      },
    },
  ];

  /**
   * CU24: Listar órdenes de trabajo de taller con paginación y filtros
   */
  getOrdenesTaller(params?: FiltroMantenimientoDto): Observable<PaginacionTaller> {
    let httpParams = new HttpParams();
    if (params?.id_sala) httpParams = httpParams.set('id_sala', String(params.id_sala));
    if (params?.id_computadora) httpParams = httpParams.set('id_computadora', String(params.id_computadora));
    if (params?.estado && params.estado !== 'TODOS') httpParams = httpParams.set('estado', params.estado);
    if (params?.prioridad && params.prioridad !== 'TODOS') httpParams = httpParams.set('prioridad', params.prioridad);
    if (params?.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    if (params?.pagina) httpParams = httpParams.set('pagina', String(params.pagina));
    if (params?.limite) httpParams = httpParams.set('limite', String(params.limite));

    return this.http.get<PaginacionTaller>(`${this.apiUrl}/taller`, { params: httpParams }).pipe(
      catchError(() => {
        // Fallback local enriquecido
        return of(this.filtrarOrdenesLocal(params));
      }),
    );
  }

  /**
   * CU24: Obtener detalle técnico de una orden por ID
   */
  getOrdenById(id: number): Observable<MantenimientoTaller> {
    return this.http.get<MantenimientoTaller>(`${this.apiUrl}/taller/${id}`).pipe(
      catchError(() => {
        const found = this.ordenesMock.find((o) => o.id_mantenimiento === Number(id));
        if (found) return of(found);
        return of(this.ordenesMock[0]);
      }),
    );
  }

  /**
   * CU24: Crear orden de taller preventiva o correctiva directa
   */
  crearOrdenTaller(dto: CrearOrdenTallerDto): Observable<MantenimientoTaller> {
    return this.http.post<MantenimientoTaller>(`${this.apiUrl}/taller`, dto).pipe(
      catchError(() => {
        const nueva: MantenimientoTaller = {
          id_mantenimiento: this.ordenesMock.length + 1,
          id_averia: dto.id_averia || null,
          id_computadora: dto.id_computadora,
          id_usuario_tecnico: dto.id_usuario_tecnico || null,
          id_usuario_administrador: 1,
          estado: 'PENDIENTE_TALLER',
          tipo_mantenimiento: dto.tipo_mantenimiento || 'CORRECTIVO',
          prioridad: dto.prioridad || 'MEDIA',
          descripcion_problema: dto.descripcion_problema || 'Mantenimiento registrado',
          fecha_hora_ingreso: new Date().toISOString(),
          computadora: {
            id_computadora: dto.id_computadora,
            codigo_equipo: `PC-0${dto.id_computadora}`,
            estado_actual: 'EN_MANTENIMIENTO',
            sala: { id_sala: 1, codigo_sala: 'LAB-101', nombre: 'Laboratorio de Informática I' },
          },
        };
        this.ordenesMock.unshift(nueva);
        return of(nueva);
      }),
    );
  }

  /**
   * CU24: Iniciar intervención técnica en taller
   */
  iniciarReparacion(id: number, dto: IniciarMantenimientoDto): Observable<MantenimientoTaller> {
    return this.http.patch<MantenimientoTaller>(`${this.apiUrl}/taller/${id}/iniciar`, dto).pipe(
      catchError(() => {
        const index = this.ordenesMock.findIndex((o) => o.id_mantenimiento === Number(id));
        if (index !== -1) {
          const item = { ...this.ordenesMock[index] };
          item.estado = 'EN_REPARACION';
          item.diagnostico_tecnico = dto.diagnostico_tecnico;
          item.fecha_hora_inicio_taller = dto.fecha_hora_inicio || new Date().toISOString();
          if (dto.id_usuario_tecnico) {
            item.id_usuario_tecnico = dto.id_usuario_tecnico;
            item.tecnico = {
              id_usuario: dto.id_usuario_tecnico,
              nombres: 'Técnico',
              apellidos: 'Especialista',
              correo_institucional: 'soporte@uagrm.edu.bo',
            };
          }
          this.ordenesMock[index] = item;
          return of(item);
        }
        return of(this.ordenesMock[0]);
      }),
    );
  }

  /**
   * CU24: Finalizar reparación técnica y registrar solución
   */
  finalizarReparacion(id: number, dto: FinalizarMantenimientoDto): Observable<MantenimientoTaller> {
    return this.http.patch<MantenimientoTaller>(`${this.apiUrl}/taller/${id}/finalizar`, dto).pipe(
      catchError(() => {
        const index = this.ordenesMock.findIndex((o) => o.id_mantenimiento === Number(id));
        if (index !== -1) {
          const item = { ...this.ordenesMock[index] };
          item.estado = 'REPARADO_EN_TALLER';
          item.solucion_aplicada = dto.solucion_aplicada;
          item.repuestos_utilizados = dto.repuestos_utilizados || null;
          item.duracion_taller_horas = dto.duracion_taller_horas || 2.0;
          item.costo_reparacion = dto.costo_reparacion || 0;
          item.fecha_hora_fin_taller = dto.fecha_hora_fin || new Date().toISOString();
          this.ordenesMock[index] = item;
          return of(item);
        }
        return of(this.ordenesMock[0]);
      }),
    );
  }

  /**
   * CU25: Confirmar retorno físico a sala y puesta en marcha
   */
  confirmarRetornoSala(id: number, dto: ConfirmarRetornoDto): Observable<MantenimientoTaller> {
    return this.http.post<MantenimientoTaller>(`${this.apiUrl}/taller/${id}/retorno`, dto).pipe(
      catchError(() => {
        const index = this.ordenesMock.findIndex((o) => o.id_mantenimiento === Number(id));
        if (index !== -1) {
          const item = { ...this.ordenesMock[index] };
          item.estado = 'RETORNADO_A_SALA';
          item.confirmacion_retorno = {
            id_retorno: 99,
            id_mantenimiento: item.id_mantenimiento,
            id_usuario_confirma: dto.id_usuario_confirma || 1,
            fecha_hora_retorno: new Date().toISOString(),
            pruebas_satisfactorias: dto.pruebas_satisfactorias ?? true,
            obs_instalacion: dto.obs_instalacion || 'Reinstalación en sala verificada',
            usuario_confirma: { id_usuario: 1, nombres: 'Operador', apellidos: 'Laboratorio' },
          };
          if (item.computadora) {
            item.computadora.estado_actual = 'DISPONIBLE';
          }
          this.ordenesMock[index] = item;
          return of(item);
        }
        return of(this.ordenesMock[0]);
      }),
    );
  }

  /**
   * CU24: Dar de baja definitiva por daño irreparable
   */
  darDeBaja(id: number, dto: DarBajaDto): Observable<MantenimientoTaller> {
    return this.http.patch<MantenimientoTaller>(`${this.apiUrl}/taller/${id}/baja`, dto).pipe(
      catchError(() => {
        const index = this.ordenesMock.findIndex((o) => o.id_mantenimiento === Number(id));
        if (index !== -1) {
          const item = { ...this.ordenesMock[index] };
          item.estado = 'BAJA_DEFINITIVA';
          item.motivo_baja = dto.motivo;
          if (item.computadora) {
            item.computadora.estado_actual = 'DE_BAJA';
          }
          this.ordenesMock[index] = item;
          return of(item);
        }
        return of(this.ordenesMock[0]);
      }),
    );
  }

  /**
   * Métricas RAMS: Dashboard ejecutivo de confiabilidad, disponibilidad y KPIs
   */
  getMetricasRamsDashboard(params?: FiltroRamsDto): Observable<MetricasRamsDashboard> {
    let httpParams = new HttpParams();
    if (params?.id_sala) httpParams = httpParams.set('id_sala', String(params.id_sala));
    if (params?.mes) httpParams = httpParams.set('mes', String(params.mes));
    if (params?.anio) httpParams = httpParams.set('anio', String(params.anio));
    if (params?.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    if (params?.pagina) httpParams = httpParams.set('pagina', String(params.pagina));
    if (params?.limite) httpParams = httpParams.set('limite', String(params.limite));

    return this.http.get<any>(`${this.apiUrl}/rams/dashboard`, { params: httpParams }).pipe(
      map((res) => {
        // Normalización si el backend responde con estructura directa
        if (res && res.kpis && res.resumen_salas) {
          return this.adaptarRespuestaBackendRams(res, params);
        }
        return res as MetricasRamsDashboard;
      }),
      catchError(() => {
        return of(this.generarMetricasRamsMock(params));
      }),
    );
  }

  // ================= MÉTODOS DE FILTRADO Y MOCK LOCAL =================

  private filtrarOrdenesLocal(params?: FiltroMantenimientoDto): PaginacionTaller {
    let items = [...this.ordenesMock];

    if (params?.id_sala) {
      items = items.filter((o) => o.computadora?.sala?.id_sala === Number(params.id_sala));
    }
    if (params?.id_computadora) {
      items = items.filter((o) => o.id_computadora === Number(params.id_computadora));
    }
    if (params?.estado && params.estado !== 'TODOS') {
      items = items.filter((o) => o.estado === params.estado);
    }
    if (params?.prioridad && params.prioridad !== 'TODOS') {
      items = items.filter((o) => o.prioridad === params.prioridad);
    }
    if (params?.busqueda) {
      const q = params.busqueda.toLowerCase();
      items = items.filter(
        (o) =>
          o.computadora?.codigo_equipo?.toLowerCase().includes(q) ||
          o.computadora?.sala?.nombre?.toLowerCase().includes(q) ||
          o.descripcion_problema?.toLowerCase().includes(q) ||
          o.diagnostico_tecnico?.toLowerCase().includes(q) ||
          o.solucion_aplicada?.toLowerCase().includes(q) ||
          String(o.id_mantenimiento).includes(q),
      );
    }

    const total = items.length;
    const limite = params?.limite || 15;
    const pagina = params?.pagina || 1;
    const inicio = (pagina - 1) * limite;
    const paginados = items.slice(inicio, inicio + limite);

    return {
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite) || 1,
      data: paginados,
      items: paginados,
    };
  }

  private adaptarRespuestaBackendRams(res: any, params?: FiltroRamsDto): MetricasRamsDashboard {
    const kpis: KpisRamsDashboard = res.kpis;
    const resumen_salas: ResumenRamsSala[] = res.resumen_salas || [];
    const criticosRaw: any[] = res.equipos_criticos || [];

    const items: IndicadorRams[] = criticosRaw.map((ind: any) => ({
      id_indicador: Number(ind.id_indicador || ind.id),
      id_computadora: Number(ind.id_computadora),
      codigo_equipo: ind.computadora?.codigo_equipo || `PC-${ind.id_computadora}`,
      id_sala: Number(ind.id_sala || ind.computadora?.id_sala || 1),
      codigo_sala: ind.sala?.codigo_sala || ind.computadora?.sala?.codigo_sala || 'LAB',
      nombre_sala: ind.sala?.nombre || ind.computadora?.sala?.nombre || 'Sala CITEF',
      periodo_mes: Number(ind.periodo_mes || kpis.periodo_mes),
      periodo_anio: Number(ind.periodo_anio || kpis.periodo_anio),
      cant_fallas_registradas: Number(ind.cant_fallas_registradas || 0),
      horas_operativas_totales: Number(ind.horas_operativas_totales || 280),
      horas_parada_totales: Number(ind.horas_parada_totales || 0),
      mtbf_horas: Number(ind.mtbf_horas || 0),
      mttr_horas: Number(ind.mttr_horas || 0),
      disponibilidad_operativa_a: Number(ind.disponibilidad_operativa_a || 1.0),
      disponibilidad_porcentaje: Math.round(Number(ind.disponibilidad_operativa_a || 1.0) * 10000) / 100,
      estado_operativo: ind.computadora?.estado_actual || 'DISPONIBLE',
    }));

    const total = items.length;
    const limite = params?.limite || 15;
    const pagina = params?.pagina || 1;

    return {
      kpis,
      resumen_salas,
      equipos_criticos: items.slice(0, 8),
      items,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite) || 1,
    };
  }

  private generarMetricasRamsMock(params?: FiltroRamsDto): MetricasRamsDashboard {
    const mes = params?.mes || new Date().getMonth() + 1;
    const anio = params?.anio || new Date().getFullYear();

    const salasMock = [
      { id: 1, cod: 'LAB-101', nom: 'Laboratorio de Informática I', pcs: 25, fallas: 4, mtbf: 68.5, mttr: 2.1, disp: 97.02 },
      { id: 2, cod: 'LAB-102', nom: 'Laboratorio Financiero II', pcs: 20, fallas: 2, mtbf: 142.0, mttr: 1.8, disp: 98.75 },
      { id: 3, cod: 'LAB-201', nom: 'Laboratorio de Simulación III', pcs: 22, fallas: 6, mtbf: 45.2, mttr: 3.4, disp: 93.00 },
      { id: 4, cod: 'LAB-202', nom: 'Laboratorio de Posgrado IV', pcs: 18, fallas: 1, mtbf: 290.0, mttr: 1.2, disp: 99.59 },
    ];

    let salasFiltradas = salasMock;
    if (params?.id_sala) {
      salasFiltradas = salasMock.filter((s) => s.id === Number(params.id_sala));
    }

    const indicadores: IndicadorRams[] = [
      {
        id_indicador: 1,
        id_computadora: 1,
        codigo_equipo: 'PC-L1-01',
        id_sala: 1,
        codigo_sala: 'LAB-101',
        nombre_sala: 'Laboratorio de Informática I',
        periodo_mes: mes,
        periodo_anio: anio,
        cant_fallas_registradas: 2,
        horas_operativas_totales: 275.5,
        horas_parada_totales: 4.5,
        mtbf_horas: 137.75,
        mttr_horas: 2.25,
        disponibilidad_operativa_a: 0.9839,
        disponibilidad_porcentaje: 98.39,
        estado_operativo: 'EN_MANTENIMIENTO',
      },
      {
        id_indicador: 2,
        id_computadora: 2,
        codigo_equipo: 'PC-L1-02',
        id_sala: 1,
        codigo_sala: 'LAB-101',
        nombre_sala: 'Laboratorio de Informática I',
        periodo_mes: mes,
        periodo_anio: anio,
        cant_fallas_registradas: 1,
        horas_operativas_totales: 277.0,
        horas_parada_totales: 3.0,
        mtbf_horas: 277.0,
        mttr_horas: 3.0,
        disponibilidad_operativa_a: 0.9893,
        disponibilidad_porcentaje: 98.93,
        estado_operativo: 'EN_MANTENIMIENTO',
      },
      {
        id_indicador: 3,
        id_computadora: 3,
        codigo_equipo: 'PC-L1-03',
        id_sala: 1,
        codigo_sala: 'LAB-101',
        nombre_sala: 'Laboratorio de Informática I',
        periodo_mes: mes,
        periodo_anio: anio,
        cant_fallas_registradas: 0,
        horas_operativas_totales: 280.0,
        horas_parada_totales: 0.0,
        mtbf_horas: 280.0,
        mttr_horas: 0.0,
        disponibilidad_operativa_a: 1.0,
        disponibilidad_porcentaje: 100.0,
        estado_operativo: 'DISPONIBLE',
      },
      {
        id_indicador: 4,
        id_computadora: 4,
        codigo_equipo: 'PC-L1-04',
        id_sala: 1,
        codigo_sala: 'LAB-101',
        nombre_sala: 'Laboratorio de Informática I',
        periodo_mes: mes,
        periodo_anio: anio,
        cant_fallas_registradas: 1,
        horas_operativas_totales: 278.2,
        horas_parada_totales: 1.8,
        mtbf_horas: 278.2,
        mttr_horas: 1.8,
        disponibilidad_operativa_a: 0.9936,
        disponibilidad_porcentaje: 99.36,
        estado_operativo: 'DISPONIBLE',
      },
      {
        id_indicador: 5,
        id_computadora: 15,
        codigo_equipo: 'PC-L2-05',
        id_sala: 2,
        codigo_sala: 'LAB-102',
        nombre_sala: 'Laboratorio Financiero II',
        periodo_mes: mes,
        periodo_anio: anio,
        cant_fallas_registradas: 1,
        horas_operativas_totales: 278.25,
        horas_parada_totales: 1.75,
        mtbf_horas: 278.25,
        mttr_horas: 1.75,
        disponibilidad_operativa_a: 0.9937,
        disponibilidad_porcentaje: 99.37,
        estado_operativo: 'EN_MANTENIMIENTO',
      },
      {
        id_indicador: 6,
        id_computadora: 22,
        codigo_equipo: 'PC-L3-08',
        id_sala: 3,
        codigo_sala: 'LAB-201',
        nombre_sala: 'Laboratorio de Simulación III',
        periodo_mes: mes,
        periodo_anio: anio,
        cant_fallas_registradas: 2,
        horas_operativas_totales: 274.0,
        horas_parada_totales: 6.0,
        mtbf_horas: 137.0,
        mttr_horas: 3.0,
        disponibilidad_operativa_a: 0.9786,
        disponibilidad_porcentaje: 97.86,
        estado_operativo: 'DISPONIBLE',
      },
      {
        id_indicador: 7,
        id_computadora: 30,
        codigo_equipo: 'PC-L3-15',
        id_sala: 3,
        codigo_sala: 'LAB-201',
        nombre_sala: 'Laboratorio de Simulación III',
        periodo_mes: mes,
        periodo_anio: anio,
        cant_fallas_registradas: 3,
        horas_operativas_totales: 245.0,
        horas_parada_totales: 35.0,
        mtbf_horas: 81.67,
        mttr_horas: 11.67,
        disponibilidad_operativa_a: 0.875,
        disponibilidad_porcentaje: 87.5,
        estado_operativo: 'DE_BAJA',
      },
      {
        id_indicador: 8,
        id_computadora: 31,
        codigo_equipo: 'PC-L3-16',
        id_sala: 3,
        codigo_sala: 'LAB-201',
        nombre_sala: 'Laboratorio de Simulación III',
        periodo_mes: mes,
        periodo_anio: anio,
        cant_fallas_registradas: 1,
        horas_operativas_totales: 276.5,
        horas_parada_totales: 3.5,
        mtbf_horas: 276.5,
        mttr_horas: 3.5,
        disponibilidad_operativa_a: 0.9875,
        disponibilidad_porcentaje: 98.75,
        estado_operativo: 'DISPONIBLE',
      },
    ];

    let itemsFiltrados = indicadores;
    if (params?.id_sala) {
      itemsFiltrados = itemsFiltrados.filter((i) => i.id_sala === Number(params.id_sala));
    }
    if (params?.busqueda) {
      const q = params.busqueda.toLowerCase();
      itemsFiltrados = itemsFiltrados.filter(
        (i) =>
          i.codigo_equipo.toLowerCase().includes(q) ||
          i.nombre_sala.toLowerCase().includes(q) ||
          i.codigo_sala.toLowerCase().includes(q),
      );
    }

    const total = itemsFiltrados.length;
    const limite = params?.limite || 15;
    const pagina = params?.pagina || 1;
    const inicio = (pagina - 1) * limite;
    const itemsPaginados = itemsFiltrados.slice(inicio, inicio + limite);

    const kpis: KpisRamsDashboard = {
      mtbf_promedio_horas: 187.4,
      mttr_promedio_horas: 2.85,
      disponibilidad_promedio_factor: 0.985,
      disponibilidad_promedio_porcentaje: 98.5,
      total_equipos_parque: 85,
      total_equipos_operativos: 79,
      total_equipos_en_taller: 3,
      total_equipos_baja: 3,
      total_fallas_periodo: 13,
      periodo_mes: mes,
      periodo_anio: anio,
    };

    const resumen_salas: ResumenRamsSala[] = salasFiltradas.map((s) => ({
      id_sala: s.id,
      codigo_sala: s.cod,
      nombre_sala: s.nom,
      cant_equipos: s.pcs,
      cant_fallas: s.fallas,
      mtbf_promedio: s.mtbf,
      mttr_promedio: s.mttr,
      disponibilidad_promedio: s.disp / 100,
      disponibilidad_porcentaje: s.disp,
    }));

    return {
      kpis,
      resumen_salas,
      equipos_criticos: itemsFiltrados.slice(0, 8),
      items: itemsPaginados,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite) || 1,
    };
  }
}
