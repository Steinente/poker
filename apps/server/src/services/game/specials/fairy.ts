import {
  SPECIAL_CARD_KEY,
  type Card,
  type PokerGameState,
} from '@poker/shared'
import { createDecisionId, nowIso } from './special-utils.js'

export const isFairyCard = (card: Card): boolean =>
  card.type === 'special' && card.special === SPECIAL_CARD_KEY.fairy

export const logFairyPlayed = (state: PokerGameState, playerId: string) => {
  state.logs.push({
    id: createDecisionId(),
    createdAt: nowIso(),
    type: 'specialEffect',
    messageKey: 'special.fairy.played',
    messageParams: {
      playerId,
    },
  })
}


