import type { PokerGameViewState } from '@poker/shared'

export const getOwnPendingDecision = (
  state: PokerGameViewState | null | undefined,
) => state?.pendingDecision ?? null

export const canPlayerPredict = (
  state: PokerGameViewState | null | undefined,
  playerId: string,
) => false

export const isRoundPlayerActive = (
  state: PokerGameViewState,
  playerId: string,
) => state.currentRound?.activePlayerId === playerId
