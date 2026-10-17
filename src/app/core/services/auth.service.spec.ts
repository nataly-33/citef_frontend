import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from './auth.service';

describe('AuthService (Frontend CITEF)', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({
      providers: [
        AuthService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
      ],
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('debe inicializarse como no autenticado si no hay token en localStorage', () => {
    expect(service.isAuthenticated()).toBeFalse();
    expect(service.currentUser()).toBeNull();
  });

  it('debe autenticar y almacenar el token JWT al hacer login exitoso', () => {
    const mockResponse = {
      access_token: 'fake_jwt_token_citef',
      usuario: {
        id_usuario: 1,
        correo_institucional: 'admin@uagrm.edu.bo',
        nombres: 'Admin',
        apellidos: 'Central',
        roles: ['ADMINISTRADOR'],
        permisos: ['SEG_USUARIOS_VER'],
      },
    };

    service.login('admin@uagrm.edu.bo', 'Admin123*').subscribe((res) => {
      expect(res.access_token).toBe('fake_jwt_token_citef');
      expect(service.isAuthenticated()).toBeTrue();
      expect(service.token()).toBe('fake_jwt_token_citef');
      expect(service.hasRole('ADMINISTRADOR')).toBeTrue();
    });

    const req = httpMock.expectOne('http://localhost:3000/api/v1/auth/login');
    expect(req.request.method).toBe('POST');
    req.flush(mockResponse);
  });

  it('debe limpiar la sesión y el token al invocar logout', () => {
    service.token.set('token_activo');
    service.logout();
    expect(service.token()).toBeNull();
    expect(service.currentUser()).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
  });
});
