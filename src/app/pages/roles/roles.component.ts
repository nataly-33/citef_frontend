import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  UsuariosService,
  RolItem,
} from '../../core/services/usuarios.service';
import {
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
} from '../../shared/components';

interface PermisoGrupo {
  modulo: string;
  permisos: Array<{
    id_permiso: number;
    codigo: string;
    modulo: string;
    descrip: string;
  }>;
}

@Component({
  selector: 'app-roles',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    PaginationComponent,
    ModalAlertComponent,
    TableCardComponent,
  ],
  templateUrl: './roles.component.html',
  styleUrls: ['./roles.component.css'],
})
export class RolesComponent implements OnInit {
  listaRoles = signal<RolItem[]>([]);
  catalogoPermisos = signal<any[]>([]);
  rolSeleccionadoParaVer = signal<RolItem | null>(null);

  busquedaPermiso = '';

  // Modal
  mostrarModal = signal<boolean>(false);
  esEdicion = signal<boolean>(false);
  guardando = signal<boolean>(false);

  modeloRol = {
    id_rol: 0,
    nombre: '',
    descrip: '',
  };

  permisosSeleccionados: number[] = [];

  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);
  modalErrorMsg = signal<string | null>(null);

  constructor(private usuariosService: UsuariosService) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    this.usuariosService.getRoles().subscribe({
      next: (data) => {
        this.listaRoles.set(data);
        if (data.length > 0 && !this.rolSeleccionadoParaVer()) {
          this.rolSeleccionadoParaVer.set(data[0]);
        }
      },
      error: () => this.showError('Error al sincronizar roles.'),
    });

    this.usuariosService.getPermisos().subscribe({
      next: (data) => this.catalogoPermisos.set(data),
      error: () => this.showError('Error al cargar catálogo de permisos.'),
    });
  }

  permisosAgrupados = computed<PermisoGrupo[]>(() => {
    const list = this.catalogoPermisos();
    const gruposMap = new Map<string, any[]>();

    for (const p of list) {
      const mod = p.modulo || 'General';
      if (!gruposMap.has(mod)) gruposMap.set(mod, []);
      gruposMap.get(mod)!.push(p);
    }

    const resultado: PermisoGrupo[] = [];
    gruposMap.forEach((permisos, modulo) => {
      resultado.push({ modulo, permisos });
    });
    return resultado;
  });

  permisosFiltrados = computed(() => {
    let list = this.catalogoPermisos();
    if (this.busquedaPermiso.trim()) {
      const q = this.busquedaPermiso.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.codigo.toLowerCase().includes(q) ||
          p.descrip.toLowerCase().includes(q) ||
          (p.modulo && p.modulo.toLowerCase().includes(q)),
      );
    }
    return list;
  });

  // Paginación de la matriz de permisos (máximo 15 registros por página)
  paginaActual = signal<number>(1);
  tamanoPagina = 15;

  totalPaginas = computed(() => {
    const total = this.permisosFiltrados().length;
    return total === 0 ? 1 : Math.ceil(total / this.tamanoPagina);
  });

  permisosPaginados = computed(() => {
    const list = this.permisosFiltrados();
    const pag = this.paginaActual();
    const start = (pag - 1) * this.tamanoPagina;
    return list.slice(start, start + this.tamanoPagina);
  });

  inicioRegistro = computed(() => {
    if (this.permisosFiltrados().length === 0) return 0;
    return (this.paginaActual() - 1) * this.tamanoPagina + 1;
  });

  finRegistro = computed(() => {
    return Math.min(
      this.paginaActual() * this.tamanoPagina,
      this.permisosFiltrados().length,
    );
  });

  cambiarPagina(nueva: number) {
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
    }
  }

  seleccionarRolParaVer(r: RolItem) {
    this.rolSeleccionadoParaVer.set(r);
  }

  onCambioRolSelect(idRol: any) {
    const r = this.listaRoles().find((x) => x.id_rol === Number(idRol));
    if (r) this.rolSeleccionadoParaVer.set(r);
  }

  tienePermisoRol(codigoPermiso: string): boolean {
    const r = this.rolSeleccionadoParaVer();
    if (!r || !r.permisos) return false;
    return r.permisos.some((p) => p.codigo === codigoPermiso);
  }

  abrirModalCrear() {
    this.esEdicion.set(false);
    this.modeloRol = { id_rol: 0, nombre: '', descrip: '' };
    this.permisosSeleccionados = [];
    this.modalErrorMsg.set(null);
    this.mostrarModal.set(true);
  }

  abrirModalEditar(r: RolItem) {
    this.esEdicion.set(true);
    this.modeloRol = { id_rol: r.id_rol, nombre: r.nombre, descrip: r.descrip };
    this.permisosSeleccionados = (r.permisos || []).map((p) => p.id_permiso);
    this.modalErrorMsg.set(null);
    this.mostrarModal.set(true);
  }

  estaPermisoSeleccionado(idPermiso: number): boolean {
    return this.permisosSeleccionados.includes(idPermiso);
  }

  togglePermiso(idPermiso: number) {
    const idx = this.permisosSeleccionados.indexOf(idPermiso);
    if (idx >= 0) {
      this.permisosSeleccionados.splice(idx, 1);
    } else {
      this.permisosSeleccionados.push(idPermiso);
    }
  }

  seleccionarTodosPermisos() {
    this.permisosSeleccionados = this.catalogoPermisos().map((p) => p.id_permiso);
  }

  desmarcarTodosPermisos() {
    this.permisosSeleccionados = [];
  }

  toggleModuloCompleto(g: PermisoGrupo) {
    const ids = g.permisos.map((p) => p.id_permiso);
    const todosMarcados = ids.every((id) => this.permisosSeleccionados.includes(id));

    if (todosMarcados) {
      this.permisosSeleccionados = this.permisosSeleccionados.filter((id) => !ids.includes(id));
    } else {
      for (const id of ids) {
        if (!this.permisosSeleccionados.includes(id)) {
          this.permisosSeleccionados.push(id);
        }
      }
    }
  }

  guardarRol() {
    this.guardando.set(true);
    this.modalErrorMsg.set(null);

    if (this.esEdicion()) {
      this.usuariosService
        .actualizarPermisosRol(this.modeloRol.id_rol, this.permisosSeleccionados)
        .subscribe({
          next: (act) => {
            this.guardando.set(false);
            this.mostrarModal.set(false);
            this.showSuccess(`Permisos del rol ${act.nombre} actualizados correctamente.`);
            this.cargarDatos();
          },
          error: (err) => {
            this.guardando.set(false);
            const msg = err.error?.message || 'Error al actualizar permisos del rol.';
            this.modalErrorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
          },
        });
    } else {
      this.usuariosService
        .crearRol({
          nombre: this.modeloRol.nombre.toUpperCase(),
          descrip: this.modeloRol.descrip,
          permisos_ids: this.permisosSeleccionados,
        })
        .subscribe({
          next: (nuevo) => {
            this.guardando.set(false);
            this.mostrarModal.set(false);
            this.showSuccess(`Rol ${nuevo.nombre} creado exitosamente.`);
            this.cargarDatos();
          },
          error: (err) => {
            this.guardando.set(false);
            const msg = err.error?.message || 'Error al crear el rol.';
            this.modalErrorMsg.set(Array.isArray(msg) ? msg.join(', ') : msg);
          },
        });
    }
  }

  private showSuccess(msg: string) {
    this.successMsg.set(msg);
    this.errorMsg.set(null);
    setTimeout(() => this.successMsg.set(null), 4000);
  }

  private showError(msg: string) {
    this.errorMsg.set(msg);
    this.successMsg.set(null);
    setTimeout(() => this.errorMsg.set(null), 5000);
  }
}
