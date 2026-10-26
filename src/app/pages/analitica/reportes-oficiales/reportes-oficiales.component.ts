import { Component, OnInit, signal, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  AnaliticaService,
  ReporteCatalogoItem,
  FiltroReporteDto,
} from '../../../core/services/analitica.service';
import { InfraestructuraService, SalaItem } from '../../../core/services/infraestructura.service';
import { ModalAlertComponent } from '../../../shared/components/modal-alert/modal-alert.component';

@Component({
  selector: 'app-reportes-oficiales',
  standalone: true,
  imports: [CommonModule, FormsModule, ModalAlertComponent],
  templateUrl: './reportes-oficiales.component.html',
  styleUrls: ['./reportes-oficiales.component.css'],
})
export class ReportesOficialesComponent implements OnInit {
  private readonly analiticaService = inject(AnaliticaService);
  private readonly infraService = inject(InfraestructuraService);

  // Estados
  cargandoCatalogo = signal<boolean>(false);
  exportandoExcel = signal<boolean>(false);
  cargandoPdf = signal<boolean>(false);
  catalogoReportes = signal<ReporteCatalogoItem[]>([]);
  reporteSeleccionado = signal<ReporteCatalogoItem | null>(null);
  salas = signal<SalaItem[]>([]);

  // Filtros compactos (Sin etiquetas)
  filtroFechaInicio = signal<string>('');
  filtroFechaFin = signal<string>('');
  filtroSalaId = signal<number | null>(null);

  // Modal Vista Previa PDF Oficial
  mostrarModalPdf = signal<boolean>(false);
  datosPdfPreview = signal<any | null>(null);
  mensajeError = signal<string | null>(null);

  ngOnInit(): void {
    // Rango de fechas por defecto
    const hoy = new Date();
    const inicioMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
    this.filtroFechaInicio.set(inicioMes.toISOString().slice(0, 10));
    this.filtroFechaFin.set(hoy.toISOString().slice(0, 10));

    this.cargarCatalogo();
    this.cargarSalas();
  }

  cargarCatalogo(): void {
    this.cargandoCatalogo.set(true);
    this.analiticaService.getCatalogoReportes().subscribe({
      next: (res) => {
        this.catalogoReportes.set(res || []);
        if (res && res.length > 0) {
          this.reporteSeleccionado.set(res[0]);
        }
        this.cargandoCatalogo.set(false);
      },
      error: () => {
        this.cargandoCatalogo.set(false);
      },
    });
  }

  cargarSalas(): void {
    this.infraService.getSalas({ activo: true }).subscribe({
      next: (res) => this.salas.set(res || []),
      error: () => {},
    });
  }

  seleccionarReporte(rep: ReporteCatalogoItem): void {
    this.reporteSeleccionado.set(rep);
    this.mensajeError.set(null);
  }

  exportarExcel(): void {
    const sel = this.reporteSeleccionado();
    if (!sel) return;

    this.exportandoExcel.set(true);
    this.mensajeError.set(null);

    const dto: FiltroReporteDto = {
      tipo_reporte: sel.codigo,
      fecha_inicio: this.filtroFechaInicio(),
      fecha_fin: this.filtroFechaFin(),
      id_sala: this.filtroSalaId(),
      formato: 'EXCEL',
    };

    this.analiticaService.exportarExcel(dto).subscribe({
      next: (blob: Blob) => {
        const fechaStr = new Date().toISOString().slice(0, 10);
        const fileName = `CITEF_${sel.codigo}_${fechaStr}.xlsx`;
        this.descargarBlob(blob, fileName);
        this.exportandoExcel.set(false);
      },
      error: (err) => {
        this.mensajeError.set('No se pudo generar el libro de Excel. Verifique la conexión con el servidor.');
        this.exportandoExcel.set(false);
      },
    });
  }

  abrirVistaPreviaPdf(): void {
    const sel = this.reporteSeleccionado();
    if (!sel) return;

    this.cargandoPdf.set(true);
    this.mensajeError.set(null);

    const dto: FiltroReporteDto = {
      tipo_reporte: sel.codigo,
      fecha_inicio: this.filtroFechaInicio(),
      fecha_fin: this.filtroFechaFin(),
      id_sala: this.filtroSalaId(),
      formato: 'PDF',
    };

    this.analiticaService.getReportePdfData(dto).subscribe({
      next: (data) => {
        this.datosPdfPreview.set(data);
        this.cargandoPdf.set(false);
        this.mostrarModalPdf.set(true);
      },
      error: () => {
        this.mensajeError.set('Error al recopilar los datos oficiales para la generación del documento PDF.');
        this.cargandoPdf.set(false);
      },
    });
  }

  cerrarModalPdf(): void {
    this.mostrarModalPdf.set(false);
    this.datosPdfPreview.set(null);
  }

  imprimirDocumentoOficial(): void {
    window.print();
  }

  private descargarBlob(blob: Blob, nombreArchivo: string): void {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = nombreArchivo;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  }
}
