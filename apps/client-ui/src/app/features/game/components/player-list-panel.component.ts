import { Component, Input, inject } from '@angular/core'
import type { PokerGameViewState } from '@poker/shared'
import { I18nService } from '../../../core/i18n/i18n.service'
import type { TranslationKey } from '../../../core/i18n/translations'
import { TPipe } from '../../../shared/pipes/t.pipe'

@Component({
  selector: 'poker-player-list-panel',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="panel player-panel">
      <h3 style="margin-top: 0;">{{ 'players' | t }}</h3>

      <div class="grid" style="gap: 8px;">
        @for (player of state.players; track player.playerId) {
          <div
            class="player-row"
            [class.player-row-active]="isActive(player.playerId)"
            [class.player-row-self]="player.playerId === state.selfPlayerId"
          >
            <div class="player-row-top">
              <strong>
                {{ player.name }}
                @if (player.playerId === state.selfPlayerId) {
                  <span class="muted">({{ 'self' | t }})</span>
                }
              </strong>

              <div class="player-tags">
                @if (isDealer(player.playerId)) {
                  <span
                    class="status-pill badge-dealer"
                    [title]="t('badge.dealer')"
                    >D</span
                  >
                }
                @if (isSmallBlind(player.playerId)) {
                  <span
                    class="status-pill badge-blind"
                    [title]="t('badge.smallBlind')"
                    >SB</span
                  >
                }
                @if (isBigBlind(player.playerId)) {
                  <span
                    class="status-pill badge-blind"
                    [title]="t('badge.bigBlind')"
                    >BB</span
                  >
                }
                @if (player.eliminated) {
                  <span class="status-pill badge-out" [title]="t('badge.out')"
                    >Out</span
                  >
                }
              </div>
            </div>

            <div class="player-row-stats muted">
              <span>{{ 'seat' | t }} {{ player.seatIndex + 1 }}</span>
              <span>{{ 'game.chips' | t }} {{ player.chips }}</span>
              <span>{{ 'game.handsWon' | t }} {{ player.handsWon }}</span>
            </div>

            @if (roundPlayer(player.playerId); as rp) {
              <div class="player-row-stats muted">
                <span>{{ 'game.playerBet' | t }} {{ rp.currentBet }}</span>
                <span
                  >{{ 'game.playerTotal' | t }} {{ rp.totalCommitted }}</span
                >
                @if (rp.folded) {
                  <span class="tag-fold">{{ 'game.playerFolded' | t }}</span>
                }
                @if (rp.isAllIn) {
                  <span class="tag-allin">{{ 'game.playerAllIn' | t }}</span>
                }
                @if (rp.lastAction) {
                  <span>{{ actionLabel(rp.lastAction.type) }}</span>
                }
              </div>
            }
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .player-panel {
        padding: 10px;
      }

      .player-row {
        border: 1px solid var(--border);
        border-radius: 12px;
        padding: 10px;
        background: rgb(15 23 42 / 0.42);
      }

      .player-row-self {
        box-shadow: inset 0 0 0 1px rgb(212 167 44 / 0.35);
      }

      .player-row-active {
        outline: 2px solid rgb(212 167 44 / 0.65);
      }

      .player-row-top,
      .player-row-stats,
      .player-tags {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
        align-items: center;
      }

      .player-row-stats {
        margin-top: 6px;
        font-size: 12px;
      }

      .badge-dealer {
        background: #7c3aed;
        color: #fff;
        cursor: help;
      }

      .badge-blind {
        background: #d97706;
        color: #fff;
        cursor: help;
      }

      .badge-out {
        background: #64748b;
        color: #fff;
        cursor: help;
      }

      .tag-fold {
        color: #ef4444;
        font-weight: 600;
      }

      .tag-allin {
        color: #f59e0b;
        font-weight: 600;
      }
    `,
  ],
})
export class PlayerListPanelComponent {
  private readonly i18n = inject(I18nService)

  @Input({ required: true }) state!: PokerGameViewState

  t(key: TranslationKey): string {
    return this.i18n.t(key)
  }

  roundPlayer(playerId: string) {
    return this.state.currentRound?.players.find(
      (player) => player.playerId === playerId,
    )
  }

  isActive(playerId: string) {
    return this.state.currentRound?.activePlayerId === playerId
  }

  isDealer(playerId: string) {
    const round = this.state.currentRound

    if (!round) {
      return false
    }

    return round.players[round.dealerIndex]?.playerId === playerId
  }

  isSmallBlind(playerId: string) {
    return this.state.currentRound?.smallBlindPlayerId === playerId
  }

  isBigBlind(playerId: string) {
    return this.state.currentRound?.bigBlindPlayerId === playerId
  }

  actionLabel(action: string): string {
    const key = `game.lastAction.${action}` as TranslationKey

    return this.i18n.t(key) !== key ? this.i18n.t(key) : action
  }
}
