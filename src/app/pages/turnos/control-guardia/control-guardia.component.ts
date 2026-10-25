import { Component, OnInit, OnDestroy, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule, Router } from '@angular/router';
import {
  TurnosService,
  JornadaTurno,
  ActaRelevo,
  ChecklistApertura,
  ChecklistCierre,
  AbrirTurnoDto,
  CerrarTurnoDto,
  FirmarActaDto,
  SalaDashboardItem,
  AuxiliarParaRelevo,
} from '../../../core/services/turnos.service';
import { InfraestructuraService, SalaItem } from '../../../core/services/infraestructura.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ConfirmModalComponent,
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
} from '../../../shared/components';

@Component({
  selector: 'app-control-guardia',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    ConfirmModalComponent,
    PaginationComponent,
    ModalAlertComponent,
    TableCardComponent,
  ],
  templateUrl: './control-guardia.component.html',
  styleUrls: ['./control-guardia.component.css'],
})
export class ControlGuardiaComponent implements OnInit, OnDestroy {
  private readonly turnosService = inject(TurnosService);
  private readonly infraService = inject(InfraestructuraService);
  readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  // Rol del usuario actual
  esAdmin = computed(() => {
    return this.authService.hasRole('ADMINISTRADOR');
  });

  nombreAuxiliarResponsable = computed(() => {
    const j = this.jornadaActiva();
    if (j?.usuario_auxiliar) {
      return `${j.usuario_auxiliar.nombres} ${j.usuario_auxiliar.apellidos}`;
    }
    const u = this.authService.currentUser();
    return u ? `${u.nombres} ${u.apellidos}` : 'Auxiliar Responsable';
  });

  // Pestaña activa: Historial de Guardias o Actas de Relevo
  tabActiva = signal<'HISTORIAL' | 'ACTAS'>('HISTORIAL');

  // Estados reactivos principales
  cargando = signal<boolean>(false);
  jornadaActiva = signal<JornadaTurno | null>(null);

  // Supervisión en vivo de salas (para Administrador)
  salasDashboard = signal<SalaDashboardItem[]>([]);
  cargandoDashboard = signal<boolean>(false);

  // Historial de Jornadas
  jornadas = signal<JornadaTurno[]>([]);
  totalJornadas = signal<number>(0);
  paginaJornadas = signal<number>(1);

  // Actas de Relevo
  actas = signal<ActaRelevo[]>([]);
  totalActas = signal<number>(0);
  paginaActas = signal<number>(1);

  readonly limite = 15;

  // Catálogos
  salas = signal<SalaItem[]>([]);
  auxiliares = signal<AuxiliarParaRelevo[]>([]);

  // Excluir al usuario actual del selector de relevo entrante
  auxiliaresDisponibles = computed(() => {
    const miId = this.authService.currentUser()?.id_usuario;
    return this.auxiliares().filter((a) => Number(a.id_usuario) !== Number(miId));
  });

  // Notificaciones y alertas globales
  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  // Temporizador en vivo
  tiempoTranscurrido = signal<string>('00:00:00');
  private timerInterval: any = null;

  // Filtros Historial de Guardias
  filtroSalaGuardia = signal<number | null>(null);
  filtroFechaGuardia = signal<string>('');
  filtroEstadoGuardia = signal<string>('TODOS');

  // Filtros Actas de Relevo
  filtroBusquedaActas = signal<string>('');
  filtroSalaActas = signal<number | null>(null);
  filtroFechaActas = signal<string>('');
  filtroSoloPendientesActas = signal<boolean>(false);

  // Modales
  mostrarModalApertura = signal<boolean>(false);
  mostrarModalCierre = signal<boolean>(false);
  mostrarModalDetalleJornada = signal<boolean>(false);
  mostrarModalEditarObsJornada = signal<boolean>(false);
  mostrarConfirmEliminarJornada = signal<boolean>(false);

  mostrarModalVerActa = signal<boolean>(false);
  mostrarModalFirmarActa = signal<boolean>(false);
  mostrarModalEditarActa = signal<boolean>(false);
  mostrarConfirmEliminarActa = signal<boolean>(false);

  // Formulario Apertura
  aperturaForm = {
    id_sala: null as number | null,
    luces: true,
    orden_limpieza: true,
    aire_acondicionado: true,
    proyector: true,
    pcs_encendidas: 20,
    observaciones: '',
  };
  formErrorsApertura = signal<{ [key: string]: string }>({});
  modalAlertApertura = signal<string | null>(null);

  // Formulario Cierre (opciones desmarcadas por defecto para flexibilidad de turnos)
  cierreForm = {
    luces_apagadas: false,
    aire_apagado: false,
    proyector_apagado: false,
    pcs_apagadas: false,
    orden_verificado: false,
    observaciones: '',
    id_usuario_entrante: null as number | null,
  };
  formErrorsCierre = signal<{ [key: string]: string }>({});
  modalAlertCierre = signal<string | null>(null);

  // Formulario Firma de Acta
  firmaForm = {
    conforme: true,
    obs_discrepancia: '',
  };
  formErrorsFirma = signal<{ [key: string]: string }>({});
  modalAlertFirma = signal<string | null>(null);

  // Formulario Edición de Acta
  edicionActaForm = {
    novedades: '',
    obs_discrepancia: '',
  };

  // Elementos seleccionados para modal
  jornadaSeleccionada = signal<JornadaTurno | null>(null);
  observacionEdicionJornada = signal<string>('');
  jornadaAEliminar = signal<JornadaTurno | null>(null);

  actaSeleccionada = signal<ActaRelevo | null>(null);
  actaAEliminar = signal<ActaRelevo | null>(null);

  ngOnInit(): void {
    this.cargarSalas();
    this.cargarAuxiliares();

    if (this.esAdmin()) {
      this.cargarDashboardSalas();
    } else {
      this.consultarJornadaActiva();
    }

    this.cargarHistorialJornadas();
    this.cargarActas();
  }

  ngOnDestroy(): void {
    this.detenerTemporizador();
  }

  // ================= CATÁLOGOS =================
  cargarSalas(): void {
    this.infraService.getSalas({ activo: true }).subscribe({
      next: (res) => this.salas.set(res || []),
      error: () => this.salas.set([]),
    });
  }

  cargarAuxiliares(): void {
    this.turnosService.getAuxiliaresParaRelevo().subscribe({
      next: (res) => this.auxiliares.set(res || []),
      error: () => this.auxiliares.set([]),
    });
  }

  // ================= DASHBOARD SALAS (ADMIN) =================
  cargarDashboardSalas(): void {
    this.cargandoDashboard.set(true);
    this.turnosService.getDashboardSalas().subscribe({
      next: (data) => {
        this.salasDashboard.set(data || []);
        this.cargandoDashboard.set(false);
      },
      error: (err) => {
        console.error('Error cargando dashboard de supervisión de salas', err);
        this.salasDashboard.set([]);
        this.cargandoDashboard.set(false);
      },
    });
  }

  // ================= JORNADA ACTIVA (AUXILIAR) =================
  consultarJornadaActiva(): void {
    this.turnosService.getJornadaActiva().subscribe({
      next: (jornada) => {
        this.jornadaActiva.set(jornada);
        if (jornada && jornada.estado === 'EN_CURSO') {
          this.iniciarTemporizador(jornada.hora_apertura);
        } else {
          this.detenerTemporizador();
        }
      },
      error: () => {
        this.jornadaActiva.set(null);
        this.detenerTemporizador();
      },
    });
  }

  // Temporizador
  private iniciarTemporizador(horaInicioIso: string): void {
    this.detenerTemporizador();
    const inicio = new Date(horaInicioIso).getTime();

    const actualizar = () => {
      const ahora = Date.now();
      const diffMs = Math.max(0, ahora - inicio);
      const totalSeg = Math.floor(diffMs / 1000);
      const horas = Math.floor(totalSeg / 3600);
      const mins = Math.floor((totalSeg % 3600) / 60);
      const segs = totalSeg % 60;
      const pad = (n: number) => n.toString().padStart(2, '0');
      this.tiempoTranscurrido.set(`${pad(horas)}:${pad(mins)}:${pad(segs)}`);
    };

    actualizar();
    this.timerInterval = setInterval(actualizar, 1000);
  }

  private detenerTemporizador(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
    this.tiempoTranscurrido.set('00:00:00');
  }

  // ================= HISTORIAL DE GUARDIAS =================
  cargarHistorialJornadas(): void {
    this.cargando.set(true);
    this.turnosService
      .getJornadas({
        pagina: this.paginaJornadas(),
        limite: this.limite,
        id_sala: this.filtroSalaGuardia() || undefined,
        fecha: this.filtroFechaGuardia() || undefined,
        estado: this.filtroEstadoGuardia(),
      })
      .subscribe({
        next: (resp) => {
          this.jornadas.set(resp?.data || (resp as any)?.items || []);
          this.totalJornadas.set(resp?.total || 0);
          this.cargando.set(false);
        },
        error: (err) => {
          console.error('Error cargando historial de jornadas', err);
          this.jornadas.set([]);
          this.totalJornadas.set(0);
          this.cargando.set(false);
        },
      });
  }

  aplicarFiltrosGuardias(): void {
    this.paginaJornadas.set(1);
    this.cargarHistorialJornadas();
  }

  limpiarFiltrosGuardias(): void {
    this.filtroSalaGuardia.set(null);
    this.filtroFechaGuardia.set('');
    this.filtroEstadoGuardia.set('TODOS');
    this.paginaJornadas.set(1);
    this.cargarHistorialJornadas();
  }

  cambiarPaginaJornadas(pag: number): void {
    this.paginaJornadas.set(pag);
    this.cargarHistorialJornadas();
  }

  // ================= HISTORIAL DE ACTAS DE RELEVO =================
  cargarActas(): void {
    this.turnosService
      .getActas({
        pagina: this.paginaActas(),
        limite: this.limite,
        id_sala: this.filtroSalaActas() || undefined,
        fecha: this.filtroFechaActas() || undefined,
        solo_pendientes_firma: this.filtroSoloPendientesActas() || undefined,
        busqueda: this.filtroBusquedaActas().trim() || undefined,
      })
      .subscribe({
        next: (resp) => {
          this.actas.set(resp?.data || (resp as any)?.items || []);
          this.totalActas.set(resp?.total || 0);
        },
        error: (err) => {
          console.error('Error cargando actas de relevo', err);
          this.actas.set([]);
          this.totalActas.set(0);
        },
      });
  }

  aplicarFiltrosActas(): void {
    this.paginaActas.set(1);
    this.cargarActas();
  }

  limpiarFiltrosActas(): void {
    this.filtroBusquedaActas.set('');
    this.filtroSalaActas.set(null);
    this.filtroFechaActas.set('');
    this.filtroSoloPendientesActas.set(false);
    this.paginaActas.set(1);
    this.cargarActas();
  }

  cambiarPaginaActas(pag: number): void {
    this.paginaActas.set(pag);
    this.cargarActas();
  }

  cambiarTab(tab: 'HISTORIAL' | 'ACTAS'): void {
    this.tabActiva.set(tab);
    if (tab === 'HISTORIAL') {
      this.cargarHistorialJornadas();
    } else {
      this.cargarActas();
    }
  }

  // ================= MODAL APERTURA DE GUARDIA =================
  abrirModalApertura(): void {
    this.formErrorsApertura.set({});
    this.modalAlertApertura.set(null);
    this.aperturaForm = {
      id_sala: this.salas().length > 0 ? this.salas()[0].id_sala : null,
      luces: true,
      orden_limpieza: true,
      aire_acondicionado: true,
      proyector: true,
      pcs_encendidas: 20,
      observaciones: '',
    };
    this.mostrarModalApertura.set(true);
  }

  cerrarModalApertura(): void {
    this.mostrarModalApertura.set(false);
  }

  confirmarApertura(): void {
    this.formErrorsApertura.set({});
    this.modalAlertApertura.set(null);

    const errores: { [key: string]: string } = {};
    if (!this.aperturaForm.id_sala) {
      errores['id_sala'] = 'Debe seleccionar un laboratorio para la guardia.';
    }
    if (this.aperturaForm.pcs_encendidas === null || this.aperturaForm.pcs_encendidas < 0) {
      errores['pcs_encendidas'] = 'La cantidad de computadoras no puede ser negativa.';
    }

    if (Object.keys(errores).length > 0) {
      this.formErrorsApertura.set(errores);
      return;
    }

    const payload: AbrirTurnoDto = {
      id_sala: Number(this.aperturaForm.id_sala),
      checklist_apertura: {
        luces: Boolean(this.aperturaForm.luces),
        orden: Boolean(this.aperturaForm.orden_limpieza),
        orden_limpieza: Boolean(this.aperturaForm.orden_limpieza),
        aire: Boolean(this.aperturaForm.aire_acondicionado),
        aire_acondicionado: Boolean(this.aperturaForm.aire_acondicionado),
        proyector: Boolean(this.aperturaForm.proyector),
        pcs_encendidas: Number(this.aperturaForm.pcs_encendidas),
        observacion: this.aperturaForm.observaciones.trim() || undefined,
        observaciones: this.aperturaForm.observaciones.trim() || undefined,
      } as any,
    };

    this.cargando.set(true);
    this.turnosService.abrirTurno(payload).subscribe({
      next: () => {
        this.cargando.set(false);
        this.mostrarModalApertura.set(false);
        this.mensajeExito.set('Turno de guardia iniciado exitosamente con checklist registrado.');
        this.consultarJornadaActiva();
        this.cargarHistorialJornadas();
        if (this.esAdmin()) this.cargarDashboardSalas();
        setTimeout(() => this.mensajeExito.set(null), 4000);
      },
      error: (err) => {
        this.cargando.set(false);
        const errorMsg =
          err?.error?.message ||
          'No se pudo abrir el turno de guardia. Verifique si ya tiene una guardia en curso.';
        this.modalAlertApertura.set(errorMsg);
      },
    });
  }

  // ================= MODAL CIERRE DE GUARDIA =================
  abrirModalCierre(): void {
    this.formErrorsCierre.set({});
    this.modalAlertCierre.set(null);
    this.cierreForm = {
      luces_apagadas: false,
      aire_apagado: false,
      proyector_apagado: false,
      pcs_apagadas: false,
      orden_verificado: false,
      observaciones: '',
      id_usuario_entrante: null,
    };
    this.mostrarModalCierre.set(true);
  }

  cerrarModalCierre(): void {
    this.mostrarModalCierre.set(false);
  }

  confirmarCierre(): void {
    if (!this.jornadaActiva()) return;

    this.formErrorsCierre.set({});
    this.modalAlertCierre.set(null);

    const payload: CerrarTurnoDto = {
      checklist_cierre: {
        luces_apagadas: this.cierreForm.luces_apagadas,
        aire_apagado: this.cierreForm.aire_apagado,
        proyector_apagado: this.cierreForm.proyector_apagado,
        pcs_apagadas: this.cierreForm.pcs_apagadas,
        orden_verificado: this.cierreForm.orden_verificado,
        observaciones: this.cierreForm.observaciones.trim() || undefined,
      },
      obs_cierre: this.cierreForm.observaciones.trim() || undefined,
      id_usuario_entrante: this.cierreForm.id_usuario_entrante
        ? Number(this.cierreForm.id_usuario_entrante)
        : undefined,
    };

    const idJornada = this.jornadaActiva()!.id_jornada;
    this.cargando.set(true);

    this.turnosService.cerrarTurno(idJornada, payload).subscribe({
      next: () => {
        this.cargando.set(false);
        this.mostrarModalCierre.set(false);
        this.detenerTemporizador();
        this.mensajeExito.set(
          'Guardia cerrada exitosamente. Acta oficial de relevo emitida automáticamente.',
        );
        setTimeout(() => this.mensajeExito.set(null), 4000);

        this.consultarJornadaActiva();
        this.cargarHistorialJornadas();
        this.cargarActas();
        if (this.esAdmin()) this.cargarDashboardSalas();
      },
      error: (err) => {
        this.cargando.set(false);
        const errorMsg =
          err?.error?.message || 'Error al cerrar el turno de guardia. Intente nuevamente.';
        this.modalAlertCierre.set(errorMsg);
      },
    });
  }

  // ================= VER DETALLE DE JORNADA =================
  verDetalleJornada(j: JornadaTurno): void {
    this.jornadaSeleccionada.set(j);
    this.mostrarModalDetalleJornada.set(true);
  }

  cerrarModalDetalleJornada(): void {
    this.mostrarModalDetalleJornada.set(false);
    this.jornadaSeleccionada.set(null);
  }

  // ================= EDITAR OBSERVACIÓN JORNADA =================
  abrirModalEditarObsJornada(j: JornadaTurno): void {
    this.jornadaSeleccionada.set(j);
    this.observacionEdicionJornada.set(
      j.obs_cierre || j.checklist_apertura?.observaciones || '',
    );
    this.mostrarModalEditarObsJornada.set(true);
  }

  cerrarModalEditarObsJornada(): void {
    this.mostrarModalEditarObsJornada.set(false);
    this.jornadaSeleccionada.set(null);
  }

  guardarObservacionJornada(): void {
    const j = this.jornadaSeleccionada();
    if (!j) return;

    this.cargando.set(true);
    this.turnosService
      .actualizarObservacionJornada(j.id_jornada, this.observacionEdicionJornada().trim())
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.mostrarModalEditarObsJornada.set(false);
          this.mensajeExito.set('Observaciones de jornada actualizadas correctamente.');
          setTimeout(() => this.mensajeExito.set(null), 3500);
          this.cargarHistorialJornadas();
        },
        error: (err) => {
          this.cargando.set(false);
          this.mensajeError.set(err?.error?.message || 'Error al actualizar observaciones.');
          setTimeout(() => this.mensajeError.set(null), 4000);
        },
      });
  }

  // ================= ELIMINAR JORNADA =================
  solicitarEliminarJornada(j: JornadaTurno): void {
    this.jornadaAEliminar.set(j);
    this.mostrarConfirmEliminarJornada.set(true);
  }

  confirmarEliminarJornada(): void {
    const j = this.jornadaAEliminar();
    if (!j) return;

    this.cargando.set(true);
    this.turnosService.eliminarJornada(j.id_jornada).subscribe({
      next: () => {
        this.cargando.set(false);
        this.mostrarConfirmEliminarJornada.set(false);
        this.jornadaAEliminar.set(null);
        this.mensajeExito.set(`Jornada N° ${j.id_jornada} eliminada del registro.`);
        setTimeout(() => this.mensajeExito.set(null), 3500);
        this.cargarHistorialJornadas();
        this.cargarActas();
        if (this.esAdmin()) this.cargarDashboardSalas();
      },
      error: (err) => {
        this.cargando.set(false);
        this.mostrarConfirmEliminarJornada.set(false);
        this.mensajeError.set(
          err?.error?.message ||
            'No se puede eliminar la jornada porque tiene registros de relevo o bitácora vinculados.',
        );
        setTimeout(() => this.mensajeError.set(null), 4500);
      },
    });
  }

  cancelarEliminarJornada(): void {
    this.mostrarConfirmEliminarJornada.set(false);
    this.jornadaAEliminar.set(null);
  }

  // ================= VER ACTA OFICIAL / IMPRIMIR =================
  verDetalleActa(acta: ActaRelevo): void {
    this.actaSeleccionada.set(acta);
    this.mostrarModalVerActa.set(true);
  }

  cerrarModalVerActa(): void {
    this.mostrarModalVerActa.set(false);
    this.actaSeleccionada.set(null);
  }

  imprimirActa(): void {
    window.print();
  }

  // ================= FIRMA DE CONFORMIDAD =================
  abrirModalFirmaActa(acta: ActaRelevo): void {
    this.actaSeleccionada.set(acta);
    this.firmaForm = {
      conforme: true,
      obs_discrepancia: '',
    };
    this.formErrorsFirma.set({});
    this.modalAlertFirma.set(null);
    this.mostrarModalFirmarActa.set(true);
  }

  cerrarModalFirmaActa(): void {
    this.mostrarModalFirmarActa.set(false);
  }

  confirmarFirmaActa(): void {
    const acta = this.actaSeleccionada();
    if (!acta) return;

    this.formErrorsFirma.set({});
    this.modalAlertFirma.set(null);

    if (!this.firmaForm.conforme && !this.firmaForm.obs_discrepancia.trim()) {
      this.formErrorsFirma.set({
        obs_discrepancia:
          'Si no está conforme, debe registrar el detalle de las discrepancias observadas en la sala.',
      });
      return;
    }

    const payload: FirmarActaDto = {
      conforme: this.firmaForm.conforme,
      aceptado: this.firmaForm.conforme,
      obs_discrepancia: this.firmaForm.obs_discrepancia.trim() || undefined,
    };

    this.cargando.set(true);
    this.turnosService.firmarActaRelevo(acta.id_acta_relevo, payload).subscribe({
      next: () => {
        this.cargando.set(false);
        this.mostrarModalFirmarActa.set(false);
        this.mensajeExito.set(
          `Acta N° ${acta.id_acta_relevo} firmada digitalmente (${
            payload.conforme ? 'Conforme' : 'Con Discrepancia'
          }).`,
        );
        setTimeout(() => this.mensajeExito.set(null), 4000);
        this.cargarActas();
      },
      error: (err) => {
        this.cargando.set(false);
        const rawMsg = err?.error?.message;
        let finalMsg = 'El auxiliar designado debe firmar';
        if (
          typeof rawMsg === 'string' &&
          rawMsg.trim().length > 0 &&
          !rawMsg.includes('Cannot POST') &&
          !rawMsg.includes('Cannot PATCH')
        ) {
          finalMsg = rawMsg;
        }
        this.modalAlertFirma.set(finalMsg);
      },
    });
  }

  // ================= EDITAR ACTA =================
  abrirModalEditarActa(acta: ActaRelevo): void {
    this.actaSeleccionada.set(acta);
    this.edicionActaForm = {
      novedades: acta.novedades || '',
      obs_discrepancia: acta.obs_discrepancia || '',
    };
    this.mostrarModalEditarActa.set(true);
  }

  cerrarModalEditarActa(): void {
    this.mostrarModalEditarActa.set(false);
  }

  guardarEdicionActa(): void {
    const acta = this.actaSeleccionada();
    if (!acta) return;

    this.cargando.set(true);
    this.turnosService
      .actualizarActa(acta.id_acta_relevo, {
        novedades: this.edicionActaForm.novedades.trim() || undefined,
        obs_discrepancia: this.edicionActaForm.obs_discrepancia.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.mostrarModalEditarActa.set(false);
          this.mensajeExito.set('Acta de relevo actualizada correctamente.');
          setTimeout(() => this.mensajeExito.set(null), 3500);
          this.cargarActas();
        },
        error: (err) => {
          this.cargando.set(false);
          this.mensajeError.set(err?.error?.message || 'Error al actualizar acta.');
          setTimeout(() => this.mensajeError.set(null), 4000);
        },
      });
  }

  // ================= ELIMINAR ACTA =================
  solicitarEliminarActa(acta: ActaRelevo): void {
    this.actaAEliminar.set(acta);
    this.mostrarConfirmEliminarActa.set(true);
  }

  confirmarEliminarActa(): void {
    const acta = this.actaAEliminar();
    if (!acta) return;

    this.cargando.set(true);
    this.turnosService.eliminarActa(acta.id_acta_relevo).subscribe({
      next: () => {
        this.cargando.set(false);
        this.mostrarConfirmEliminarActa.set(false);
        this.actaAEliminar.set(null);
        this.mensajeExito.set(`Acta N° ${acta.id_acta_relevo} eliminada exitosamente.`);
        setTimeout(() => this.mensajeExito.set(null), 3500);
        this.cargarActas();
      },
      error: (err) => {
        this.cargando.set(false);
        this.mostrarConfirmEliminarActa.set(false);
        this.mensajeError.set(
          err?.error?.message || 'No se puede eliminar el acta seleccionada.',
        );
        setTimeout(() => this.mensajeError.set(null), 4000);
      },
    });
  }

  cancelarEliminarActa(): void {
    this.mostrarConfirmEliminarActa.set(false);
    this.actaAEliminar.set(null);
  }

  // Navegación auxiliar
  irAAverias(): void {
    this.router.navigate(['/admin/turnos/averias']);
  }

  irAObjetos(): void {
    this.router.navigate(['/admin/turnos/objetos']);
  }
}
