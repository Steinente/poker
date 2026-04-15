import type { PokerGameState } from '@poker/shared'

const dateToIso = (value: number) => new Date(value).toISOString()

const getOrCreatePlayerStats = (state: PokerGameState, playerId: string) => {
  const existing = state.playerInteractionStats.find(
    (entry) => entry.playerId === playerId,
  )

  if (existing) {
    return existing
  }

  const created = {
    playerId,
    totalInteractionTimeMs: 0,
    interactionCount: 0,
    pendingInteractionStartedAt: null,
  }

  state.playerInteractionStats.push(created)
  return created
}

const getActionablePlayerIds = (state: PokerGameState): string[] => {
  if (state.phase === 'finished' || state.phase === 'waiting') {
    return []
  }

  const round = state.currentRound

  if (!round) {
    return []
  }

  if (
    state.phase === 'preflop' ||
    state.phase === 'flop' ||
    state.phase === 'turn' ||
    state.phase === 'river'
  ) {
    return round.activePlayerId ? [round.activePlayerId] : []
  }

  return []
}

export const syncActionableInteractionTimers = (
  state: PokerGameState,
  now = Date.now(),
) => {
  const actionablePlayerIds = new Set(getActionablePlayerIds(state))

  for (const player of state.players) {
    const stats = getOrCreatePlayerStats(state, player.playerId)
    const isActionable = actionablePlayerIds.has(player.playerId)

    if (isActionable && !stats.pendingInteractionStartedAt) {
      stats.pendingInteractionStartedAt = dateToIso(now)
      continue
    }

    if (!isActionable) {
      stats.pendingInteractionStartedAt = null
    }
  }
}

export const recordPlayerInteractionCompletion = (
  state: PokerGameState,
  playerId: string,
  now = Date.now(),
) => {
  const stats = getOrCreatePlayerStats(state, playerId)
  const startedAt = stats.pendingInteractionStartedAt

  let durationMs = 0
  if (startedAt) {
    const parsed = Date.parse(startedAt)
    if (Number.isFinite(parsed) && parsed <= now) {
      durationMs = now - parsed
    }
  }

  stats.totalInteractionTimeMs += durationMs
  stats.interactionCount += 1
  stats.pendingInteractionStartedAt = null
}
