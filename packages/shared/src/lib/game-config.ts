import type { SpecialCardKey } from './cards.js'

export const PREDICTION_VISIBILITIES = ['open', 'hidden', 'secret'] as const

export type PredictionVisibility = (typeof PREDICTION_VISIBILITIES)[number]

export const OPEN_PREDICTION_RESTRICTIONS = [
  'none',
  'mustEqualTricks',
  'mustNotEqualTricks',
] as const

export type OpenPredictionRestriction =
  (typeof OPEN_PREDICTION_RESTRICTIONS)[number]

export const CLOUD_RULE_TIMINGS = ['endOfRound', 'immediateAfterTrick'] as const

export type CloudRuleTiming = (typeof CLOUD_RULE_TIMINGS)[number]

export const POKER_VARIANTS = ['texasHoldem'] as const

export type PokerVariant = (typeof POKER_VARIANTS)[number]

export const HOLDEM_LIMIT_MODES = ['noLimit', 'fixedLimit', 'potLimit'] as const

export type HoldemLimitMode = (typeof HOLDEM_LIMIT_MODES)[number]

export const AUTOMATIC_BLIND_INCREASE_MODES = [
  'time',
  'dealerRounds',
] as const

export type AutomaticBlindIncreaseMode =
  (typeof AUTOMATIC_BLIND_INCREASE_MODES)[number]

export interface GameConfig {
  gameType: 'poker'
  pokerVariant: PokerVariant
  holdemLimitMode: HoldemLimitMode
  maxPlayers: number
  buyIn: number
  smallBlind: number
  bigBlind: number
  automaticBlindIncreaseEnabled: boolean
  automaticBlindIncreaseMode: AutomaticBlindIncreaseMode
  automaticBlindIncreaseValue: number
  automaticBlindIncreaseAmount: number
  predictionVisibility?: PredictionVisibility
  openPredictionRestriction?: OpenPredictionRestriction
  cloudRuleTiming?: CloudRuleTiming
  allowSpectatorChat: boolean
  specialCardsRandomizerEnabled?: boolean
  extendedPlayerRangeEnabled?: boolean
  readLogEnabledByDefault: boolean
  languageDefault: 'en' | 'de'
  includedSpecialCards: SpecialCardKey[]
}
