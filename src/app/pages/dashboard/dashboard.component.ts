import { Component, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, UsuarioSession } from '../../core/services/auth.service';
import {
  UsuariosService,
  UsuarioItem,
  RolItem,
  CrearUsuarioPayload,
} from '../../core/services/usuarios.service';
import {
  AuditoriaService,
  BitacoraItem,
} from '../../core/services/auditoria.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.css'],
})
export class DashboardComponent implements OnInit {
  activeTab = signal<'usuarios' | 'roles' | 'auditoria'>('usuarios');

  currentUser = signal<UsuarioSession | null>(null);

  // Listados
  listaUsuarios = signal<UsuarioItem[]>([]);
  listaRoles = signal<RolItem[]>([]);
  listaAuditoria = signal<BitacoraItem[]>([]);

  // Filtros
  busquedaUsuarios = '';
  filtroTabla = '';
  filtroAccion = '';
  filtroCorreo = '';

  // Mensajes feedback
  successMsg = signal<string | null>(null);
  errorMsg = signal<string | null>(null);

  // Modales
  mostrarModalCrear = signal(false);
  mostrarModalPass = signal(false);

  // Objeto nuevo usuario
  nuevoUsuario: CrearUsuarioPayload = {
    nombres: '',
    apellidos: '',
    correo_institucional: '',
    password: '',
    telefono: '',
    roles_ids: [],
  };

  // Cambio de password por admin
  usuarioSeleccionado: UsuarioItem | null = null;
  nuevaPasswordAdmin = '';

  constructor(
    private authService: AuthService,
    private usuariosService: UsuariosService,
    private auditoriaService: AuditoriaService,
  ) {}

  ngOnInit(): void {
    this.currentUser.set(this.authService.currentUser());
    this.cargarUsuarios();
    this.cargarRoles();
  }

  setTab(tab: 'usuarios' | 'roles' | 'auditoria') {
    this.activeTab.set(tab);
    this.limpiarMensajes();
    if (tab === 'usuarios') this.cargarUsuarios();
    if (tab === 'roles') this.cargarRoles();
    if (tab === 'auditoria') this.cargarAuditoria();
  }

  cargarUsuarios() {
    this.usuariosService
      .getUsuarios({ busqueda: this.busquedaUsuarios })
      .subscribe({
        next: (data) => this.listaUsuarios.set(data),
        error: (err) => this.showError('Error al cargar la lista de usuarios'),
      });
  }

  cargarRoles() {
    this.usuariosService.getRoles().subscribe({
      next: (data) => this.listaRoles.set(data),
      error: (err) => this.showError('Error al cargar los roles'),
    });
  }

  cargarAuditoria() {
    this.auditoriaService
      .getBitacora({
        tabla: this.filtroTabla || undefined,
        accion: this.filtroAccion || undefined,
        correo: this.filtroCorreo || undefined,
        limite: 50,
      })
      .subscribe({
        next: (res) => this.listaAuditoria.set(res.items),
        error: (err) => this.showError('Error al consultar la bitácora de auditoría'),
      });
  }

  toggleEstado(u: UsuarioItem) {
    const nuevoEstado = !u.activo;
    this.usuariosService.cambiarEstado(u.id_usuario, nuevoEstado).subscribe({
      next: () => {
        this.showSuccess(`Estado del usuario ${u.correo_institucional} actualizado.`);
        this.cargarUsuarios();
      },
      error: () => this.showError('No se pudo cambiar el estado del usuario'),
    });
  }

  abrirModalCrearUsuario() {
    this.nuevoUsuario = {
      nombres: '',
      apellidos: '',
      correo_institucional: '',
      password: '',
      telefono: '',
      roles_ids: [],
    };
    this.mostrarModalCrear.set(true);
  }

  toggleRolSeleccion(idRol: number) {
    const idx = this.nuevoUsuario.roles_ids.indexOf(idRol);
    if (idx >= 0) {
      this.nuevoUsuario.roles_ids.splice(idx, 1);
    } else {
      this.nuevoUsuario.roles_ids.push(idRol);
    }
  }

  guardarNuevoUsuario() {
    if (this.nuevoUsuario.roles_ids.length === 0) {
      this.showError('Debe seleccionar al menos un rol.');
      return;
    }

    this.usuariosService.crearUsuario(this.nuevoUsuario).subscribe({
      next: () => {
        this.mostrarModalCrear.set(false);
        this.showSuccess('Usuario creado exitosamente con auditoría registrada.');
        this.cargarUsuarios();
      },
      error: (err) => {
        const msg = err.error?.message || 'Error al crear el usuario';
        this.showError(Array.isArray(msg) ? msg.join(', ') : msg);
      },
    });
  }

  abrirModalPassword(u: UsuarioItem) {
    this.usuarioSeleccionado = u;
    this.nuevaPasswordAdmin = '';
    this.mostrarModalPass.set(true);
  }

  guardarNuevaPassword() {
    if (!this.usuarioSeleccionado) return;
    this.usuariosService
      .cambiarPassword(this.usuarioSeleccionado.id_usuario, this.nuevaPasswordAdmin)
      .subscribe({
        next: () => {
          this.mostrarModalPass.set(false);
          this.showSuccess('Contraseña actualizada correctamente por el administrador.');
        },
        error: (err) => this.showError('Error al actualizar la contraseña'),
      });
  }

  onLogout() {
    this.authService.logout();
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

  private limpiarMensajes() {
    this.successMsg.set(null);
    this.errorMsg.set(null);
  }
}
