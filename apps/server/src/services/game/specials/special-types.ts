import type { Card, SpecialCard, PokerGameState } from '@poker/shared'

export interface BeforePlaySpecialContext {
  state: PokerGameState
  playerId: string
  card: SpecialCard
}

export interface BeforePlaySpecialResult {
  requiresDecision: boolean
  autoResolved?: boolean
  messageKey?: string
  messageParams?: Record<string, string | number | boolean | null>
}

export interface AfterPlaySpecialContext {
  state: PokerGameState
  playerId: string
  card: Card
}

export interface AfterPlaySpecialResult {
  messageKey?: string
  messageParams?: Record<string, string | number | boolean | null>
}


