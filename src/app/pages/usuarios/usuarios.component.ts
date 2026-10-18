import { Component, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  UsuariosService,
  UsuarioItem,
  RolItem,
  CrearUsuarioPayload,
  ActualizarUsuarioPayload,
} from '../../core/services/usuarios.service';
import { AuthService } from '../../core/services/auth.service';
import {
  ConfirmModalComponent,
  PaginationComponent,
  ModalAlertComponent,
  TableCardComponent,
} from '../../shared/components';

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ConfirmModalComponent,
    PaginationComponent,
    ModalAlertComponent,
    TableCardComponent,
  ],
  templateUrl: './usuarios.component.html',
  styleUrls: ['./usuarios.component.css'],
})
export class UsuariosComponent implements OnInit {
  todosLosUsuarios = signal<UsuarioItem[]>([]);
  listaRoles = signal<RolItem[]>([]);

  // Filtros
  busqueda = '';
  filtroEstado = 'TODOS';
  filtroRol = 'TODOS';

  // Lista filtrada efectiva
  usuariosFiltrados = signal<UsuarioItem[]>([]);

  // Ordenamiento
  columnaOrden = signal<string>('id_usuario');
  direccionOrden = signal<'asc' | 'desc'>('desc');

  // Paginación
  paginaActual = signal<number>(1);
  tamanoPagina = 15;

  // Mensajes de Alerta
  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  // Permisos de usuario según RBAC
  puedeCrear = computed(() => this.authService.hasPermission('SEG_USUARIOS_CREAR'));
  puedeEditar = computed(() => this.authService.hasPermission('SEG_USUARIOS_EDITAR'));

  // Modales
  mostrarModalCrear = signal<boolean>(false);
  mostrarModalEditar = signal<boolean>(false);
  mostrarModalConfirmarEliminar = signal<boolean>(false);
  guardando = signal<boolean>(false);

  // Errores de validación - Modal Nuevo Usuario
  erroresNuevo = {
    nombres: '',
    apellidos: '',
    correo: '',
    password: '',
    roles: '',
  };
  modalErrorMsg = signal<string | null>(null);

  // Errores de validación - Modal Editar Usuario
  erroresEditar = {
    nombres: '',
    apellidos: '',
    roles: '',
  };
  modalEditarErrorMsg = signal<string | null>(null);

  // Formulario Nuevo
  nuevoUsuario: CrearUsuarioPayload = {
    nombres: '',
    apellidos: '',
    correo_institucional: '',
    password: '',
    telefono: '',
    roles_ids: [],
  };

  // Formulario Editar
  usuarioAEditar: {
    id_usuario: number;
    nombres: string;
    apellidos: string;
    correo: string;
    telefono: string;
    roles_ids: number[];
    activo: boolean;
  } | null = null;

  // Usuario para eliminar/desactivar
  usuarioAEliminar: UsuarioItem | null = null;

  constructor(
    private usuariosService: UsuariosService,
    private authService: AuthService,
  ) {}

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    this.usuariosService.getUsuarios().subscribe({
      next: (data) => {
        this.todosLosUsuarios.set(data);
        this.ejecutarBusqueda();
      },
      error: () => this.showError('Error al sincronizar usuarios con la base de datos.'),
    });

    this.usuariosService.getRoles().subscribe({
      next: (data) => this.listaRoles.set(data),
      error: () => this.showError('Error al cargar catálogo de roles.'),
    });
  }

  ejecutarBusqueda() {
    let list = [...this.todosLosUsuarios()];

    // Búsqueda por texto
    if (this.busqueda.trim()) {
      const q = this.busqueda.toLowerCase().trim();
      list = list.filter(
        (u) =>
          u.nombres.toLowerCase().includes(q) ||
          u.apellidos.toLowerCase().includes(q) ||
          u.correo_institucional.toLowerCase().includes(q),
      );
    }

    // Filtro por Estado
    if (this.filtroEstado === 'ACTIVOS') {
      list = list.filter((u) => u.activo);
    } else if (this.filtroEstado === 'INACTIVOS') {
      list = list.filter((u) => !u.activo);
    }

    // Filtro por Rol
    if (this.filtroRol !== 'TODOS') {
      list = list.filter((u) =>
        u.roles.some((r) => r.nombre === this.filtroRol),
      );
    }

    // Ordenamiento
    const col = this.columnaOrden();
    const dir = this.direccionOrden();
    list.sort((a: any, b: any) => {
      let valA = a[col];
      let valB = b[col];

      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return dir === 'asc' ? -1 : 1;
      if (valA > valB) return dir === 'asc' ? 1 : -1;
      return 0;
    });

    this.usuariosFiltrados.set(list);
    this.paginaActual.set(1);
  }

  limpiarFiltros() {
    this.busqueda = '';
    this.filtroEstado = 'TODOS';
    this.filtroRol = 'TODOS';
    this.ejecutarBusqueda();
  }

  totalFiltrados = computed(() => this.usuariosFiltrados().length);

  totalPaginas = computed(() => {
    const total = this.totalFiltrados();
    return total === 0 ? 1 : Math.ceil(total / this.tamanoPagina);
  });

  usuariosPaginados = computed(() => {
    const list = this.usuariosFiltrados();
    const pag = this.paginaActual();
    const tam = this.tamanoPagina;
    const start = (pag - 1) * tam;
    return list.slice(start, start + tam);
  });

  inicioRegistro = computed(() => {
    if (this.totalFiltrados() === 0) return 0;
    return (this.paginaActual() - 1) * this.tamanoPagina + 1;
  });

  finRegistro = computed(() => {
    return Math.min(
      this.paginaActual() * this.tamanoPagina,
      this.totalFiltrados(),
    );
  });

  ordenarPor(columna: string) {
    if (this.columnaOrden() === columna) {
      this.direccionOrden.update((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      this.columnaOrden.set(columna);
      this.direccionOrden.set('asc');
    }
    this.ejecutarBusqueda();
  }

  iconoOrden(columna: string): string {
    if (this.columnaOrden() !== columna) {
      return 'bi-arrow-down-up text-muted';
    }
    return this.direccionOrden() === 'asc' ? 'bi-sort-up' : 'bi-sort-down';
  }

  cambiarPagina(nueva: number) {
    if (nueva >= 1 && nueva <= this.totalPaginas()) {
      this.paginaActual.set(nueva);
    }
  }

  // Validación y Manejo de Errores
  limpiarErrorNuevo(campo: keyof typeof this.erroresNuevo) {
    this.erroresNuevo[campo] = '';
    this.modalErrorMsg.set(null);
  }

  limpiarErrorEditar(campo: keyof typeof this.erroresEditar) {
    this.erroresEditar[campo] = '';
    this.modalEditarErrorMsg.set(null);
  }

  validarFormularioNuevo(): boolean {
    this.erroresNuevo = {
      nombres: '',
      apellidos: '',
      correo: '',
      password: '',
      roles: '',
    };
    let valido = true;

    if (!this.nuevoUsuario.nombres || !this.nuevoUsuario.nombres.trim()) {
      this.erroresNuevo.nombres = 'Los nombres son obligatorios.';
      valido = false;
    }

    if (!this.nuevoUsuario.apellidos || !this.nuevoUsuario.apellidos.trim()) {
      this.erroresNuevo.apellidos = 'Los apellidos son obligatorios.';
      valido = false;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (
      !this.nuevoUsuario.correo_institucional ||
      !this.nuevoUsuario.correo_institucional.trim()
    ) {
      this.erroresNuevo.correo = 'El correo electrónico es obligatorio.';
      valido = false;
    } else if (!emailRegex.test(this.nuevoUsuario.correo_institucional.trim())) {
      this.erroresNuevo.correo =
        'Ingrese un correo electrónico válido (ej: usuario@gmail.com).';
      valido = false;
    }

    if (!this.nuevoUsuario.password) {
      this.erroresNuevo.password = 'La contraseña inicial es obligatoria.';
      valido = false;
    } else if (this.nuevoUsuario.password.length < 6) {
      this.erroresNuevo.password =
        'La contraseña debe tener al menos 6 caracteres.';
      valido = false;
    }

    if (!this.nuevoUsuario.roles_ids || this.nuevoUsuario.roles_ids.length === 0) {
      this.erroresNuevo.roles = 'Debe seleccionar al menos un rol para el usuario.';
      valido = false;
    }

    return valido;
  }

  validarFormularioEditar(): boolean {
    this.erroresEditar = {
      nombres: '',
      apellidos: '',
      roles: '',
    };
    let valido = true;

    if (!this.usuarioAEditar?.nombres || !this.usuarioAEditar.nombres.trim()) {
      this.erroresEditar.nombres = 'Los nombres son obligatorios.';
      valido = false;
    }

    if (!this.usuarioAEditar?.apellidos || !this.usuarioAEditar.apellidos.trim()) {
      this.erroresEditar.apellidos = 'Los apellidos son obligatorios.';
      valido = false;
    }

    if (!this.usuarioAEditar?.roles_ids || this.usuarioAEditar.roles_ids.length === 0) {
      this.erroresEditar.roles = 'El usuario debe conservar al menos un rol asignado.';
      valido = false;
    }

    return valido;
  }

  // Creación de Usuario
  abrirModalCrear() {
    this.nuevoUsuario = {
      nombres: '',
      apellidos: '',
      correo_institucional: '',
      password: '',
      telefono: '',
      roles_ids: [],
    };
    this.erroresNuevo = {
      nombres: '',
      apellidos: '',
      correo: '',
      password: '',
      roles: '',
    };
    this.modalErrorMsg.set(null);
    this.mostrarModalCrear.set(true);
  }

  esRolSeleccionadoNuevo(idRol: number): boolean {
    return this.nuevoUsuario.roles_ids.includes(idRol);
  }

  toggleRolNuevo(idRol: number) {
    const idx = this.nuevoUsuario.roles_ids.indexOf(idRol);
    if (idx >= 0) {
      this.nuevoUsuario.roles_ids.splice(idx, 1);
    } else {
      this.nuevoUsuario.roles_ids.push(idRol);
    }
    if (this.nuevoUsuario.roles_ids.length > 0) {
      this.limpiarErrorNuevo('roles');
    }
  }

  guardarNuevoUsuario() {
    this.modalErrorMsg.set(null);

    if (!this.validarFormularioNuevo()) {
      return;
    }

    this.guardando.set(true);
    this.usuariosService.crearUsuario(this.nuevoUsuario).subscribe({
      next: (creado) => {
        this.guardando.set(false);
        this.mostrarModalCrear.set(false);
        this.showSuccess(`Usuario ${creado.correo_institucional} creado exitosamente.`);
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando.set(false);
        const rawMsg = err.error?.message;
        const msg = Array.isArray(rawMsg)
          ? rawMsg.join(', ')
          : rawMsg || 'Error al crear usuario en la base de datos.';
        this.modalErrorMsg.set(msg);

        // Mapear al campo específico para destacar en rojo
        const lower = msg.toLowerCase();
        if (lower.includes('correo') || lower.includes('email')) {
          this.erroresNuevo.correo = msg;
        } else if (lower.includes('contraseña') || lower.includes('password')) {
          this.erroresNuevo.password = msg;
        } else if (lower.includes('rol')) {
          this.erroresNuevo.roles = msg;
        }
      },
    });
  }

  // Edición de Usuario
  abrirModalEditar(u: UsuarioItem) {
    this.usuarioAEditar = {
      id_usuario: u.id_usuario,
      nombres: u.nombres,
      apellidos: u.apellidos,
      correo: u.correo_institucional,
      telefono: u.telefono || '',
      roles_ids: (u.roles || []).map((r) => r.id_rol),
      activo: u.activo,
    };
    this.erroresEditar = {
      nombres: '',
      apellidos: '',
      roles: '',
    };
    this.modalEditarErrorMsg.set(null);
    this.mostrarModalEditar.set(true);
  }

  esRolSeleccionadoEditar(idRol: number): boolean {
    return this.usuarioAEditar ? this.usuarioAEditar.roles_ids.includes(idRol) : false;
  }

  toggleRolEditar(idRol: number) {
    if (!this.usuarioAEditar) return;
    const idx = this.usuarioAEditar.roles_ids.indexOf(idRol);
    if (idx >= 0) {
      this.usuarioAEditar.roles_ids.splice(idx, 1);
    } else {
      this.usuarioAEditar.roles_ids.push(idRol);
    }
    if (this.usuarioAEditar.roles_ids.length > 0) {
      this.limpiarErrorEditar('roles');
    }
  }

  guardarEdicionUsuario() {
    if (!this.usuarioAEditar) return;
    this.modalEditarErrorMsg.set(null);

    if (!this.validarFormularioEditar()) {
      return;
    }

    this.guardando.set(true);
    const payload: ActualizarUsuarioPayload = {
      nombres: this.usuarioAEditar.nombres,
      apellidos: this.usuarioAEditar.apellidos,
      telefono: this.usuarioAEditar.telefono,
      activo: this.usuarioAEditar.activo,
      roles_ids: this.usuarioAEditar.roles_ids,
    };

    this.usuariosService.actualizarUsuario(this.usuarioAEditar.id_usuario, payload).subscribe({
      next: (act) => {
        this.guardando.set(false);
        this.mostrarModalEditar.set(false);
        this.showSuccess(`Datos de ${act.correo_institucional} actualizados.`);
        this.cargarDatos();
      },
      error: (err) => {
        this.guardando.set(false);
        const rawMsg = err.error?.message;
        const msg = Array.isArray(rawMsg)
          ? rawMsg.join(', ')
          : rawMsg || 'Error al actualizar usuario.';
        this.modalEditarErrorMsg.set(msg);
      },
    });
  }

  // Eliminación / Desactivación
  abrirConfirmacionEliminar(u: UsuarioItem) {
    this.usuarioAEliminar = u;
    this.mostrarModalConfirmarEliminar.set(true);
  }

  ejecutarEliminacion() {
    if (!this.usuarioAEliminar) return;

    const id = this.usuarioAEliminar.id_usuario;
    const correo = this.usuarioAEliminar.correo_institucional;
    this.mostrarModalConfirmarEliminar.set(false);

    this.usuariosService.eliminarUsuario(id).subscribe({
      next: () => {
        this.showSuccess(`Usuario ${correo} dado de baja correctamente.`);
        this.cargarDatos();
      },
      error: () => {
        // En caso de fallo con delete, intentar cambiar estado a false
        this.usuariosService.cambiarEstado(id, false).subscribe({
          next: () => {
            this.showSuccess(`Usuario ${correo} desactivado correctamente.`);
            this.cargarDatos();
          },
          error: () => this.showError('No se pudo desactivar el usuario.'),
        });
      },
    });
  }

  private showSuccess(msg: string) {
    this.successMsg.set(msg);
    this.errorMsg.set(null);
    setTimeout(() => this.successMsg.set(null), 4000);
  }

  getBadgeRolClass(nombre: string): string {
    const n = (nombre || '').toUpperCase().trim();
    if (n === 'ADMINISTRADOR' || n.includes('ADMIN')) return 'badge-role-admin';
    if (n === 'DOCENTE') return 'badge-role-docente';
    if (n === 'AUXILIAR') return 'badge-role-auxiliar';
    if (n === 'TECNICO' || n === 'TÉCNICO') return 'badge-role-tecnico';
    return 'badge-role-default';
  }

  private showError(msg: string) {
    this.errorMsg.set(msg);
    this.successMsg.set(null);
    setTimeout(() => this.errorMsg.set(null), 5000);
  }
}
