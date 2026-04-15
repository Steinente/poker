import type { Card, GameConfig, PokerGameState } from '@poker/shared'
import { prisma } from '../../db/prisma.js'
import type { Prisma } from '../../generated/prisma/client.js'

export const normalizeCode = (code: string) => code.trim().toUpperCase()

export const parseSpecialCardSettings = (
  value: string | null,
): {
  allowSpectatorChat: boolean
  gameType: GameConfig['gameType']
  pokerVariant: GameConfig['pokerVariant']
  holdemLimitMode: GameConfig['holdemLimitMode']
  maxPlayers: GameConfig['maxPlayers']
  buyIn: GameConfig['buyIn']
  smallBlind: GameConfig['smallBlind']
  bigBlind: GameConfig['bigBlind']
} => {
  const fallback: {
    allowSpectatorChat: boolean
    gameType: GameConfig['gameType']
    pokerVariant: GameConfig['pokerVariant']
    holdemLimitMode: GameConfig['holdemLimitMode']
    maxPlayers: number
    buyIn: number
    smallBlind: number
    bigBlind: number
  } = {
    allowSpectatorChat: true,
    gameType: 'poker' as const,
    pokerVariant: 'texasHoldem' as const,
    holdemLimitMode: 'noLimit',
    maxPlayers: 9,
    buyIn: 1000,
    smallBlind: 10,
    bigBlind: 20,
  }

  if (!value) {
    return fallback
  }

  try {
    const parsed = JSON.parse(value) as Partial<typeof fallback>

    const holdemLimitMode =
      parsed.holdemLimitMode === 'fixedLimit' ||
      parsed.holdemLimitMode === 'potLimit' ||
      parsed.holdemLimitMode === 'noLimit'
        ? parsed.holdemLimitMode
        : fallback.holdemLimitMode

    const parsedSmallBlind =
      typeof parsed.smallBlind === 'number'
        ? Math.max(1, Math.floor(parsed.smallBlind))
        : fallback.smallBlind

    const smallBlind =
      holdemLimitMode === 'fixedLimit'
        ? Math.max(2, parsedSmallBlind + (parsedSmallBlind % 2))
        : parsedSmallBlind

    const parsedBigBlind =
      typeof parsed.bigBlind === 'number'
        ? Math.max(1, Math.floor(parsed.bigBlind))
        : fallback.bigBlind

    const bigBlind =
      holdemLimitMode === 'fixedLimit'
        ? smallBlind * 2
        : Math.max(smallBlind, parsedBigBlind)

    return {
      allowSpectatorChat: parsed.allowSpectatorChat !== false,
      gameType: 'poker',
      pokerVariant:
        parsed.pokerVariant === 'texasHoldem'
          ? 'texasHoldem'
          : fallback.pokerVariant,
      holdemLimitMode,
      maxPlayers:
        typeof parsed.maxPlayers === 'number'
          ? Math.max(2, Math.min(10, Math.floor(parsed.maxPlayers)))
          : fallback.maxPlayers,
      buyIn:
        typeof parsed.buyIn === 'number'
          ? Math.max(bigBlind, Math.floor(parsed.buyIn))
          : fallback.buyIn,
      smallBlind,
      bigBlind,
    }
  } catch {
    return fallback
  }
}

export const loadLobbyByCode = async (code: string) =>
  prisma.lobby.findUnique({
    where: { code: normalizeCode(code) },
    include: {
      players: {
        orderBy: {
          joinedAt: 'asc',
        },
      },
      gameState: true,
    },
  })

export type LobbyWithPlayers = Awaited<ReturnType<typeof loadLobbyByCode>>

export const lobbyConfigToShared = (
  lobby: NonNullable<LobbyWithPlayers>,
): GameConfig => {
  const settings = parseSpecialCardSettings(lobby.includedSpecialCards)

  return {
    ...settings,
    readLogEnabledByDefault: lobby.readLogEnabledByDefault,
    languageDefault: lobby.languageDefault === 'de' ? 'de' : 'en',
    includedSpecialCards: [],
  }
}

export const serializeSpecialCardSettings = (settings: {
  allowSpectatorChat: boolean
  gameType: GameConfig['gameType']
  pokerVariant: GameConfig['pokerVariant']
  holdemLimitMode: GameConfig['holdemLimitMode']
  maxPlayers: GameConfig['maxPlayers']
  buyIn: GameConfig['buyIn']
  smallBlind: GameConfig['smallBlind']
  bigBlind: GameConfig['bigBlind']
}) => JSON.stringify(settings)

export const toJson = (value: PokerGameState): Prisma.JsonObject =>
  JSON.parse(JSON.stringify(value)) as Prisma.JsonObject

export const fromJson = (value: unknown): PokerGameState => {
  const state = value as PokerGameState & {
    chatMessages?: unknown
    previousRoundRevealedCards?: unknown
    randomizerPoolSpecialCards?: unknown
    winnerPlayerIds?: unknown
  }

  if (!Array.isArray(state.chatMessages)) {
    state.chatMessages = []
  }

  if (!Array.isArray(state.randomizerPoolSpecialCards)) {
    state.randomizerPoolSpecialCards = []
  }

  if (!Array.isArray(state.playerInteractionStats)) {
    state.playerInteractionStats = []
  }

  if (!Array.isArray(state.winnerPlayerIds)) {
    state.winnerPlayerIds = []
  }

  state.previousRoundRevealedCards ??= null

  if (state.currentRound) {
    state.currentRound.drawPile ??= []
    state.currentRound.communityCards ??= []
    state.currentRound.burnCards ??= []
    state.currentRound.pots ??= []
    state.currentRound.availableActions ??= {}
    state.currentRound.completedTricks ??= []
    state.currentRound.currentTrick ??= null
    state.currentRound.raisesThisStreet ??= 0
  }

  return state as PokerGameState
}

export const nowIso = () => new Date().toISOString()

export const getPlayerBySessionToken = (
  lobby: NonNullable<LobbyWithPlayers>,
  sessionToken: string,
) => {
  const player = lobby.players.find(
    (entry) => entry.sessionToken === sessionToken,
  )

  if (!player) {
    throw new Error('error.playerNotFound')
  }

  return player
}

export const getSeatOrderedPlayerIds = (state: PokerGameState) =>
  state.players
    .slice()
    .sort((left, right) => left.seatIndex - right.seatIndex)
    .map((player) => player.playerId)

export const getNextPlayerId = (
  orderedPlayerIds: string[],
  currentPlayerId: string,
): string | null => {
  const index = orderedPlayerIds.indexOf(currentPlayerId)
  if (index === -1) {
    return null
  }

  return orderedPlayerIds[(index + 1) % orderedPlayerIds.length] ?? null
}

export const ensurePredictionRevealedForScoring = (_state: PokerGameState) => {}

export const getReadableCardLabel = (card: Card): string => {
  if (card.type === 'number') {
    return `${card.suit} ${card.value}`
  }

  if (card.type === 'wild') {
    return 'wild'
  }

  if (card.type === 'jester') {
    return 'jester'
  }

  return card.special
}

export const isNoTrumpSelectableTrigger = (_card: Card) => false

export const isFollowSuitDisabledInTrick = (_state: PokerGameState) => false
