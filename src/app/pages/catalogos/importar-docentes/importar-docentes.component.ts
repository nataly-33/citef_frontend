import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  DocentesService,
  DocenteItem,
} from '../../../core/services/docentes.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ConfirmModalComponent,
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
} from '../../../shared/components';

@Component({
  selector: 'app-importar-docentes',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmModalComponent,
    PaginationComponent,
    ModalAlertComponent,
    TableCardComponent,
  ],
  templateUrl: './importar-docentes.component.html',
  styleUrls: ['./importar-docentes.component.css'],
})
export class ImportarDocentesComponent implements OnInit {
  readonly limite = 15;

  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  // ESTADO TABLA DOCENTES
  docentes = signal<DocenteItem[]>([]);
  docentesTotal = signal<number>(0);
  docentePagina = signal<number>(1);
  busqueda = '';
  filtroEstado = 'TODOS';

  // ESTADO CARGA MASIVA DRAG & DROP
  archivoSeleccionado = signal<File | null>(null);
  isDragging = signal<boolean>(false);
  procesandoImportacion = signal<boolean>(false);

  // MODAL CREAR / EDITAR
  mostrarModalDocente = signal<boolean>(false);
  editandoCodigo = signal<string | null>(null);
  guardandoDocente = signal<boolean>(false);
  modalDocenteError = signal<string | null>(null);

  docenteForm = {
    codigo: '',
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    departamento_academico: 'General',
    condicion_contrato: 'TITULAR',
  };

  docenteErrors = signal<{
    codigo?: string;
    nombres?: string;
    apellidos?: string;
    correo?: string;
  }>({});

  // CONFIRMACIÓN
  mostrarConfirmarEliminar = signal<boolean>(false);
  confirmacionMensaje = '';
  docenteAEliminar: DocenteItem | null = null;

  constructor(
    private docentesService: DocentesService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarDocentes();
  }

  puedeGestionar(): boolean {
    return this.authService.hasPermission('CAT_IMPORTAR_DOCENTES');
  }

  formatTamano(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // ==========================================
  // CARGA DE LISTA
  // ==========================================
  cargarDocentes(): void {
    const activoParam =
      this.filtroEstado === 'TODOS'
        ? undefined
        : this.filtroEstado === 'ACTIVOS';

    this.docentesService
      .getDocentes({
        busqueda: this.busqueda.trim() || undefined,
        activo: activoParam,
        pagina: this.docentePagina(),
        limite: this.limite,
      })
      .subscribe({
        next: (res) => {
          this.docentes.set(res.items);
          this.docentesTotal.set(res.total);
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error al cargar padrón docente');
        },
      });
  }

  ejecutarBusqueda(): void {
    this.docentePagina.set(1);
    this.cargarDocentes();
  }

  limpiarFiltros(): void {
    this.busqueda = '';
    this.filtroEstado = 'TODOS';
    this.docentePagina.set(1);
    this.cargarDocentes();
  }

  cambiarPaginaDocente(p: number): void {
    this.docentePagina.set(p);
    this.cargarDocentes();
  }

  descargarPlantilla(): void {
    this.docentesService.descargarPlantillaCsv();
  }

  // ==========================================
  // DRAG & DROP Y SUBIDA
  // ==========================================
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(true);
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);
  }

  onFileDropped(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging.set(false);

    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      this.validarYAsignarArchivo(e.dataTransfer.files[0]);
    }
  }

  onFileSelected(e: Event): void {
    const target = e.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.validarYAsignarArchivo(target.files[0]);
    }
  }

  validarYAsignarArchivo(file: File): void {
    const extension = file.name.substring(file.name.lastIndexOf('.')).toLowerCase();
    const permitidas = ['.xlsx', '.xls', '.csv'];

    if (!permitidas.includes(extension)) {
      this.errorMsg.set('Solo se admiten libros de Excel (.xlsx, .xls) o archivos .csv');
      this.archivoSeleccionado.set(null);
      return;
    }

    this.errorMsg.set(null);
    this.archivoSeleccionado.set(file);
  }

  removerArchivo(e?: Event): void {
    if (e) e.stopPropagation();
    this.archivoSeleccionado.set(null);
  }

  ejecutarImportacion(): void {
    const file = this.archivoSeleccionado();
    if (!file) return;

    this.procesandoImportacion.set(true);
    this.errorMsg.set(null);
    this.successMsg.set(null);

    this.docentesService.importarExcel(file).subscribe({
      next: (res) => {
        this.procesandoImportacion.set(false);
        this.archivoSeleccionado.set(null);
        this.successMsg.set(
          `Carga masiva exitosa: Se importaron/procesaron ${res.totalImportados} docentes correctamente.`,
        );
        this.cargarDocentes();
      },
      error: (err) => {
        this.procesandoImportacion.set(false);
        this.errorMsg.set(
          err.error?.message ||
            'Error al procesar el archivo. Verifique la estructura de columnas y que no contenga filas duplicadas.',
        );
      },
    });
  }

  // ==========================================
  // MODAL CREAR / EDITAR INDIVIDUAL
  // ==========================================
  abrirModalCrearDocente(): void {
    this.editandoCodigo.set(null);
    this.docenteForm = {
      codigo: '',
      nombres: '',
      apellidos: '',
      correo: '',
      telefono: '',
      departamento_academico: 'General',
      condicion_contrato: 'TITULAR',
    };
    this.docenteErrors.set({});
    this.modalDocenteError.set(null);
    this.mostrarModalDocente.set(true);
  }

  abrirModalEditarDocente(d: DocenteItem): void {
    this.editandoCodigo.set(d.codigo);
    this.docenteForm = {
      codigo: d.codigo,
      nombres: d.nombres,
      apellidos: d.apellidos,
      correo: d.correo,
      telefono: d.telefono || '',
      departamento_academico: d.departamento_academico || 'General',
      condicion_contrato: d.condicion_contrato || 'TITULAR',
    };
    this.docenteErrors.set({});
    this.modalDocenteError.set(null);
    this.mostrarModalDocente.set(true);
  }

  cerrarModalDocente(): void {
    this.mostrarModalDocente.set(false);
    this.modalDocenteError.set(null);
    this.docenteErrors.set({});
  }

  validarDocente(): boolean {
    const errs: {
      codigo?: string;
      nombres?: string;
      apellidos?: string;
      correo?: string;
    } = {};

    if (!this.editandoCodigo()) {
      if (!this.docenteForm.codigo || !this.docenteForm.codigo.trim()) {
        errs.codigo = 'El código docente UAGRM es obligatorio';
      }
    }

    if (!this.docenteForm.nombres || !this.docenteForm.nombres.trim()) {
      errs.nombres = 'Los nombres son requeridos';
    }

    if (!this.docenteForm.apellidos || !this.docenteForm.apellidos.trim()) {
      errs.apellidos = 'Los apellidos son requeridos';
    }

    if (!this.docenteForm.correo || !this.docenteForm.correo.trim()) {
      errs.correo = 'El correo electrónico es requerido';
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(this.docenteForm.correo.trim())) {
        errs.correo = 'Ingrese un formato de correo electrónico válido';
      }
    }

    this.docenteErrors.set(errs);
    return Object.keys(errs).length === 0;
  }

  guardarDocente(): void {
    if (!this.validarDocente()) return;

    this.guardandoDocente.set(true);
    this.modalDocenteError.set(null);

    const payload = {
      codigo: this.docenteForm.codigo.trim(),
      nombres: this.docenteForm.nombres.trim(),
      apellidos: this.docenteForm.apellidos.trim(),
      correo: this.docenteForm.correo.trim().toLowerCase(),
      telefono: this.docenteForm.telefono ? this.docenteForm.telefono.trim() : undefined,
      departamento_academico: this.docenteForm.departamento_academico?.trim() || 'General',
      condicion_contrato: this.docenteForm.condicion_contrato || 'TITULAR',
    };

    const codigo = this.editandoCodigo();
    const obs = codigo
      ? this.docentesService.actualizarDocente(codigo, payload)
      : this.docentesService.crearDocente(payload);

    obs.subscribe({
      next: () => {
        this.guardandoDocente.set(false);
        this.cerrarModalDocente();
        this.successMsg.set(
          codigo ? 'Datos de docente actualizados' : 'Docente registrado exitosamente',
        );
        this.cargarDocentes();
      },
      error: (err) => {
        this.guardandoDocente.set(false);
        this.modalDocenteError.set(
          err.error?.message || 'Error al guardar docente en el servidor',
        );
      },
    });
  }

  abrirConfirmacionEliminarDocente(d: DocenteItem): void {
    this.docenteAEliminar = d;
    this.confirmacionMensaje = `¿Está seguro de que desea cambiar el estado o desactivar al docente ${d.nombres} ${d.apellidos} (${d.codigo})?`;
    this.mostrarConfirmarEliminar.set(true);
  }

  ejecutarEliminacion(): void {
    if (!this.docenteAEliminar) return;

    const { codigo, nombres, apellidos } = this.docenteAEliminar;
    this.mostrarConfirmarEliminar.set(false);

    this.docentesService.eliminarDocente(codigo).subscribe({
      next: () => {
        this.successMsg.set(`Docente ${nombres} ${apellidos} desactivado o eliminado correctamente`);
        this.cargarDocentes();
      },
      error: (err) => {
        this.errorMsg.set(err.error?.message || 'Error al procesar la baja del docente');
      },
    });
  }
}
