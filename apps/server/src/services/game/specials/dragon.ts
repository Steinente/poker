import {
  SPECIAL_CARD_KEY,
  type Card,
  type PokerGameState,
} from '@poker/shared'
import { createDecisionId, nowIso } from './special-utils.js'

export const disablesFollowSuitForDragonLead = (card: Card): boolean =>
  card.type === 'special' && card.special === SPECIAL_CARD_KEY.dragon

export const logDragonPlayed = (state: PokerGameState, playerId: string) => {
  state.logs.push({
    id: createDecisionId(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: 'special.dragon.played',
    messageParams: {
      playerId,
    },
  })
}


