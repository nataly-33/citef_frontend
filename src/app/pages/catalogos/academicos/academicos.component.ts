import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  CatalogosService,
  CarreraItem,
  MateriaItem,
} from '../../../core/services/catalogos.service';
import { AuthService } from '../../../core/services/auth.service';
import {
  ConfirmModalComponent,
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
} from '../../../shared/components';

@Component({
  selector: 'app-academicos',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmModalComponent,
    PaginationComponent,
    ModalAlertComponent,
    TableCardComponent,
  ],
  templateUrl: './academicos.component.html',
  styleUrls: ['./academicos.component.css'],
})
export class AcademicosComponent implements OnInit {
  pestanaActiva = signal<'carreras' | 'materias'>('carreras');
  readonly limite = 15;
  readonly semestresLista = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

  // Global messages
  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  // ==========================================
  // ESTADO CARRERAS
  // ==========================================
  carreras = signal<CarreraItem[]>([]);
  carrerasTotal = signal<number>(0);
  carreraPagina = signal<number>(1);
  busquedaCarrera = '';
  filtroEstadoCarrera = 'TODOS';

  mostrarModalCarrera = signal<boolean>(false);
  editandoCarreraId = signal<number | null>(null);
  guardandoCarrera = signal<boolean>(false);
  modalCarreraError = signal<string | null>(null);

  carreraForm = {
    codigo: '',
    nombre: '',
  };

  carreraErrors = signal<{ codigo?: string; nombre?: string }>({});

  // ==========================================
  // ESTADO MATERIAS
  // ==========================================
  materias = signal<MateriaItem[]>([]);
  materiasTotal = signal<number>(0);
  materiaPagina = signal<number>(1);
  listaCarrerasTodas = signal<CarreraItem[]>([]);

  filtroCarreraMateria: number | null = null;
  busquedaMateria = '';
  filtroSemestreMateria: number | null = null;
  filtroEstadoMateria = 'TODOS';

  mostrarModalMateria = signal<boolean>(false);
  editandoMateriaId = signal<number | null>(null);
  guardandoMateria = signal<boolean>(false);
  modalMateriaError = signal<string | null>(null);

  materiaForm = {
    sigla: '',
    nombre: '',
  };

  materiaCarreras: Array<{ id_carrera: number | null; semestre_nivel: number | null }> = [
    { id_carrera: null, semestre_nivel: 1 },
  ];

  materiaErrors = signal<{
    sigla?: string;
    nombre?: string;
    carreras?: string;
  }>({});

  carrerasFilaErrors = signal<Record<number, { carrera?: string; semestre?: string; general?: string }>>({});

  // ==========================================
  // CONFIRMACIÓN DE ELIMINACIÓN
  // ==========================================
  mostrarConfirmarEliminar = signal<boolean>(false);
  confirmacionTitulo = '';
  confirmacionMensaje = '';
  elementoAEliminar: { tipo: 'carrera' | 'materia'; id: number; nombre: string } | null = null;

  constructor(
    private catalogosService: CatalogosService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarCarreras();
    this.cargarListaCarrerasDropdown();
    this.cargarMaterias();
  }

  puedeGestionar(): boolean {
    return this.authService.hasPermission('CAT_ACADEMICOS_GESTIONAR');
  }

  cambiarPestana(pestana: 'carreras' | 'materias'): void {
    this.pestanaActiva.set(pestana);
    this.successMsg.set(null);
    this.errorMsg.set(null);
  }

  // ==========================================
  // LÓGICA CARRERAS
  // ==========================================
  cargarCarreras(): void {
    const activoParam =
      this.filtroEstadoCarrera === 'TODOS'
        ? undefined
        : this.filtroEstadoCarrera === 'ACTIVOS';

    this.catalogosService
      .getCarreras({
        busqueda: this.busquedaCarrera.trim() || undefined,
        activo: activoParam,
        pagina: this.carreraPagina(),
        limite: this.limite,
      })
      .subscribe({
        next: (res) => {
          this.carreras.set(res.items);
          this.carrerasTotal.set(res.total);
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error al cargar catálogo de carreras');
        },
      });
  }

  cargarListaCarrerasDropdown(): void {
    this.catalogosService.getCarrerasTodas().subscribe({
      next: (res) => this.listaCarrerasTodas.set(res),
      error: () => {},
    });
  }

  ejecutarBusquedaCarreras(): void {
    this.carreraPagina.set(1);
    this.cargarCarreras();
  }

  limpiarFiltrosCarreras(): void {
    this.busquedaCarrera = '';
    this.filtroEstadoCarrera = 'TODOS';
    this.carreraPagina.set(1);
    this.cargarCarreras();
  }

  cambiarPaginaCarrera(p: number): void {
    this.carreraPagina.set(p);
    this.cargarCarreras();
  }

  abrirModalCrearCarrera(): void {
    this.editandoCarreraId.set(null);
    this.carreraForm = { codigo: '', nombre: '' };
    this.carreraErrors.set({});
    this.modalCarreraError.set(null);
    this.mostrarModalCarrera.set(true);
  }

  abrirModalEditarCarrera(c: CarreraItem): void {
    this.editandoCarreraId.set(c.id_carrera);
    this.carreraForm = { codigo: c.codigo, nombre: c.nombre };
    this.carreraErrors.set({});
    this.modalCarreraError.set(null);
    this.mostrarModalCarrera.set(true);
  }

  cerrarModalCarrera(): void {
    this.mostrarModalCarrera.set(false);
    this.modalCarreraError.set(null);
    this.carreraErrors.set({});
  }

  validarCarrera(): boolean {
    const errs: { codigo?: string; nombre?: string } = {};
    if (!this.carreraForm.codigo || !this.carreraForm.codigo.trim()) {
      errs.codigo = 'El código de la carrera es obligatorio (ej: 186-5)';
    } else if (this.carreraForm.codigo.trim().length > 20) {
      errs.codigo = 'El código no puede exceder 20 caracteres';
    }

    if (!this.carreraForm.nombre || !this.carreraForm.nombre.trim()) {
      errs.nombre = 'El nombre de la carrera es obligatorio';
    } else if (this.carreraForm.nombre.trim().length > 100) {
      errs.nombre = 'El nombre no puede exceder 100 caracteres';
    }

    this.carreraErrors.set(errs);
    return Object.keys(errs).length === 0;
  }

  guardarCarrera(): void {
    if (!this.validarCarrera()) return;

    this.guardandoCarrera.set(true);
    this.modalCarreraError.set(null);

    const payload = {
      codigo: this.carreraForm.codigo.trim().toUpperCase(),
      nombre: this.carreraForm.nombre.trim(),
    };

    const id = this.editandoCarreraId();
    const obs = id
      ? this.catalogosService.actualizarCarrera(id, payload)
      : this.catalogosService.crearCarrera(payload);

    obs.subscribe({
      next: () => {
        this.guardandoCarrera.set(false);
        this.cerrarModalCarrera();
        this.successMsg.set(
          id ? 'Carrera actualizada correctamente' : 'Carrera creada exitosamente',
        );
        this.cargarCarreras();
        this.cargarListaCarrerasDropdown();
      },
      error: (err) => {
        this.guardandoCarrera.set(false);
        this.modalCarreraError.set(
          err.error?.message || 'Error al guardar la carrera en el servidor',
        );
      },
    });
  }

  abrirConfirmacionEliminarCarrera(c: CarreraItem): void {
    this.elementoAEliminar = {
      tipo: 'carrera',
      id: c.id_carrera,
      nombre: c.nombre,
    };
    this.confirmacionTitulo = 'Desactivar Carrera Universitaria';
    this.confirmacionMensaje = `¿Está seguro de que desea cambiar el estado o desactivar la carrera "${c.nombre}" (${c.codigo})?`;
    this.mostrarConfirmarEliminar.set(true);
  }

  // ==========================================
  // LÓGICA MATERIAS
  // ==========================================
  cargarMaterias(): void {
    const activoParam =
      this.filtroEstadoMateria === 'TODOS'
        ? undefined
        : this.filtroEstadoMateria === 'ACTIVOS';

    this.catalogosService
      .getMaterias({
        id_carrera: this.filtroCarreraMateria || undefined,
        semestre_nivel: this.filtroSemestreMateria || undefined,
        busqueda: this.busquedaMateria.trim() || undefined,
        activo: activoParam,
        pagina: this.materiaPagina(),
        limite: this.limite,
      })
      .subscribe({
        next: (res) => {
          this.materias.set(res.items);
          this.materiasTotal.set(res.total);
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error al cargar catálogo de materias');
        },
      });
  }

  ejecutarBusquedaMaterias(): void {
    this.materiaPagina.set(1);
    this.cargarMaterias();
  }

  limpiarFiltrosMaterias(): void {
    this.filtroCarreraMateria = null;
    this.busquedaMateria = '';
    this.filtroSemestreMateria = null;
    this.filtroEstadoMateria = 'TODOS';
    this.materiaPagina.set(1);
    this.cargarMaterias();
  }

  cambiarPaginaMateria(p: number): void {
    this.materiaPagina.set(p);
    this.cargarMaterias();
  }

  agregarCarreraFila(): void {
    this.materiaCarreras.push({ id_carrera: null, semestre_nivel: 1 });
  }

  removerCarreraFila(index: number): void {
    if (this.materiaCarreras.length > 1) {
      this.materiaCarreras.splice(index, 1);
      if (Object.keys(this.carrerasFilaErrors()).length > 0) {
        this.validarMateria();
      }
    }
  }

  carreraFilaError(index: number, tipo: 'carrera' | 'semestre' | 'general'): string | undefined {
    return this.carrerasFilaErrors()[index]?.[tipo];
  }

  abrirModalCrearMateria(): void {
    this.cargarListaCarrerasDropdown();
    this.editandoMateriaId.set(null);
    this.materiaForm = {
      sigla: '',
      nombre: '',
    };
    const carreraInicial = this.filtroCarreraMateria || null;
    this.materiaCarreras = [
      { id_carrera: carreraInicial, semestre_nivel: 1 },
    ];
    this.materiaErrors.set({});
    this.carrerasFilaErrors.set({});
    this.modalMateriaError.set(null);
    this.mostrarModalMateria.set(true);
  }

  abrirModalEditarMateria(m: MateriaItem): void {
    this.cargarListaCarrerasDropdown();
    this.editandoMateriaId.set(m.id_materia);
    this.materiaForm = {
      sigla: m.sigla,
      nombre: m.nombre,
    };

    if (m.carreras_asociadas && m.carreras_asociadas.length > 0) {
      this.materiaCarreras = m.carreras_asociadas.map((ca) => ({
        id_carrera: ca.id_carrera,
        semestre_nivel: ca.semestre_nivel,
      }));
    } else if (m.id_carrera) {
      this.materiaCarreras = [
        { id_carrera: m.id_carrera, semestre_nivel: m.semestre_nivel || 1 },
      ];
    } else {
      this.materiaCarreras = [{ id_carrera: null, semestre_nivel: 1 }];
    }

    this.materiaErrors.set({});
    this.carrerasFilaErrors.set({});
    this.modalMateriaError.set(null);
    this.mostrarModalMateria.set(true);
  }

  cerrarModalMateria(): void {
    this.mostrarModalMateria.set(false);
    this.modalMateriaError.set(null);
    this.materiaErrors.set({});
    this.carrerasFilaErrors.set({});
  }

  validarMateria(): boolean {
    const errs: {
      sigla?: string;
      nombre?: string;
      carreras?: string;
    } = {};

    const filaErrors: Record<number, { carrera?: string; semestre?: string; general?: string }> = {};

    if (!this.materiaForm.sigla || !this.materiaForm.sigla.trim()) {
      errs.sigla = 'La sigla de la materia es obligatoria (ej: MAT101)';
    } else if (this.materiaForm.sigla.trim().length > 20) {
      errs.sigla = 'La sigla no puede superar 20 caracteres';
    }

    if (!this.materiaForm.nombre || !this.materiaForm.nombre.trim()) {
      errs.nombre = 'El nombre de la materia es obligatorio';
    } else if (this.materiaForm.nombre.trim().length > 150) {
      errs.nombre = 'El nombre no puede superar 150 caracteres';
    }

    if (!this.materiaCarreras || this.materiaCarreras.length === 0) {
      errs.carreras = 'Debe vincular al menos una carrera a la materia';
    } else {
      const carrerasVistas = new Set<number>();

      this.materiaCarreras.forEach((c, idx) => {
        const rowErr: { carrera?: string; semestre?: string; general?: string } = {};

        if (!c.id_carrera) {
          rowErr.carrera = 'Seleccione una carrera';
          rowErr.general = 'Debe seleccionar una carrera de la lista';
        } else if (carrerasVistas.has(c.id_carrera)) {
          rowErr.carrera = 'Carrera repetida';
          rowErr.general = 'Esta carrera ya fue agregada en otra fila';
        } else {
          carrerasVistas.add(c.id_carrera);
        }

        if (!c.semestre_nivel) {
          rowErr.semestre = 'Indique semestre';
          if (!rowErr.general) rowErr.general = 'Debe seleccionar el semestre correspondiente';
        }

        if (Object.keys(rowErr).length > 0) {
          filaErrors[idx] = rowErr;
        }
      });

      if (Object.keys(filaErrors).length > 0) {
        errs.carreras = 'Corrija las carreras y semestres marcados en rojo';
      }
    }

    this.materiaErrors.set(errs);
    this.carrerasFilaErrors.set(filaErrors);
    return Object.keys(errs).length === 0 && Object.keys(filaErrors).length === 0;
  }

  guardarMateria(): void {
    if (!this.validarMateria()) return;

    this.guardandoMateria.set(true);
    this.modalMateriaError.set(null);

    const carrerasPayload = this.materiaCarreras.map((c) => ({
      id_carrera: Number(c.id_carrera),
      semestre_nivel: Number(c.semestre_nivel),
    }));

    const payload = {
      sigla: this.materiaForm.sigla.trim().toUpperCase(),
      nombre: this.materiaForm.nombre.trim(),
      carreras: carrerasPayload,
      id_carrera: carrerasPayload[0]?.id_carrera,
      semestre_nivel: carrerasPayload[0]?.semestre_nivel,
    };

    const id = this.editandoMateriaId();
    const obs = id
      ? this.catalogosService.actualizarMateria(id, payload)
      : this.catalogosService.crearMateria(payload);

    obs.subscribe({
      next: () => {
        this.guardandoMateria.set(false);
        this.cerrarModalMateria();
        this.successMsg.set(
          id ? 'Materia actualizada correctamente' : 'Materia creada exitosamente',
        );
        this.cargarMaterias();
      },
      error: (err) => {
        this.guardandoMateria.set(false);
        this.modalMateriaError.set(
          err.error?.message || 'Error al guardar la materia en el servidor',
        );
      },
    });
  }

  abrirConfirmacionEliminarMateria(m: MateriaItem): void {
    this.elementoAEliminar = {
      tipo: 'materia',
      id: m.id_materia,
      nombre: `${m.sigla} - ${m.nombre}`,
    };
    this.confirmacionTitulo = 'Desactivar Materia Universitaria';
    this.confirmacionMensaje = `¿Está seguro de que desea cambiar el estado o desactivar la materia "${m.nombre}" (${m.sigla})?`;
    this.mostrarConfirmarEliminar.set(true);
  }

  // ==========================================
  // CONFIRMACIÓN GENERAL
  // ==========================================
  ejecutarEliminacion(): void {
    if (!this.elementoAEliminar) return;

    const { tipo, id, nombre } = this.elementoAEliminar;
    this.mostrarConfirmarEliminar.set(false);

    if (tipo === 'carrera') {
      this.catalogosService.eliminarCarrera(id).subscribe({
        next: () => {
          this.successMsg.set(`Carrera "${nombre}" eliminada o desactivada correctamente`);
          this.cargarCarreras();
          this.cargarListaCarrerasDropdown();
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error al procesar la baja de la carrera');
        },
      });
    } else {
      this.catalogosService.eliminarMateria(id).subscribe({
        next: () => {
          this.successMsg.set(`Materia "${nombre}" eliminada o desactivada correctamente`);
          this.cargarMaterias();
        },
        error: (err) => {
          this.errorMsg.set(err.error?.message || 'Error al procesar la baja de la materia');
        },
      });
    }
  }
}
