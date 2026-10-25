import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TurnosService,
  ActaRelevo,
  FirmarActaDto,
  CrearActaRelevoDto,
  JornadaTurno,
} from '../../../core/services/turnos.service';
import { InfraestructuraService, SalaItem } from '../../../core/services/infraestructura.service';
import { TurnosAuxiliaresService, AuxiliarUsuario } from '../../../core/services/turnos-auxiliares.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ConfirmModalComponent,
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
} from '../../../shared/components';

@Component({
  selector: 'app-acta-relevo',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmModalComponent,
    PaginationComponent,
    ModalAlertComponent,
    TableCardComponent,
  ],
  templateUrl: './acta-relevo.component.html',
  styleUrls: ['./acta-relevo.component.css'],
})
export class ActaRelevoComponent implements OnInit {
  private readonly turnosService = inject(TurnosService);
  private readonly infraService = inject(InfraestructuraService);
  private readonly turnosAuxiliaresService = inject(TurnosAuxiliaresService);
  readonly authService = inject(AuthService);

  // Estados reactivos
  cargando = signal<boolean>(false);
  actas = signal<ActaRelevo[]>([]);
  totalRegistros = signal<number>(0);
  paginaActual = signal<number>(1);
  readonly limite = 15;

  // Catálogos
  salas = signal<SalaItem[]>([]);
  auxiliares = signal<AuxiliarUsuario[]>([]);
  jornadasCerradas = signal<JornadaTurno[]>([]);

  // Filtros
  filtroBusqueda = signal<string>('');
  filtroSala = signal<number | null>(null);
  filtroFecha = signal<string>('');
  filtroSoloPendientes = signal<boolean>(false);

  // Mensajes de alerta global
  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  // Modales
  mostrarModalDetalle = signal<boolean>(false);
  mostrarModalFirmar = signal<boolean>(false);
  mostrarModalCrear = signal<boolean>(false);
  mostrarModalEditar = signal<boolean>(false);
  mostrarConfirmEliminar = signal<boolean>(false);

  // Acta en operación
  actaSeleccionada = signal<ActaRelevo | null>(null);
  actaAEliminar = signal<ActaRelevo | null>(null);

  // Formulario Firma
  firmaForm = {
    conforme: true,
    obs_discrepancia: '',
  };
  formErrorsFirma = signal<{ [key: string]: string }>({});
  modalAlertFirma = signal<string | null>(null);

  // Formulario Nueva Acta
  nuevaActaForm = {
    id_jornada: null as number | null,
    id_usuario_entrante: null as number | null,
    cant_equipos_operativos: 20,
    novedades: '',
  };
  formErrorsNueva = signal<{ [key: string]: string }>({});
  modalAlertNueva = signal<string | null>(null);

  // Formulario Edición
  edicionForm = {
    novedades: '',
    obs_discrepancia: '',
  };

  ngOnInit(): void {
    this.cargarSalas();
    this.cargarAuxiliares();
    this.cargarActas();
    this.cargarJornadasParaRelevo();
  }

  cargarSalas(): void {
    this.infraService.getSalas({ activo: true }).subscribe({
      next: (res) => this.salas.set(res || []),
      error: () => this.salas.set([]),
    });
  }

  cargarAuxiliares(): void {
    this.turnosAuxiliaresService.getAuxiliaresDisponibles().subscribe({
      next: (res) => this.auxiliares.set(res || []),
      error: () => this.auxiliares.set([]),
    });
  }

  cargarJornadasParaRelevo(): void {
    this.turnosService.getJornadas({ limite: 50 }).subscribe({
      next: (res) => this.jornadasCerradas.set(res?.data || []),
      error: () => this.jornadasCerradas.set([]),
    });
  }

  cargarActas(): void {
    this.cargando.set(true);
    this.turnosService
      .getActas({
        pagina: this.paginaActual(),
        limite: this.limite,
        id_sala: this.filtroSala() || undefined,
        fecha: this.filtroFecha() || undefined,
        solo_pendientes_firma: this.filtroSoloPendientes() || undefined,
        busqueda: this.filtroBusqueda().trim() || undefined,
      })
      .subscribe({
        next: (resp) => {
          this.actas.set(resp?.data || []);
          this.totalRegistros.set(resp?.total || 0);
          this.cargando.set(false);
        },
        error: (err) => {
          console.error('Error cargando actas de relevo', err);
          this.actas.set([]);
          this.totalRegistros.set(0);
          this.cargando.set(false);
        },
      });
  }

  aplicarFiltros(): void {
    this.paginaActual.set(1);
    this.cargarActas();
  }

  limpiarFiltros(): void {
    this.filtroBusqueda.set('');
    this.filtroSala.set(null);
    this.filtroFecha.set('');
    this.filtroSoloPendientes.set(false);
    this.paginaActual.set(1);
    this.cargarActas();
  }

  cambiarPagina(p: number): void {
    this.paginaActual.set(p);
    this.cargarActas();
  }

  // ================= VER ACTA / IMPRIMIR =================
  verDetalleActa(acta: ActaRelevo): void {
    this.actaSeleccionada.set(acta);
    this.mostrarModalDetalle.set(true);
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle.set(false);
    this.actaSeleccionada.set(null);
  }

  imprimirActa(): void {
    window.print();
  }

  // ================= FIRMA DE CONFORMIDAD =================
  abrirModalFirma(acta: ActaRelevo): void {
    this.actaSeleccionada.set(acta);
    this.firmaForm = {
      conforme: true,
      obs_discrepancia: '',
    };
    this.formErrorsFirma.set({});
    this.modalAlertFirma.set(null);
    this.mostrarModalFirmar.set(true);
  }

  cerrarModalFirma(): void {
    this.mostrarModalFirmar.set(false);
  }

  confirmarFirma(): void {
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
      next: (actaFirmada) => {
        this.cargando.set(false);
        this.mostrarModalFirmar.set(false);
        this.mensajeExito.set(
          `Acta N° ${acta.id_acta_relevo} firmada digitalmente con éxito (${
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

  // ================= CREAR NUEVA ACTA =================
  abrirModalCrear(): void {
    this.formErrorsNueva.set({});
    this.modalAlertNueva.set(null);
    this.nuevaActaForm = {
      id_jornada: this.jornadasCerradas().length > 0 ? this.jornadasCerradas()[0].id_jornada : null,
      id_usuario_entrante: this.auxiliares().length > 0 ? this.auxiliares()[0].id_usuario : null,
      cant_equipos_operativos: 20,
      novedades: '',
    };
    this.mostrarModalCrear.set(true);
  }

  cerrarModalCrear(): void {
    this.mostrarModalCrear.set(false);
  }

  guardarNuevaActa(): void {
    this.formErrorsNueva.set({});
    this.modalAlertNueva.set(null);

    const errores: { [key: string]: string } = {};
    if (!this.nuevaActaForm.id_jornada) {
      errores['id_jornada'] = 'Debe seleccionar la jornada de guardia correspondiente.';
    }
    if (!this.nuevaActaForm.id_usuario_entrante) {
      errores['id_usuario_entrante'] = 'Debe seleccionar el auxiliar entrante.';
    }

    if (Object.keys(errores).length > 0) {
      this.formErrorsNueva.set(errores);
      return;
    }

    const payload: CrearActaRelevoDto = {
      id_usuario_entrante: Number(this.nuevaActaForm.id_usuario_entrante),
      cant_equipos_operativos: Number(this.nuevaActaForm.cant_equipos_operativos),
      novedades: this.nuevaActaForm.novedades.trim() || undefined,
    };

    this.cargando.set(true);
    this.turnosService.crearActaRelevo(Number(this.nuevaActaForm.id_jornada), payload).subscribe({
      next: () => {
        this.cargando.set(false);
        this.mostrarModalCrear.set(false);
        this.mensajeExito.set('Acta de relevo emitida exitosamente.');
        setTimeout(() => this.mensajeExito.set(null), 4000);
        this.cargarActas();
      },
      error: (err) => {
        this.cargando.set(false);
        this.modalAlertNueva.set(err?.error?.message || 'Error al emitir acta de relevo.');
      },
    });
  }

  // ================= EDITAR ACTA =================
  abrirModalEditar(acta: ActaRelevo): void {
    this.actaSeleccionada.set(acta);
    this.edicionForm = {
      novedades: acta.novedades || '',
      obs_discrepancia: acta.obs_discrepancia || '',
    };
    this.mostrarModalEditar.set(true);
  }

  cerrarModalEditar(): void {
    this.mostrarModalEditar.set(false);
  }

  guardarEdicion(): void {
    const acta = this.actaSeleccionada();
    if (!acta) return;

    this.cargando.set(true);
    this.turnosService
      .actualizarActa(acta.id_acta_relevo, {
        novedades: this.edicionForm.novedades.trim() || undefined,
        obs_discrepancia: this.edicionForm.obs_discrepancia.trim() || undefined,
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.mostrarModalEditar.set(false);
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
  solicitarEliminar(acta: ActaRelevo): void {
    this.actaAEliminar.set(acta);
    this.mostrarConfirmEliminar.set(true);
  }

  confirmarEliminar(): void {
    const acta = this.actaAEliminar();
    if (!acta) return;

    this.cargando.set(true);
    this.turnosService.eliminarActa(acta.id_acta_relevo).subscribe({
      next: () => {
        this.cargando.set(false);
        this.mostrarConfirmEliminar.set(false);
        this.actaAEliminar.set(null);
        this.mensajeExito.set(`Acta N° ${acta.id_acta_relevo} eliminada exitosamente.`);
        setTimeout(() => this.mensajeExito.set(null), 3500);
        this.cargarActas();
      },
      error: (err) => {
        this.cargando.set(false);
        this.mostrarConfirmEliminar.set(false);
        this.mensajeError.set(
          err?.error?.message || 'No se puede eliminar el acta seleccionada.',
        );
        setTimeout(() => this.mensajeError.set(null), 4000);
      },
    });
  }

  cancelarEliminar(): void {
    this.mostrarConfirmEliminar.set(false);
    this.actaAEliminar.set(null);
  }
}
