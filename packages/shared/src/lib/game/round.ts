import type { Card, Suit } from '../cards.js'
import type { PlayerPrediction } from './predictions.js'
import type { TrickState } from './trick.js'

export const PLAYER_ACTIONS = [
  'fold',
  'check',
  'call',
  'raise',
  'allIn',
  'postSmallBlind',
  'postBigBlind',
] as const

export type PlayerActionType = (typeof PLAYER_ACTIONS)[number]

export interface PotState {
  amount: number
  eligiblePlayerIds: string[]
}

export interface PlayerActionRecord {
  type: PlayerActionType
  amount: number
}

export interface PlayerActionAvailability {
  canFold: boolean
  canCheck: boolean
  callAmount: number
  minRaiseTo: number | null
  maxRaiseTo: number
  raiseStep: number
  canRaise: boolean
  canAllIn: boolean
}

export interface RoundPlayerState {
  playerId: string
  hand: Card[]
  stack: number
  currentBet: number
  totalCommitted: number
  folded: boolean
  isAllIn: boolean
  hasActed: boolean
  holeCardsRevealed: boolean
  lastAction: PlayerActionRecord | null
  wonChips: number
  tricksWon?: number
  prediction?: PlayerPrediction | null
  pendingCloudAdjustment?: boolean
  pendingWitchExchange?: boolean
  pendingWitchCardId?: string
  pendingWitchTrickIndex?: number
}

export interface RoundState {
  handNumber: number
  roundNumber: number
  dealerIndex: number
  activePlayerId: string | null
  smallBlindPlayerId: string | null
  bigBlindPlayerId: string | null
  currentBet: number
  minimumRaise: number
  raisesThisStreet: number
  street: 'preflop' | 'flop' | 'turn' | 'river'
  communityCards: Card[]
  burnCards: Card[]
  drawPile: Card[]
  deckRemainderCount: number
  players: RoundPlayerState[]
  pots: PotState[]
  potTotal: number
  availableActions: Record<string, PlayerActionAvailability>
  roundLeaderPlayerId?: string | null
  trumpSuit?: Suit | null
  trumpCard?: Card | null
  currentTrick?: TrickState | null
  completedTricks?: TrickState[]
}
