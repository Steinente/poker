import type { PokerGameState } from '@poker/shared'
import { createDecisionId, nowIso } from './special-utils.js'

export const logBombPlayed = (state: PokerGameState, playerId: string) => {
  state.logs.push({
    id: createDecisionId(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: 'special.bomb.played',
    messageParams: {
      playerId,
    },
  })
}

export const logBombCancelledTrick = (state: PokerGameState) => {
  state.logs.push({
    id: createDecisionId(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: 'game.trick.canceledByBomb',
  })
}


