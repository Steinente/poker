import { Component, Input, inject } from '@angular/core'
import type { Card, PotState } from '@poker/shared'
import { I18nService } from '../../../core/i18n/i18n.service'
import { CardComponent } from '../../../shared/components/card.component'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'poker-trick-area',
  standalone: true,
  imports: [CardComponent, TPipe],
  template: `
    <div class="panel">
      <div class="table-header">
        <h3 style="margin: 0;">{{ 'game.table' | t }}</h3>
        <div class="muted">{{ 'game.pot' | t }} {{ potTotal }}</div>
      </div>

      <div class="card-grid table-cards-grid">
        @if (communityCards.length > 0) {
          @for (card of communityCards; track card.id) {
            <poker-card [card]="card" />
          }
        } @else {
          <p class="muted trick-empty-label">{{ 'game.boardBuilding' | t }}</p>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .table-header {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
        margin-bottom: 10px;
      }

      .table-header .muted {
        margin-left: auto;
        text-align: right;
      }

      .table-cards-grid {
        min-height: 150px;
        align-content: flex-start;
        justify-content: flex-start;
      }

      .trick-empty-label {
        margin: 0;
      }

      @media (max-width: 700px) {
        .table-cards-grid {
          min-height: 148px;
        }
      }

      @media (max-width: 460px) {
        .table-cards-grid {
          min-height: 126px;
        }
      }
    `,
  ],
})
export class TrickAreaComponent {
  readonly i18n = inject(I18nService)

  @Input() communityCards: Card[] = []
  @Input() potTotal = 0
  @Input() pots: PotState[] = []
  @Input() streetLabel = ''
  @Input() activePlayerName: string | null = null
}
