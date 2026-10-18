import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { PaginatedResponse } from './catalogos.service';

export interface DocenteItem {
  codigo: string;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono?: string | null;
  activo: boolean;
  creado_en?: string;
  actualizado_en?: string;
}

export interface ImportarDocentesResponse {
  mensaje: string;
  totalImportados: number;
  insertados?: number;
  actualizados?: number;
  items?: DocenteItem[];
}

@Injectable({
  providedIn: 'root',
})
export class DocentesService {
  private readonly apiUrl = 'http://localhost:3000/api/v1/docentes';

  constructor(private http: HttpClient) {}

  getDocentes(params?: {
    busqueda?: string;
    activo?: boolean;
    pagina?: number;
    limite?: number;
  }): Observable<PaginatedResponse<DocenteItem>> {
    let httpParams = new HttpParams();
    if (params?.busqueda) httpParams = httpParams.set('busqueda', params.busqueda);
    if (params?.activo !== undefined) httpParams = httpParams.set('activo', String(params.activo));
    if (params?.pagina) httpParams = httpParams.set('pagina', String(params.pagina));
    if (params?.limite) httpParams = httpParams.set('limite', String(params.limite));

    return this.http.get<PaginatedResponse<DocenteItem>>(this.apiUrl, {
      params: httpParams,
    });
  }

  getDocente(codigo: string): Observable<DocenteItem> {
    return this.http.get<DocenteItem>(`${this.apiUrl}/${codigo}`);
  }

  crearDocente(payload: {
    codigo: string;
    nombres: string;
    apellidos: string;
    correo: string;
    telefono?: string;
    activo?: boolean;
  }): Observable<DocenteItem> {
    return this.http.post<DocenteItem>(this.apiUrl, payload);
  }

  actualizarDocente(
    codigo: string,
    payload: {
      nombres?: string;
      apellidos?: string;
      correo?: string;
      telefono?: string;
      activo?: boolean;
    },
  ): Observable<DocenteItem> {
    return this.http.put<DocenteItem>(`${this.apiUrl}/${codigo}`, payload);
  }

  cambiarEstadoDocente(codigo: string, activo: boolean): Observable<DocenteItem> {
    return this.http.patch<DocenteItem>(`${this.apiUrl}/${codigo}/estado`, { activo });
  }

  eliminarDocente(codigo: string): Observable<{ mensaje: string }> {
    return this.http.delete<{ mensaje: string }>(`${this.apiUrl}/${codigo}`);
  }

  importarExcel(archivo: File): Observable<ImportarDocentesResponse> {
    const formData = new FormData();
    formData.append('archivo', archivo, archivo.name);
    return this.http.post<ImportarDocentesResponse>(`${this.apiUrl}/importar-excel`, formData);
  }

  descargarPlantillaCsv(): void {
    const cabeceras = 'codigo,nombres,apellidos,correo,telefono\n';
    const filasEjemplo =
      'DOC-1001,Carlos Humberto,Gutiérrez Flores,carlos.gutierrez@uagrm.edu.bo,71023456\n' +
      'DOC-1002,María Elena,Rojas Mercado,maria.rojas@uagrm.edu.bo,72134567\n' +
      'DOC-1003,Fernando Javier,Paredes Suárez,fernando.paredes@uagrm.edu.bo,73245678\n';

    const contenido = '\uFEFF' + cabeceras + filasEjemplo; // BOM para soporte UTF-8 en Excel
    const blob = new Blob([contenido], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_padron_docente_citef.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}
