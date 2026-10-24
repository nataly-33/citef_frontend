import {
  Component,
  OnInit,
  signal,
  computed,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  ReservasService,
  ReservaSala,
  SolicitarReservaDto,
  EditarReservaDto,
  ResponderReservaDto,
  ResultadoValidacionDisponibilidad,
  SalaSimple,
  DocenteSimple,
  MateriaSimple,
} from '../../../core/services/reservas.service';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { ModalAlertComponent } from '../../../shared/components/modal-alert/modal-alert.component';
import { ConfirmModalComponent } from '../../../shared/components/confirm-modal/confirm-modal.component';

export type ModoVistaCalendario = 'semana' | 'dia' | 'mes';

export interface DiaSemanaItem {
  fecha: Date;
  fechaStr: string; // YYYY-MM-DD
  nombreDia: string;
  nroDia: number;
  esHoy: boolean;
}

export interface PosicionTarjeta {
  width: string;
  left: string;
  esParticionada: boolean;
}

@Component({
  selector: 'app-calendario-reservas',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalAlertComponent, ConfirmModalComponent],
  templateUrl: './calendario-reservas.component.html',
  styleUrls: ['./calendario-reservas.component.css'],
})
export class CalendarioReservasComponent implements OnInit {
  private readonly reservasService = inject(ReservasService);
  readonly authService = inject(AuthService);
  private readonly http = inject(HttpClient);
  private readonly apiUrl = 'http://localhost:3000/api/v1';

  // Estados reactivos
  reservas = signal<ReservaSala[]>([]);
  salas = signal<SalaSimple[]>([]);
  docentes = signal<DocenteSimple[]>([]);
  materias = signal<MateriaSimple[]>([]);

  cargando = signal<boolean>(false);
  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);
  private timeoutMensajeExito: any = null;
  private timeoutMensajeError: any = null;

  readonly hoyDate = new Date();

  mostrarMensajeExito(msg: string, duracionMs = 4500): void {
    if (this.timeoutMensajeExito) {
      clearTimeout(this.timeoutMensajeExito);
    }
    this.mensajeExito.set(msg);
    this.timeoutMensajeExito = setTimeout(() => {
      this.mensajeExito.set(null);
      this.timeoutMensajeExito = null;
    }, duracionMs);
  }

  mostrarMensajeError(msg: string, duracionMs = 5000): void {
    if (this.timeoutMensajeError) {
      clearTimeout(this.timeoutMensajeError);
    }
    this.mensajeError.set(msg);
    this.timeoutMensajeError = setTimeout(() => {
      this.mensajeError.set(null);
      this.timeoutMensajeError = null;
    }, duracionMs);
  }

  // Filtros de navegación
  salaSeleccionadaId = signal<number | undefined>(undefined);
  modoVista = signal<ModoVistaCalendario>('dia');
  fechaReferencia = signal<Date>(new Date());

  // Visualización de canceladas/rechazadas (por defecto ocultas para evitar solapamientos)
  mostrarCanceladas = signal<boolean>(false);

  // Franjas horarias de 30 minutos (07:00 a 21:30)
  readonly slotsMediaHora: string[] = [
    '07:00', '07:30', '08:00', '08:30', '09:00', '09:30',
    '10:00', '10:30', '11:00', '11:30', '12:00', '12:30',
    '13:00', '13:30', '14:00', '14:30', '15:00', '15:30',
    '16:00', '16:30', '17:00', '17:30', '18:00', '18:30',
    '19:00', '19:30', '20:00', '20:30', '21:00', '21:30',
  ];

  // Modal Detalle
  modalDetalleVisible = signal<boolean>(false);
  reservaDetalle = signal<ReservaSala | null>(null);

  // Modal Dictamen Jefatura (Aprobar / Rechazar)
  modalDictamenVisible = signal<boolean>(false);
  accionDictamen = signal<'APROBAR' | 'RECHAZAR'>('APROBAR');
  dictamenObservacion = signal<string>('');
  errorDictamen = signal<string | null>(null);
  guardandoDictamen = signal<boolean>(false);
  aprobarTodasRecurrentes = signal<boolean>(false);

  // Modal Cancelar
  modalCancelarVisible = signal<boolean>(false);
  motivoCancelacion = signal<string>('');
  errorCancelar = signal<string | null>(null);
  guardandoCancelacion = signal<boolean>(false);

  // Modal Solicitar Reserva
  modalSolicitarVisible = signal<boolean>(false);
  guardandoSolicitud = signal<boolean>(false);
  errorSolicitud = signal<string | null>(null);

  // Formulario de Solicitud (Soporte multi-sala para docentes con >30 alumnos)
  formSalaId = signal<number | null>(null);
  salasSeleccionadas = signal<number[]>([]);
  formCodigoDocente = signal<string>('');
  formMateriaId = signal<number | null>(null);
  formFecha = signal<string>('');
  formHoraInicio = signal<string>('08:00');
  formHoraFin = signal<string>('10:00');
  formTema = signal<string>('');
  formCantAlumnos = signal<number>(25);
  formTipoReserva = signal<'CLASE' | 'EXAMEN'>('CLASE');
  formProgramarSemestre = signal<boolean>(false);
  formFechaFinSemestre = signal<string>('');
  formDiasSemana = signal<number[]>([3]); // 1=Lun, 2=Mar, 3=Mié, 4=Jue, 5=Vie, 6=Sáb

  // Modal Editar Reserva
  modalEditarVisible = signal<boolean>(false);
  guardandoEdicion = signal<boolean>(false);
  errorEdicion = signal<string | null>(null);
  editandoReservaId = signal<number | null>(null);
  editSalaId = signal<number>(1);
  editSalasSeleccionadas = signal<number[]>([1]);
  editEsMultiSala = signal<boolean>(false);
  editFecha = signal<string>('');
  editHoraInicio = signal<string>('08:00');
  editHoraFin = signal<string>('10:00');
  editTema = signal<string>('');
  editCantAlumnos = signal<number>(25);
  editTipoReserva = signal<'CLASE' | 'EXAMEN'>('CLASE');
  editObs = signal<string>('');

  salaSeleccionadaEdicion = computed<SalaSimple | null>(() => {
    const id = this.editSalaId();
    return this.salas().find((s) => s.id_sala === id) || null;
  });

  salasSeleccionadasEdicion = computed<SalaSimple[]>(() => {
    const ids = this.editSalasSeleccionadas();
    return this.salas().filter((s) => ids.includes(s.id_sala));
  });

  capacidadTotalEdicion = computed<number>(() => {
    if (this.editEsMultiSala() || this.editSalasSeleccionadas().length > 1) {
      return this.salasSeleccionadasEdicion().reduce(
        (acc, s) => acc + (s.cant_estudiantes || 0),
        0,
      );
    }
    const sala = this.salaSeleccionadaEdicion();
    return sala ? sala.cant_estudiantes || 0 : 0;
  });

  capacidadExcedidaEdicion = computed<boolean>(() => {
    const cap = this.capacidadTotalEdicion();
    if (cap <= 0) return false;
    const cant = this.editCantAlumnos() || 0;
    return cant > cap;
  });

  toggleEditSalaSeleccionada(idSala: number): void {
    if (!this.editEsMultiSala()) {
      // Modo individual: un clic selecciona exclusivamente esa sala
      this.editSalaId.set(idSala);
      this.editSalasSeleccionadas.set([idSala]);
      this.errorEdicion.set(null);
      return;
    }
    const current = this.editSalasSeleccionadas();
    let nuevos: number[];
    if (current.includes(idSala)) {
      if (current.length > 1) {
        nuevos = current.filter((x) => x !== idSala);
      } else {
        nuevos = current;
      }
    } else {
      nuevos = [...current, idSala];
    }
    this.editSalasSeleccionadas.set(nuevos);
    this.editSalaId.set(nuevos[0]);
    this.errorEdicion.set(null);
  }

  toggleModoMultiSalaEdit(): void {
    const multi = !this.editEsMultiSala();
    this.editEsMultiSala.set(multi);
    if (!multi) {
      const primera = this.editSalasSeleccionadas()[0] || this.editSalaId() || 1;
      this.editSalaId.set(primera);
      this.editSalasSeleccionadas.set([primera]);
    }
    this.errorEdicion.set(null);
  }

  onEditCantAlumnosChange(val: number): void {
    this.editCantAlumnos.set(val);
    this.errorEdicion.set(null);
  }

  onEditSalaChange(val: number | string): void {
    const num = Number(val);
    this.editSalaId.set(num);
    this.editSalasSeleccionadas.set([num]);
    this.editEsMultiSala.set(false);
    this.errorEdicion.set(null);
  }

  onEditFechaChange(val: string): void {
    this.editFecha.set(val);
    this.errorEdicion.set(null);
  }

  onEditHoraInicioChange(val: string): void {
    this.editHoraInicio.set(val);
    this.errorEdicion.set(null);
  }

  onEditHoraFinChange(val: string): void {
    this.editHoraFin.set(val);
    this.errorEdicion.set(null);
  }

  // Buscador de materias
  buscadorMateria = signal<string>('');
  dropdownMateriaAbierto = signal<boolean>(false);

  // Validación de disponibilidad en vivo
  verificandoDisponibilidad = signal<boolean>(false);
  resultadoDisponibilidad = signal<ResultadoValidacionDisponibilidad | null>(null);

  // Errores específicos por campo
  erroresForm = signal<{ [key: string]: string }>({});

  // Computadas para materias y docentes
  docenteActual = computed<DocenteSimple | null>(() => {
    const cod = this.formCodigoDocente();
    if (!cod) return null;
    return this.docentes().find((d) => d.codigo === cod) || null;
  });

  esUsuarioDocente = computed<boolean>(() => {
    const user = this.authService.currentUser();
    return !!(user && user.roles?.includes('DOCENTE') && !user.roles?.includes('ADMINISTRADOR'));
  });

  materiaSeleccionada = computed<MateriaSimple | null>(() => {
    const id = this.formMateriaId();
    if (!id) return null;
    return this.materias().find((m) => m.id_materia === id) || null;
  });

  materiasFiltradas = computed<MateriaSimple[]>(() => {
    const q = this.buscadorMateria().trim().toLowerCase();
    if (!q) return this.materias();
    return this.materias().filter(
      (m) => m.sigla.toLowerCase().includes(q) || m.nombre.toLowerCase().includes(q),
    );
  });

  capacidadTotalSeleccionada = computed<number>(() => {
    const ids = this.salasSeleccionadas();
    if (ids.length === 0) {
      const s = this.salas().find((x) => x.id_sala === this.formSalaId());
      return s ? s.cant_estudiantes : 0;
    }
    return this.salas()
      .filter((s) => ids.includes(s.id_sala))
      .reduce((acc, s) => acc + (s.cant_estudiantes || 0), 0);
  });

  // Salas activas para la vista diaria (filtrada si se seleccionó una sala o todas si ninguna)
  salasParaVistaDia = computed<SalaSimple[]>(() => {
    const todas = this.salas().filter((s) => s.activo !== false);
    const idSel = this.salaSeleccionadaId();
    if (idSel) {
      const filtrada = todas.filter((s) => s.id_sala === idSel);
      return filtrada.length > 0 ? filtrada : todas;
    }
    return todas;
  });

  // Días de la semana calculados reactivamente
  diasSemana = computed<DiaSemanaItem[]>(() => {
    const ref = this.fechaReferencia();
    const curr = new Date(ref);
    // Obtener el lunes de la semana (0 es domingo, 1 es lunes)
    const day = curr.getDay();
    const diff = curr.getDate() - day + (day === 0 ? -6 : 1);
    const lunes = new Date(curr.setDate(diff));

    const hoyStr = this.formatDateIso(new Date());
    const dias: DiaSemanaItem[] = [];
    const nombres = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

    for (let i = 0; i < 6; i++) {
      const d = new Date(lunes);
      d.setDate(lunes.getDate() + i);
      const iso = this.formatDateIso(d);
      dias.push({
        fecha: d,
        fechaStr: iso,
        nombreDia: nombres[i],
        nroDia: d.getDate(),
        esHoy: iso === hoyStr,
      });
    }
    return dias;
  });

  // Título dinámico del rango actual
  tituloRango = computed<string>(() => {
    const modo = this.modoVista();
    const ref = this.fechaReferencia();

    if (modo === 'dia') {
      return ref.toLocaleDateString('es-ES', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }

    if (modo === 'mes') {
      return ref.toLocaleDateString('es-ES', {
        month: 'long',
        year: 'numeric',
      });
    }

    // Modo semana
    const dias = this.diasSemana();
    if (dias.length === 0) return '';
    const primerDia = dias[0];
    const ultimoDia = dias[dias.length - 1];

    const mes1 = primerDia.fecha.toLocaleDateString('es-ES', { month: 'short' });
    const mes2 = ultimoDia.fecha.toLocaleDateString('es-ES', { month: 'short' });
    const anio = ultimoDia.fecha.getFullYear();

    if (mes1 === mes2) {
      return `${primerDia.nroDia} al ${ultimoDia.nroDia} de ${mes1}, ${anio}`;
    }
    return `${primerDia.nroDia} ${mes1} - ${ultimoDia.nroDia} ${mes2}, ${anio}`;
  });

  getNombreDiaEspanol(d: Date): string {
    const nombres = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    return nombres[d.getDay()] || '';
  }

  // Algoritmo estilo Google Calendar: Partición horizontal dinámica para eventos solapados
  mapaPosiciones = computed<Map<number, PosicionTarjeta>>(() => {
    const todas = this.reservas();
    const salaSel = this.salaSeleccionadaId();
    const verCanc = this.mostrarCanceladas();

    // Agrupar reservas activas por fecha_reserva
    const porFecha = new Map<string, ReservaSala[]>();
    for (const r of todas) {
      if (salaSel && r.id_sala !== salaSel) continue;
      if ((r.estado === 'CANCELADA' || r.estado === 'RECHAZADA') && !verCanc) continue;
      const f = r.fecha_reserva;
      if (!porFecha.has(f)) porFecha.set(f, []);
      porFecha.get(f)!.push(r);
    }

    const resultado = new Map<number, PosicionTarjeta>();

    for (const [_, lista] of porFecha.entries()) {
      // 1. Ordenar por hora_inicio asc, luego duración desc
      const ordenadas = [...lista].sort((a, b) => {
        const cmpIni = a.hora_inicio.localeCompare(b.hora_inicio);
        if (cmpIni !== 0) return cmpIni;
        return b.hora_fin.localeCompare(a.hora_fin);
      });

      // 2. Agrupar en clusters continuos de solapamiento
      const clusters: ReservaSala[][] = [];
      let currentCluster: ReservaSala[] = [];
      let maxFinCluster = '00:00:00';

      for (const r of ordenadas) {
        if (currentCluster.length === 0) {
          currentCluster.push(r);
          maxFinCluster = r.hora_fin;
        } else if (r.hora_inicio < maxFinCluster) {
          // Solapa con el rango del cluster actual
          currentCluster.push(r);
          if (r.hora_fin > maxFinCluster) {
            maxFinCluster = r.hora_fin;
          }
        } else {
          // Iniciar nuevo cluster
          clusters.push(currentCluster);
          currentCluster = [r];
          maxFinCluster = r.hora_fin;
        }
      }
      if (currentCluster.length > 0) {
        clusters.push(currentCluster);
      }

      // 3. Para cada cluster, asignar columnas greedy
      for (const cluster of clusters) {
        const colMap = new Map<number, number>(); // id_reserva -> colIndex
        let maxCols = 1;

        for (const item of cluster) {
          const colUsadas = new Set<number>();
          for (const other of cluster) {
            if (other.id_reserva === item.id_reserva) continue;
            if (!colMap.has(other.id_reserva)) continue;
            // Solapan en tiempo si:
            const solapan = item.hora_inicio < other.hora_fin && other.hora_inicio < item.hora_fin;
            if (solapan) {
              colUsadas.add(colMap.get(other.id_reserva)!);
            }
          }

          let c = 0;
          while (colUsadas.has(c)) {
            c++;
          }
          colMap.set(item.id_reserva, c);
          if (c + 1 > maxCols) {
            maxCols = c + 1;
          }
        }

        // 4. Guardar posiciones finales para los items del cluster
        for (const item of cluster) {
          const colIndex = colMap.get(item.id_reserva) || 0;
          if (maxCols <= 1) {
            resultado.set(item.id_reserva, {
              width: 'calc(100% - 4px)',
              left: '2px',
              esParticionada: false,
            });
          } else {
            const colWidth = 100 / maxCols;
            resultado.set(item.id_reserva, {
              width: `calc(${colWidth}% - 4px)`,
              left: `calc(${colIndex * colWidth}% + 2px)`,
              esParticionada: true,
            });
          }
        }
      }
    }

    return resultado;
  });

  getPosicionReserva(idReserva: number): PosicionTarjeta {
    return (
      this.mapaPosiciones().get(idReserva) || {
        width: 'calc(100% - 4px)',
        left: '2px',
        esParticionada: false,
      }
    );
  }

  // Fecha de hoy en formato ISO para el atributo min
  readonly fechaMinimaHoy = this.formatDateIso(new Date());

  ngOnInit(): void {
    this.cargarCatalogos();
    this.cargarReservas();

    // Sincronización en tiempo real vía WebSocket
    this.reservasService.onReservasActualizadas().subscribe(() => {
      this.cargarReservas();
    });
  }

  // Carga de salas, docentes y materias para dropdowns
  cargarCatalogos(): void {
    // Salas
    this.http.get<any>(`${this.apiUrl}/salas`).subscribe({
      next: (data) => {
        const lista = Array.isArray(data) ? data : data.data || [];
        this.salas.set(lista);
      },
      error: () => {},
    });

    // Docentes
    this.http.get<any>(`${this.apiUrl}/docentes?todos=true`).subscribe({
      next: (data) => {
        const lista = Array.isArray(data) ? data : data.data || [];
        this.docentes.set(lista);
        // Si el usuario es docente, preseleccionar su código
        this.preseleccionarDocenteSiAplica();
      },
      error: () => {},
    });

    // Materias
    this.http.get<any>(`${this.apiUrl}/catalogos/materias?todos=true`).subscribe({
      next: (data) => {
        const lista = Array.isArray(data) ? data : data.data || [];
        this.materias.set(lista);
      },
      error: () => {},
    });
  }

  preseleccionarDocenteSiAplica(): void {
    const user = this.authService.currentUser();
    if (!user) return;
    const doc = this.docentes().find(
      (d) =>
        Number(d.id_usuario || d.usuario?.id_usuario) === Number(user.id_usuario) ||
        (d.correo && user.correo_institucional && d.correo.toLowerCase() === user.correo_institucional.toLowerCase()),
    );
    if (doc) {
      this.formCodigoDocente.set(doc.codigo);
    } else if (!this.esUsuarioDocente() && this.docentes().length > 0 && !this.formCodigoDocente()) {
      this.formCodigoDocente.set(this.docentes()[0].codigo);
    }
  }

  getNombreDocente(d?: DocenteSimple | null): string {
    if (!d) return '';
    const nombres = d.nombres || d.usuario?.nombres || '';
    const apellidos = d.apellidos || d.usuario?.apellidos || '';
    if (nombres || apellidos) {
      return `${apellidos} ${nombres}`.trim();
    }
    return d.codigo;
  }

  formatearFechaEspanol(fechaStr?: string | null): string {
    if (!fechaStr) return '';
    const clean = String(fechaStr).slice(0, 10);
    const parts = clean.split('-');
    if (parts.length < 3) return clean;
    const anio = parts[0];
    const mesIndex = parseInt(parts[1], 10) - 1;
    const dia = parts[2];
    const meses = [
      'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
      'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
    ];
    return `${dia} de ${meses[mesIndex] || parts[1]} de ${anio}`;
  }

  horaToMinutos(hora: string): number {
    if (!hora) return 0;
    const parts = hora.split(':');
    return parseInt(parts[0], 10) * 60 + parseInt(parts[1] || '0', 10);
  }

  horaToSlot(hora: string): string {
    if (!hora) return '07:00';
    const parts = hora.split(':');
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1] || '0', 10);
    const slotM = m < 15 ? '00' : m < 45 ? '30' : '00';
    const slotH = m >= 45 ? h + 1 : h;
    return `${String(slotH).padStart(2, '0')}:${slotM}`;
  }

  esHoraEnPunto(slot: string): boolean {
    return slot.endsWith(':00');
  }

  // Obtener todas las reservas que INICIAN exactamente en este slot (con filtro opcional de sala)
  getReservasQueInicianEnSlot(fechaStr: string, slotStr: string, idSala?: number): ReservaSala[] {
    return this.reservas().filter((res) => {
      if (res.fecha_reserva !== fechaStr) return false;
      if (idSala !== undefined && res.id_sala !== idSala) return false;
      // Excluir canceladas y rechazadas para que el horario quede limpio salvo que se active el toggle
      if (res.estado === 'CANCELADA' || res.estado === 'RECHAZADA') {
        if (!this.mostrarCanceladas()) return false;
      }
      return this.horaToSlot(res.hora_inicio) === slotStr;
    });
  }

  // Compatibilidad legacy si alguna vista aún consulta una sola reserva
  getReservaQueIniciaEnSlot(fechaStr: string, slotStr: string): ReservaSala | null {
    const lista = this.getReservasQueInicianEnSlot(fechaStr, slotStr);
    return lista.length > 0 ? lista[0] : null;
  }

  // Altura en px proporcional a la duración (cada slot de 30 min mide 36px)
  calcularAlturaTarjetaPx(r: ReservaSala): number {
    const ini = this.horaToMinutos(r.hora_inicio);
    const fin = this.horaToMinutos(r.hora_fin);
    const duracion = Math.max(30, fin - ini);
    const slots = duracion / 30.0;
    return Math.max(32, Math.round(slots * 36 - 4));
  }

  // Selección en buscador de materias
  seleccionarMateria(m: MateriaSimple): void {
    this.formMateriaId.set(m.id_materia);
    this.buscadorMateria.set(`${m.sigla} — ${m.nombre}`);
    this.dropdownMateriaAbierto.set(false);
    this.erroresForm.update((errs) => {
      const copy = { ...errs };
      delete copy['id_materia'];
      return copy;
    });
  }

  // Toggle de selección múltiple de salas para cátedras con muchos alumnos
  toggleSalaSeleccionada(idSala: number): void {
    const current = this.salasSeleccionadas();
    if (current.includes(idSala)) {
      if (current.length > 1) {
        this.salasSeleccionadas.set(current.filter((x) => x !== idSala));
      }
    } else {
      this.salasSeleccionadas.set([...current, idSala]);
    }
    this.formSalaId.set(this.salasSeleccionadas()[0]);
    this.verificarDisponibilidadReactiva();
  }

  cargarReservas(): void {
    this.cargando.set(true);

    const ref = this.fechaReferencia();
    let fechaDesde: string;
    let fechaHasta: string;

    if (this.modoVista() === 'mes') {
      const year = ref.getFullYear();
      const month = ref.getMonth();
      const primerDiaMes = new Date(year, month, 1);
      const ultimoDiaMes = new Date(year, month + 1, 0);
      fechaDesde = this.formatDateIso(primerDiaMes);
      fechaHasta = this.formatDateIso(ultimoDiaMes);
    } else {
      // Semana o Día: abarcamos la semana completa para mantener el contexto
      const dias = this.diasSemana();
      fechaDesde = dias[0]?.fechaStr || this.formatDateIso(ref);
      fechaHasta = dias[dias.length - 1]?.fechaStr || this.formatDateIso(ref);
    }

    this.reservasService
      .obtenerParaCalendario(this.salaSeleccionadaId(), fechaDesde, fechaHasta)
      .subscribe({
        next: (data) => {
          this.reservas.set(data || []);
          this.cargando.set(false);
        },
        error: (err) => {
          this.mostrarMensajeError(err?.error?.message || 'Error al cargar las reservas del calendario');
          this.cargando.set(false);
        },
      });
  }

  cambiarModo(modo: ModoVistaCalendario): void {
    this.modoVista.set(modo);
    this.cargarReservas();
  }

  irAHoy(): void {
    this.fechaReferencia.set(new Date());
    this.cargarReservas();
  }

  anteriorPeriodo(): void {
    const curr = new Date(this.fechaReferencia());
    if (this.modoVista() === 'dia') {
      curr.setDate(curr.getDate() - 1);
    } else if (this.modoVista() === 'mes') {
      curr.setMonth(curr.getMonth() - 1);
    } else {
      curr.setDate(curr.getDate() - 7);
    }
    this.fechaReferencia.set(curr);
    this.cargarReservas();
  }

  siguientePeriodo(): void {
    const curr = new Date(this.fechaReferencia());
    if (this.modoVista() === 'dia') {
      curr.setDate(curr.getDate() + 1);
    } else if (this.modoVista() === 'mes') {
      curr.setMonth(curr.getMonth() + 1);
    } else {
      curr.setDate(curr.getDate() + 7);
    }
    this.fechaReferencia.set(curr);
    this.cargarReservas();
  }

  cambiarSalaFiltro(idSala?: number): void {
    this.salaSeleccionadaId.set(idSala ? Number(idSala) : undefined);
    this.cargarReservas();
  }

  // Ver Detalle
  abrirModalDetalle(reserva: ReservaSala): void {
    this.reservaDetalle.set(reserva);
    this.modalDetalleVisible.set(true);
  }

  cerrarModalDetalle(): void {
    this.modalDetalleVisible.set(false);
  }

  // Dictaminar reserva (Jefatura)
  abrirModalDictamen(accion: 'APROBAR' | 'RECHAZAR'): void {
    this.accionDictamen.set(accion);
    this.dictamenObservacion.set(
      accion === 'APROBAR' ? 'Aprobada formalmente por Jefatura' : '',
    );
    this.aprobarTodasRecurrentes.set(false);
    this.errorDictamen.set(null);
    this.modalDictamenVisible.set(true);
  }

  confirmarDictamen(): void {
    const r = this.reservaDetalle();
    if (!r) return;

    if (
      this.accionDictamen() === 'RECHAZAR' &&
      (!this.dictamenObservacion() || this.dictamenObservacion().trim() === '')
    ) {
      this.errorDictamen.set('Debe indicar obligatoriamente el motivo del rechazo');
      return;
    }

    this.guardandoDictamen.set(true);
    this.errorDictamen.set(null);

    const dto: ResponderReservaDto = {
      accion: this.accionDictamen(),
      obs_resolucion: this.dictamenObservacion().trim(),
      aprobar_todas_recurrentes:
        this.accionDictamen() === 'APROBAR' && this.aprobarTodasRecurrentes(),
    };

    this.reservasService.gestionar(r.id_reserva, dto).subscribe({
      next: (actualizada) => {
        this.guardandoDictamen.set(false);
        this.modalDictamenVisible.set(false);
        this.reservaDetalle.set(actualizada);
        this.mostrarMensajeExito(
          `Reserva #${actualizada.id_reserva} ha sido ${actualizada.estado.toLowerCase()} exitosamente`,
        );
        this.cargarReservas();
      },
      error: (err) => {
        this.guardandoDictamen.set(false);
        this.errorDictamen.set(err?.error?.message || 'Error al procesar la resolución');
      },
    });
  }

  // Cancelar Reserva
  abrirModalCancelar(): void {
    this.motivoCancelacion.set('');
    this.errorCancelar.set(null);
    this.modalCancelarVisible.set(true);
  }

  confirmarCancelacion(): void {
    const r = this.reservaDetalle();
    if (!r) return;

    this.guardandoCancelacion.set(true);
    this.errorCancelar.set(null);

    this.reservasService.cancelar(r.id_reserva, this.motivoCancelacion()).subscribe({
      next: (actualizada) => {
        this.guardandoCancelacion.set(false);
        this.modalCancelarVisible.set(false);
        this.reservaDetalle.set(actualizada);
        this.mostrarMensajeExito(`Reserva #${r.id_reserva} cancelada exitosamente`);
        this.cargarReservas();
      },
      error: (err) => {
        this.guardandoCancelacion.set(false);
        this.errorCancelar.set(err?.error?.message || 'Error al cancelar la reserva');
      },
    });
  }

  // Solicitar Nueva Reserva
  abrirModalSolicitar(fechaPre?: string, horaPre?: string, idSalaPre?: number): void {
    this.errorSolicitud.set(null);
    this.erroresForm.set({});
    this.resultadoDisponibilidad.set(null);

    // Inicializar sala y salas seleccionadas
    const salaDefecto = idSalaPre || this.salaSeleccionadaId() || (this.salas()[0]?.id_sala ?? 1);
    this.formSalaId.set(salaDefecto);
    this.salasSeleccionadas.set([salaDefecto]);

    const fBase = fechaPre || this.formatDateIso(new Date());
    this.formFecha.set(fBase);
    this.formHoraInicio.set(horaPre || '08:00');

    // Default del día de la semana para recurrencia según la fecha seleccionada en el calendario
    const fObj = new Date(fBase + 'T12:00:00');
    const dSem = fObj.getDay();
    this.formDiasSemana.set([dSem === 0 ? 1 : dSem]);

    // Hora fin por defecto 1h30 o 2h después
    if (horaPre) {
      const parts = horaPre.split(':');
      const h = parseInt(parts[0], 10);
      const m = parts[1] || '00';
      const finH = h + 2;
      this.formHoraFin.set(`${finH < 10 ? '0' + finH : finH}:${m}`);
    } else {
      this.formHoraFin.set('10:00');
    }

    this.formTema.set('');
    this.formCantAlumnos.set(25);
    this.formTipoReserva.set('CLASE');
    this.formProgramarSemestre.set(false);
    this.formFechaFinSemestre.set('');
    this.preseleccionarDocenteSiAplica();

    // Materia por defecto y texto del buscador
    if (this.materias().length > 0) {
      const mat = this.materias()[0];
      this.formMateriaId.set(mat.id_materia);
      this.buscadorMateria.set(`${mat.sigla} — ${mat.nombre}`);
    } else {
      this.formMateriaId.set(null);
      this.buscadorMateria.set('');
    }

    this.dropdownMateriaAbierto.set(false);
    this.modalSolicitarVisible.set(true);
    this.verificarDisponibilidadReactiva();
  }

  cerrarModalSolicitar(): void {
    this.modalSolicitarVisible.set(false);
    this.dropdownMateriaAbierto.set(false);
  }

  onFechaChange(nuevaFecha: string): void {
    this.formFecha.set(nuevaFecha);
    if (nuevaFecha) {
      const d = new Date(nuevaFecha + 'T12:00:00').getDay();
      const dSem = d === 0 ? 1 : d;
      if (this.formDiasSemana().length <= 1) {
        this.formDiasSemana.set([dSem]);
      }
    }
    this.verificarDisponibilidadReactiva();
  }

  toggleDiaSemana(dia: number): void {
    const curr = this.formDiasSemana();
    if (curr.includes(dia)) {
      if (curr.length > 1) {
        this.formDiasSemana.set(curr.filter((d) => d !== dia));
      }
    } else {
      this.formDiasSemana.set([...curr, dia].sort());
    }
  }

  // Verificación reactiva en tiempo real al cambiar sala, fecha u horarios
  verificarDisponibilidadReactiva(): void {
    const idSala = this.formSalaId();
    const fecha = this.formFecha();
    const hIni = this.formHoraInicio();
    const hFin = this.formHoraFin();

    if (!idSala || !fecha || !hIni || !hFin) {
      this.resultadoDisponibilidad.set(null);
      return;
    }

    const salas = this.salasSeleccionadas().length > 0 ? this.salasSeleccionadas() : [idSala];
    const cantTotal = Number(this.formCantAlumnos() || 0);
    const capTotal = this.capacidadTotalSeleccionada();

    if (cantTotal > capTotal) {
      this.resultadoDisponibilidad.set({
        disponible: false,
        mensaje: `${cantTotal} alumnos excede la capacidad combinada de las salas seleccionadas (${capTotal} puestos).`,
      });
      return;
    }

    // Cuota proporcional según la capacidad individual de la sala actual para no desbordar
    const salaActual = this.salas().find((s) => s.id_sala === idSala);
    const cuotaSala = salaActual
      ? Math.min(
          salaActual.cant_estudiantes,
          Math.max(1, Math.round(cantTotal * (salaActual.cant_estudiantes / Math.max(1, capTotal)))),
        )
      : Math.min(cantTotal, 20);

    this.verificandoDisponibilidad.set(true);
    this.reservasService
      .validarDisponibilidad(idSala, fecha, hIni, hFin, cuotaSala)
      .subscribe({
        next: (res) => {
          this.verificandoDisponibilidad.set(false);
          this.resultadoDisponibilidad.set(res);
        },
        error: (err) => {
          this.verificandoDisponibilidad.set(false);
          this.resultadoDisponibilidad.set({
            disponible: false,
            mensaje: err?.error?.message || 'Conflicto u horario no disponible',
          });
        },
      });
  }

  guardarSolicitud(): void {
    const errs: { [key: string]: string } = {};

    const salas = this.salasSeleccionadas().length > 0
      ? this.salasSeleccionadas()
      : (this.formSalaId() ? [Number(this.formSalaId())] : []);

    if (salas.length === 0) {
      errs['id_sala'] = 'Debe seleccionar al menos una sala de cómputo';
    }

    if (!this.formCodigoDocente()) {
      errs['codigo_docente'] = 'Debe indicar el docente responsable';
    }

    if (!this.formMateriaId()) {
      errs['id_materia'] = 'Debe seleccionar la materia';
    }

    if (!this.formFecha()) {
      errs['fecha_reserva'] = 'La fecha de la reserva es obligatoria';
    }

    if (!this.formHoraInicio() || !this.formHoraFin()) {
      errs['horario'] = 'Las horas de inicio y fin son obligatorias';
    }

    if (!this.formTema() || this.formTema().trim().length < 5) {
      errs['tema_practica'] = 'El tema debe contener al menos 5 caracteres';
    }

    if (!this.formCantAlumnos() || this.formCantAlumnos() < 1) {
      errs['cant_estimada_alumnos'] = 'Debe indicar al menos 1 alumno';
    }

    if (this.formProgramarSemestre()) {
      if (!this.formFechaFinSemestre()) {
        errs['fecha_fin_semestre'] = 'Indique la fecha de conclusión del semestre';
      } else if (this.formFechaFinSemestre() <= this.formFecha()) {
        errs['fecha_fin_semestre'] = 'La fecha de fin debe ser posterior a la fecha inicial';
      }
      if (this.formDiasSemana().length === 0) {
        errs['dias_semana'] = 'Seleccione al menos un día de la semana';
      }
    }

    const disp = this.resultadoDisponibilidad();
    if (disp && !disp.disponible) {
      errs['disponibilidad'] = disp.mensaje;
    }

    this.erroresForm.set(errs);
    if (Object.keys(errs).length > 0) {
      return;
    }

    this.guardandoSolicitud.set(true);
    this.errorSolicitud.set(null);

    const dto: SolicitarReservaDto = {
      id_sala: salas[0],
      ids_salas: salas.length > 1 ? salas : undefined,
      codigo_docente: this.formCodigoDocente(),
      id_materia: Number(this.formMateriaId()),
      fecha_reserva: this.formFecha(),
      hora_inicio: this.formHoraInicio(),
      hora_fin: this.formHoraFin(),
      tema_practica: this.formTema().trim(),
      cant_estimada_alumnos: Number(this.formCantAlumnos()),
      tipo_reserva: this.formTipoReserva(),
      fecha_fin_semestre: this.formProgramarSemestre() ? this.formFechaFinSemestre() : undefined,
      dias_semana: this.formProgramarSemestre() ? this.formDiasSemana() : undefined,
    };

    this.reservasService.solicitar(dto).subscribe({
      next: (creada) => {
        this.guardandoSolicitud.set(false);
        this.modalSolicitarVisible.set(false);
        const tipoLabel = this.formTipoReserva() === 'EXAMEN' ? 'Examen' : 'Cátedra';
        const multiLabel = salas.length > 1 ? ' Multi-Sala' : '';
        this.mostrarMensajeExito(
          `Solicitud de ${tipoLabel}${multiLabel} registrada exitosamente (#${creada.id_reserva}). Estado: PENDIENTE de aprobación por Jefatura.`,
        );
        this.cargarReservas();
      },
      error: (err) => {
        this.guardandoSolicitud.set(false);
        this.errorSolicitud.set(
          err?.error?.message || 'Error al registrar la solicitud de reserva',
        );
      },
    });
  }

  // Edición de reservas existentes
  puedeEditarReserva(r: ReservaSala): boolean {
    if (!r) return false;
    if (r.estado === 'CANCELADA' || r.estado === 'FINALIZADA') return false;
    if (this.authService.hasRole('ADMINISTRADOR')) return true;

    const user = this.authService.currentUser();
    const esTitular = Boolean(
      Number(r.docente?.id_usuario || r.docente?.usuario?.id_usuario) === Number(user?.id_usuario) ||
      (r.codigo_docente && this.formCodigoDocente() === r.codigo_docente)
    );

    return Boolean(this.authService.hasPermission('RESERVAS_SOLICITAR') && esTitular);
  }

  abrirModalEditar(reserva: ReservaSala): void {
    this.editandoReservaId.set(reserva.id_reserva);

    // Verificar si es multi-sala combinada
    const esGrupo = !!(
      reserva.id_grupo_multisala ||
      (reserva.salas_grupo && reserva.salas_grupo.length > 1)
    );
    this.editEsMultiSala.set(esGrupo);

    if (esGrupo && reserva.salas_grupo && reserva.salas_grupo.length > 0) {
      const ids = reserva.salas_grupo.map((sg) => sg.id_sala);
      this.editSalasSeleccionadas.set(ids);
      this.editSalaId.set(ids[0]);
    } else {
      this.editSalasSeleccionadas.set([reserva.id_sala]);
      this.editSalaId.set(reserva.id_sala);
    }

    this.editFecha.set(String(reserva.fecha_reserva).slice(0, 10));
    this.editHoraInicio.set(String(reserva.hora_inicio).slice(0, 5));
    this.editHoraFin.set(String(reserva.hora_fin).slice(0, 5));
    this.editTema.set(reserva.tema_practica || '');
    this.editCantAlumnos.set(reserva.cant_total_alumnos || reserva.cant_estimada_alumnos || 25);
    this.editTipoReserva.set((reserva.tipo_reserva as any) || 'CLASE');
    this.editObs.set('');
    this.errorEdicion.set(null);
    this.modalEditarVisible.set(true);
  }

  guardarEdicion(): void {
    const id = this.editandoReservaId();
    if (!id) return;

    if (!this.editTema() || this.editTema().trim().length < 5) {
      this.errorEdicion.set('El tema de la práctica debe tener al menos 5 caracteres');
      return;
    }

    if (!this.editCantAlumnos() || this.editCantAlumnos() < 1) {
      this.errorEdicion.set('Debe indicar una cantidad válida de alumnos');
      return;
    }

    const cap = this.capacidadTotalEdicion();
    if (cap > 0 && this.editCantAlumnos() > cap) {
      const salasNombres = this.editEsMultiSala()
        ? this.salasSeleccionadasEdicion().map((s) => s.codigo_sala).join(' + ')
        : (this.salaSeleccionadaEdicion()?.codigo_sala || 'la sala');
      this.errorEdicion.set(
        `La cantidad estimada (${this.editCantAlumnos()} alumnos) excede la capacidad combinada de ${salasNombres} (${cap} puestos)`,
      );
      return;
    }

    this.guardandoEdicion.set(true);
    this.errorEdicion.set(null);

    const idsSalas =
      this.editEsMultiSala() && this.editSalasSeleccionadas().length > 0
        ? this.editSalasSeleccionadas()
        : [Number(this.editSalaId())];

    const dto: EditarReservaDto = {
      id_sala: Number(idsSalas[0]),
      ids_salas: idsSalas,
      fecha_reserva: this.editFecha(),
      hora_inicio: this.editHoraInicio(),
      hora_fin: this.editHoraFin(),
      tema_practica: this.editTema().trim(),
      cant_estimada_alumnos: Number(this.editCantAlumnos()),
      tipo_reserva: this.editTipoReserva(),
      obs_edicion: this.editObs().trim() || undefined,
    };

    this.reservasService.editar(id, dto).subscribe({
      next: (actualizada) => {
        this.guardandoEdicion.set(false);
        this.modalEditarVisible.set(false);
        if (this.reservaDetalle() && this.reservaDetalle()?.id_reserva === id) {
          this.reservaDetalle.set(actualizada);
        }
        this.mostrarMensajeExito(`Reserva #${id} modificada exitosamente`);
        this.cargarReservas();
      },
      error: (err) => {
        this.guardandoEdicion.set(false);
        this.errorEdicion.set(err?.error?.message || 'Error al actualizar la reserva');
      },
    });
  }

  marcarComoLeida(r: ReservaSala): void {
    this.reservasService.marcarLeida(r.id_reserva).subscribe({
      next: (act) => {
        this.reservaDetalle.set(act);
        this.cargarReservas();
      },
      error: () => {},
    });
  }

  getCapacidadTotalGrupo(r: ReservaSala): number {
    if (r.salas_grupo && r.salas_grupo.length > 0) {
      return r.salas_grupo.reduce((acc, s) => acc + (s.capacidad || 0), 0);
    }
    return r.sala?.cant_estudiantes || 0;
  }

  // Helpers
  formatDateIso(d: Date): string {
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }

  puedeGestionar(): boolean {
    return this.authService.hasPermission('RESERVAS_GESTIONAR');
  }

  puedeCancelarReserva(r: ReservaSala): boolean {
    if (!r) return false;
    if (r.estado === 'CANCELADA' || r.estado === 'FINALIZADA') return false;
    // Si es administrador, NO usa cancelar; gestiona / rechaza formalmente
    if (this.authService.hasRole('ADMINISTRADOR')) return false;

    const user = this.authService.currentUser();
    const esTitular = Boolean(
      Number(r.docente?.id_usuario || r.docente?.usuario?.id_usuario) === Number(user?.id_usuario) ||
      (r.codigo_docente && this.formCodigoDocente() === r.codigo_docente)
    );

    return Boolean(this.authService.hasPermission('RESERVAS_CANCELAR') && esTitular);
  }
}
