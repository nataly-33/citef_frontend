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

  // Filtros de navegación
  salaSeleccionadaId = signal<number | undefined>(undefined);
  modoVista = signal<ModoVistaCalendario>('semana');
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
  editFecha = signal<string>('');
  editHoraInicio = signal<string>('08:00');
  editHoraFin = signal<string>('10:00');
  editTema = signal<string>('');
  editCantAlumnos = signal<number>(25);
  editTipoReserva = signal<'CLASE' | 'EXAMEN'>('CLASE');
  editObs = signal<string>('');

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

  // Obtener la reserva que INICIA exactamente en este slot (Garantiza UNA SOLA etiqueta)
  getReservaQueIniciaEnSlot(fechaStr: string, slotStr: string): ReservaSala | null {
    const r = this.reservas().find((res) => {
      if (res.fecha_reserva !== fechaStr) return false;
      // Excluir canceladas y rechazadas para que el horario quede limpio y sin sobreposiciones
      if (res.estado === 'CANCELADA' || res.estado === 'RECHAZADA') {
        if (!this.mostrarCanceladas()) return false;
      }
      return this.horaToSlot(res.hora_inicio) === slotStr;
    });
    return r || null;
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

    const dias = this.diasSemana();
    const fechaDesde = dias[0]?.fechaStr;
    const fechaHasta = dias[dias.length - 1]?.fechaStr;

    this.reservasService
      .obtenerParaCalendario(this.salaSeleccionadaId(), fechaDesde, fechaHasta)
      .subscribe({
        next: (data) => {
          this.reservas.set(data || []);
          this.cargando.set(false);
        },
        error: (err) => {
          this.mensajeError.set(err?.error?.message || 'Error al cargar las reservas del calendario');
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
    };

    this.reservasService.gestionar(r.id_reserva, dto).subscribe({
      next: (actualizada) => {
        this.guardandoDictamen.set(false);
        this.modalDictamenVisible.set(false);
        this.reservaDetalle.set(actualizada);
        this.mensajeExito.set(
          `Reserva ${actualizada.id_reserva} ha sido ${actualizada.estado.toLowerCase()} exitosamente`,
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
        this.mensajeExito.set(`Reserva ${r.id_reserva} cancelada exitosamente`);
        this.cargarReservas();
      },
      error: (err) => {
        this.guardandoCancelacion.set(false);
        this.errorCancelar.set(err?.error?.message || 'Error al cancelar la reserva');
      },
    });
  }

  // Solicitar Nueva Reserva
  abrirModalSolicitar(fechaPre?: string, horaPre?: string): void {
    this.errorSolicitud.set(null);
    this.erroresForm.set({});
    this.resultadoDisponibilidad.set(null);

    // Inicializar sala y salas seleccionadas
    const salaDefecto = this.salaSeleccionadaId() || (this.salas()[0]?.id_sala ?? 1);
    this.formSalaId.set(salaDefecto);
    this.salasSeleccionadas.set([salaDefecto]);

    this.formFecha.set(fechaPre || this.formatDateIso(new Date()));
    this.formHoraInicio.set(horaPre || '08:00');

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
    this.formDiasSemana.set([3]);
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

    // Si hay múltiples salas seleccionadas (ej. 24 + 10 = 34 puestos),
    // validar primero contra la capacidad total combinada antes de rechazar
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

    // Proporción por sala para la consulta de colisión de horario individual
    const alumnosPorSala = Math.max(1, Math.ceil(cantTotal / salas.length));

    this.verificandoDisponibilidad.set(true);
    this.reservasService
      .validarDisponibilidad(idSala, fecha, hIni, hFin, alumnosPorSala)
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

    const alumnosPorSala = Math.max(1, Math.ceil(Number(this.formCantAlumnos()) / salas.length));

    // Si es solo 1 sala
    if (salas.length === 1) {
      const dto: SolicitarReservaDto = {
        id_sala: salas[0],
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
          this.mensajeExito.set(
            `Solicitud de reserva registrada exitosamente (#${creada.id_reserva}). Estado: PENDIENTE de aprobación por Jefatura.`,
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
    } else {
      // Múltiples salas para cátedras numerosas (>30 alumnos)
      let completadas = 0;
      let errorOcurrido: string | null = null;

      for (const idSala of salas) {
        const dto: SolicitarReservaDto = {
          id_sala: idSala,
          codigo_docente: this.formCodigoDocente(),
          id_materia: Number(this.formMateriaId()),
          fecha_reserva: this.formFecha(),
          hora_inicio: this.formHoraInicio(),
          hora_fin: this.formHoraFin(),
          tema_practica: `${this.formTema().trim()} (Cátedra multi-sala)`,
          cant_estimada_alumnos: alumnosPorSala,
          tipo_reserva: this.formTipoReserva(),
          fecha_fin_semestre: this.formProgramarSemestre() ? this.formFechaFinSemestre() : undefined,
          dias_semana: this.formProgramarSemestre() ? this.formDiasSemana() : undefined,
        };

        this.reservasService.solicitar(dto).subscribe({
          next: () => {
            completadas++;
            if (completadas === salas.length) {
              this.guardandoSolicitud.set(false);
              this.modalSolicitarVisible.set(false);
              this.mensajeExito.set(
                `Se registraron exitosamente las solicitudes para las ${salas.length} salas seleccionadas. Estado: PENDIENTE de aprobación.`,
              );
              this.cargarReservas();
            }
          },
          error: (err) => {
            errorOcurrido = err?.error?.message || 'Error al solicitar una de las salas seleccionadas';
            this.guardandoSolicitud.set(false);
            this.errorSolicitud.set(errorOcurrido);
          },
        });
      }
    }
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
    this.editSalaId.set(reserva.id_sala);
    this.editFecha.set(String(reserva.fecha_reserva).slice(0, 10));
    this.editHoraInicio.set(String(reserva.hora_inicio).slice(0, 5));
    this.editHoraFin.set(String(reserva.hora_fin).slice(0, 5));
    this.editTema.set(reserva.tema_practica || '');
    this.editCantAlumnos.set(reserva.cant_estimada_alumnos || 25);
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

    this.guardandoEdicion.set(true);
    this.errorEdicion.set(null);

    const dto: EditarReservaDto = {
      id_sala: Number(this.editSalaId()),
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
        this.mensajeExito.set(`Reserva #${id} modificada exitosamente`);
        this.cargarReservas();
      },
      error: (err) => {
        this.guardandoEdicion.set(false);
        this.errorEdicion.set(err?.error?.message || 'Error al actualizar la reserva');
      },
    });
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
