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
  ConsultarReservasFiltroDto,
  ResponderReservaDto,
  SolicitarReservaDto,
  EditarReservaDto,
  SalaSimple,
  DocenteSimple,
  MateriaSimple,
  ResultadoValidacionDisponibilidad,
} from '../../../core/services/reservas.service';
import { AuthService } from '../../../core/services/auth.service';
import { HttpClient } from '@angular/common/http';
import { PaginationComponent } from '../../../shared/components/pagination/pagination.component';
import { ModalAlertComponent } from '../../../shared/components/modal-alert/modal-alert.component';

@Component({
  selector: 'app-bandeja-gestion-reservas',
  standalone: true,
  imports: [CommonModule, FormsModule, PaginationComponent, ModalAlertComponent],
  templateUrl: './bandeja-gestion-reservas.component.html',
  styleUrls: ['./bandeja-gestion-reservas.component.css'],
})
export class BandejaGestionReservasComponent implements OnInit {
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

  // Paginación estándar de 15 filas
  paginaActual = signal<number>(1);
  totalRegistros = signal<number>(0);
  readonly limitePagina = 15;

  // Filtros de búsqueda
  filtroBusqueda = signal<string>('');
  filtroSala = signal<number | undefined>(undefined);
  filtroEstado = signal<string | undefined>(undefined);
  filtroFechaDesde = signal<string>('');
  filtroFechaHasta = signal<string>('');

  // Modales
  modalDetalleVisible = signal<boolean>(false);
  reservaSeleccionada = signal<ReservaSala | null>(null);

  modalDictamenVisible = signal<boolean>(false);
  accionDictamen = signal<'APROBAR' | 'RECHAZAR'>('APROBAR');
  dictamenObs = signal<string>('');
  errorDictamen = signal<string | null>(null);
  guardandoDictamen = signal<boolean>(false);

  modalCancelarVisible = signal<boolean>(false);
  motivoCancelacion = signal<string>('');
  errorCancelar = signal<string | null>(null);
  guardandoCancelar = signal<boolean>(false);

  // Modal Nueva Reserva
  modalNuevaVisible = signal<boolean>(false);
  guardandoNueva = signal<boolean>(false);
  errorNueva = signal<string | null>(null);

  formSalaId = signal<number | null>(null);
  salasSeleccionadas = signal<number[]>([]);
  formCodigoDocente = signal<string>('');
  formMateriaId = signal<number | null>(null);
  formFecha = signal<string>('');
  formHoraInicio = signal<string>('08:00');
  formHoraFin = signal<string>('10:00');
  formTema = signal<string>('');
  formCantAlumnos = signal<number>(20);
  formTipoReserva = signal<'CLASE' | 'EXAMEN'>('CLASE');
  formProgramarSemestre = signal<boolean>(false);
  formFechaFinSemestre = signal<string>('');
  formDiasSemana = signal<number[]>([3]);

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

  // Computadas
  esUsuarioDocente = computed<boolean>(() => {
    const user = this.authService.currentUser();
    return !!(user && user.roles?.includes('DOCENTE') && !user.roles?.includes('ADMINISTRADOR'));
  });

  docenteActual = computed<DocenteSimple | null>(() => {
    const cod = this.formCodigoDocente();
    if (!cod) return null;
    return this.docentes().find((d) => d.codigo === cod) || null;
  });

  materiasFiltradas = computed<MateriaSimple[]>(() => {
    const q = this.buscadorMateria().trim().toLowerCase();
    if (!q) return this.materias();
    return this.materias().filter(
      (m) => m.sigla.toLowerCase().includes(q) || m.nombre.toLowerCase().includes(q),
    );
  });

  materiaSeleccionada = computed<MateriaSimple | null>(() => {
    const id = this.formMateriaId();
    if (!id) return null;
    return this.materias().find((m) => m.id_materia === id) || null;
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

  resultadoDisponibilidad = signal<ResultadoValidacionDisponibilidad | null>(null);
  erroresForm = signal<{ [key: string]: string }>({});

  readonly fechaMinimaHoy = this.formatDateIso(new Date());

  // Conteo de métricas
  conteoPendientes = signal<number>(0);
  conteoAprobadas = signal<number>(0);
  conteoRechazadas = signal<number>(0);

  ngOnInit(): void {
    this.cargarCatalogos();
    this.buscar();

    // Sincronización en tiempo real vía WebSocket
    this.reservasService.onReservasActualizadas().subscribe(() => {
      this.cargarDatos();
    });
  }

  cargarCatalogos(): void {
    this.http.get<any>(`${this.apiUrl}/salas`).subscribe({
      next: (data) => {
        const lista = Array.isArray(data) ? data : data.data || [];
        this.salas.set(lista);
      },
    });

    this.http.get<any>(`${this.apiUrl}/docentes?todos=true`).subscribe({
      next: (data) => {
        const lista = Array.isArray(data) ? data : data.data || [];
        this.docentes.set(lista);
      },
    });

    this.http.get<any>(`${this.apiUrl}/catalogos/materias?todos=true`).subscribe({
      next: (data) => {
        const lista = Array.isArray(data) ? data : data.data || [];
        this.materias.set(lista);
      },
    });
  }

  buscar(): void {
    this.paginaActual.set(1);
    this.cargarDatos();
  }

  limpiarFiltros(): void {
    this.filtroBusqueda.set('');
    this.filtroSala.set(undefined);
    this.filtroEstado.set(undefined);
    this.filtroFechaDesde.set('');
    this.filtroFechaHasta.set('');
    this.paginaActual.set(1);
    this.cargarDatos();
  }

  cambiarPagina(nuevaPagina: number): void {
    this.paginaActual.set(nuevaPagina);
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.cargando.set(true);

    const filtros: ConsultarReservasFiltroDto = {
      pagina: this.paginaActual(),
      limite: this.limitePagina,
      busqueda: this.filtroBusqueda()?.trim() || undefined,
      id_sala: this.filtroSala(),
      estado: this.filtroEstado(),
      fecha_desde: this.filtroFechaDesde() || undefined,
      fecha_hasta: this.filtroFechaHasta() || undefined,
    };

    this.reservasService.listar(filtros).subscribe({
      next: (res) => {
        this.reservas.set(res.data || []);
        this.totalRegistros.set(res.total || 0);
        this.cargando.set(false);
        this.calcularContadores(res.data || []);
      },
      error: (err) => {
        this.cargando.set(false);
        this.mensajeError.set(err?.error?.message || 'Error al cargar listado de solicitudes');
      },
    });
  }

  private calcularContadores(lista: ReservaSala[]): void {
    let p = 0;
    let a = 0;
    let r = 0;
    for (const item of lista) {
      if (item.estado === 'PENDIENTE') p++;
      else if (item.estado === 'APROBADA') a++;
      else if (item.estado === 'RECHAZADA' || item.estado === 'CANCELADA') r++;
    }
    this.conteoPendientes.set(p);
    this.conteoAprobadas.set(a);
    this.conteoRechazadas.set(r);
  }

  // Ver Detalle
  abrirModalDetalle(reserva: ReservaSala): void {
    this.reservaSeleccionada.set(reserva);
    this.modalDetalleVisible.set(true);
  }

  cerrarModalDetalle(): void {
    this.modalDetalleVisible.set(false);
  }

  // Dictamen (Aprobar / Rechazar)
  abrirModalDictamen(reserva: ReservaSala, accion: 'APROBAR' | 'RECHAZAR'): void {
    this.reservaSeleccionada.set(reserva);
    this.accionDictamen.set(accion);
    this.dictamenObs.set(
      accion === 'APROBAR' ? 'Aprobada formalmente por Jefatura' : '',
    );
    this.errorDictamen.set(null);
    this.modalDictamenVisible.set(true);
  }

  confirmarDictamen(): void {
    const r = this.reservaSeleccionada();
    if (!r) return;

    if (
      this.accionDictamen() === 'RECHAZAR' &&
      (!this.dictamenObs() || this.dictamenObs().trim() === '')
    ) {
      this.errorDictamen.set('Debe indicar obligatoriamente el motivo del rechazo');
      return;
    }

    this.guardandoDictamen.set(true);
    this.errorDictamen.set(null);

    const dto: ResponderReservaDto = {
      accion: this.accionDictamen(),
      obs_resolucion: this.dictamenObs().trim(),
    };

    this.reservasService.gestionar(r.id_reserva, dto).subscribe({
      next: (actualizada) => {
        this.guardandoDictamen.set(false);
        this.modalDictamenVisible.set(false);
        this.mensajeExito.set(
          `Reserva #${actualizada.id_reserva} ha sido ${actualizada.estado.toLowerCase()} exitosamente`,
        );
        this.cargarDatos();
      },
      error: (err) => {
        this.guardandoDictamen.set(false);
        this.errorDictamen.set(err?.error?.message || 'Error al procesar la resolución');
      },
    });
  }

  // Cancelar
  abrirModalCancelar(reserva: ReservaSala): void {
    this.reservaSeleccionada.set(reserva);
    this.motivoCancelacion.set('');
    this.errorCancelar.set(null);
    this.modalCancelarVisible.set(true);
  }

  confirmarCancelar(): void {
    const r = this.reservaSeleccionada();
    if (!r) return;

    this.guardandoCancelar.set(true);
    this.errorCancelar.set(null);

    this.reservasService.cancelar(r.id_reserva, this.motivoCancelacion()).subscribe({
      next: (actualizada) => {
        this.guardandoCancelar.set(false);
        this.modalCancelarVisible.set(false);
        this.mensajeExito.set(`Reserva #${actualizada.id_reserva} cancelada exitosamente`);
        this.cargarDatos();
      },
      error: (err) => {
        this.guardandoCancelar.set(false);
        this.errorCancelar.set(err?.error?.message || 'Error al cancelar la reserva');
      },
    });
  }

  // Helpers
  getNombreDocente(d: DocenteSimple): string {
    if (!d) return '';
    const nom = d.nombres
      ? `${d.apellidos || ''} ${d.nombres}`.trim()
      : (d.usuario ? `${d.usuario.apellidos || ''} ${d.usuario.nombres}`.trim() : '');
    return nom ? `${nom} (${d.codigo})` : d.codigo;
  }

  getNombreDocenteReserva(r: ReservaSala): string {
    if (!r) return '';
    if (r.docente) {
      const nom = r.docente.nombres
        ? `${r.docente.apellidos || ''} ${r.docente.nombres}`.trim()
        : (r.docente.usuario ? `${r.docente.usuario.apellidos || ''} ${r.docente.usuario.nombres}`.trim() : '');
      if (nom) return `${nom} (${r.codigo_docente})`;
    }
    return r.codigo_docente;
  }

  toggleSala(idSala: number): void {
    const current = this.salasSeleccionadas();
    if (current.includes(idSala)) {
      if (current.length > 1) {
        this.salasSeleccionadas.set(current.filter((id) => id !== idSala));
      }
    } else {
      this.salasSeleccionadas.set([...current, idSala]);
    }
    if (this.salasSeleccionadas().length > 0) {
      this.formSalaId.set(this.salasSeleccionadas()[0]);
    }
    this.verificarDisponibilidadReactiva();
  }

  esSalaSeleccionada(idSala: number): boolean {
    return this.salasSeleccionadas().includes(idSala);
  }

  seleccionarMateria(m: MateriaSimple): void {
    this.formMateriaId.set(m.id_materia);
    this.buscadorMateria.set(`${m.sigla} — ${m.nombre}`);
    this.dropdownMateriaAbierto.set(false);
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
    } else if (!user.roles?.includes('DOCENTE') && this.docentes().length > 0 && !this.formCodigoDocente()) {
      this.formCodigoDocente.set(this.docentes()[0].codigo);
    }
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

  // Modal Nueva Reserva
  abrirModalNueva(): void {
    this.errorNueva.set(null);
    this.erroresForm.set({});
    this.resultadoDisponibilidad.set(null);

    const salaDefecto = this.salas()[0]?.id_sala ?? 1;
    this.formSalaId.set(salaDefecto);
    this.salasSeleccionadas.set([salaDefecto]);

    this.formFecha.set(this.formatDateIso(new Date()));
    this.formHoraInicio.set('08:00');
    this.formHoraFin.set('10:00');
    this.formTema.set('');
    this.formCantAlumnos.set(25);
    this.formTipoReserva.set('CLASE');
    this.formProgramarSemestre.set(false);
    this.formFechaFinSemestre.set('');
    this.formDiasSemana.set([3]);

    this.preseleccionarDocenteSiAplica();

    if (this.materias().length > 0) {
      const mat = this.materias()[0];
      this.formMateriaId.set(mat.id_materia);
      this.buscadorMateria.set(`${mat.sigla} — ${mat.nombre}`);
    } else {
      this.formMateriaId.set(null);
      this.buscadorMateria.set('');
    }

    this.dropdownMateriaAbierto.set(false);
    this.modalNuevaVisible.set(true);
    this.verificarDisponibilidadReactiva();
  }

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

    const alumnosPorSala = Math.max(1, Math.ceil(cantTotal / salas.length));

    this.reservasService
      .validarDisponibilidad(idSala, fecha, hIni, hFin, alumnosPorSala)
      .subscribe({
        next: (res) => this.resultadoDisponibilidad.set(res),
        error: (err) => {
          this.resultadoDisponibilidad.set({
            disponible: false,
            mensaje: err?.error?.message || 'Conflicto u horario no disponible',
          });
        },
      });
  }

  guardarNueva(): void {
    const errs: { [key: string]: string } = {};

    const salas = this.salasSeleccionadas().length > 0
      ? this.salasSeleccionadas()
      : (this.formSalaId() ? [Number(this.formSalaId())] : []);

    if (salas.length === 0) errs['id_sala'] = 'Debe seleccionar al menos una sala de cómputo';
    if (!this.formCodigoDocente()) errs['codigo_docente'] = 'Debe indicar el docente';
    if (!this.formMateriaId()) errs['id_materia'] = 'Debe seleccionar la materia';
    if (!this.formFecha()) errs['fecha_reserva'] = 'La fecha es obligatoria';
    if (!this.formHoraInicio() || !this.formHoraFin()) errs['horario'] = 'El horario es obligatorio';
    if (!this.formTema() || this.formTema().trim().length < 5) {
      errs['tema_practica'] = 'El tema debe contener al menos 5 caracteres';
    }
    if (!this.formCantAlumnos() || this.formCantAlumnos() < 1) {
      errs['cant_estimada_alumnos'] = 'Indique al menos 1 alumno';
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
    if (Object.keys(errs).length > 0) return;

    this.guardandoNueva.set(true);
    this.errorNueva.set(null);

    const alumnosPorSala = Math.max(1, Math.ceil(Number(this.formCantAlumnos()) / salas.length));

    if (salas.length === 1) {
      const dto: SolicitarReservaDto = {
        id_sala: Number(salas[0]),
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
          this.guardandoNueva.set(false);
          this.modalNuevaVisible.set(false);
          this.mensajeExito.set(
            `Solicitud #${creada.id_reserva} registrada exitosamente en estado PENDIENTE`,
          );
          this.cargarDatos();
        },
        error: (err) => {
          this.guardandoNueva.set(false);
          this.errorNueva.set(err?.error?.message || 'Error al registrar solicitud');
        },
      });
    } else {
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
              this.guardandoNueva.set(false);
              this.modalNuevaVisible.set(false);
              this.mensajeExito.set(
                `Se registraron exitosamente las solicitudes para las ${salas.length} salas seleccionadas en estado PENDIENTE.`,
              );
              this.cargarDatos();
            }
          },
          error: (err) => {
            errorOcurrido = err?.error?.message || 'Error al solicitar una de las salas';
            this.guardandoNueva.set(false);
            this.errorNueva.set(errorOcurrido);
          },
        });
      }
    }
  }

  // Edición y Control de Permisos
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

  puedeCancelarReserva(r: ReservaSala): boolean {
    if (!r) return false;
    if (r.estado === 'CANCELADA' || r.estado === 'FINALIZADA') return false;
    if (this.authService.hasRole('ADMINISTRADOR')) return false;

    const user = this.authService.currentUser();
    const esTitular = Boolean(
      Number(r.docente?.id_usuario || r.docente?.usuario?.id_usuario) === Number(user?.id_usuario) ||
      (r.codigo_docente && this.formCodigoDocente() === r.codigo_docente)
    );

    return Boolean(this.authService.hasPermission('RESERVAS_CANCELAR') && esTitular);
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
        if (this.reservaSeleccionada() && this.reservaSeleccionada()?.id_reserva === id) {
          this.reservaSeleccionada.set(actualizada);
        }
        this.mensajeExito.set(`Reserva #${id} modificada exitosamente`);
        this.cargarDatos();
      },
      error: (err) => {
        this.guardandoEdicion.set(false);
        this.errorEdicion.set(err?.error?.message || 'Error al actualizar la reserva');
      },
    });
  }

  private formatDateIso(d: Date): string {
    const anio = d.getFullYear();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${anio}-${mes}-${dia}`;
  }
}
