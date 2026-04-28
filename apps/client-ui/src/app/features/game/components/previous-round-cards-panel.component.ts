import { Component, Input, inject } from '@angular/core'
import type {
  Card,
  GamePlayerViewMeta,
  PreviousRoundRevealedCards,
} from '@poker/shared'
import type { TranslationKey } from '../../../core/i18n/translations'
import { I18nService } from '../../../core/i18n/i18n.service'
import { CardComponent } from '../../../shared/components/card.component'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'poker-previous-round-cards-panel',
  standalone: true,
  imports: [CardComponent, TPipe],
  template: `
    <div class="panel previous-round-panel">
      <h3 class="previous-round-title">
        {{ 'game.previousRound.title' | t }}
      </h3>

      @if (previousRound) {
        <section class="previous-round-section">
          <div class="previous-round-section-title">
            {{ 'game.previousRound.board' | t }}
          </div>

          @if (previousRound.communityCards.length > 0) {
            <div class="card-grid previous-round-card-grid">
              @for (card of previousRound.communityCards; track card.id) {
                <poker-card
                  class="previous-round-card"
                  [card]="card"
                  [play]="ignoreCardClick"
                />
              }
            </div>
            <ul class="previous-round-reader-list">
              @for (card of previousRound.communityCards; track card.id) {
                <li>{{ cardScreenReaderLabel(card) }}</li>
              }
            </ul>
          } @else {
            <div class="muted">{{ 'game.previousRound.noBoardCards' | t }}</div>
          }
        </section>

        <section class="previous-round-section">
          <div class="previous-round-section-title">
            {{ 'game.previousRound.holeCards' | t }}
          </div>

          @if (previousRound.playerCards.length > 0) {
            <div class="previous-round-players">
              @for (
                revealedCards of previousRound.playerCards;
                track revealedCards.playerId
              ) {
                <div class="previous-round-player">
                  <div class="previous-round-player-name">
                    {{ playerName(revealedCards.playerId) }}
                  </div>
                  <div class="card-grid previous-round-card-grid">
                    @for (card of revealedCards.cards; track card.id) {
                      <poker-card
                        class="previous-round-card"
                        [card]="card"
                        [play]="ignoreCardClick"
                      />
                    }
                  </div>
                  <ul class="previous-round-reader-list">
                    @for (card of revealedCards.cards; track card.id) {
                      <li>{{ cardScreenReaderLabel(card) }}</li>
                    }
                  </ul>
                </div>
              }
            </div>
          } @else {
            <div class="muted">
              {{ 'game.previousRound.noHoleCards' | t }}
            </div>
          }
        </section>
      } @else {
        <div class="muted">{{ 'game.previousRound.empty' | t }}</div>
      }
    </div>
  `,
  styles: [
    `
      .previous-round-panel {
        display: grid;
        gap: 14px;
      }

      .previous-round-title {
        margin: 0;
      }

      .previous-round-section {
        display: grid;
        gap: 8px;
      }

      .previous-round-section-title,
      .previous-round-player-name {
        font-size: 13px;
        font-weight: 700;
      }

      .previous-round-players {
        display: grid;
        gap: 12px;
      }

      .previous-round-player {
        display: grid;
        gap: 6px;
      }

      .previous-round-card-grid {
        display: flex;
        flex-wrap: nowrap;
        gap: 6px;
        justify-content: flex-start;
      }

      .previous-round-reader-list {
        border: 0;
        clip: rect(0 0 0 0);
        clip-path: inset(50%);
        height: 1px;
        margin: -1px;
        overflow: hidden;
        padding: 0;
        position: absolute;
        white-space: nowrap;
        width: 1px;
      }

      poker-card.previous-round-card {
        flex: 0 0 min(76px, calc((100% - 24px) / 5));
        width: min(76px, calc((100% - 24px) / 5));
        aspect-ratio: 96 / 150;
      }

      .previous-round-card .poker-card {
        width: 100% !important;
        min-height: 96px !important;
        padding: 6px !important;
      }

      .previous-round-card .poker-card-value {
        font-size: 18px !important;
      }

      .previous-round-card .poker-card-value-compact {
        font-size: 16px !important;
      }

      .previous-round-card .poker-card-title {
        font-size: 11px !important;
      }

      .previous-round-card .poker-card-subtitle {
        font-size: 10px !important;
      }

      .previous-round-card .poker-card-middle-label {
        font-size: 8px !important;
      }

      .previous-round-card .poker-card-suit-symbol {
        font-size: 34px !important;
      }
    `,
  ],
})
export class PreviousRoundCardsPanelComponent {
  private readonly i18n = inject(I18nService)

  @Input() previousRound: PreviousRoundRevealedCards | null = null
  @Input() players: GamePlayerViewMeta[] = []

  readonly ignoreCardClick = (_card: Card) => {}

  playerName(playerId: string) {
    return (
      this.players.find((player) => player.playerId === playerId)?.name ??
      playerId
    )
  }

  cardScreenReaderLabel(card: Card) {
    if (card.type === 'number') {
      return `${this.i18n.t(`suit.${card.suit}` as TranslationKey)} ${this.i18n.t(
        `card.value.${card.value}` as TranslationKey,
      )}`
    }

    return ''
  }
}
