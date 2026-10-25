import { Component, OnInit, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  TurnosService,
  ObjetoExtraviado,
  RegistrarObjetoDto,
  DevolverObjetoDto,
} from '../../../core/services/turnos.service';
import { InfraestructuraService, SalaItem } from '../../../core/services/infraestructura.service';
import { OcupacionService } from '../../../core/services/ocupacion.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ConfirmModalComponent,
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
} from '../../../shared/components';

@Component({
  selector: 'app-objetos-extraviados',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmModalComponent,
    PaginationComponent,
    ModalAlertComponent,
    TableCardComponent,
  ],
  templateUrl: './objetos-extraviados.component.html',
  styleUrls: ['./objetos-extraviados.component.css'],
})
export class ObjetosExtraviadosComponent implements OnInit {
  private readonly turnosService = inject(TurnosService);
  private readonly infraService = inject(InfraestructuraService);
  private readonly ocupacionService = inject(OcupacionService);
  readonly authService = inject(AuthService);

  // Estados de tabla
  cargando = signal<boolean>(false);
  objetos = signal<ObjetoExtraviado[]>([]);
  totalRegistros = signal<number>(0);
  paginaActual = signal<number>(1);
  readonly limite = 15;

  // Catálogos
  salas = signal<SalaItem[]>([]);

  // Filtros
  filtroBusqueda = signal<string>('');
  filtroSala = signal<number | null>(null);
  filtroCategoria = signal<string>('TODOS');
  filtroEstado = signal<string>('TODOS');

  // Mensajes de alerta global
  mensajeExito = signal<string | null>(null);
  mensajeError = signal<string | null>(null);

  // Modales
  mostrarModalRegistrar = signal<boolean>(false);
  mostrarModalDevolver = signal<boolean>(false);
  mostrarModalDetalle = signal<boolean>(false);
  mostrarModalEditar = signal<boolean>(false);
  mostrarConfirmEliminar = signal<boolean>(false);

  // Selección
  objetoSeleccionado = signal<ObjetoExtraviado | null>(null);
  objetoAEliminar = signal<ObjetoExtraviado | null>(null);

  // Formulario Registrar Objeto
  registroForm = {
    id_sala: null as number | null,
    categoria: 'ELECTRONICA' as 'ELECTRONICA' | 'DOCUMENTO' | 'PRENDA' | 'MATERIAL_ESTUDIO' | 'OTRO',
    descrip_detallada: '',
    lugar_exacto: '',
  };
  formErrorsRegistro = signal<{ [key: string]: string }>({});
  modalAlertRegistro = signal<string | null>(null);

  // Formulario Devolver / Restituir al Estudiante
  devolucionForm = {
    registro_estudiante: '',
    nombre_estudiante: '',
    obs_devolucion: '',
  };
  formErrorsDevolucion = signal<{ [key: string]: string }>({});
  modalAlertDevolucion = signal<string | null>(null);

  // Formulario Editar
  editarForm = {
    categoria: 'ELECTRONICA' as 'ELECTRONICA' | 'DOCUMENTO' | 'PRENDA' | 'MATERIAL_ESTUDIO' | 'OTRO',
    descrip_detallada: '',
    lugar_exacto: '',
  };

  ngOnInit(): void {
    this.cargarSalas();
    this.cargarObjetos();
  }

  cargarSalas(): void {
    this.infraService.getSalas({ activo: true }).subscribe({
      next: (res) => this.salas.set(res || []),
      error: () => this.salas.set([]),
    });
  }

  cargarObjetos(): void {
    this.cargando.set(true);
    this.turnosService
      .getObjetos({
        pagina: this.paginaActual(),
        limite: this.limite,
        id_sala: this.filtroSala() || undefined,
        categoria: this.filtroCategoria(),
        estado: this.filtroEstado(),
        busqueda: this.filtroBusqueda().trim() || undefined,
      })
      .subscribe({
        next: (resp) => {
          this.objetos.set(resp?.data || (resp as any)?.items || []);
          this.totalRegistros.set(resp?.total || 0);
          this.cargando.set(false);
        },
        error: (err) => {
          console.error('Error cargando libro de objetos extraviados', err);
          this.objetos.set([]);
          this.totalRegistros.set(0);
          this.cargando.set(false);
        },
      });
  }

  aplicarFiltros(): void {
    this.paginaActual.set(1);
    this.cargarObjetos();
  }

  limpiarFiltros(): void {
    this.filtroBusqueda.set('');
    this.filtroSala.set(null);
    this.filtroCategoria.set('TODOS');
    this.filtroEstado.set('TODOS');
    this.paginaActual.set(1);
    this.cargarObjetos();
  }

  cambiarPagina(p: number): void {
    this.paginaActual.set(p);
    this.cargarObjetos();
  }

  // ================= MODAL REGISTRAR OBJETO =================
  abrirModalRegistrar(): void {
    this.formErrorsRegistro.set({});
    this.modalAlertRegistro.set(null);
    this.registroForm = {
      id_sala: this.salas().length > 0 ? this.salas()[0].id_sala : null,
      categoria: 'ELECTRONICA',
      descrip_detallada: '',
      lugar_exacto: '',
    };
    this.mostrarModalRegistrar.set(true);
  }

  cerrarModalRegistrar(): void {
    this.mostrarModalRegistrar.set(false);
  }

  confirmarRegistro(): void {
    this.formErrorsRegistro.set({});
    this.modalAlertRegistro.set(null);

    const errores: { [key: string]: string } = {};
    if (!this.registroForm.id_sala) {
      errores['id_sala'] = 'Debe seleccionar la sala o laboratorio donde se halló el objeto.';
    }
    if (!this.registroForm.lugar_exacto.trim()) {
      errores['lugar_exacto'] = 'Especifique la ubicación exacta (ej. Mesa PC-14, Escritorio Auxiliar).';
    }
    if (!this.registroForm.descrip_detallada.trim()) {
      errores['descrip_detallada'] = 'Describa detalladamente el bien encontrado.';
    }

    if (Object.keys(errores).length > 0) {
      this.formErrorsRegistro.set(errores);
      return;
    }

    const payload: RegistrarObjetoDto = {
      id_sala: Number(this.registroForm.id_sala),
      categoria: this.registroForm.categoria,
      descrip_detallada: this.registroForm.descrip_detallada.trim(),
      lugar_exacto: this.registroForm.lugar_exacto.trim(),
    };

    this.cargando.set(true);
    this.turnosService.registrarObjeto(payload).subscribe({
      next: (objetoRegistrado) => {
        this.cargando.set(false);
        this.mostrarModalRegistrar.set(false);
        this.mensajeExito.set(
          `Objeto #${objetoRegistrado.id_objeto} ingresado a custodia institucional.`,
        );
        setTimeout(() => this.mensajeExito.set(null), 4000);
        this.cargarObjetos();
      },
      error: (err) => {
        this.cargando.set(false);
        this.modalAlertRegistro.set(
          err?.error?.message || 'Error al registrar el objeto en el servidor.',
        );
      },
    });
  }

  // ================= MODAL DEVOLVER OBJETO (RESTITUCIÓN) =================
  abrirModalDevolver(obj: ObjetoExtraviado): void {
    this.objetoSeleccionado.set(obj);
    this.formErrorsDevolucion.set({});
    this.modalAlertDevolucion.set(null);
    this.devolucionForm = {
      registro_estudiante: '',
      nombre_estudiante: '',
      obs_devolucion: '',
    };
    this.mostrarModalDevolver.set(true);
  }

  cerrarModalDevolver(): void {
    this.mostrarModalDevolver.set(false);
  }

  buscarEstudianteReceptor(): void {
    const reg = this.devolucionForm.registro_estudiante.trim();
    if (!reg) return;
    this.ocupacionService.buscarEstudiantePorRegistro(reg).subscribe({
      next: (resp) => {
        if (resp && resp.estudiante) {
          const nombreCompleto = `${resp.estudiante.nombres || ''} ${resp.estudiante.apellidos || ''}`.trim();
          if (nombreCompleto) {
            this.devolucionForm.nombre_estudiante = nombreCompleto;
            // Limpiar error de nombre si existía
            const errores = { ...this.formErrorsDevolucion() };
            delete errores['nombre_estudiante'];
            this.formErrorsDevolucion.set(errores);
          }
        }
      },
      error: () => {
        // Silencioso; permite digitación manual del nombre
      },
    });
  }

  confirmarDevolucion(): void {
    const obj = this.objetoSeleccionado();
    if (!obj) return;

    this.formErrorsDevolucion.set({});
    this.modalAlertDevolucion.set(null);

    const errores: { [key: string]: string } = {};
    if (!this.devolucionForm.registro_estudiante.trim()) {
      errores['registro_estudiante'] = 'Debe ingresar el Registro Universitario (RU) o C.I. del estudiante.';
    }

    if (!this.devolucionForm.nombre_estudiante.trim()) {
      errores['nombre_estudiante'] = 'Debe ingresar el nombre completo del estudiante reclamante.';
    }

    if (Object.keys(errores).length > 0) {
      this.formErrorsDevolucion.set(errores);
      return;
    }

    const payload: DevolverObjetoDto = {
      registro_estudiante_receptor: this.devolucionForm.registro_estudiante.trim(),
      nombre_estudiante_receptor: this.devolucionForm.nombre_estudiante.trim(),
      obs_devolucion: this.devolucionForm.obs_devolucion.trim() || undefined,
    };

    this.cargando.set(true);
    this.turnosService.devolverObjeto(obj.id_objeto, payload).subscribe({
      next: () => {
        this.cargando.set(false);
        this.mostrarModalDevolver.set(false);
        this.mensajeExito.set(
          `Objeto #${obj.id_objeto} restituido formalmente al estudiante ${payload.nombre_estudiante_receptor} (RU: ${payload.registro_estudiante_receptor}).`,
        );
        setTimeout(() => this.mensajeExito.set(null), 4500);
        this.cargarObjetos();
      },
      error: (err) => {
        this.cargando.set(false);
        this.modalAlertDevolucion.set(
          err?.error?.message || 'Error al procesar la devolución. Verifique los datos ingresados.',
        );
      },
    });
  }

  // ================= MODAL DETALLE / COMPROBANTE =================
  verDetalleObjeto(obj: ObjetoExtraviado): void {
    this.objetoSeleccionado.set(obj);
    this.mostrarModalDetalle.set(true);
  }

  cerrarModalDetalle(): void {
    this.mostrarModalDetalle.set(false);
  }

  // ================= MODAL EDITAR =================
  abrirModalEditar(obj: ObjetoExtraviado): void {
    this.objetoSeleccionado.set(obj);
    this.editarForm = {
      categoria: obj.categoria,
      descrip_detallada: obj.descrip_detallada,
      lugar_exacto: obj.lugar_exacto,
    };
    this.mostrarModalEditar.set(true);
  }

  cerrarModalEditar(): void {
    this.mostrarModalEditar.set(false);
  }

  guardarEdicion(): void {
    const obj = this.objetoSeleccionado();
    if (!obj) return;

    this.cargando.set(true);
    this.turnosService
      .actualizarObjeto(obj.id_objeto, {
        categoria: this.editarForm.categoria,
        descrip_detallada: this.editarForm.descrip_detallada.trim(),
        lugar_exacto: this.editarForm.lugar_exacto.trim(),
      })
      .subscribe({
        next: () => {
          this.cargando.set(false);
          this.mostrarModalEditar.set(false);
          this.mensajeExito.set(`Objeto #${obj.id_objeto} modificado correctamente.`);
          setTimeout(() => this.mensajeExito.set(null), 3500);
          this.cargarObjetos();
        },
        error: (err) => {
          this.cargando.set(false);
          this.mensajeError.set(err?.error?.message || 'Error al actualizar objeto.');
          setTimeout(() => this.mensajeError.set(null), 4000);
        },
      });
  }

  // ================= ELIMINAR =================
  solicitarEliminar(obj: ObjetoExtraviado): void {
    this.objetoAEliminar.set(obj);
    this.mostrarConfirmEliminar.set(true);
  }

  confirmarEliminar(): void {
    const obj = this.objetoAEliminar();
    if (!obj) return;

    this.cargando.set(true);
    this.turnosService.eliminarObjeto(obj.id_objeto).subscribe({
      next: () => {
        this.cargando.set(false);
        this.mostrarConfirmEliminar.set(false);
        this.objetoAEliminar.set(null);
        this.mensajeExito.set(`Objeto #${obj.id_objeto} eliminado del libro de custodia.`);
        setTimeout(() => this.mensajeExito.set(null), 3500);
        this.cargarObjetos();
      },
      error: (err) => {
        this.cargando.set(false);
        this.mostrarConfirmEliminar.set(false);
        this.mensajeError.set(err?.error?.message || 'No se puede eliminar el objeto.');
        setTimeout(() => this.mensajeError.set(null), 4000);
      },
    });
  }

  cancelarEliminar(): void {
    this.mostrarConfirmEliminar.set(false);
    this.objetoAEliminar.set(null);
  }
}
