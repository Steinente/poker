import type { Card, PokerGameState } from '@poker/shared'
import crypto from 'node:crypto'
import { prisma } from '../../db/prisma.js'
import { LobbyStatus, PlayerRole } from '../../generated/prisma/client.js'
import { mapLobbyToSummary } from '../lobby-mapper.js'
import {
  clearLobbyChatMessages,
  getLobbyChatMessages,
} from '../lobby-chat-store.js'
import { loadStateOrThrow, persistState } from './game-persistence.js'
import {
  advanceActionTurn,
  applyBet,
  awardUncontestedPot,
  buildActionAvailability,
  dealRemainingCommunityCards,
  getPlayerBestHandRankKey,
  getRoundPlayer,
  isBettingRoundComplete,
  moveToNextStreet,
  resetForShowdownDelay,
  settleShowdown,
  shouldForceShowdown,
  startNextHand,
} from './poker-engine.js'
import { createGameStateView } from './game-state-view.js'
import {
  getPlayerBySessionToken,
  loadLobbyByCode,
  lobbyConfigToShared,
  nowIso,
  parseSpecialCardSettings,
} from './game-service-support.js'
import { recordPlayerInteractionCompletion } from './player-interaction-timing.js'

const CHAT_MESSAGE_LIMIT = 200

const pushLog = (
  state: PokerGameState,
  entry: Omit<PokerGameState['logs'][number], 'id' | 'createdAt'>,
) => {
  state.logs.push({
    id: crypto.randomUUID(),
    createdAt: nowIso(),
    ...entry,
  })
}

const trimChat = (state: PokerGameState) => {
  if (state.chatMessages.length > CHAT_MESSAGE_LIMIT) {
    state.chatMessages.splice(0, state.chatMessages.length - CHAT_MESSAGE_LIMIT)
  }
}

const syncStatePlayerChips = (state: PokerGameState) => {
  const round = state.currentRound

  if (!round) {
    return
  }

  for (const player of state.players) {
    const roundPlayer = round.players.find(
      (entry) => entry.playerId === player.playerId,
    )
    if (!roundPlayer) {
      continue
    }

    player.chips = roundPlayer.stack
  }
}

const appendStreetLog = (state: PokerGameState) => {
  const round = state.currentRound
  if (!round) {
    return
  }

  // Flop reveals 3 cards, turn and river reveal 1 each
  const newCardCount = state.phase === 'flop' ? 3 : 1
  const cards = round.communityCards.slice(-newCardCount)
  const community = cards
    .filter(
      (card): card is Extract<Card, { type: 'number' }> =>
        card.type === 'number',
    )
    .map((card) => `${card.suit}:${card.value}`)
    .join(', ')

  const messageKey =
    newCardCount === 1 ? 'game.street.cardDealt' : 'game.street.cardsDealt'

  pushLog(state, {
    type: 'streetDealt',
    messageKey,
    messageParams: {
      cards: community,
    },
  })
}

const formatCardsParam = (cards: Card[]) =>
  cards
    .filter(
      (card): card is Extract<Card, { type: 'number' }> =>
        card.type === 'number',
    )
    .map((card) => `${card.suit}:${card.value}`)
    .join(', ')

const appendAllInRunoutLog = (state: PokerGameState, cards: Card[]) => {
  pushLog(state, {
    type: 'streetDealt',
    messageKey: 'game.showdown.allInRunout',
    messageParams: {
      cards: formatCardsParam(cards),
    },
  })
}

const appendActionLog = (
  state: PokerGameState,
  playerId: string,
  action: string,
  amount?: number,
  extraParams?: Record<string, string | number | boolean | null>,
) => {
  pushLog(state, {
    type: 'playerAction',
    messageKey: `game.action.${action}`,
    messageParams: {
      playerId,
      amount: amount ?? null,
      ...(extraParams ?? {}),
    },
  })
}

const appendHoleCardsSummaryLog = (state: PokerGameState) => {
  const round = state.currentRound

  if (!round) {
    return
  }

  const hands = round.players
    .filter((player) => !player.folded && player.hand.length > 0)
    .map((player) => {
      const playerName =
        state.players.find((entry) => entry.playerId === player.playerId)
          ?.name ?? player.playerId
      return `${playerName}=${formatCardsParam(player.hand)}`
    })
    .join(' | ')

  pushLog(state, {
    type: 'showdown',
    messageKey: 'game.showdown.holeCards',
    messageParams: {
      hands,
    },
  })
}

const appendShowdownLog = (state: PokerGameState) => {
  const round = state.currentRound
  const winnerHandRanks = new Map<string, string>()

  if (round) {
    for (const playerId of state.winnerPlayerIds) {
      winnerHandRanks.set(playerId, getPlayerBestHandRankKey(round, playerId))
    }
  }

  const winnerSummaries = state.winnerPlayerIds.map((playerId) => {
    const playerName =
      state.players.find((entry) => entry.playerId === playerId)?.name ??
      playerId
    const handRank = winnerHandRanks.get(playerId) ?? 'highCard'
    return `${playerName}=${handRank}`
  })

  pushLog(state, {
    type: 'showdown',
    messageKey: 'game.showdown.resolved',
    messageParams: {
      winnerNames: state.winnerPlayerIds
        .map(
          (playerId) =>
            state.players.find((entry) => entry.playerId === playerId)?.name ??
            playerId,
        )
        .join(', '),
      winnerSummary: winnerSummaries.join(' | '),
    },
  })
}

const appendHandStartLogs = (state: PokerGameState) => {
  pushLog(state, {
    type: 'cardsDealt',
    messageKey: 'game.hand.started',
  })

  const round = state.currentRound
  if (!round) {
    return
  }

  const smallBlindPlayer = round.players.find(
    (player) => player.playerId === round.smallBlindPlayerId,
  )
  const bigBlindPlayer = round.players.find(
    (player) => player.playerId === round.bigBlindPlayerId,
  )
  const smallBlindPlayerName = state.players.find(
    (player) => player.playerId === round.smallBlindPlayerId,
  )?.name
  const bigBlindPlayerName = state.players.find(
    (player) => player.playerId === round.bigBlindPlayerId,
  )?.name

  const smallBlindAmount =
    smallBlindPlayer?.lastAction?.type === 'postSmallBlind'
      ? smallBlindPlayer.lastAction.amount
      : state.config.smallBlind
  const bigBlindAmount =
    bigBlindPlayer?.lastAction?.type === 'postBigBlind'
      ? bigBlindPlayer.lastAction.amount
      : state.config.bigBlind

  pushLog(state, {
    type: 'blindPosted',
    messageKey: 'game.hand.blindsPosted',
    messageParams: {
      smallBlindPlayerName: smallBlindPlayerName ?? '-',
      bigBlindPlayerName: bigBlindPlayerName ?? '-',
      smallBlind: smallBlindAmount,
      bigBlind: bigBlindAmount,
    },
  })
}

const capturePreviousRoundRevealedCards = (state: PokerGameState) => {
  const round = state.currentRound

  if (!round) {
    state.previousRoundRevealedCards = null
    return
  }

  const showdownPlayers = round.players.filter(
    (player) => !player.folded && player.hand.length > 0,
  )
  const playerCards =
    showdownPlayers.length > 1
      ? showdownPlayers
          .filter((player) => player.holeCardsRevealed)
          .map((player) => ({
            playerId: player.playerId,
            cards: player.hand,
          }))
      : []

  state.previousRoundRevealedCards = {
    handNumber: round.handNumber,
    roundNumber: round.roundNumber,
    communityCards: round.communityCards,
    playerCards,
  }
}

const buildInitialState = (
  lobby: NonNullable<Awaited<ReturnType<typeof loadLobbyByCode>>>,
): PokerGameState => {
  const players = lobby.players
    .filter((player) => player.role !== PlayerRole.SPECTATOR && !player.inGame)
    .map((player, seatIndex) => ({
      playerId: player.id,
      name: player.name,
      seatIndex,
      connected: player.connected,
      isHost: player.id === lobby.hostPlayerId,
      readLogEnabled: player.readLogEnabled,
      chips: lobbyConfigToShared(lobby).buyIn,
      handsWon: 0,
      eliminated: false,
      finishPlace: null,
    }))

  return {
    lobbyCode: lobby.code,
    lobbyStatus: 'running',
    config: lobbyConfigToShared(lobby),
    randomizerPoolSpecialCards: [],
    players,
    playerInteractionStats: players.map((player) => ({
      playerId: player.playerId,
      totalInteractionTimeMs: 0,
      interactionCount: 0,
      pendingInteractionStartedAt: null,
    })),
    phase: 'waiting',
    maxRounds: 0,
    currentRound: null,
    previousRoundRevealedCards: null,
    scoreboard: [],
    logs: [],
    chatMessages: [],
    pendingDecision: null,
    resolvedCardEffects: [],
    winnerPlayerIds: [],
    createdAt: nowIso(),
    updatedAt: nowIso(),
  }
}

export class GameService {
  async startGame(input: { code: string; sessionToken: string }) {
    const lobby = await loadLobbyByCode(input.code)

    if (!lobby) {
      throw new Error('error.lobbyNotFound')
    }

    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    if (player.id !== lobby.hostPlayerId) {
      throw new Error('error.onlyHostCanStart')
    }

    const playingPlayers = lobby.players.filter(
      (entry) => entry.role !== PlayerRole.SPECTATOR && !entry.inGame,
    )
    const config = lobbyConfigToShared(lobby)

    if (playingPlayers.length < 2) {
      throw new Error('minPlayersRequired')
    }

    if (playingPlayers.length > config.maxPlayers) {
      throw new Error('maxPlayersExceeded')
    }

    const state = buildInitialState(lobby)
    const transferredLobbyMessages = getLobbyChatMessages(lobby.code)
    if (transferredLobbyMessages.length > 0) {
      state.chatMessages.push(...transferredLobbyMessages)
      trimChat(state)
    }

    state.chatMessages.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      senderPlayerId: 'system',
      senderName: 'System',
      senderRole: 'system',
      text: '',
      systemMessageKey: 'chat.system.inGameContinuation',
    })

    startNextHand(state)
    appendHandStartLogs(state)

    await prisma.lobby.update({
      where: { id: lobby.id },
      data: {
        status: LobbyStatus.RUNNING,
        hostDisconnectedAt: null,
        hostDisconnectDeadline: null,
      },
    })

    await prisma.player.updateMany({
      where: {
        lobbyId: lobby.id,
        id: {
          in: playingPlayers.map((entry) => entry.id),
        },
      },
      data: {
        inGame: true,
      },
    })

    await persistState(lobby.id, state)
    clearLobbyChatMessages(lobby.code)

    const updatedLobby = await prisma.lobby.findUniqueOrThrow({
      where: { id: lobby.id },
      include: {
        players: {
          orderBy: {
            joinedAt: 'asc',
          },
        },
      },
    })

    return {
      lobby: mapLobbyToSummary(updatedLobby),
      state,
    }
  }

  private async mutateState(
    input: { code: string; sessionToken: string },
    mutate: (state: PokerGameState, actingPlayerId: string) => void,
  ) {
    const { lobby, state } = await loadStateOrThrow(input.code)
    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    if (player.role === PlayerRole.SPECTATOR) {
      throw new Error('error.notYourTurn')
    }

    const round = state.currentRound

    if (!round || state.phase === 'finished' || state.phase === 'showdown') {
      throw new Error('error.notYourTurn')
    }

    if (round.activePlayerId !== player.id) {
      throw new Error('error.notYourTurn')
    }

    recordPlayerInteractionCompletion(state, player.id)
    mutate(state, player.id)
    syncStatePlayerChips(state)
    await persistState(lobby.id, state)
    return state
  }

  private finalizeAction(state: PokerGameState, actingPlayerId: string) {
    const round = state.currentRound

    if (!round) {
      return
    }

    const remainingPlayers = round.players.filter(
      (player) => player.hand.length > 0 && !player.folded,
    )

    if (remainingPlayers.length === 1) {
      awardUncontestedPot(state, remainingPlayers[0].playerId)
      round.availableActions = {}
      state.phase = 'showdown'
      appendShowdownLog(state)
      return
    }

    if (isBettingRoundComplete(round)) {
      if (shouldForceShowdown(round) && state.phase !== 'river') {
        const revealedCards = dealRemainingCommunityCards(state)
        appendAllInRunoutLog(state, revealedCards)
        appendHoleCardsSummaryLog(state)
        settleShowdown(state)
        round.availableActions = {}
        state.phase = 'showdown'
        appendShowdownLog(state)
        return
      }

      if (state.phase === 'river') {
        appendHoleCardsSummaryLog(state)
        settleShowdown(state)
        round.availableActions = {}
        state.phase = 'showdown'
        appendShowdownLog(state)
        return
      }

      moveToNextStreet(state)
      appendStreetLog(state)
      return
    }

    advanceActionTurn(state, actingPlayerId)
  }

  async fold(input: { code: string; sessionToken: string }) {
    return this.mutateState(input, (state, actingPlayerId) => {
      const round = state.currentRound!
      const player = getRoundPlayer(round, actingPlayerId)
      const callAmount = Math.max(0, round.currentBet - player.currentBet)

      player.folded = true
      player.hasActed = true
      player.lastAction = { type: 'fold', amount: callAmount }
      appendActionLog(state, actingPlayerId, 'fold', callAmount)
      this.finalizeAction(state, actingPlayerId)
    })
  }

  async check(input: { code: string; sessionToken: string }) {
    return this.mutateState(input, (state, actingPlayerId) => {
      const round = state.currentRound!
      const player = getRoundPlayer(round, actingPlayerId)

      if (round.currentBet !== player.currentBet) {
        throw new Error('error.illegalCheck')
      }

      player.hasActed = true
      player.lastAction = { type: 'check', amount: 0 }
      appendActionLog(state, actingPlayerId, 'check')
      this.finalizeAction(state, actingPlayerId)
    })
  }

  async call(input: { code: string; sessionToken: string; amount?: number }) {
    return this.mutateState(input, (state, actingPlayerId) => {
      const round = state.currentRound!
      const player = getRoundPlayer(round, actingPlayerId)
      const targetBet = round.currentBet
      const callAmount = Math.max(0, targetBet - player.currentBet)

      if (targetBet <= player.currentBet) {
        throw new Error('error.illegalCall')
      }

      applyBet(
        round,
        player,
        targetBet,
        player.stack <= targetBet - player.currentBet ? 'allIn' : 'call',
      )
      appendActionLog(state, actingPlayerId, 'call', callAmount)
      this.finalizeAction(state, actingPlayerId)
    })
  }

  async raise(input: { code: string; sessionToken: string; amount: number }) {
    return this.mutateState(input, (state, actingPlayerId) => {
      const round = state.currentRound!
      const player = getRoundPlayer(round, actingPlayerId)
      const availability = buildActionAvailability(
        round,
        actingPlayerId,
        state.config,
      )

      if (!availability?.canRaise || availability.minRaiseTo === null) {
        throw new Error('error.illegalRaise')
      }

      const minRaiseBy = availability.minRaiseTo - round.currentBet
      const maxRaiseBy = availability.maxRaiseTo - round.currentBet
      const raiseBy = Math.max(
        minRaiseBy,
        Math.min(maxRaiseBy, Math.floor(input.amount)),
      )
      const targetBet = round.currentBet + raiseBy
      const shouldLogRaiseWithTotal = round.currentBet > 0

      if (raiseBy < minRaiseBy) {
        throw new Error('error.illegalRaise')
      }

      applyBet(
        round,
        player,
        targetBet,
        targetBet >= availability.maxRaiseTo ? 'allIn' : 'raise',
      )

      if (shouldLogRaiseWithTotal) {
        appendActionLog(state, actingPlayerId, 'reraise', raiseBy, {
          total: targetBet,
        })
      } else {
        appendActionLog(state, actingPlayerId, 'raise', raiseBy)
      }
      this.finalizeAction(state, actingPlayerId)
    })
  }

  async allIn(input: { code: string; sessionToken: string }) {
    return this.mutateState(input, (state, actingPlayerId) => {
      const round = state.currentRound!
      const player = getRoundPlayer(round, actingPlayerId)
      const availability = buildActionAvailability(
        round,
        actingPlayerId,
        state.config,
      )

      if (!availability?.canAllIn) {
        throw new Error('error.illegalRaise')
      }

      const targetBet = player.currentBet + player.stack

      if (targetBet <= player.currentBet) {
        throw new Error('error.illegalRaise')
      }

      applyBet(round, player, targetBet, 'allIn')
      appendActionLog(state, actingPlayerId, 'allIn', targetBet)
      this.finalizeAction(state, actingPlayerId)
    })
  }

  async advanceFromShowdown(code: string) {
    const { lobby, state } = await loadStateOrThrow(code)

    if (state.phase !== 'showdown') {
      return state
    }

    resetForShowdownDelay(state)
    capturePreviousRoundRevealedCards(state)
    startNextHand(state)

    if (state.currentRound === null) {
      pushLog(state, {
        type: 'gameFinished',
        messageKey: 'game.finished',
        messageParams: {
          winnerNames: state.winnerPlayerIds
            .map(
              (playerId) =>
                state.players.find((entry) => entry.playerId === playerId)
                  ?.name ?? playerId,
            )
            .join(', '),
        },
      })

      await prisma.lobby.update({
        where: { id: lobby.id },
        data: { status: LobbyStatus.FINISHED },
      })
    } else {
      appendHandStartLogs(state)
    }

    await persistState(lobby.id, state)
    return state
  }

  async setReadLogEnabled(input: {
    code: string
    sessionToken: string
    enabled: boolean
  }) {
    const { lobby, state } = await loadStateOrThrow(input.code)
    const player = getPlayerBySessionToken(lobby, input.sessionToken)

    await prisma.player.update({
      where: { id: player.id },
      data: { readLogEnabled: input.enabled },
    })

    const statePlayer = state.players.find(
      (entry) => entry.playerId === player.id,
    )
    if (statePlayer) {
      statePlayer.readLogEnabled = input.enabled
    }

    await persistState(lobby.id, state)
    return state
  }

  async sendChatMessage(input: {
    code: string
    sessionToken: string
    text: string
  }) {
    const { lobby, state } = await loadStateOrThrow(input.code)
    const player = getPlayerBySessionToken(lobby, input.sessionToken)
    const spectatorChatAllowed = parseSpecialCardSettings(
      lobby.includedSpecialCards,
    ).allowSpectatorChat

    if (player.role === PlayerRole.SPECTATOR && !spectatorChatAllowed) {
      throw new Error('error.spectatorChatDisabled')
    }

    state.chatMessages.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      senderPlayerId: player.id,
      senderName: player.name,
      senderRole:
        player.role === PlayerRole.HOST
          ? 'host'
          : player.role === PlayerRole.SPECTATOR
            ? 'spectator'
            : 'player',
      text: input.text.trim(),
    })

    trimChat(state)
    await persistState(lobby.id, state)
    return state
  }

  async appendSystemChatMessage(input: {
    code: string
    systemMessageKey: string
    systemMessageParams?: Record<string, string | number | boolean | null>
  }) {
    const { lobby, state } = await loadStateOrThrow(input.code)

    state.chatMessages.push({
      id: crypto.randomUUID(),
      createdAt: nowIso(),
      senderPlayerId: 'system',
      senderName: 'System',
      senderRole: 'system',
      text: '',
      systemMessageKey: input.systemMessageKey,
      systemMessageParams: input.systemMessageParams,
    })

    trimChat(state)
    await persistState(lobby.id, state)
    return state
  }

  async getViewState(input: { code: string; sessionToken: string }) {
    const { lobby, state } = await loadStateOrThrow(input.code)
    const player = getPlayerBySessionToken(lobby, input.sessionToken)
    const spectators = lobby.players
      .filter((entry) => entry.role === PlayerRole.SPECTATOR && entry.connected)
      .map((entry) => entry.name)
    const playerPresence: Record<string, 'online' | 'away' | 'offline'> = {}

    for (const statePlayer of state.players) {
      const lobbyPlayer = lobby.players.find(
        (entry) => entry.id === statePlayer.playerId,
      )

      if (!lobbyPlayer) {
        continue
      }

      statePlayer.connected = lobbyPlayer.connected
      playerPresence[statePlayer.playerId] = !lobbyPlayer.connected
        ? 'offline'
        : lobbyPlayer.inGame
          ? 'online'
          : 'away'
    }

    return createGameStateView(state, player.id, spectators, playerPresence)
  }

  async resolvePendingCompletedTrick(code: string) {
    return this.advanceFromShowdown(code)
  }
}
