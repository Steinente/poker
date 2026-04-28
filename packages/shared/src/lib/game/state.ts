import type { GameConfig } from '../game-config.js'
import type { Card, SpecialCardKey } from '../cards.js'
import type { LobbyStatus } from '../lobby-state.js'
import type { GameLogMessageKey } from './log-keys.js'
import type { GamePhase } from './phases.js'
import type { RoundState } from './round.js'
import type { PlayerScoreEntry } from './score.js'

export interface GamePlayerInteractionStats {
  playerId: string
  totalInteractionTimeMs: number
  interactionCount: number
  pendingInteractionStartedAt: string | null
}

export interface GamePlayerMeta {
  playerId: string
  name: string
  seatIndex: number
  connected: boolean
  isHost: boolean
  readLogEnabled: boolean
  chips: number
  handsWon: number
  eliminated: boolean
  finishPlace?: number | null
}

export interface GameLogEntry {
  id: string
  createdAt: string
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
  visibleToPlayerId?: string
}

export interface GameChatMessage {
  id: string
  createdAt: string
  senderPlayerId: string
  senderName: string
  senderRole: 'host' | 'player' | 'spectator' | 'system'
  text: string
  systemMessageKey?: string
  systemMessageParams?: Record<string, string | number | boolean | null>
}

export interface PreviousRoundRevealedPlayerCards {
  playerId: string
  cards: Card[]
}

export interface PreviousRoundRevealedCards {
  handNumber: number
  roundNumber: number
  communityCards: Card[]
  playerCards: PreviousRoundRevealedPlayerCards[]
}

export interface AutomaticBlindIncreaseState {
  timeWindowStartedAt: string
  handsSinceLastIncrease: number
}

export interface PokerGameState {
  lobbyCode: string
  lobbyStatus: LobbyStatus
  config: GameConfig
  automaticBlindIncrease: AutomaticBlindIncreaseState
  randomizerPoolSpecialCards: SpecialCardKey[]
  players: GamePlayerMeta[]
  playerInteractionStats: GamePlayerInteractionStats[]
  phase: GamePhase
  maxRounds: number
  currentRound: RoundState | null
  previousRoundRevealedCards: PreviousRoundRevealedCards | null
  scoreboard: PlayerScoreEntry[]
  logs: GameLogEntry[]
  chatMessages: GameChatMessage[]
  pendingDecision: null
  resolvedCardEffects: []
  winnerPlayerIds: string[]
  createdAt: string
  updatedAt: string
}

export type WildGameState = PokerGameState
