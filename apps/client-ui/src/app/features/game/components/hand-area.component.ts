import { Component, Input, inject } from '@angular/core'
import type { Card } from '@poker/shared'
import { CardComponent } from '../../../shared/components/card.component'
import { I18nService } from '../../../core/i18n/i18n.service'
import { TPipe } from '../../../shared/pipes/t.pipe'
import { getBestHandRankKey } from '../utils/hand-rank.util'

@Component({
  selector: 'poker-hand-area',
  standalone: true,
  imports: [CardComponent, TPipe],
  template: `
    <div class="panel">
      <div class="hand-header">
        <div class="hand-title-row">
          <h3 style="margin: 0;">{{ 'hand.title' | t }}</h3>
          <div class="muted">{{ handRankLabel() }}</div>
        </div>
        @if (stack !== null) {
          <div class="muted">{{ 'game.stack' | t }} {{ stack }}</div>
        }
      </div>

      <div class="card-grid">
        @for (card of cards; track card.id) {
          <poker-card [card]="card" />
        }
      </div>
    </div>
  `,
  styles: [
    `
      .hand-header {
        display: flex;
        justify-content: space-between;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
        margin-bottom: 10px;
      }

      .hand-title-row {
        display: flex;
        gap: 10px;
        flex-wrap: wrap;
        align-items: center;
      }
    `,
  ],
})
export class HandAreaComponent {
  private readonly i18n = inject(I18nService)

  @Input({ required: true }) cards: Card[] = []
  @Input({ required: true }) communityCards: Card[] = []
  @Input() stack: number | null = null

  handRankLabel() {
    const rankKey = getBestHandRankKey([...this.cards, ...this.communityCards])

    if (!rankKey) {
      return this.i18n.t('game.handRank.pending')
    }

    return this.i18n.t(`game.handRank.${rankKey}`)
  }
}
