import type { Card, SpecialCardKey } from '../cards.js'
import type { GameConfig } from '../game-config.js'
import type { LobbyStatus } from '../lobby-state.js'
import type { GamePhase } from './phases.js'
import type { GameLogColorKey } from './log-colors.js'
import type {
  PlayerActionAvailability,
  PlayerActionRecord,
  PotState,
} from './round.js'
import type { PlayerScoreEntry } from './score.js'
import type { GameLogMessageKey } from './log-keys.js'
import type { PreviousRoundRevealedCards } from './state.js'

export interface GamePlayerViewMeta {
  playerId: string
  name: string
  seatIndex: number
  connected: boolean
  presence: 'online' | 'away' | 'offline'
  isHost: boolean
  readLogEnabled: boolean
  chips: number
  handsWon: number
  eliminated: boolean
  finishPlace?: number | null
}

export interface RoundPlayerViewState {
  playerId: string
  hand: Card[]
  handCount: number
  stack: number
  currentBet: number
  totalCommitted: number
  folded: boolean
  isAllIn: boolean
  holeCardsRevealed: boolean
  lastAction: PlayerActionRecord | null
  wonChips: number
}

export interface RoundViewState {
  handNumber: number
  roundNumber: number
  dealerIndex: number
  activePlayerId: string | null
  smallBlindPlayerId: string | null
  bigBlindPlayerId: string | null
  currentBet: number
  minimumRaise: number
  street: 'preflop' | 'flop' | 'turn' | 'river'
  communityCards: Card[]
  deckRemainderCount: number
  players: RoundPlayerViewState[]
  pots: PotState[]
  potTotal: number
  availableActions: PlayerActionAvailability | null
}

export interface GameLogEntryView {
  id: string
  createdAt: string
  colorKey: GameLogColorKey
  borderColorKey: GameLogColorKey
  type:
    | 'system'
    | 'playerJoined'
    | 'playerDisconnected'
    | 'cardsDealt'
    | 'blindPosted'
    | 'playerAction'
    | 'streetDealt'
    | 'showdown'
    | 'gameFinished'
  messageKey: GameLogMessageKey
  messageParams?: Record<string, string | number | boolean | null>
}

export interface GameChatMessageView {
  id: string
  createdAt: string
  senderPlayerId: string
  senderName: string
  senderRole: 'host' | 'player' | 'spectator' | 'system'
  text: string
  systemMessageKey?: string
  systemMessageParams?: Record<string, string | number | boolean | null>
}

export interface GamePlayerInteractionStatsView {
  playerId: string
  totalInteractionTimeMs: number
  interactionCount: number
}

export interface PokerGameViewState {
  selfPlayerId: string
  lobbyCode: string
  lobbyStatus: LobbyStatus
  config: GameConfig
  randomizerPoolSpecialCards: SpecialCardKey[]
  players: GamePlayerViewMeta[]
  spectators: string[]
  phase: GamePhase
  maxRounds: number
  currentRound: RoundViewState | null
  previousRoundRevealedCards: PreviousRoundRevealedCards | null
  playerInteractionStats: GamePlayerInteractionStatsView[]
  scoreboard: PlayerScoreEntry[]
  logs: GameLogEntryView[]
  chatMessages: GameChatMessageView[]
  pendingDecision: null
  resolvedCardEffects: []
  winnerPlayerIds: string[]
  createdAt: string
  updatedAt: string
}

export type WildGameViewState = PokerGameViewState
