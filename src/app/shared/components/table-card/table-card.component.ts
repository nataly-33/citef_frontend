import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-table-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './table-card.component.html',
  styleUrls: ['./table-card.component.css'],
})
export class TableCardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() hasActions = false;
}
