import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import {
  InfraestructuraService,
  SalaItem,
} from '../../../core/services/infraestructura.service';
import {
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
  ConfirmModalComponent,
} from '../../../shared/components';

export interface ErroresSala {
  codigo_sala?: string;
  nombre?: string;
  piso?: string;
  cant_estudiantes?: string;
  filas_cuadricula?: string;
  columnas_cuadricula?: string;
}

@Component({
  selector: 'app-salas',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    ModalAlertComponent,
    TableCardComponent,
    ConfirmModalComponent,
  ],
  templateUrl: './salas.component.html',
  styleUrls: ['./salas.component.css'],
})
export class SalasComponent implements OnInit {
  salas = signal<SalaItem[]>([]);
  cargando = signal<boolean>(false);
  paginaActual = signal<number>(1);
  tamanoPagina = 15;

  // Filtros
  filtroTexto = '';
  filtroPiso: string | number = '';
  filtroEstado = '';

  // Modal Crear/Editar
  modalVisible = signal<boolean>(false);
  modoEdicion = signal<boolean>(false);
  guardando = signal<boolean>(false);
  errorModal = signal<string | null>(null);
  errores = signal<ErroresSala>({});

  formSala: {
    id_sala?: number;
    codigo_sala: string;
    nombre: string;
    piso: number | null;
    cant_estudiantes: number | null;
    maquina_docente: boolean;
    proyector: boolean;
    aire_acondicionado: boolean;
    filas_cuadricula: number;
    columnas_cuadricula: number;
    estado_operativo: string;
  } = {
    codigo_sala: '',
    nombre: '',
    piso: 1,
    cant_estudiantes: 24,
    maquina_docente: true,
    proyector: true,
    aire_acondicionado: true,
    filas_cuadricula: 6,
    columnas_cuadricula: 8,
    estado_operativo: 'OPERATIVA',
  };

  // Confirm Modal
  confirmModalVisible = signal<boolean>(false);
  confirmModalTitulo = signal<string>('');
  confirmModalMensaje = signal<string>('');
  salaAfectada = signal<SalaItem | null>(null);

  // Salas filtradas localmente
  salasFiltradas = computed(() => {
    let list = this.salas();
    if (this.filtroTexto && this.filtroTexto.trim() !== '') {
      const t = this.filtroTexto.toLowerCase().trim();
      list = list.filter(
        (s) =>
          s.codigo_sala.toLowerCase().includes(t) ||
          s.nombre.toLowerCase().includes(t),
      );
    }
    if (this.filtroPiso !== '' && this.filtroPiso !== null && this.filtroPiso !== undefined) {
      list = list.filter((s) => s.piso === Number(this.filtroPiso));
    }
    if (this.filtroEstado && this.filtroEstado.trim() !== '') {
      list = list.filter((s) => s.estado_operativo === this.filtroEstado);
    }
    return list;
  });

  // Paginación a 15 elementos
  salasPaginadas = computed(() => {
    const list = this.salasFiltradas();
    const start = (this.paginaActual() - 1) * this.tamanoPagina;
    return list.slice(start, start + this.tamanoPagina);
  });

  constructor(
    private readonly infraService: InfraestructuraService,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.cargarSalas();
  }

  cargarSalas(): void {
    this.cargando.set(true);
    this.infraService.getSalas().subscribe({
      next: (data) => {
        this.salas.set(data);
        this.cargando.set(false);
      },
      error: (err) => {
        console.error('Error al cargar laboratorios:', err);
        this.cargando.set(false);
      },
    });
  }

  aplicarFiltros(): void {
    this.paginaActual.set(1);
  }

  limpiarFiltros(): void {
    this.filtroTexto = '';
    this.filtroPiso = '';
    this.filtroEstado = '';
    this.paginaActual.set(1);
  }

  cambiarPagina(p: number): void {
    this.paginaActual.set(p);
  }

  irAEditorCuadricula(idSala: number): void {
    this.router.navigate(['/infraestructura/cuadricula', idSala]);
  }

  abrirModalCrear(): void {
    this.modoEdicion.set(false);
    this.errorModal.set(null);
    this.errores.set({});
    this.formSala = {
      codigo_sala: '',
      nombre: '',
      piso: 1,
      cant_estudiantes: 24,
      maquina_docente: true,
      proyector: true,
      aire_acondicionado: true,
      filas_cuadricula: 6,
      columnas_cuadricula: 8,
      estado_operativo: 'OPERATIVA',
    };
    this.modalVisible.set(true);
  }

  abrirModalEditar(sala: SalaItem): void {
    this.modoEdicion.set(true);
    this.errorModal.set(null);
    this.errores.set({});
    this.formSala = {
      id_sala: sala.id_sala,
      codigo_sala: sala.codigo_sala,
      nombre: sala.nombre,
      piso: sala.piso,
      cant_estudiantes: sala.cant_estudiantes,
      maquina_docente: sala.maquina_docente,
      proyector: sala.proyector,
      aire_acondicionado: sala.aire_acondicionado,
      filas_cuadricula: sala.filas_cuadricula,
      columnas_cuadricula: sala.columnas_cuadricula,
      estado_operativo: sala.estado_operativo,
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
    const errs: ErroresSala = {};

    if (!this.formSala.codigo_sala || this.formSala.codigo_sala.trim() === '') {
      errs.codigo_sala = 'El código de sala es obligatorio';
    } else if (this.formSala.codigo_sala.trim().length > 20) {
      errs.codigo_sala = 'Máximo 20 caracteres para el código';
    }

    if (!this.formSala.nombre || this.formSala.nombre.trim() === '') {
      errs.nombre = 'El nombre descriptivo es obligatorio';
    } else if (this.formSala.nombre.trim().length > 80) {
      errs.nombre = 'Máximo 80 caracteres para el nombre';
    }

    if (this.formSala.piso === null || isNaN(this.formSala.piso) || this.formSala.piso < 0) {
      errs.piso = 'El nivel de piso debe ser 0 o superior';
    }

    if (
      this.formSala.cant_estudiantes === null ||
      isNaN(this.formSala.cant_estudiantes) ||
      this.formSala.cant_estudiantes <= 0
    ) {
      errs.cant_estudiantes = 'La capacidad de alumnos debe ser de al menos 1';
    }

    if (
      !this.formSala.filas_cuadricula ||
      this.formSala.filas_cuadricula < 2 ||
      this.formSala.filas_cuadricula > 20
    ) {
      errs.filas_cuadricula = 'Las filas deben estar entre 2 y 20';
    }

    if (
      !this.formSala.columnas_cuadricula ||
      this.formSala.columnas_cuadricula < 2 ||
      this.formSala.columnas_cuadricula > 20
    ) {
      errs.columnas_cuadricula = 'Las columnas deben estar entre 2 y 20';
    }

    this.errores.set(errs);
    return Object.keys(errs).length === 0;
  }

  guardarSala(): void {
    if (!this.validarFormulario()) {
      return;
    }

    this.guardando.set(true);
    this.errorModal.set(null);

    const payload = {
      codigo_sala: this.formSala.codigo_sala.trim().toUpperCase(),
      nombre: this.formSala.nombre.trim(),
      piso: Number(this.formSala.piso),
      cant_estudiantes: Number(this.formSala.cant_estudiantes),
      maquina_docente: this.formSala.maquina_docente,
      proyector: this.formSala.proyector,
      aire_acondicionado: this.formSala.aire_acondicionado,
      filas_cuadricula: Number(this.formSala.filas_cuadricula),
      columnas_cuadricula: Number(this.formSala.columnas_cuadricula),
      estado_operativo: this.formSala.estado_operativo,
    };

    if (this.modoEdicion() && this.formSala.id_sala) {
      this.infraService.actualizarSala(this.formSala.id_sala, payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.modalVisible.set(false);
          this.cargarSalas();
        },
        error: (err) => {
          this.guardando.set(false);
          const msg =
            err.error?.message ||
            'Error al actualizar los datos de la sala. Verifique los campos ingresados.';
          this.errorModal.set(Array.isArray(msg) ? msg.join(', ') : msg);
        },
      });
    } else {
      this.infraService.crearSala(payload).subscribe({
        next: () => {
          this.guardando.set(false);
          this.modalVisible.set(false);
          this.cargarSalas();
        },
        error: (err) => {
          this.guardando.set(false);
          const msg =
            err.error?.message ||
            'Error al registrar la sala. Verifique que el código no esté duplicado.';
          this.errorModal.set(Array.isArray(msg) ? msg.join(', ') : msg);
        },
      });
    }
  }

  solicitarCambioEstado(sala: SalaItem): void {
    this.salaAfectada.set(sala);
    if (sala.activo) {
      this.confirmModalTitulo.set('Desactivar Laboratorio');
      this.confirmModalMensaje.set(
        `¿Está seguro de desactivar "${sala.codigo_sala} - ${sala.nombre}"? La sala no estará disponible para turnos ni reservas.`,
      );
    } else {
      this.confirmModalTitulo.set('Reactivar Laboratorio');
      this.confirmModalMensaje.set(
        `¿Desea reactivar la sala "${sala.codigo_sala} - ${sala.nombre}" para su uso operativo regular?`,
      );
    }
    this.confirmModalVisible.set(true);
  }

  ejecutarCambioEstado(): void {
    const sala = this.salaAfectada();
    if (!sala) return;

    this.infraService.eliminarSala(sala.id_sala).subscribe({
      next: () => {
        this.confirmModalVisible.set(false);
        this.cargarSalas();
      },
      error: (err) => {
        console.error('Error al cambiar estado de sala:', err);
        this.confirmModalVisible.set(false);
      },
    });
  }
}
