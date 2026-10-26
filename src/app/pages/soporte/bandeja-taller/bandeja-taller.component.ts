import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  SoporteService,
  MantenimientoTaller,
  IniciarMantenimientoDto,
  FinalizarMantenimientoDto,
  ConfirmarRetornoDto,
  DarBajaDto,
  EstadoMantenimiento,
} from '../../../core/services/soporte.service';
import {
  InfraestructuraService,
  SalaItem,
} from '../../../core/services/infraestructura.service';
import { UsuarioItem } from '../../../core/services/usuarios.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ConfirmModalComponent,
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
} from '../../../shared/components';

@Component({
  selector: 'app-bandeja-taller',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmModalComponent,
    PaginationComponent,
    ModalAlertComponent,
    TableCardComponent,
  ],
  templateUrl: './bandeja-taller.component.html',
  styleUrls: ['./bandeja-taller.component.css'],
})
export class BandejaTallerComponent implements OnInit {
  private readonly soporteService = inject(SoporteService);
  private readonly infraService = inject(InfraestructuraService);
  readonly authService = inject(AuthService);

  // Estados reactivos de datos
  cargando = signal<boolean>(false);
  ordenes = signal<MantenimientoTaller[]>([]);
  totalRegistros = signal<number>(0);
  paginaActual = signal<number>(1);
  readonly limite = 15;

  // Catálogos
  salas = signal<SalaItem[]>([]);
  tecnicosDisponibles = signal<UsuarioItem[]>([]);

  // Filtros de búsqueda (Regla 4: Botón Buscar y Botón Limpiar)
  filtroBusqueda = signal<string>('');
  filtroSala = signal<number | null>(null);
  filtroEstado = signal<string>('TODOS');

  // Mensajes globales de feedback
  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  // Orden seleccionada para acción
  ordenSeleccionada = signal<MantenimientoTaller | null>(null);

  // Modales
  mostrarModalIniciar = signal<boolean>(false);
  mostrarModalFinalizar = signal<boolean>(false);
  mostrarModalRetorno = signal<boolean>(false);
  mostrarModalBaja = signal<boolean>(false);
  mostrarModalFicha = signal<boolean>(false);

  // Formulario: Iniciar Reparación
  iniciarForm = {
    diagnostico_tecnico: '',
    id_usuario_tecnico: null as number | null,
  };
  formErrorsIniciar = signal<{ [key: string]: string }>({});
  modalAlertIniciar = signal<string | null>(null);

  // Formulario: Finalizar Reparación
  finalizarForm = {
    solucion_aplicada: '',
    repuestos_utilizados: '',
    duracion_taller_horas: 2.0,
    costo_reparacion: 0,
  };
  formErrorsFinalizar = signal<{ [key: string]: string }>({});
  modalAlertFinalizar = signal<string | null>(null);

  // Formulario: Confirmar Retorno a Sala (CU25)
  retornoForm = {
    pruebas_satisfactorias: true,
    obs_instalacion: '',
  };
  formErrorsRetorno = signal<{ [key: string]: string }>({});
  modalAlertRetorno = signal<string | null>(null);

  // Formulario: Dar de Baja
  bajaForm = {
    motivo: '',
  };
  formErrorsBaja = signal<{ [key: string]: string }>({});
  modalAlertBaja = signal<string | null>(null);

  ngOnInit(): void {
    this.cargarSalas();
    this.cargarTecnicos();
    this.cargarOrdenes();
  }

  cargarSalas(): void {
    this.infraService.getSalas({ activo: true }).subscribe({
      next: (salas) => this.salas.set(salas || []),
      error: () => {},
    });
  }

  cargarTecnicos(): void {
    this.soporteService.getTecnicos().subscribe({
      next: (tecnicos) => {
        this.tecnicosDisponibles.set(tecnicos || []);
      },
      error: () => {
        this.tecnicosDisponibles.set([]);
      },
    });
  }

  cargarOrdenes(): void {
    this.cargando.set(true);
    this.soporteService
      .getOrdenesTaller({
        busqueda: this.filtroBusqueda().trim() || undefined,
        id_sala: this.filtroSala() || undefined,
        estado: this.filtroEstado() || undefined,
        pagina: this.paginaActual(),
        limite: this.limite,
      })
      .subscribe({
        next: (resp) => {
          this.ordenes.set(resp.data || resp.items || []);
          this.totalRegistros.set(resp.total || 0);
          this.cargando.set(false);
        },
        error: () => {
          this.cargando.set(false);
          this.mensajeError.set('No fue posible cargar las órdenes de taller.');
        },
      });
  }

  aplicarFiltros(): void {
    this.paginaActual.set(1);
    this.cargarOrdenes();
  }

  limpiarFiltros(): void {
    this.filtroBusqueda.set('');
    this.filtroSala.set(null);
    this.filtroEstado.set('TODOS');
    this.paginaActual.set(1);
    this.cargarOrdenes();
  }

  cambiarPagina(nuevaPagina: number): void {
    this.paginaActual.set(nuevaPagina);
    this.cargarOrdenes();
  }

  // ================= ACCIONES: INICIAR REPARACIÓN =================

  abrirModalIniciar(orden: MantenimientoTaller): void {
    this.ordenSeleccionada.set(orden);
    this.iniciarForm = {
      diagnostico_tecnico: orden.diagnostico_tecnico || '',
      id_usuario_tecnico: orden.id_usuario_tecnico || this.authService.currentUser()?.id_usuario || null,
    };
    this.formErrorsIniciar.set({});
    this.modalAlertIniciar.set(null);
    this.mostrarModalIniciar.set(true);
  }

  cerrarModalIniciar(): void {
    this.mostrarModalIniciar.set(false);
    this.ordenSeleccionada.set(null);
  }

  guardarIniciarReparacion(): void {
    const errors: { [key: string]: string } = {};
    if (!this.iniciarForm.diagnostico_tecnico.trim()) {
      errors['diagnostico_tecnico'] = 'El diagnóstico técnico inicial es obligatorio para iniciar intervención.';
    }
    if (this.iniciarForm.diagnostico_tecnico.trim().length < 5) {
      errors['diagnostico_tecnico'] = 'El diagnóstico técnico debe contener al menos 5 caracteres descriptivos.';
    }

    if (Object.keys(errors).length > 0) {
      this.formErrorsIniciar.set(errors);
      return;
    }
    this.formErrorsIniciar.set({});

    const orden = this.ordenSeleccionada();
    if (!orden) return;

    this.cargando.set(true);
    const dto: IniciarMantenimientoDto = {
      diagnostico_tecnico: this.iniciarForm.diagnostico_tecnico.trim(),
      id_usuario_tecnico: this.iniciarForm.id_usuario_tecnico || undefined,
    };

    this.soporteService.iniciarReparacion(orden.id_mantenimiento, dto).subscribe({
      next: () => {
        this.cargando.set(false);
        this.cerrarModalIniciar();
        this.mensajeExito.set(`Reparación iniciada formalmente para el equipo ${orden.computadora?.codigo_equipo || 'en taller'}.`);
        this.cargarOrdenes();
      },
      error: (err) => {
        this.cargando.set(false);
        const msg = err.error?.message || 'Error al iniciar reparación en taller.';
        this.modalAlertIniciar.set(msg);
      },
    });
  }

  // ================= ACCIONES: FINALIZAR REPARACIÓN =================

  abrirModalFinalizar(orden: MantenimientoTaller): void {
    this.ordenSeleccionada.set(orden);
    this.finalizarForm = {
      solucion_aplicada: orden.solucion_aplicada || '',
      repuestos_utilizados: orden.repuestos_utilizados || '',
      duracion_taller_horas: orden.duracion_taller_horas || 2.0,
      costo_reparacion: orden.costo_reparacion || 0,
    };
    this.formErrorsFinalizar.set({});
    this.modalAlertFinalizar.set(null);
    this.mostrarModalFinalizar.set(true);
  }

  cerrarModalFinalizar(): void {
    this.mostrarModalFinalizar.set(false);
    this.ordenSeleccionada.set(null);
  }

  guardarFinalizarReparacion(): void {
    const errors: { [key: string]: string } = {};
    if (!this.finalizarForm.solucion_aplicada.trim()) {
      errors['solucion_aplicada'] = 'La solución técnica aplicada es obligatoria.';
    }
    if (this.finalizarForm.duracion_taller_horas === null || this.finalizarForm.duracion_taller_horas === undefined || this.finalizarForm.duracion_taller_horas < 0) {
      errors['duracion_taller_horas'] = 'La duración en taller debe ser un número igual o mayor a cero.';
    }

    if (Object.keys(errors).length > 0) {
      this.formErrorsFinalizar.set(errors);
      return;
    }
    this.formErrorsFinalizar.set({});

    const orden = this.ordenSeleccionada();
    if (!orden) return;

    this.cargando.set(true);
    const dto: FinalizarMantenimientoDto = {
      solucion_aplicada: this.finalizarForm.solucion_aplicada.trim(),
      repuestos_utilizados: this.finalizarForm.repuestos_utilizados.trim() || undefined,
      duracion_taller_horas: Number(this.finalizarForm.duracion_taller_horas),
      costo_reparacion: Number(this.finalizarForm.costo_reparacion) || 0,
    };

    this.soporteService.finalizarReparacion(orden.id_mantenimiento, dto).subscribe({
      next: () => {
        this.cargando.set(false);
        this.cerrarModalFinalizar();
        this.mensajeExito.set(`Reparación técnica concluida exitosamente. El equipo ${orden.computadora?.codigo_equipo || ''} está listo para retorno.`);
        this.cargarOrdenes();
      },
      error: (err) => {
        this.cargando.set(false);
        const msg = err.error?.message || 'Error al registrar finalización de reparación.';
        this.modalAlertFinalizar.set(msg);
      },
    });
  }

  // ================= ACCIONES: CONFIRMAR RETORNO A SALA (CU25) =================

  abrirModalRetorno(orden: MantenimientoTaller): void {
    this.ordenSeleccionada.set(orden);
    this.retornoForm = {
      pruebas_satisfactorias: true,
      obs_instalacion: '',
    };
    this.formErrorsRetorno.set({});
    this.modalAlertRetorno.set(null);
    this.mostrarModalRetorno.set(true);
  }

  cerrarModalRetorno(): void {
    this.mostrarModalRetorno.set(false);
    this.ordenSeleccionada.set(null);
  }

  guardarConfirmarRetorno(): void {
    const errors: { [key: string]: string } = {};
    if (!this.retornoForm.pruebas_satisfactorias) {
      errors['pruebas_satisfactorias'] = 'Debe certificar las pruebas de arranque físico y red para validar el retorno formal.';
    }

    if (Object.keys(errors).length > 0) {
      this.formErrorsRetorno.set(errors);
      return;
    }
    this.formErrorsRetorno.set({});

    const orden = this.ordenSeleccionada();
    if (!orden) return;

    this.cargando.set(true);
    const dto: ConfirmarRetornoDto = {
      pruebas_satisfactorias: true,
      obs_instalacion: this.retornoForm.obs_instalacion.trim() || undefined,
      id_usuario_confirma: this.authService.currentUser()?.id_usuario || undefined,
    };

    this.soporteService.confirmarRetornoSala(orden.id_mantenimiento, dto).subscribe({
      next: () => {
        this.cargando.set(false);
        this.cerrarModalRetorno();
        this.mensajeExito.set(`Puesta en marcha física en sala certificada. La estación ${orden.computadora?.codigo_equipo || ''} vuelve a estar DISPONIBLE.`);
        this.cargarOrdenes();
      },
      error: (err) => {
        this.cargando.set(false);
        const msg = err.error?.message || 'Error al certificar el retorno a sala.';
        this.modalAlertRetorno.set(msg);
      },
    });
  }

  // ================= ACCIONES: DAR DE BAJA =================

  abrirModalBaja(orden: MantenimientoTaller): void {
    this.ordenSeleccionada.set(orden);
    this.bajaForm = {
      motivo: '',
    };
    this.formErrorsBaja.set({});
    this.modalAlertBaja.set(null);
    this.mostrarModalBaja.set(true);
  }

  cerrarModalBaja(): void {
    this.mostrarModalBaja.set(false);
    this.ordenSeleccionada.set(null);
  }

  guardarDarDeBaja(): void {
    const errors: { [key: string]: string } = {};
    if (!this.bajaForm.motivo.trim()) {
      errors['motivo'] = 'Debe fundamentar detalladamente el motivo técnico de la baja definitiva.';
    } else if (this.bajaForm.motivo.trim().length < 10) {
      errors['motivo'] = 'El motivo de baja debe tener al menos 10 caracteres explicando la causa de inviabilidad técnica.';
    }

    if (Object.keys(errors).length > 0) {
      this.formErrorsBaja.set(errors);
      return;
    }
    this.formErrorsBaja.set({});

    const orden = this.ordenSeleccionada();
    if (!orden) return;

    this.cargando.set(true);
    const dto: DarBajaDto = {
      motivo: this.bajaForm.motivo.trim(),
    };

    this.soporteService.darDeBaja(orden.id_mantenimiento, dto).subscribe({
      next: () => {
        this.cargando.set(false);
        this.cerrarModalBaja();
        this.mensajeExito.set(`Equipo ${orden.computadora?.codigo_equipo || ''} declarado en BAJA DEFINITIVA.`);
        this.cargarOrdenes();
      },
      error: (err) => {
        this.cargando.set(false);
        const msg = err.error?.message || 'Error al procesar la baja definitiva.';
        this.modalAlertBaja.set(msg);
      },
    });
  }

  // ================= ACCIONES: VER FICHA TÉCNICA =================

  abrirModalFicha(orden: MantenimientoTaller): void {
    this.ordenSeleccionada.set(orden);
    this.mostrarModalFicha.set(true);
  }

  cerrarModalFicha(): void {
    this.mostrarModalFicha.set(false);
    this.ordenSeleccionada.set(null);
  }

  imprimirFicha(): void {
    window.print();
  }
}

