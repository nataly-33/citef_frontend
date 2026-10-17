import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-table-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="citef-card p-0 table-card-container">
      <div class="table-card-header" *ngIf="title || hasActions">
        <div>
          <h3 class="table-card-title" *ngIf="title">{{ title }}</h3>
          <p class="table-card-subtitle" *ngIf="subtitle">{{ subtitle }}</p>
        </div>
        <div class="table-card-actions">
          <ng-content select="[card-actions]"></ng-content>
        </div>
      </div>

      <div class="table-responsive">
        <ng-content></ng-content>
      </div>

      <div class="table-card-footer">
        <ng-content select="[card-footer]"></ng-content>
      </div>
    </div>
  `,
  styles: [
    `
      .table-card-container {
        border-radius: var(--citef-radius-md, 8px);
        box-shadow: var(--citef-shadow-sm, 0 1px 3px rgba(0, 0, 0, 0.07));
        border: 1px solid var(--citef-border, #e2e8f0);
        background: #ffffff;
        overflow: hidden;
      }

      .table-card-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 1.15rem 1.5rem;
        border-bottom: 1px solid var(--citef-border, #e2e8f0);
        background: #ffffff;
      }

      .table-card-title {
        font-size: 1.05rem;
        font-weight: 700;
        color: var(--citef-primary, #002855);
        margin: 0;
      }

      .table-card-subtitle {
        font-size: 0.8125rem;
        color: var(--citef-text-secondary, #64748b);
        margin: 0.25rem 0 0 0;
      }

      .table-responsive {
        overflow-x: auto;
        width: 100%;
      }

      .table-card-footer {
        width: 100%;
      }
    `,
  ],
})
export class TableCardComponent {
  @Input() title?: string;
  @Input() subtitle?: string;
  @Input() hasActions = false;
}
