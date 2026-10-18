import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  InfraestructuraService,
  PerifericoItem,
  TipoPerifericoItem,
  SalaItem,
  ComputadoraItem,
} from '../../../core/services/infraestructura.service';
import {
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
  ConfirmModalComponent,
} from '../../../shared/components';

export interface ErroresPeriferico {
  id_tipo_periferico?: string;
  marca_modelo?: string;
  numero_activo?: string;
}

@Component({
  selector: 'app-inventario-perifericos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    ModalAlertComponent,
    TableCardComponent,
    ConfirmModalComponent,
  ],
  templateUrl: './inventario-perifericos.component.html',
  styleUrls: ['./inventario-perifericos.component.css'],
})
export class InventarioPerifericosComponent implements OnInit {
  Number = Number;

  perifericos = signal<PerifericoItem[]>([]);
  tiposPeriferico = signal<TipoPerifericoItem[]>([]);
  salasFiltro = signal<SalaItem[]>([]);
  totalRegistros = signal<number>(0);
  paginaActual = signal<number>(1);
  tamanoPagina = 15;
  cargando = signal<boolean>(false);

  // Filtros
  filtroTexto = '';
  filtroTipo: string | number = '';
  filtroSala: string | number = '';
  filtroCondicion = '';
  filtroUbicacion = ''; // '' | 'ASIGNADO' | 'BODEGA'

  // Modal Registrar/Editar
  modalVisible = signal<boolean>(false);
  modoEdicion = signal<boolean>(false);
  guardando = signal<boolean>(false);
  errorModal = signal<string | null>(null);
  errores = signal<ErroresPeriferico>({});

  formPeriferico: {
    id_periferico?: number;
    id_tipo_periferico: number | null;
    marca_modelo: string;
    numero_activo: string;
    condicion_fisica: 'BUENO' | 'REGULAR' | 'DANADO' | 'FALTANTE';
  } = {
    id_tipo_periferico: null,
    marca_modelo: '',
    numero_activo: '',
    condicion_fisica: 'BUENO',
  };

  // Modal Asignar Periférico
  modalAsignarVisible = signal<boolean>(false);
  perifericoSeleccionado = signal<PerifericoItem | null>(null);
  salasDisponibles = signal<SalaItem[]>([]);
  salaSeleccionada = signal<SalaItem | null>(null);
  pcsDeSala = signal<ComputadoraItem[]>([]);
  tipoDestino: 'BODEGA' | 'PC' = 'BODEGA';
  idSalaAsignar: number | null = null;
  idPcAsignar: number | null = null;
  guardandoAsignacion = signal<boolean>(false);
  cargandoCuadricula = signal<boolean>(false);
  errorModalAsignar = signal<string | null>(null);

  // Computed para el renderizado del mapa de la sala
  filasArray = computed(() => {
    const total = this.salaSeleccionada()?.filas_cuadricula || 0;
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  columnasArray = computed(() => {
    const total = this.salaSeleccionada()?.columnas_cuadricula || 0;
    return Array.from({ length: total }, (_, i) => i + 1);
  });

  computadoraSeleccionada = computed(() => {
    if (this.tipoDestino !== 'PC' || !this.idPcAsignar) return null;
    return (
      this.pcsDeSala().find((c) => Number(c.id_computadora) === Number(this.idPcAsignar)) ||
      null
    );
  });

  // Confirm Modal
  confirmModalVisible = signal<boolean>(false);
  confirmModalTitulo = signal<string>('');
  confirmModalMensaje = signal<string>('');
  perifericoAfectado = signal<PerifericoItem | null>(null);

  constructor(private readonly infraService: InfraestructuraService) {}

  ngOnInit(): void {
    this.cargarTipos();
    this.cargarSalas();
    this.cargarPerifericos();
  }

  cargarSalas(): void {
    this.infraService.getSalas({ activo: true }).subscribe({
      next: (salas) => this.salasFiltro.set(salas.filter((s) => s.activo)),
      error: (err) => console.error('Error al cargar laboratorios:', err),
    });
  }

  cargarTipos(): void {
    this.infraService.getTiposPeriferico().subscribe({
      next: (tipos) => this.tiposPeriferico.set(tipos),
      error: (err) => console.error('Error al cargar tipos de periférico:', err),
    });
  }

  cargarPerifericos(): void {
    this.cargando.set(true);
    const params: any = {
      pagina: this.paginaActual(),
      limite: this.tamanoPagina,
    };

    if (this.filtroTexto && this.filtroTexto.trim() !== '') {
      params.busqueda = this.filtroTexto.trim();
    }
    if (this.filtroTipo !== '' && this.filtroTipo !== null) {
      params.id_tipo_periferico = Number(this.filtroTipo);
    }
    if (this.filtroSala === 'BODEGA') {
      params.en_bodega = true;
    } else if (this.filtroSala !== '' && this.filtroSala !== null) {
      params.id_sala = Number(this.filtroSala);
    }
    if (this.filtroCondicion && this.filtroCondicion.trim() !== '') {
      params.condicion_fisica = this.filtroCondicion;
    }
    if (this.filtroUbicacion === 'BODEGA') {
      params.en_bodega = true;
    }

    this.infraService.getPerifericos(params).subscribe({
      next: (res) => {
        let lista = res.data;
        if (this.filtroUbicacion === 'ASIGNADO') {
          lista = lista.filter((p) => p.id_computadora !== null);
        }
        this.perifericos.set(lista);
        this.totalRegistros.set(res.total);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar inventario de periféricos:', err);
        this.cargando.set(false);
      },
    });
  }

  aplicarFiltros(): void {
    this.paginaActual.set(1);
    this.cargarPerifericos();
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.filtroTipo = '';
    this.filtroSala = '';
    this.filtroCondicion = '';
    this.filtroUbicacion = '';
    this.paginaActual.set(1);
    this.cargarPerifericos();
  }

  cambiarPagina(p: number): void {
    this.paginaActual.set(p);
    this.cargarPerifericos();
  }

  // ================= MODAL REGISTRAR / EDITAR =================
  abrirModalRegistrar(): void {
    this.modoEdicion.set(false);
    this.errorModal.set(null);
    this.errores.set({});
    const primerTipo = this.tiposPeriferico()[0]?.id_tipo_periferico || null;
    this.formPeriferico = {
      id_tipo_periferico: primerTipo,
      marca_modelo: '',
      numero_activo: '',
      condicion_fisica: 'BUENO',
    };
    this.modalVisible.set(true);
  }

  abrirModalEditar(p: PerifericoItem): void {
    this.modoEdicion.set(true);
    this.errorModal.set(null);
    this.errores.set({});
    this.formPeriferico = {
      id_periferico: p.id_periferico,
      id_tipo_periferico: p.id_tipo_periferico,
      marca_modelo: p.marca_modelo,
      numero_activo: p.numero_activo || '',
      condicion_fisica: p.condicion_fisica,
    };
    this.modalVisible.set(true);
  }

  cerrarModalDirecto(): void {
    this.modalVisible.set(false);
    this.errorModal.set(null);
    this.errores.set({});
  }

  cerrarModal(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.cerrarModalDirecto();
    }
  }

  validarFormulario(): boolean {
    const errs: ErroresPeriferico = {};

    if (!this.formPeriferico.id_tipo_periferico) {
      errs.id_tipo_periferico = 'Debe seleccionar un tipo de periférico';
    }

    if (!this.formPeriferico.marca_modelo || this.formPeriferico.marca_modelo.trim() === '') {
      errs.marca_modelo = 'La marca y modelo son obligatorios';
    } else if (this.formPeriferico.marca_modelo.trim().length > 80) {
      errs.marca_modelo = 'Máximo 80 caracteres';
    }

    if (!this.formPeriferico.numero_activo || this.formPeriferico.numero_activo.trim() === '') {
      errs.numero_activo = 'El número de activo es obligatorio';
    } else if (this.formPeriferico.numero_activo.trim().length > 60) {
      errs.numero_activo = 'Máximo 60 caracteres para el número de activo';
    }

    this.errores.set(errs);
    return Object.keys(errs).length === 0;
  }

  guardarPeriferico(): void {
    if (!this.validarFormulario()) {
      return;
    }

    this.guardando.set(true);
    this.errorModal.set(null);

    const numeroActivo = this.formPeriferico.numero_activo.trim();

    const payload: Partial<PerifericoItem> = {
      id_tipo_periferico: Number(this.formPeriferico.id_tipo_periferico),
      marca_modelo: this.formPeriferico.marca_modelo.trim(),
      numero_activo: numeroActivo,
      condicion_fisica: this.formPeriferico.condicion_fisica,
    };

    if (this.modoEdicion() && this.formPeriferico.id_periferico) {
      this.infraService
        .actualizarPeriferico(this.formPeriferico.id_periferico, payload)
        .subscribe({
          next: () => {
            this.guardando.set(false);
            this.modalVisible.set(false);
            this.cargarPerifericos();
          },
          error: (err) => {
            this.guardando.set(false);
            const msg =
              err.error?.message ||
              'Error al actualizar el componente. Verifique que el número de activo no esté duplicado.';
            this.errorModal.set(Array.isArray(msg) ? msg.join(', ') : msg);
          },
        });
    } else {
      this.infraService.registrarPeriferico(payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.modalVisible.set(false);
          this.cargarPerifericos();
        },
        error: (err) => {
          this.guardando.set(false);
          const msg =
            err.error?.message ||
            'Error al registrar el componente en inventario. Verifique número de activo único.';
          this.errorModal.set(Array.isArray(msg) ? msg.join(', ') : msg);
        },
      });
    }
  }

  // ================= MODAL ASIGNAR =================
  abrirModalAsignar(p: PerifericoItem): void {
    this.perifericoSeleccionado.set(p);
    this.tipoDestino = p.id_computadora ? 'PC' : 'BODEGA';
    this.idPcAsignar = p.id_computadora ? Number(p.id_computadora) : null;
    this.errorModalAsignar.set(null);

    // Cargar solo salas activas
    this.infraService.getSalas({ activo: true }).subscribe({
      next: (salas) => {
        const activas = salas.filter((s) => s.activo);
        this.salasDisponibles.set(activas);

        if (p.computadora?.id_sala) {
          const salaId = Number(p.computadora.id_sala);
          this.idSalaAsignar = salaId;
          this.cargarPcsDeSala(salaId);
        } else if (activas.length > 0) {
          this.idSalaAsignar = activas[0].id_sala;
          this.cargarPcsDeSala(activas[0].id_sala);
        }
      },
      error: (err) => {
        console.error('Error al cargar lista de salas:', err);
        this.errorModalAsignar.set('No se pudieron consultar las salas disponibles.');
      },
    });

    this.modalAsignarVisible.set(true);
  }

  onTipoDestinoChange(tipo: 'BODEGA' | 'PC'): void {
    if (tipo === 'BODEGA') {
      this.seleccionarBodega();
    } else {
      this.tipoDestino = 'PC';
      if (this.idSalaAsignar) {
        this.cargarPcsDeSala(this.idSalaAsignar);
      }
    }
  }

  cargarPcsDeSala(idSala: any): void {
    if (!idSala) {
      this.salaSeleccionada.set(null);
      this.pcsDeSala.set([]);
      this.idPcAsignar = null;
      return;
    }
    const numSala = Number(idSala);
    this.idSalaAsignar = numSala;
    this.cargandoCuadricula.set(true);
    this.infraService.getComputadorasPorSala(numSala).subscribe({
      next: (res) => {
        this.cargandoCuadricula.set(false);
        this.salaSeleccionada.set(res.sala);
        const pcsActivas = (res.computadoras || []).filter((c) => c.activo);
        this.pcsDeSala.set(pcsActivas);
        if (!this.idPcAsignar || !pcsActivas.some((c) => Number(c.id_computadora) === Number(this.idPcAsignar))) {
          this.idPcAsignar = pcsActivas.length > 0 ? Number(pcsActivas[0].id_computadora) : null;
        }
      },
      error: (err) => {
        this.cargandoCuadricula.set(false);
        console.error('Error al cargar equipos de sala:', err);
        this.salaSeleccionada.set(null);
        this.pcsDeSala.set([]);
      },
    });
  }

  getPcEnCoordenada(fila: number, col: number): ComputadoraItem | undefined {
    return this.pcsDeSala().find(
      (c) => Number(c.posicion_fila) === fila && Number(c.posicion_columna) === col && c.activo,
    );
  }

  seleccionarPcDeMatriz(pc: ComputadoraItem): void {
    this.tipoDestino = 'PC';
    this.idPcAsignar = Number(pc.id_computadora);
  }

  seleccionarBodega(): void {
    this.tipoDestino = 'BODEGA';
    this.idPcAsignar = null;
  }

  cerrarModalAsignar(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-backdrop')) {
      this.modalAsignarVisible.set(false);
    }
  }

  ejecutarAsignacion(): void {
    const p = this.perifericoSeleccionado();
    if (!p) return;

    const idPcFinal = this.tipoDestino === 'BODEGA' ? null : (this.idPcAsignar ? Number(this.idPcAsignar) : null);

    this.guardandoAsignacion.set(true);
    this.errorModalAsignar.set(null);
    this.infraService.asignarPeriferico(p.id_periferico, idPcFinal).subscribe({
      next: () => {
        this.guardandoAsignacion.set(false);
        this.modalAsignarVisible.set(false);
        this.cargarPerifericos();
      },
      error: (err) => {
        this.guardandoAsignacion.set(false);
        console.error('Error al asignar periférico:', err);
        const msg = err.error?.message || 'No se pudo reasignar el periférico.';
        this.errorModalAsignar.set(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  // ================= CAMBIO DE ESTADO =================
  solicitarCambioEstado(p: PerifericoItem): void {
    this.perifericoAfectado.set(p);
    if (p.activo) {
      this.confirmModalTitulo.set('Desactivar Componente');
      this.confirmModalMensaje.set(
        `¿Está seguro de desactivar "${p.marca_modelo}" (${p.numero_activo || 'Sin número de activo'})?`,
      );
    } else {
      this.confirmModalTitulo.set('Reactivar Componente');
      this.confirmModalMensaje.set(
        `¿Desea reactivar en inventario el componente "${p.marca_modelo}"?`,
      );
    }
    this.confirmModalVisible.set(true);
  }

  ejecutarCambioEstado(): void {
    const p = this.perifericoAfectado();
    if (!p) return;

    this.infraService.eliminarPeriferico(p.id_periferico).subscribe({
      next: () => {
        this.confirmModalVisible.set(false);
        this.cargarPerifericos();
      },
      error: (err) => {
        console.error('Error al cambiar estado de periférico:', err);
        this.confirmModalVisible.set(false);
      },
    });
  }
}
