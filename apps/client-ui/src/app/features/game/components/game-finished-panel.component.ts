import { Component, Input } from '@angular/core'
import type { PokerGameViewState } from '@poker/shared'
import { TPipe } from '../../../shared/pipes/t.pipe'

interface RankedPlayer {
  playerId: string
  name: string
  seatIndex: number
  chips: number
  handsWon: number
  finishPlace: number | null
  interactionTimeMs: number
  interactionCount: number
  isSelf: boolean
}

@Component({
  selector: 'poker-game-finished-panel',
  standalone: true,
  imports: [TPipe],
  template: `
    <div class="panel finished-panel">
      <div class="finished-hero">
        <div class="finished-label">{{ 'phase.finished' | t }}</div>
        <h2 style="margin: 0;">{{ 'game.finishedTitle' | t }}</h2>
        <p class="muted" style="margin: 8px 0 0;">{{ 'game.finalRanking' | t }}</p>
        <p class="muted" style="margin: 6px 0 0;">
          {{ 'stats.totalGameTime' | t }}: {{ formatDuration(totalGameDurationMs()) }}
        </p>
      </div>

      <div class="ranking-list">
        @for (player of ranking(); track player.playerId) {
          <div
            class="ranking-row"
            [class.ranking-row-winner]="$index === 0"
            [class.ranking-row-self]="player.isSelf"
          >
            <div class="ranking-place">
              {{ player.finishPlace ?? $index + 1 }}
            </div>

            <div class="ranking-player">
              <div class="ranking-name">
                {{ player.name }}
                @if (player.isSelf) {
                  <span class="muted">({{ 'player.self' | t }})</span>
                }
              </div>
              <div class="muted">
                {{ 'game.handsWon' | t }} {{ player.handsWon }}
              </div>
              <div class="muted">
                {{ 'stats.interactionTime' | t }}
                {{ formatDuration(player.interactionTimeMs) }}
              </div>
            </div>

            <div class="ranking-score">
              {{ player.chips }} {{ 'table.points' | t }}
            </div>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .finished-panel {
        padding: 20px;
      }

      .finished-hero {
        margin-bottom: 18px;
      }

      .finished-label {
        color: var(--accent);
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        margin-bottom: 8px;
      }

      .ranking-list {
        display: grid;
        gap: 10px;
      }

      .ranking-row {
        display: grid;
        grid-template-columns: 48px minmax(0, 1fr) auto;
        gap: 12px;
        align-items: center;
        padding: 12px 14px;
        border: 1px solid var(--border);
        border-radius: 14px;
        background: rgb(15 23 42 / 0.55);
      }

      .ranking-row-winner {
        border-color: var(--accent);
        box-shadow: inset 0 0 0 1px rgb(212 167 44 / 0.35);
      }

      .ranking-row-self {
        outline: 2px solid rgb(212 167 44 / 0.45);
      }

      .ranking-place {
        display: grid;
        place-items: center;
        width: 36px;
        height: 36px;
        border-radius: 999px;
        background: #22304a;
        color: var(--text);
        font-weight: 700;
      }

      .ranking-name {
        font-weight: 700;
      }

      .ranking-score {
        font-weight: 700;
        white-space: nowrap;
      }

    `,
  ],
})
export class GameFinishedPanelComponent {
  @Input({ required: true }) state!: PokerGameViewState

  private finishedAtMs(): number | null {
    for (let index = this.state.logs.length - 1; index >= 0; index -= 1) {
      const entry = this.state.logs[index]

      if (!entry || entry.type !== 'gameFinished') {
        continue
      }

      const finishedAt = Date.parse(entry.createdAt)
      if (Number.isFinite(finishedAt)) {
        return finishedAt
      }
    }

    return null
  }

  totalGameDurationMs(): number {
    const startedAt = Date.parse(this.state.createdAt)
    const endedAt = this.finishedAtMs() ?? Date.parse(this.state.updatedAt)

    if (!Number.isFinite(startedAt) || !Number.isFinite(endedAt)) {
      return 0
    }

    return Math.max(0, endedAt - startedAt)
  }

  formatDuration(totalMs: number): string {
    const safeMs = Math.max(0, Math.round(totalMs))
    const totalSeconds = Math.floor(safeMs / 1000)
    const seconds = totalSeconds % 60
    const minutes = Math.floor(totalSeconds / 60)

    return `${minutes}:${String(seconds).padStart(2, '0')}`
  }

  ranking(): RankedPlayer[] {
    const interactionTotals = new Map<string, number>()
    const interactionCounts = new Map<string, number>()

    for (const entry of this.state.playerInteractionStats) {
      interactionTotals.set(entry.playerId, entry.totalInteractionTimeMs)
      interactionCounts.set(entry.playerId, entry.interactionCount)
    }

    return [...this.state.players]
      .map((player) => ({
        playerId: player.playerId,
        name: player.name,
        seatIndex: player.seatIndex,
        chips: player.chips,
        handsWon: player.handsWon,
        finishPlace: player.finishPlace ?? null,
        interactionTimeMs: interactionTotals.get(player.playerId) ?? 0,
        interactionCount: interactionCounts.get(player.playerId) ?? 0,
        isSelf: player.playerId === this.state.selfPlayerId,
      }))
      .sort((left, right) => {
        const leftPlace = left.finishPlace ?? Number.MAX_SAFE_INTEGER
        const rightPlace = right.finishPlace ?? Number.MAX_SAFE_INTEGER

        if (leftPlace !== rightPlace) {
          return leftPlace - rightPlace
        }

        if (right.chips !== left.chips) {
          return right.chips - left.chips
        }

        if (right.handsWon !== left.handsWon) {
          return right.handsWon - left.handsWon
        }

        return left.seatIndex - right.seatIndex
      })
  }
}



